import nodemailer from 'nodemailer'
import path from 'path'
import { generateOTPEmailHTML } from './emailTemplate'

// Survive Next.js Turbopack hot-module-reload: a plain top-level Map gets
// recreated whenever this file is recompiled, which wipes every pending OTP
// mid-signup. Stash it on globalThis so the same Map instance is reused
// across module reloads.
//
// We also keep a *pending signup* payload alongside the OTP. The user is only
// inserted into the DB after a successful OTP verification, so we have to
// hold their form data somewhere in the meantime. Memory is fine for this
// because the lifetime is short (15 min) and the data is non-sensitive
// except for the password — which is hashed before being persisted and
// dropped from memory immediately after verify.
export interface PendingSignup {
  username: string
  password: string // plaintext, lives only in memory for ≤15 min
  email: string
  company?: string
  department?: string
  fullName?: string
  role: 'admin' | 'employee' | 'executive'
}

type OtpEntry = {
  otp: string
  expiresAt: number
  pending?: PendingSignup
}
type OtpStore = Map<string, OtpEntry>
const otpGlobal = globalThis as unknown as { __rayOtpStore?: OtpStore }
const otpStore: OtpStore = otpGlobal.__rayOtpStore ?? new Map()
otpGlobal.__rayOtpStore = otpStore

const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    // .trim() guards against the common mistake of writing `EMAIL_USER= foo@bar`
    // in .env.local (space after the equals sign). dotenv passes that leading
    // space through as part of the value, and Gmail then rejects the whole
    // request as "Invalid login" (535 BadCredentials).
    user: (process.env.EMAIL_USER || 'connectwithvexar@gmail.com').trim(),
    // Gmail app password — 16 chars. Spaces (both around the value and inside
    // it as Gmail prints them) are stripped here.
    pass: (process.env.EMAIL_PASSWORD || 'abcdefghijklmnop').replace(/\s+/g, ''),
  },
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG)
  }
  return transporter
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOTPEmail(
  email: string,
  otp: string,
  pending?: PendingSignup,
): Promise<boolean> {
  // Always store the OTP first so verification works even if the email send fails
  // (e.g. wrong app password in dev). The console log below makes the OTP
  // available in your dev terminal for testing.
  const expiresAt = Date.now() + 15 * 60 * 1000
  // Preserve any pending signup that was attached on a previous send (e.g.
  // when /resend-otp is called we don't re-pass it, but we still want to
  // create the user once the new code is verified).
  const existingPending = otpStore.get(email)?.pending
  otpStore.set(email, { otp, expiresAt, pending: pending ?? existingPending })
  cleanupExpiredOTPs()
  console.log(`[OTP] Code for ${email}: ${otp} (valid 15 min)`)

  try {
    const transporter = getTransporter()

    const senderAddress = EMAIL_CONFIG.auth.user

    // Image strategy:
    //  - If PUBLIC_BASE_URL is set (production), reference the mascot via an
    //    absolute https URL. This renders reliably in every webmail client
    //    (Gmail web, Gmail mobile, Outlook, Apple Mail, Yahoo).
    //  - If not set (local dev / no public URL), fall back to a CID inline
    //    attachment so the image still shows up.
    const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '')
      .replace(/\/+$/, '') // strip trailing slash
    const useHostedImage = publicBaseUrl.startsWith('http')

    const mascotSrc = useHostedImage
      ? `${publicBaseUrl}/images/ray-simple.png`
      : 'cid:ray-chatbot'

    const mailOptions: nodemailer.SendMailOptions = {
      from: `RAY by Vexar <${senderAddress}>`,
      to: email,
      replyTo: senderAddress,
      subject: 'Your RAY verification code',
      html: generateOTPEmailHTML(otp, email, mascotSrc),
      text:
        `Hi there,\n\n` +
        `Thanks for signing up with RAY.\n\n` +
        `Your verification code is: ${otp}\n\n` +
        `This code is valid for 15 minutes. Enter it on the verification page ` +
        `to finish setting up your account.\n\n` +
        `Security tip: RAY will never ask you to share this code with anyone. ` +
        `If you did not sign up for a RAY account, you can safely ignore this email — ` +
        `no account will be created.\n\n` +
        `Need help? Just reply to this email and we'll get back to you.\n\n` +
        `— The RAY Team at Vexar Tech`,
      headers: {
        'List-Unsubscribe': `<mailto:${senderAddress}?subject=unsubscribe>`,
        'X-Entity-Ref-ID': `ray-otp-${Date.now()}`,
      },
    }

    // Only attach the file when we're falling back to CID.
    if (!useHostedImage) {
      const mascotPath = path.join(process.cwd(), 'public', 'images', 'ray-simple.png')
      mailOptions.attachments = [
        {
          filename: 'ray-chatbot.png',
          path: mascotPath,
          cid: 'ray-chatbot',
        },
      ]
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`[OTP] Email sent to ${email} (image via ${useHostedImage ? 'URL' : 'CID'}):`, info.response)
    return true
  } catch (error) {
    console.error('[OTP] Failed to send email:', error)
    return false
  }
}

export function verifyOTP(email: string, otp: string): boolean {
  const stored = otpStore.get(email)
  if (!stored) {
    return false
  }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email)
    return false
  }
  if (stored.otp !== otp) {
    return false
  }
  otpStore.delete(email)
  return true
}

/**
 * Atomically verifies the OTP and returns the pending signup payload (if
 * any) so the API route can finish creating the user in the DB. Returns
 *   { ok: true, pending?: PendingSignup } on success
 *   { ok: false, reason: 'expired' | 'mismatch' | 'not_found' } otherwise.
 *
 * The entry is deleted from the store on success regardless of whether a
 * pending signup was attached, mirroring the original verifyOTP semantics.
 */
export function verifyOTPAndGetPending(
  email: string,
  otp: string,
): { ok: true; pending?: PendingSignup } | { ok: false; reason: 'expired' | 'mismatch' | 'not_found' } {
  const stored = otpStore.get(email)
  if (!stored) return { ok: false, reason: 'not_found' }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email)
    return { ok: false, reason: 'expired' }
  }
  if (stored.otp !== otp) return { ok: false, reason: 'mismatch' }
  otpStore.delete(email)
  return { ok: true, pending: stored.pending }
}

export function cleanupExpiredOTPs(): void {
  const now = Date.now()
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email)
    }
  }
}

export function resendOTP(email: string): string {
  const newOTP = generateOTP()
  sendOTPEmail(email, newOTP).catch((err) => {
    console.error('[OTP] Error resending:', err)
  })
  return newOTP
}

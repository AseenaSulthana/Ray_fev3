import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // prevents iOS auto-zoom on input focus
  userScalable: false,      // prevents pinch-to-zoom breaking the layout
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00B8D4' },
    { media: '(prefers-color-scheme: dark)',  color: '#1E1240' },
  ],
  viewportFit: 'cover',     // extends into notch / dynamic island area
}

export const metadata: Metadata = {
  title: 'RAY - AI Assistant',
  description:
    'RAY is an intelligent AI assistant that helps you navigate and understand complex information. Search through your knowledge base with confidence.',
  generator: 'v0.app',
  // PWA-like meta so "Add to Home Screen" looks polished
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RAY',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}

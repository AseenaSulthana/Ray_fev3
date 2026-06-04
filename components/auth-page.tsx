'use client'

import { useState } from 'react'
import LoginForm, { type LoginPayload } from './login-form'
import { authenticateUser } from '@/lib/auth-data'

interface AuthPageProps {
  onLoginSuccess: (user: any) => void
  onSwitchToSignup?: () => void
  onBack?: () => void
  notice?: string
}

export default function AuthPage({
  onLoginSuccess,
  onSwitchToSignup,
  onBack,
  notice,
}: AuthPageProps) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (payload: LoginPayload) => {
    setError('')
    setIsSubmitting(true)
    try {
      // authenticateUser hits /api/auth/login, which matches either username
      // or email — the same behaviour the original localStorage version had.
      const user = await authenticateUser(payload.username, payload.password)
      if (!user) {
        setError('Invalid username or password.')
        return
      }
      // The role dropdown is treated as the user's chosen view, but we
      // trust the server-returned role for authorization. If the user
      // picks a role that doesn't match their account, fall back to the
      // server role.
      const role =
        user.role === payload.role ? payload.role : user.role
      onLoginSuccess({ ...user, role })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LoginForm
        onSubmit={handleLogin}
        error={error}
        notice={notice}
        onSwitchToSignup={onSwitchToSignup}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

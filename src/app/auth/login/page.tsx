'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Scissors, Mail, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui'

type Mode = 'email' | 'otp'

const errorMessages: Record<string, string> = {
  no_user_record: 'Your account is not set up yet. Please contact support.',
  no_salon: 'No salon linked to your account. Please contact support.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const errorMessage = errorParam ? errorMessages[errorParam] : null

  const [mode, setMode] = useState<Mode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Welcome back!')
    router.refresh()
    router.push('/dashboard')
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '')
    const formattedPhone = phone.startsWith('+') ? phone : `+91${digits}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setOtpSent(true)
    toast.success('OTP sent to your phone!')
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '')
    const formattedPhone = phone.startsWith('+') ? phone : `+91${digits}`
    const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otpToken, type: 'sms' })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Welcome!')
    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Suite &apos;O&apos;</h1>
          <p className="text-sm text-muted-foreground mt-1">Salon Management Software</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5">
          <h2 className="text-lg font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-5">Access your salon dashboard</p>

          {errorMessage && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {errorMessage}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-5">
            <button
              onClick={() => setMode('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'email' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <Mail className="w-3.5 h-3.5" />Email
            </button>
            <button
              onClick={() => setMode('otp')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'otp' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              <Phone className="w-3.5 h-3.5" />OTP
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Password</label>
                  <Link href="/auth/reset-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full h-11 px-3 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
                {loading ? <Spinner className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                Sign in
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone number</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 h-11 bg-muted/40 border border-border rounded-xl text-sm text-muted-foreground">+91</span>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                    placeholder="98765 00000" disabled={otpSent}
                    className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                </div>
              </div>
              {otpSent && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">OTP Code</label>
                    <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-primary hover:underline">Change number</button>
                  </div>
                  <input
                    type="text" value={otpToken} onChange={e => setOtpToken(e.target.value)} required
                    placeholder="6-digit OTP" maxLength={6}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-lg tracking-widest font-bold"
                  />
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
                {loading ? <Spinner className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                {otpSent ? 'Verify OTP' : 'Send OTP'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:underline">Contact us to get started</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Spinner className="w-6 h-6" /></div>}>
      <LoginForm />
    </Suspense>
  )
}

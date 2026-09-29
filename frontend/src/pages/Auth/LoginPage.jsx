import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Navigate } from 'react-router-dom'
import { loginStep1, verifyOTP, clearError } from '../../store/slices/authSlice'
import { FiUser, FiLock, FiShield, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { loading, error, pendingOTP, pendingEmployeeId, otpMessage, isAuthenticated } = useSelector(s => s.auth)

  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword]     = useState('')
  const [otp, setOtp]               = useState(['', '', '', '', '', ''])
  const [showPass, setShowPass]      = useState(false)
  const [resending, setResending]    = useState(false)
  const [countdown, setCountdown]    = useState(0)

  // ── Redirect to dashboard when authenticated ──────────────
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => { if (error) dispatch(clearError()) }, [])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // Already logged in — redirect immediately
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleLogin = (e) => {
    e.preventDefault()
    dispatch(loginStep1({ employee_id: employeeId, password }))
  }

  const handleOTPChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus()
    }
  }

  const handleOTPKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus()
    }
  }

  const handleOTPPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) setOtp(paste.split(''))
  }

  const handleVerify = (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) return toast.error('Enter the 6-digit OTP')
    dispatch(verifyOTP({ employee_id: pendingEmployeeId, otp: code }))
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await axios.post('/api/auth/resend-otp/', { employee_id: pendingEmployeeId })
      toast.success('OTP resent to your email')
      setCountdown(60)
      setOtp(['', '', '', '', '', ''])
    } catch {
      toast.error('Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Left branding panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.logoBox}>
            <span style={styles.logoText}>A</span>
          </div>
          <h1 style={styles.brand}>ADANI POWER</h1>
          <p style={styles.brandSub}>Dahanu Thermal Power Station</p>
          <div style={styles.divider} />
          <h2 style={styles.appName}>E-Logbook System</h2>
          <p style={styles.appDesc}>
            Digital shift logbook management for AHP, Operations,
            Electrical, Mechanical & C&I departments.
          </p>
          <div style={styles.features}>
            {['Shift-wise Digital Entries','2-Step Secure Authentication','Role-Based Access Control','Supervisor Approval Workflow'].map(f => (
              <div key={f} style={styles.featureItem}>
                <span style={styles.featureDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <p style={styles.docNo}>ADTPS/AHP/OPN/F/01 | ADTPS/AHP/OPN/F/02</p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          {!pendingOTP ? (
            <>
              <div style={styles.formHeader}>
                <div style={styles.formIcon}><FiUser size={22} color="#0D3B6E" /></div>
                <div>
                  <h2 style={styles.formTitle}>Sign In</h2>
                  <p style={styles.formSub}>Use your Employee ID and password</p>
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Employee ID <span className="required">*</span></label>
                  <div style={styles.inputWrapper}>
                    <FiUser style={styles.inputIcon} />
                    <input
                      id="employee_id"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '38px' }}
                      placeholder="e.g. EMP-12345"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <div style={styles.inputWrapper}>
                    <FiLock style={styles.inputIcon} />
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      className="form-control"
                      style={{ paddingLeft: '38px', paddingRight: '38px' }}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      style={styles.eyeBtn}
                      onClick={() => setShowPass(v => !v)}
                    >
                      {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <a href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>
                    Forgot Password?
                  </a>
                </div>

                <button id="login-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner" /> Signing in…</> : <>Sign In</>}
                </button>
              </form>

              <div style={styles.securityNote}>
                <FiShield size={14} />
                <span>2-Step verification required after login</span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.formHeader}>
                <div style={{ ...styles.formIcon, background: '#E8F7EF' }}>
                  <FiShield size={22} color="var(--color-success)" />
                </div>
                <div>
                  <h2 style={styles.formTitle}>Verify OTP</h2>
                  <p style={styles.formSub}>{otpMessage || 'OTP sent to your registered email'}</p>
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleVerify}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                    Enter the 6-digit OTP code
                  </p>
                  <div style={styles.otpRow} onPaste={handleOTPPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength={1}
                        style={styles.otpInput}
                        value={digit}
                        onChange={e => handleOTPChange(e.target.value, i)}
                        onKeyDown={e => handleOTPKeyDown(e, i)}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <button id="verify-otp-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner" /> Verifying…</> : 'Verify & Login'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  {countdown > 0 ? (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      Resend OTP in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleResend}
                      disabled={resending}
                    >
                      <FiRefreshCw size={13} />
                      {resending ? 'Sending…' : 'Resend OTP'}
                    </button>
                  )}
                </div>
              </form>

              <button
                type="button"
                style={{ ...styles.securityNote, cursor: 'pointer', border: 'none', background: 'none', width: '100%', marginTop: '12px' }}
                onClick={() => window.location.reload()}
              >
                ← Back to Login
              </button>
            </>
          )}
        </div>

        <p style={styles.footer}>
          © 2024 Adani Power Limited – Dahanu Thermal Power Station<br />
          <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Authorized Personnel Only</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F5F6FA',
  },
  left: {
    width: '45%',
    background: 'linear-gradient(145deg, #092C55 0%, #0D3B6E 50%, #1A5B9E 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    position: 'relative',
    overflow: 'hidden',
  },
  leftInner: {
    position: 'relative',
    zIndex: 1,
    color: 'white',
    maxWidth: '400px',
  },
  logoBox: {
    width: '64px', height: '64px',
    background: '#E8A317',
    borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '24px',
    boxShadow: '0 8px 20px rgba(232,163,23,0.4)',
  },
  logoText: { fontSize: '2rem', fontWeight: '900', color: 'white' },
  brand: { fontSize: '1.75rem', fontWeight: '800', color: 'white', marginBottom: '4px' },
  brandSub: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' },
  divider: { width: '48px', height: '3px', background: '#E8A317', borderRadius: '2px', marginBottom: '24px' },
  appName: { fontSize: '1.25rem', fontWeight: '700', color: 'white', marginBottom: '12px' },
  appDesc: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7', marginBottom: '24px' },
  features: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' },
  featureItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' },
  featureDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#E8A317', flexShrink: 0 },
  docNo: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 32px',
    background: '#F5F6FA',
  },
  formCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    border: '1px solid #E8ECF2',
  },
  formHeader: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' },
  formIcon: {
    width: '48px', height: '48px',
    background: '#EBF1FB',
    borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  formTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1A2332', marginBottom: '4px' },
  formSub: { fontSize: '0.8125rem', color: '#718096' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' },
  eyeBtn: {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0', padding: '4px',
  },
  otpRow: { display: 'flex', gap: '10px', justifyContent: 'center' },
  otpInput: {
    width: '48px', height: '56px',
    textAlign: 'center',
    fontSize: '1.375rem',
    fontWeight: '700',
    fontFamily: 'var(--font-mono)',
    border: '2px solid #D1D9E0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#1A2332',
  },
  securityNote: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', marginTop: '16px',
    fontSize: '0.75rem', color: '#718096',
  },
  footer: {
    marginTop: '32px', textAlign: 'center',
    fontSize: '0.75rem', color: '#A0AEC0', lineHeight: '1.8',
  },
}

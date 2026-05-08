import { useState } from 'react'
import { registerUser, loginUser } from '../utils/api'
import styles from './AuthPage.module.css'

export default function AuthPage({ onAuth }) {
  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let data
      if (mode === 'register') {
        if (!name.trim()) { setError('Name is required.'); setLoading(false); return }
        data = await registerUser({ name, email, password })
      } else {
        data = await loginUser({ email, password })
      }
      localStorage.setItem('token', data.access_token)
      onAuth({ name: data.name, email: data.email })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✉</span>
          <span className={styles.logoText}>MailCraft <span className={styles.badge}>AI</span></span>
        </div>

        <h1 className={styles.title}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Sign in to generate AI-powered emails' : 'Start generating professional emails with AI'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Full name</label>
              <input
                className={styles.input}
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>⚠ {error}</div>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading
              ? <><span className={styles.spinner} /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login' ? 'Sign in' : 'Create account'
            }
          </button>
        </form>

        <div className={styles.switchRow}>
          <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
          <button className={styles.switchBtn} onClick={switchMode} type="button">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>⚡</div>
        <h1 style={styles.title}>Hola de nuevo!</h1>
        <p style={styles.subtitle}>Inicia sesión para seguir estudiando</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={styles.footer}>
          Aún no tienes una cuenta?{' '}
          <Link href="/signup" style={styles.link}>Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'radial-gradient(ellipse at top, #1a1a2e 0%, var(--background) 60%)',
  },
  card: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  logo: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--muted)',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--foreground)',
  },
  input: {
    background: 'var(--background)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: 'var(--foreground)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  },
  error: {
    color: 'var(--error)',
    fontSize: '0.875rem',
    padding: '0.75rem',
    background: 'rgba(255, 107, 107, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 107, 107, 0.2)',
  },
  button: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    transition: 'background 0.2s, transform 0.1s',
  },
  footer: {
    textAlign: 'center',
    marginTop: '1.5rem',
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  link: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: '500',
  },
}
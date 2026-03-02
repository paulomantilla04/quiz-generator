'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import Image from 'next/image'
import { motion } from 'framer-motion' // 1. Importamos motion

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
      {/* 2. Convertimos el contenedor de la tarjeta en un motion.div */}
      <motion.div 
        style={styles.card}
        initial={{ opacity: 0, y: 40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo animado con efecto "spring" (resorte) */}
        <motion.div 
          style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 15 }}
        >
          <Image 
            src="/logo.svg" 
            alt="Quiz Generator Logo" 
            width={200} 
            height={200} 
            priority
          />
        </motion.div>

        {/* Textos que aparecen en cascada */}
        <motion.h1 
          style={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Hola de nuevo!
        </motion.h1>
        
        <motion.p 
          style={styles.subtitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Inicia sesión para seguir estudiando
        </motion.p>

        <form onSubmit={handleLogin} style={styles.form}>
          <motion.div 
            style={styles.field}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
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
          </motion.div>

          <motion.div 
            style={styles.field}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
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
          </motion.div>

          {error && (
            <motion.p 
              style={styles.error}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.p>
          )}

          {/* Botón con hover y tap para interactividad */}
          <motion.button 
            type="submit" 
            disabled={loading} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </motion.button>
        </form>

        <motion.p 
          style={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Aún no tienes una cuenta?{' '}
          <Link href="/signup" style={styles.link}>Regístrate</Link>
        </motion.p>
      </motion.div>
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
    /* Quitamos la transición de CSS tradicional de transform ya que Framer Motion lo manejará */
    transition: 'background 0.2s', 
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
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../app/lib/supabase/client'

interface Material {
  id: string
  title: string
  file_name: string
}

export default function QuizSetup({ material }: { material: Material }) {
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleStart() {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create quiz record
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          user_id: user.id,
          material_id: material.id,
          title: `${material.title} Quiz`,
          question_count: questionCount,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Create attempt record
      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .insert({
          user_id: user.id,
          quiz_id: quiz.id,
          total_questions: questionCount,
          performance_data: {
            currentDifficulty: 3,
            correctStreak: 0,
            incorrectStreak: 0,
            weakTopics: [],
            answeredCount: 0,
          }
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      router.push(`/quiz/${quiz.id}/attempt/${attempt.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <a href="/dashboard" style={styles.back}>← Volver</a>

        <div style={styles.icon}>🧠</div>
        <h1 style={styles.title}>Listo para el quiz?</h1>
        <p style={styles.subtitle}>{material.title}</p>

        <div style={styles.section}>
          <label style={styles.label}>Número de preguntas</label>
          <div style={styles.options}>
            {[5, 10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  ...styles.optionButton,
                  background: questionCount === n ? 'var(--primary)' : 'var(--background)',
                  color: questionCount === n ? 'white' : 'var(--muted)',
                  borderColor: questionCount === n ? 'var(--primary)' : 'var(--card-border)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            🎯 <strong>Generación en bloque</strong> — Se generarán todas las preguntas de una sola vez analizando el material completo. El proceso puede tomar unos segundos extra al iniciar.          </p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            ...styles.startButton,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Configurando Quiz...' : 'Iniciar Quiz →'}
        </button>
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
    padding: '1.5rem',
    background: 'radial-gradient(ellipse at top, #1a1a2e 0%, var(--background) 60%)',
  },
  card: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  back: {
    color: 'var(--muted)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'block',
    marginBottom: '1.5rem',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--muted)',
    marginBottom: '2rem',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.75rem',
  },
  options: {
    display: 'flex',
    gap: '0.75rem',
  },
  optionButton: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  infoBox: {
    background: 'rgba(108, 99, 255, 0.1)',
    border: '1px solid rgba(108, 99, 255, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  infoText: {
    fontSize: '0.875rem',
    color: 'var(--foreground)',
    lineHeight: '1.5',
  },
  error: {
    color: 'var(--error)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  startButton: {
    width: '100%',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
}
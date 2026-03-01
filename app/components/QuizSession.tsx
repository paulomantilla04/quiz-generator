'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'

interface Question {
  id?: string
  question_text: string
  options: string[]
  correct_answer: string
  topic: string
  difficulty: number
}

interface PerformanceData {
  currentDifficulty: number
  correctStreak: number
  incorrectStreak: number
  weakTopics: string[]
  answeredCount: number
}

interface Attempt {
  id: string
  quiz_id: string
  total_questions: number
  performance_data: PerformanceData
}

interface Quiz {
  id: string
  title: string
  question_count: number
  material_id: string
  materials: { id: string; title: string }
}

export default function QuizSession({
  quiz,
  attempt,
}: {
  quiz: Quiz
  attempt: Attempt
}) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [performance, setPerformance] = useState<PerformanceData>(
    attempt.performance_data
  )
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  const [coveredTopics, setCoveredTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const answeredCount = performance.answeredCount
  const totalQuestions = quiz.question_count
  const progress = (answeredCount / totalQuestions) * 100

  const difficultyLabel = (d: number) => {
    if (d <= 2) return { label: 'Easy', color: 'var(--success)' }
    if (d === 3) return { label: 'Medium', color: '#ffd963' }
    return { label: 'Hard', color: 'var(--error)' }
  }

  const fetchNextQuestion = useCallback(async (perf: PerformanceData) => {
    setLoading(true)
    setError('')
    setSelectedAnswer(null)
    setIsAnswered(false)
    setIsCorrect(null)
    setSavedQuestionId(null)

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: quiz.material_id,
          count: 1,
          difficulty: perf.currentDifficulty,
          weakTopics: perf.weakTopics,
          previousQuestions: askedQuestions,
          previousTopics: coveredTopics,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const question = data.questions[0]

      // Save question to DB
      const { data: savedQ } = await supabase
        .from('questions')
        .insert({
          quiz_id: quiz.id,
          attempt_id: attempt.id,
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answer,
          topic: question.topic,
          difficulty: question.difficulty ?? perf.currentDifficulty,
        })
        .select()
        .single()

      setSavedQuestionId(savedQ?.id ?? null)
      setCurrentQuestion(question)
      setAskedQuestions(prev => [...prev, question.question_text])
      if (question.topic) {
        setCoveredTopics(prev => [...prev, question.topic])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }, [quiz.material_id, quiz.id, attempt.id, supabase])

  useEffect(() => {
    fetchNextQuestion(performance)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Adaptive engine — updates difficulty and weak topics based on answer
  function updatePerformance(wasCorrect: boolean, topic: string): PerformanceData {
    const p = { ...performance }
    p.answeredCount += 1

    if (wasCorrect) {
      p.correctStreak += 1
      p.incorrectStreak = 0
      // 3 correct in a row → increase difficulty
      if (p.correctStreak >= 3) {
        p.currentDifficulty = Math.min(5, p.currentDifficulty + 1)
        p.correctStreak = 0
      }
    } else {
      p.incorrectStreak += 1
      p.correctStreak = 0
      // Add to weak topics if not already there
      if (!p.weakTopics.includes(topic)) {
        p.weakTopics = [...p.weakTopics.slice(-4), topic] // keep last 5
      }
      // 2 incorrect in a row → decrease difficulty
      if (p.incorrectStreak >= 2) {
        p.currentDifficulty = Math.max(1, p.currentDifficulty - 1)
        p.incorrectStreak = 0
      }
    }

    return p
  }

  async function handleAnswer(option: string) {
    if (isAnswered || !currentQuestion) return
    setSelectedAnswer(option)
    setIsAnswered(true)

    const correct = option === currentQuestion.correct_answer
    setIsCorrect(correct)

    const newPerformance = updatePerformance(correct, currentQuestion.topic)
    setPerformance(newPerformance)

    // Save answer to DB
    if (savedQuestionId) {
      await supabase.from('answers').insert({
        attempt_id: attempt.id,
        question_id: savedQuestionId,
        user_answer: option,
        is_correct: correct,
      })
    }

    // Update attempt performance in DB
    await supabase
      .from('attempts')
      .update({ performance_data: newPerformance })
      .eq('id', attempt.id)
  }

  async function handleNext() {
    if (performance.answeredCount >= totalQuestions) {
      await finishQuiz()
      return
    }
    fetchNextQuestion(performance)
  }

  async function finishQuiz() {
    setSubmitting(true)

    const { data: answers } = await supabase
      .from('answers')
      .select('is_correct')
      .eq('attempt_id', attempt.id)

    const correct = answers?.filter(a => a.is_correct).length ?? 0
    const score = Math.round((correct / totalQuestions) * 100)

    await supabase
      .from('attempts')
      .update({
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id)

    router.push(`/quiz/${quiz.id}/results/${attempt.id}`)
  }

  const diff = difficultyLabel(performance.currentDifficulty)
  const isLastQuestion = performance.answeredCount >= totalQuestions

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <a href="/dashboard" style={styles.back}>← Exit</a>
        <span style={styles.quizTitle}>{quiz.title}</span>
        <span style={{ ...styles.diffBadge, color: diff.color, borderColor: diff.color }}>
          {diff.label}
        </span>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.main}>
        <div style={styles.meta}>
          <span style={styles.metaText}>
            Question {Math.min(answeredCount + 1, totalQuestions)} of {totalQuestions}
          </span>
          {performance.weakTopics.length > 0 && (
            <span style={styles.weakTag}>
              📌 Focusing on weak areas
            </span>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Generating your question...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
            <button onClick={() => fetchNextQuestion(performance)} style={styles.retryButton}>
              Try again
            </button>
          </div>
        ) : currentQuestion ? (
          <div style={styles.questionCard}>
            <p style={styles.topicTag}>{currentQuestion.topic}</p>
            <h2 style={styles.questionText}>{currentQuestion.question_text}</h2>

            <div style={styles.options}>
              {currentQuestion.options.map((option) => {
                let bg = 'var(--background)'
                let border = 'var(--card-border)'
                let color = 'var(--foreground)'

                if (isAnswered) {
                  if (option === currentQuestion.correct_answer) {
                    bg = 'rgba(99, 255, 180, 0.1)'
                    border = 'var(--success)'
                    color = 'var(--success)'
                  } else if (option === selectedAnswer && !isCorrect) {
                    bg = 'rgba(255, 107, 107, 0.1)'
                    border = 'var(--error)'
                    color = 'var(--error)'
                  }
                } else if (option === selectedAnswer) {
                  border = 'var(--primary)'
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    style={{
                      ...styles.optionButton,
                      background: bg,
                      borderColor: border,
                      color,
                      cursor: isAnswered ? 'default' : 'pointer',
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {isAnswered && (
              <div style={{
                ...styles.feedback,
                background: isCorrect
                  ? 'rgba(99, 255, 180, 0.1)'
                  : 'rgba(255, 107, 107, 0.1)',
                borderColor: isCorrect ? 'var(--success)' : 'var(--error)',
              }}>
                <p style={{
                  color: isCorrect ? 'var(--success)' : 'var(--error)',
                  fontWeight: '600',
                  marginBottom: '0.25rem',
                }}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {!isCorrect && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                    Correct answer: {currentQuestion.correct_answer}
                  </p>
                )}
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  style={styles.nextButton}
                >
                  {submitting
                    ? 'Finishing...'
                    : isLastQuestion
                    ? 'See Results →'
                    : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'var(--background)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--card-border)',
    background: 'var(--card)',
  },
  back: {
    color: 'var(--muted)',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
  quizTitle: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: 'var(--foreground)',
  },
  diffBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid',
    borderRadius: '20px',
    padding: '0.2rem 0.6rem',
  },
  progressBar: {
    height: '3px',
    background: 'var(--card-border)',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary)',
    transition: 'width 0.4s ease',
  },
  main: {
    flex: 1,
    maxWidth: '680px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    width: '100%',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  metaText: {
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  weakTag: {
    fontSize: '0.75rem',
    color: '#ffd963',
    background: 'rgba(255, 217, 99, 0.1)',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    border: '1px solid rgba(255, 217, 99, 0.3)',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--card-border)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--muted)',
    fontSize: '0.875rem',
  },
  errorBox: {
    textAlign: 'center',
    padding: '3rem',
  },
  errorText: {
    color: 'var(--error)',
    marginBottom: '1rem',
  },
  retryButton: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  questionCard: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '2rem',
  },
  topicTag: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  },
  questionText: {
    fontSize: '1.2rem',
    fontWeight: '600',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  optionButton: {
    textAlign: 'left',
    padding: '1rem 1.25rem',
    border: '1px solid',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.15s',
    lineHeight: '1.4',
  },
  feedback: {
    marginTop: '1.25rem',
    padding: '1.25rem',
    borderRadius: '10px',
    border: '1px solid',
  },
  nextButton: {
    marginTop: '0.75rem',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
}
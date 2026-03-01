'use client'

import { useRouter } from 'next/navigation'

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
  topic: string
  difficulty: number
}

interface Answer {
  question_id: string
  user_answer: string
  is_correct: boolean
}

interface Attempt {
  id: string
  score: number
  total_questions: number
  performance_data: {
    weakTopics: string[]
    currentDifficulty: number
  }
  completed_at: string
}

interface Quiz {
  id: string
  title: string
  material_id: string
  materials: { id: string; title: string }
}

export default function ResultsView({
  attempt,
  quiz,
  questions,
  answers,
}: {
  attempt: Attempt
  quiz: Quiz
  questions: Question[]
  answers: Answer[]
}) {
  const router = useRouter()
  const score = attempt.score ?? 0
  const total = attempt.total_questions
  const correct = answers.filter(a => a.is_correct).length

  const scoreColor =
    score >= 80 ? 'var(--success)' :
    score >= 50 ? '#ffd963' :
    'var(--error)'

  const scoreEmoji =
    score >= 80 ? '🎉' :
    score >= 50 ? '📚' :
    '💪'

  const answerMap = new Map(answers.map(a => [a.question_id, a]))

  return (
    <div style={styles.container}>
      {/* Score card */}
      <div style={styles.scoreCard}>
        <div style={styles.emoji}>{scoreEmoji}</div>
        <h1 style={styles.title}>Quiz Complete!</h1>
        <p style={styles.subtitle}>{quiz.title}</p>

        <div style={{ ...styles.scoreBig, color: scoreColor }}>
          {score}%
        </div>

        <p style={styles.scoreDetail}>
          {correct} out of {total} correct
        </p>

        {attempt.performance_data.weakTopics.length > 0 && (
          <div style={styles.weakBox}>
            <p style={styles.weakTitle}>📌 Topics to review:</p>
            <div style={styles.weakTags}>
              {attempt.performance_data.weakTopics.map(topic => (
                <span key={topic} style={styles.weakTag}>{topic}</span>
              ))}
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => router.push(`/quiz/new?material=${quiz.material_id}`)}
            style={styles.primaryButton}
          >
            Retake Quiz
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={styles.secondaryButton}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Question review */}
      <div style={styles.reviewSection}>
        <h2 style={styles.reviewTitle}>Question Review</h2>
        <div style={styles.questionList}>
          {questions.map((q, i) => {
            const answer = answerMap.get(q.id)
            const wasCorrect = answer?.is_correct ?? false

            return (
              <div
                key={q.id}
                style={{
                  ...styles.questionCard,
                  borderColor: wasCorrect
                    ? 'rgba(99, 255, 180, 0.3)'
                    : 'rgba(255, 107, 107, 0.3)',
                }}
              >
                <div style={styles.questionHeader}>
                  <span style={styles.questionNum}>Q{i + 1}</span>
                  <span style={{
                    ...styles.resultBadge,
                    background: wasCorrect
                      ? 'rgba(99, 255, 180, 0.1)'
                      : 'rgba(255, 107, 107, 0.1)',
                    color: wasCorrect ? 'var(--success)' : 'var(--error)',
                  }}>
                    {wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <p style={styles.questionText}>{q.question_text}</p>
                <p style={styles.topicTag}>{q.topic}</p>

                {!wasCorrect && answer && (
                  <div style={styles.answerDetail}>
                    <p style={styles.wrongAnswer}>
                      Your answer: {answer.user_answer}
                    </p>
                    <p style={styles.correctAnswer}>
                      Correct: {q.correct_answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
  },
  scoreCard: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '2.5rem',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  emoji: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--muted)',
    marginBottom: '1.5rem',
    textTransform: 'capitalize',
  },
  scoreBig: {
    fontSize: '4rem',
    fontWeight: '800',
    lineHeight: 1,
    marginBottom: '0.5rem',
  },
  scoreDetail: {
    color: 'var(--muted)',
    marginBottom: '1.5rem',
  },
  weakBox: {
    background: 'rgba(255, 217, 99, 0.08)',
    border: '1px solid rgba(255, 217, 99, 0.2)',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.5rem',
    textAlign: 'left',
  },
  weakTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffd963',
    marginBottom: '0.5rem',
  },
  weakTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  weakTag: {
    background: 'rgba(255, 217, 99, 0.1)',
    border: '1px solid rgba(255, 217, 99, 0.3)',
    borderRadius: '20px',
    padding: '0.2rem 0.75rem',
    fontSize: '0.8rem',
    color: '#ffd963',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  reviewSection: {
    marginTop: '1rem',
  },
  reviewTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.25rem',
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  questionCard: {
    background: 'var(--card)',
    border: '1px solid',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  questionNum: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--muted)',
  },
  resultBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
  },
  questionText: {
    fontSize: '0.95rem',
    fontWeight: '500',
    lineHeight: '1.5',
    marginBottom: '0.5rem',
  },
  topicTag: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  answerDetail: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(255, 107, 107, 0.05)',
    borderRadius: '8px',
  },
  wrongAnswer: {
    fontSize: '0.875rem',
    color: 'var(--error)',
    marginBottom: '0.25rem',
  },
  correctAnswer: {
    fontSize: '0.875rem',
    color: 'var(--success)',
  },
}
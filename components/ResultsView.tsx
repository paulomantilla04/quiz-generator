'use client'

import { useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'

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

// Variantes para la animación en cascada de la lista de preguntas
const listVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Tiempo entre cada pregunta
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
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
      {/* Score card principal animada */}
      <motion.div 
        style={styles.scoreCard}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div 
          style={styles.emoji}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
        >
          {scoreEmoji}
        </motion.div>
        
        <motion.h1 
          style={styles.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Quiz Completado!
        </motion.h1>
        
        <motion.p 
          style={styles.subtitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {quiz.title}
        </motion.p>

        {/* Puntuación animada */}
        <motion.div 
          style={{ ...styles.scoreBig, color: scoreColor }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
        >
          {score}%
        </motion.div>

        <motion.p 
          style={styles.scoreDetail}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {correct} de {total} correctas
        </motion.p>

        {attempt.performance_data.weakTopics.length > 0 && (
          <motion.div 
            style={styles.weakBox}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p style={styles.weakTitle}>📌 Temas revisados:</p>
            <div style={styles.weakTags}>
              {attempt.performance_data.weakTopics.map((topic, i) => (
                <motion.span 
                  key={topic} 
                  style={styles.weakTag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                >
                  {topic}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div 
          style={styles.actions}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/quiz/new?material=${quiz.material_id}`)}
            style={styles.primaryButton}
          >
            Retomar Quiz
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')}
            style={styles.secondaryButton}
          >
            Dashboard
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Question review con animación en cascada */}
      <motion.div 
        style={styles.reviewSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }} // Empieza después de que la tarjeta de puntuación termine
      >
        <h2 style={styles.reviewTitle}>Revisión de preguntas</h2>
        <motion.div 
          style={styles.questionList}
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {questions.map((q, i) => {
            const answer = answerMap.get(q.id)
            const wasCorrect = answer?.is_correct ?? false

            return (
              <motion.div
                key={q.id}
                variants={cardVariants}
                style={{
                  ...styles.questionCard,
                  borderColor: wasCorrect
                    ? 'rgba(99, 255, 180, 0.3)'
                    : 'rgba(255, 107, 107, 0.3)',
                }}
              >
                <div style={styles.questionHeader}>
                  <span style={styles.questionNum}>P{i + 1}</span>
                  <span style={{
                    ...styles.resultBadge,
                    background: wasCorrect
                      ? 'rgba(99, 255, 180, 0.1)'
                      : 'rgba(255, 107, 107, 0.1)',
                    color: wasCorrect ? 'var(--success)' : 'var(--error)',
                  }}>
                    {wasCorrect ? '✓ Correcto' : '✗ Incorrecto'}
                  </span>
                </div>

                <p style={styles.questionText}>{q.question_text}</p>
                <p style={styles.topicTag}>{q.topic}</p>

                {!wasCorrect && answer && (
                  <div style={styles.answerDetail}>
                    <p style={styles.wrongAnswer}>
                      Tu respuesta: {answer.user_answer}
                    </p>
                    <p style={styles.correctAnswer}>
                      Respuesta correcta: {q.correct_answer}
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
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
    display: 'inline-block', // Necesario para que la rotación de framer-motion funcione bien en emojis
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
    display: 'inline-block', // Ayuda a que el escalado sea fluido desde el centro
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
    display: 'inline-block',
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
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../app/lib/supabase/client";

interface Question {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  topic: string;
  difficulty: number;
}

interface PerformanceData {
  currentDifficulty: number;
  correctStreak: number;
  incorrectStreak: number;
  weakTopics: string[];
  answeredCount: number;
}

interface Attempt {
  id: string;
  quiz_id: string;
  total_questions: number;
  performance_data: PerformanceData;
}

interface Quiz {
  id: string;
  title: string;
  question_count: number;
  material_id: string;
  materials: { id: string; title: string };
}

export default function QuizSession({
  quiz,
  attempt,
}: {
  quiz: Quiz;
  attempt: Attempt;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [performance, setPerformance] = useState<PerformanceData>(
    attempt.performance_data,
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const initialized = useRef(false)

  const router = useRouter();
  const supabase = createClient();

  const answeredCount = performance.answeredCount;
  const totalQuestions = quiz.question_count;
  const progress = (answeredCount / totalQuestions) * 100;

  const currentQuestion = questions[currentIndex];

  const fetchAllQuestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Verificar si ya hay preguntas generadas para este intento (por si recarga la página)
      const { data: existingQuestions } = await supabase
        .from("questions")
        .select("*")
        .eq("attempt_id", attempt.id)
        .order("created_at", { ascending: true });

      if (existingQuestions && existingQuestions.length > 0) {
        setQuestions(existingQuestions);
        setCurrentIndex(performance.answeredCount);
        setLoading(false);
        return;
      }

      // 2. Si no existen, llamar a la API para generar TODAS de una vez
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: quiz.material_id,
          count: totalQuestions,
          difficulty: performance.currentDifficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 3. Guardar todas las preguntas en la base de datos de un solo golpe
      const questionsToInsert = data.questions.map((q: Question) => ({
        quiz_id: quiz.id,
        attempt_id: attempt.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        topic: q.topic,
        difficulty: q.difficulty ?? performance.currentDifficulty,
      }));

      const { data: savedQs, error: insertError } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select();

      if (insertError) throw insertError;

      setQuestions(savedQs || []);
      setCurrentIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [
    quiz.material_id,
    quiz.id,
    attempt.id,
    supabase,
    totalQuestions,
    performance.answeredCount,
    performance.currentDifficulty,
  ]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      fetchAllQuestions();
    }
  }, [fetchAllQuestions]); 

  async function handleAnswer(option: string) {
    if (isAnswered || !currentQuestion) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const correct = option === currentQuestion.correct_answer;
    setIsCorrect(correct);

    // Actualizar progreso
    const newPerformance = {
      ...performance,
      answeredCount: performance.answeredCount + 1,
    };
    setPerformance(newPerformance);

    // Guardar respuesta en la BD
    if (currentQuestion.id) {
      await supabase.from("answers").insert({
        attempt_id: attempt.id,
        question_id: currentQuestion.id,
        user_answer: option,
        is_correct: correct,
      });
    }

    // Actualizar progreso del intento
    await supabase
      .from("attempts")
      .update({ performance_data: newPerformance })
      .eq("id", attempt.id);
  }

  async function handleNext() {
    if (currentIndex + 1 >= totalQuestions) {
      await finishQuiz();
      return;
    }
    // Avanzar a la siguiente pregunta localmente
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
  }

  async function finishQuiz() {
    setSubmitting(true);

    const { data: answers } = await supabase
      .from("answers")
      .select("is_correct")
      .eq("attempt_id", attempt.id);

    const correct = answers?.filter((a) => a.is_correct).length ?? 0;
    const score = Math.round((correct / totalQuestions) * 100);

    await supabase
      .from("attempts")
      .update({
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    router.push(`/quiz/${quiz.id}/results/${attempt.id}`);
  }

  const isLastQuestion = currentIndex + 1 >= totalQuestions;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <a href="/dashboard" style={styles.back}>
          ← Exit
        </a>
        <span style={styles.quizTitle}>{quiz.title}</span>
        <span
          style={{
            ...styles.diffBadge,
            color: "var(--primary)",
            borderColor: "var(--primary)",
          }}
        >
          Quiz Mode
        </span>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.main}>
        <div style={styles.meta}>
          <span style={styles.metaText}>
            Pregunta {Math.min(answeredCount + 1, totalQuestions)} de{" "}
            {totalQuestions}
          </span>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>
              Generando todas tus preguntas (esto puede tomar unos segundos)...
            </p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
            <button
              onClick={() => fetchAllQuestions()}
              style={styles.retryButton}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : currentQuestion ? (
          <div style={styles.questionCard}>
            <p style={styles.topicTag}>{currentQuestion.topic}</p>
            <h2 style={styles.questionText}>{currentQuestion.question_text}</h2>

            <div style={styles.options}>
              {currentQuestion.options.map((option) => {
                let bg = "var(--background)";
                let border = "var(--card-border)";
                let color = "var(--foreground)";

                if (isAnswered) {
                  if (option === currentQuestion.correct_answer) {
                    bg = "rgba(99, 255, 180, 0.1)";
                    border = "var(--success)";
                    color = "var(--success)";
                  } else if (option === selectedAnswer && !isCorrect) {
                    bg = "rgba(255, 107, 107, 0.1)";
                    border = "var(--error)";
                    color = "var(--error)";
                  }
                } else if (option === selectedAnswer) {
                  border = "var(--primary)";
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
                      cursor: isAnswered ? "default" : "pointer",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div
                style={{
                  ...styles.feedback,
                  background: isCorrect
                    ? "rgba(99, 255, 180, 0.1)"
                    : "rgba(255, 107, 107, 0.1)",
                  borderColor: isCorrect ? "var(--success)" : "var(--error)",
                }}
              >
                <p
                  style={{
                    color: isCorrect ? "var(--success)" : "var(--error)",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  {isCorrect ? "✓ ¡Correcto!" : "✗ Incorrecto"}
                </p>
                {!isCorrect && (
                  <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                    Respuesta correcta: {currentQuestion.correct_answer}
                  </p>
                )}
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  style={styles.nextButton}
                >
                  {submitting
                    ? "Finalizando..."
                    : isLastQuestion
                      ? "Ver Resultados →"
                      : "Siguiente Pregunta →"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "var(--background)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid var(--card-border)",
    background: "var(--card)",
  },
  back: { color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" },
  quizTitle: {
    fontWeight: "600",
    fontSize: "0.875rem",
    color: "var(--foreground)",
  },
  diffBadge: {
    fontSize: "0.75rem",
    fontWeight: "600",
    border: "1px solid",
    borderRadius: "20px",
    padding: "0.2rem 0.6rem",
  },
  progressBar: { height: "3px", background: "var(--card-border)" },
  progressFill: {
    height: "100%",
    background: "var(--primary)",
    transition: "width 0.4s ease",
  },
  main: {
    flex: 1,
    maxWidth: "680px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
    width: "100%",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  metaText: { color: "var(--muted)", fontSize: "0.875rem" },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "4rem",
    gap: "1rem",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--card-border)",
    borderTop: "3px solid var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "var(--muted)", fontSize: "0.875rem" },
  errorBox: { textAlign: "center", padding: "3rem" },
  errorText: { color: "var(--error)", marginBottom: "1rem" },
  retryButton: {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1.25rem",
    cursor: "pointer",
    fontWeight: "600",
  },
  questionCard: {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "16px",
    padding: "2rem",
  },
  topicTag: {
    fontSize: "0.75rem",
    color: "var(--primary)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "1rem",
  },
  questionText: {
    fontSize: "1.2rem",
    fontWeight: "600",
    lineHeight: "1.6",
    marginBottom: "1.5rem",
  },
  options: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  optionButton: {
    textAlign: "left",
    padding: "1rem 1.25rem",
    border: "1px solid",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "all 0.15s",
    lineHeight: "1.4",
  },
  feedback: {
    marginTop: "1.25rem",
    padding: "1.25rem",
    borderRadius: "10px",
    border: "1px solid",
  },
  nextButton: {
    marginTop: "0.75rem",
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

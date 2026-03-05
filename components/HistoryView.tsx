"use client";

import { useState } from "react";
import { FaChartBar } from "react-icons/fa";
import { motion, Variants, AnimatePresence } from "framer-motion";

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  performance_data: {
    weakTopics: string[];
    currentDifficulty: number;
  };
  quizzes: {
    id: string;
    title: string;
    question_count: number;
    materials: {
      id: string;
      title: string;
    };
  };
}

// Variantes para animaciones en cascada
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function HistoryView({ attempts }: { attempts: Attempt[] }) {
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");

  const filtered = attempts.filter((a) => {
    if (filter === "good") return a.score >= 70;
    if (filter === "bad") return a.score < 70;
    return true;
  });

  const avgScore = attempts.length
    ? Math.round(
        attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
      )
    : 0;

  const bestScore = attempts.length
    ? Math.max(...attempts.map((a) => a.score))
    : 0;

  const scoreColor = (score: number) =>
    score >= 80 ? "var(--success)" : score >= 50 ? "#ffd963" : "var(--error)";

  const difficultyLabel = (d: number) =>
    d <= 2 ? "Easy" : d === 3 ? "Medium" : "Hard";

  return (
    <div style={styles.container}>
      <motion.div 
        style={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={styles.title}>Historial</h1>
          <p style={styles.subtitle}>
            {attempts.length
              ? `${attempts.length} quiz${attempts.length > 1 ? "zes" : ""} completado${attempts.length > 1 ? "s" : ""}`
              : "No hay ningún quiz completado aún."}
          </p>
        </div>
      </motion.div>

      {attempts.length > 0 && (
        <>
          {/* Stats row con animación en cascada */}
          <motion.div 
            style={styles.statsRow}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} style={styles.statCard}>
              <p style={styles.statLabel}>Quizzes tomados</p>
              <p style={styles.statValue}>{attempts.length}</p>
            </motion.div>
            <motion.div variants={fadeUp} style={styles.statCard}>
              <p style={styles.statLabel}>Puntuación promedio</p>
              <p style={{ ...styles.statValue, color: scoreColor(avgScore) }}>
                {avgScore}%
              </p>
            </motion.div>
            <motion.div variants={fadeUp} style={styles.statCard}>
              <p style={styles.statLabel}>Mejor puntuación</p>
              <p style={{ ...styles.statValue, color: scoreColor(bestScore) }}>
                {bestScore}%
              </p>
            </motion.div>
            <motion.div variants={fadeUp} style={styles.statCard}>
              <p style={styles.statLabel}>Materiales estudiados</p>
              <p style={styles.statValue}>
                {new Set(attempts.map((a) => a.quizzes?.materials?.id)).size}
              </p>
            </motion.div>
          </motion.div>

          {/* Score timeline */}
          <motion.div 
            style={styles.timelineCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <p style={styles.timelineTitle}>Historial de puntuación</p>
            <div style={styles.chart}>
              {[...attempts].reverse().map((attempt, i) => {
                const height = `${Math.max(attempt.score, 4)}%`;
                return (
                  <div key={attempt.id} style={styles.barWrapper}>
                    <div style={styles.barLabel}>{attempt.score}%</div>
                    <div style={styles.barTrack}>
                      {/* Animación individual para cada barra del gráfico */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height }}
                        transition={{ duration: 0.6, delay: 0.4 + (i * 0.05), ease: "easeOut" }}
                        style={{
                          ...styles.bar,
                          background: scoreColor(attempt.score),
                        }}
                      />
                    </div>
                    <div style={styles.barIndex}>{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Filter */}
          <motion.div 
            style={styles.filterRow}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {(["all", "good", "bad"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  background: filter === f ? "var(--primary)" : "transparent",
                  color: filter === f ? "white" : "var(--muted)",
                  borderColor:
                    filter === f ? "var(--primary)" : "var(--card-border)",
                }}
              >
                {f === "all"
                  ? "Todos"
                  : f === "good"
                    ? "✓ Aprobados (≥70%)"
                    : "✗ Reprobados (<70%)"}
              </button>
            ))}
          </motion.div>

          {/* Attempt list */}
          <motion.div 
            style={styles.list}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((attempt) => {
                const d = new Date(attempt.completed_at);
                const date = `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;

                return (
                  <motion.div 
                    layout /* Esto hace que se reacomoden suavemente al filtrar */
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    key={attempt.id} 
                    style={styles.attemptCard}
                  >
                    <div style={styles.attemptLeft}>
                      <div
                        style={{
                          ...styles.scoreBadge,
                          color: scoreColor(attempt.score),
                          borderColor: scoreColor(attempt.score),
                          background: `${scoreColor(attempt.score)}18`,
                        }}
                      >
                        {attempt.score}%
                      </div>
                      <div>
                        <p style={styles.attemptTitle}>
                          {attempt.quizzes?.materials?.title ??
                            "Material desconocido"}
                        </p>
                        <p style={styles.attemptMeta} suppressHydrationWarning>
                          {attempt.total_questions} questions ·{" "}
                          {difficultyLabel(
                            attempt.performance_data?.currentDifficulty ?? 3,
                          )}{" "}
                          · {date}
                        </p>
                        {attempt.performance_data?.weakTopics?.length > 0 && (
                          <div style={styles.weakTopics}>
                            {attempt.performance_data.weakTopics.map((t) => (
                              <span key={t} style={styles.weakTag}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.attemptActions}>
                      <a
                        href={
                          "/quiz/" +
                          attempt.quizzes?.id +
                          "/results/" +
                          attempt.id
                        }
                        style={styles.reviewButton}
                      >
                        Revisar
                      </a>
                      <a
                        href={
                          "/quiz/new?material=" + attempt.quizzes?.materials?.id
                        }
                        style={styles.retakeButton}
                      >
                        Hacer de nuevo
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={styles.empty}
              >
                <p style={styles.emptyText}>Ningún quiz coincide con este filtro.</p>
              </motion.div>
            )}
          </motion.div>
        </>
      )}

      {attempts.length === 0 && (
        <motion.div 
          style={styles.emptyState}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-center text-6xl">
            <FaChartBar/>
          </div>
          <h3 style={styles.emptyTitle}>Sin historial aún</h3>
          <p style={styles.emptyText}>
            Completa tu primer quiz para ver tu progreso aquí.
          </p>
          <a href="/dashboard" style={styles.dashboardLink}>
            Ir al dashboard →
          </a>
        </motion.div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "2.5rem 1.5rem",
  },
  header: {
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "0.25rem",
  },
  subtitle: {
    color: "var(--muted)",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  statCard: {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "1.25rem",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "var(--muted)",
    marginBottom: "0.5rem",
    fontWeight: "500",
  },
  statValue: {
    fontSize: "1.75rem",
    fontWeight: "700",
  },
  timelineCard: {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  timelineTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "var(--muted)",
    marginBottom: "1.25rem",
  },
  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: "0.5rem",
    height: "120px",
    overflowX: "auto",
    paddingBottom: "0.25rem",
  },
  barWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    minWidth: "36px",
    flex: "1",
    maxWidth: "60px",
    height: "100%",
  },
  barLabel: {
    fontSize: "0.65rem",
    color: "var(--muted)",
    whiteSpace: "nowrap",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
    transition: "background 0.3s ease", // Quitamos 'height' de CSS normal porque Framer se encarga
    minHeight: "4px",
  },
  barIndex: {
    fontSize: "0.65rem",
    color: "var(--muted)",
  },
  filterRow: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  },
  filterButton: {
    border: "1px solid",
    borderRadius: "20px",
    padding: "0.4rem 1rem",
    fontSize: "0.8rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.875rem",
  },
  attemptCard: {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
  },
  attemptLeft: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    flex: 1,
  },
  scoreBadge: {
    fontSize: "1.1rem",
    fontWeight: "800",
    border: "2px solid",
    borderRadius: "10px",
    padding: "0.4rem 0.75rem",
    whiteSpace: "nowrap",
    minWidth: "60px",
    textAlign: "center",
  },
  attemptTitle: {
    fontWeight: "600",
    fontSize: "0.95rem",
    marginBottom: "0.2rem",
    textTransform: "capitalize",
  },
  attemptMeta: {
    fontSize: "0.8rem",
    color: "var(--muted)",
  },
  weakTopics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    marginTop: "0.5rem",
  },
  weakTag: {
    fontSize: "0.7rem",
    background: "rgba(255, 217, 99, 0.1)",
    border: "1px solid rgba(255, 217, 99, 0.25)",
    borderRadius: "20px",
    padding: "0.15rem 0.5rem",
    color: "#ffd963",
  },
  attemptActions: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
  },
  reviewButton: {
    color: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    fontSize: "0.8rem",
    fontWeight: "500",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  retakeButton: {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    fontSize: "0.8rem",
    fontWeight: "600",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  empty: {
    textAlign: "center",
    padding: "2rem",
    color: "var(--muted)",
  },
  emptyText: {
    color: "var(--muted)",
    fontSize: "0.875rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "5rem 2rem",
    border: "2px dashed var(--card-border)",
    borderRadius: "16px",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  dashboardLink: {
    display: "inline-block",
    marginTop: "1rem",
    color: "var(--primary)",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "0.875rem",
  },
};
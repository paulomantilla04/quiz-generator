'use client'

import { motion, Variants, AnimatePresence } from 'framer-motion'
import UploadButton from '@/components/UploadButton'
import MaterialCard from '@/components/MaterialCard'
import { FaNoteSticky } from "react-icons/fa6"

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// 1. Agregamos un estado 'exit' individual para cada tarjeta y pulimos la entrada
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  show: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
}

export default function DashboardClient({ firstName, materials }: { firstName: string, materials: any[] }) {
  return (
    <div style={styles.container}>
      <motion.div 
        style={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div>
          <h1 style={styles.title}>Hola, {firstName}!</h1>
          <p style={styles.subtitle}>
            {materials?.length
              ? `Tienes ${materials.length} material${materials.length > 1 ? 's' : ''} de estudio. Listo para un quiz?`
              : 'Sube tu primer PDF para empezar.'}
          </p>
        </div>
        <UploadButton />
      </motion.div>

      {/* AnimatePresence EXTERNO: Alterna entre el Grid y el Estado Vacío */}
      <AnimatePresence mode="wait">
        {materials && materials.length > 0 ? (
          <motion.div 
            key="grid"
            style={styles.grid}
            variants={gridVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {/* 2. AnimatePresence INTERNO: Maneja la entrada/salida de tarjetas INDIVIDUALES */}
            <AnimatePresence mode="popLayout">
              {materials.map(material => (
                <motion.div 
                  key={material.id} 
                  layout // 3. EL TRUCO: 'layout' hace que las tarjetas se reacomoden suavemente al borrar una
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <MaterialCard material={material} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            style={styles.empty}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className='flex items-center justify-center text-6xl'>
              <FaNoteSticky/>
            </div>
            <h3 style={styles.emptyTitle}>No hay materiales aún</h3>
            <p style={styles.emptyText}>
              Sube algún PDF y generaremos un Quiz.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--muted)',
    fontSize: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.25rem',
  },
  empty: {
    textAlign: 'center',
    padding: '5rem 2rem',
    border: '2px dashed var(--card-border)',
    borderRadius: '16px',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    marginTop: '1rem',
  },
  emptyText: {
    color: 'var(--muted)',
    maxWidth: '300px',
    margin: '0 auto',
  },
}
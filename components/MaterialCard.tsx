'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../app/lib/supabase/client'
import Image from 'next/image'
import logo from '@/public/singleLogo.svg'
import { FaTrashAlt } from "react-icons/fa"
import { motion, AnimatePresence } from 'framer-motion' // 1. Importamos Framer Motion

interface Material {
  id: string
  title: string
  file_name: string
  created_at: string
}

export default function MaterialCard({ material }: { material: Material }) {
  const [deleting, setDeleting] = useState(false)
  const [showModal, setShowModal] = useState(false) // 2. Estado para controlar el modal
  const router = useRouter()

  const date = new Date(material.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  // 3. Función real de eliminación
  async function executeDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('materials').delete().eq('id', material.id)
    setShowModal(false)
    router.refresh()
  }

  return (
    <>
      <motion.div 
        style={styles.card}
        whileHover={{ y: -4, borderColor: 'var(--primary)' }} // Pequeño efecto hover en la tarjeta
      >
        <div style={styles.icon}><Image src={logo} width={60} height={60} alt='logo' /></div>
        <div style={styles.content}>
          <h3 style={styles.title}>{material.title}</h3>
          <p style={styles.date}>Fecha de subida: {date}</p>
        </div>
        <div style={styles.actions}>
          <a href={`/quiz/new?material=${material.id}`} style={styles.quizButton}>
            Iniciar Quiz
          </a>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)} // Abre el modal
            disabled={deleting}
            style={styles.deleteButton}
          >
            {deleting ? '...' : <FaTrashAlt/>}
          </motion.button>
        </div>
      </motion.div>

      {/* 4. Modal de confirmación animado */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              style={styles.modalCard}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div style={styles.modalIconContainer}>
                <FaTrashAlt style={styles.modalIcon} />
              </div>
              <h3 style={styles.modalTitle}>¿Eliminar material?</h3>
              <p style={styles.modalText}>
                Estás a punto de eliminar permanentemente <strong>{material.title}</strong>. 
                Todos los quizzes e historial asociados a este archivo se perderán. Esta acción no se puede deshacer.
              </p>
              
              <div style={styles.modalActions}>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowModal(false)} 
                  disabled={deleting}
                  style={styles.cancelButton}
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={executeDelete} 
                  disabled={deleting}
                  style={styles.confirmDeleteButton}
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    transition: 'border-color 0.2s',
  },
  icon: {
    fontSize: '2rem',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: '0.8rem',
    color: 'var(--muted)',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  quizButton: {
    flex: 1,
    textAlign: 'center',
    background: 'var(--primary)',
    color: 'white',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'background 0.2s',
  },
  deleteButton: {
    background: 'rgba(255, 77, 77, 0.1)', // Fondo rojo translúcido más sutil
    border: '1px solid rgba(255, 77, 77, 0.3)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#ff4d4d', // Color rojo brillante para el ícono
  },
  
  // Estilos del Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)', // Efecto desenfoque en el fondo
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modalCard: {
    background: 'var(--card)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
  modalIconContainer: {
    width: '48px',
    height: '48px',
    background: 'rgba(255, 77, 77, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem auto',
  },
  modalIcon: {
    color: '#ff4d4d',
    fontSize: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--foreground)',
    marginBottom: '0.75rem',
  },
  modalText: {
    fontSize: '0.875rem',
    color: 'var(--muted)',
    lineHeight: '1.6',
    marginBottom: '1.75rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    flexDirection: 'column', // Botones apilados para móviles
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid var(--card-border)',
    color: 'var(--foreground)',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    width: '100%',
  },
  confirmDeleteButton: {
    background: '#ff4d4d',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    width: '100%',
  },
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../app/lib/supabase/client'
import Image from 'next/image'
import logo from '@/public/singleLogo.svg'
import { FaTrashAlt } from "react-icons/fa";

interface Material {
  id: string
  title: string
  file_name: string
  created_at: string
}

export default function MaterialCard({ material }: { material: Material }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const date = new Date(material.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  async function handleDelete() {
    if (!confirm('Estás seguro de eliminar este material y todos sus quizzes?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('materials').delete().eq('id', material.id)
    router.refresh()
  }

  return (
    <div style={styles.card}>
      <div style={styles.icon}><Image src={logo} width={60} height={60} alt='logo' /></div>
      <div style={styles.content}>
        <h3 style={styles.title}>{material.title}</h3>
        <p style={styles.date}>Fecha de subida: {date}</p>
      </div>
      <div style={styles.actions}>
        <a href={`/quiz/new?material=${material.id}`} style={styles.quizButton}>
          Iniciar Quiz
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={styles.deleteButton}
        >
          {deleting ? '...' : <FaTrashAlt/>}
        </button>
      </div>
    </div>
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
    background: 'red',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: 'white',
  },
}
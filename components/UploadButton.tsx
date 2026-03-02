'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../app/lib/supabase/client'

export default function UploadButton() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File must be under 20MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload file to Supabase Storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Save material record to DB
      const { error: dbError } = await supabase
        .from('materials')
        .insert({
          user_id: user.id,
          title: file.name.replace('.pdf', '').replace(/-|_/g, ' '),
          file_name: file.name,
          file_path: filePath,
        })

      if (dbError) throw dbError

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        style={{ display: 'none' }}
        id="pdf-upload"
      />
      <label htmlFor="pdf-upload" style={{
        ...styles.button,
        opacity: uploading ? 0.7 : 1,
        cursor: uploading ? 'not-allowed' : 'pointer',
        pointerEvents: uploading ? 'none' : 'auto',
      }}>
        {uploading ? 'Subiendo...' : '+ Subir PDF'}
      </label>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-block',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  },
  error: {
    color: 'var(--error)',
    fontSize: '0.75rem',
    marginTop: '0.5rem',
  },
}
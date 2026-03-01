import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import UploadButton from '../components/UploadButton'
import MaterialCard from '../components/MaterialCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Hey, {firstName} 👋</h1>
          <p style={styles.subtitle}>
            {materials?.length
              ? `You have ${materials.length} study material${materials.length > 1 ? 's' : ''}. Ready to quiz?`
              : 'Upload your first PDF to get started.'}
          </p>
        </div>
        <UploadButton />
      </div>

      {materials && materials.length > 0 ? (
        <div style={styles.grid}>
          {materials.map(material => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📄</div>
          <h3 style={styles.emptyTitle}>No materials yet</h3>
          <p style={styles.emptyText}>
            Upload a lecture PDF and we'll generate an adaptive quiz from it.
          </p>
        </div>
      )}
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
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: 'var(--muted)',
    maxWidth: '300px',
    margin: '0 auto',
  },
}
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import DashboardNav from '@/components/DashboardNav' // Ajusta la ruta si es necesario

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div style={styles.wrapper}>
      {/* Insertamos la navegación animada aquí */}
      <DashboardNav />
      
      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    background: 'var(--background)',
  },
  main: {
    // Si necesitas algún estilo general para el main, va aquí
  }
}
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import Image from 'next/image'
import logo from '../../public/singleLogo.svg'

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
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logoContainer}>
            <Image src={logo} width={70} height={70} alt='logo' />
            <span className='font-medium'>Quizzes <span className='font-black'>Fit</span></span>
          </div>
          
          <div style={styles.navLinks}>
            <a href="/dashboard" style={styles.navLink}>Dashboard</a>
            <a href="/dashboard/history" style={styles.navLink}>Historial</a>
            <form action="/auth/signout" method="post">
              <button type="submit" style={styles.navButton}>Cerrar sesión</button>
            </form>
          </div>
        </div>
      </nav>
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
  nav: {
    borderBottom: '1px solid var(--card-border)',
    background: 'var(--card)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navInner: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Agregamos este nuevo estilo para alinear la imagen y el texto
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem', // Espacio entre el logo y el texto
  },
  navLogo: {
    fontWeight: '700',
    fontSize: '1.25rem',
    color: 'var(--foreground)',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navLink: {
    color: 'var(--muted)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  navButton: {
    background: 'transparent',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.4rem 0.875rem',
    color: 'var(--muted)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
}
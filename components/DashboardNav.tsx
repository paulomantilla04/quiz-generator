'use client'

import Image from 'next/image'
import logo from '@/public/singleLogo.svg'
import { motion } from 'framer-motion'

export default function DashboardNav() {
  return (
    <motion.nav 
      style={styles.nav}
      initial={{ y: -64, opacity: 0 }} // Empieza escondido arriba
      animate={{ y: 0, opacity: 1 }}   // Baja suavemente
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div style={styles.navInner}>
        <motion.div 
          style={styles.logoContainer}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Image src={logo} width={70} height={70} alt='logo' />
          <span className='font-medium'>Quizzes <span className='font-black'>Fit</span></span>
        </motion.div>
        
        <motion.div 
          style={styles.navLinks}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <a href="/dashboard" style={styles.navLink}>Dashboard</a>
          <a href="/dashboard/history" style={styles.navLink}>Historial</a>
          <form action="/auth/signout" method="post">
            <motion.button 
              type="submit" 
              style={styles.navButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cerrar sesión
            </motion.button>
          </form>
        </motion.div>
      </div>
    </motion.nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
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
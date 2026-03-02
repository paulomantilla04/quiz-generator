import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import DashboardClient from './DashboardClient'

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

  // Pasamos los datos al componente cliente que manejará las animaciones
  return <DashboardClient firstName={firstName} materials={materials || []} />
}
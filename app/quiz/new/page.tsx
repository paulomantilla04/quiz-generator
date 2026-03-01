import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import QuizSetup from '../../components/QuizSetup'

export default async function NewQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string }>
}) {
  const { material: materialId } = await searchParams
  if (!materialId) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: material } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single()

  if (!material) redirect('/dashboard')

  return <QuizSetup material={material} />
}
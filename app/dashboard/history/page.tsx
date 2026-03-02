import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import HistoryView from '../../components/HistoryView'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempts } = await supabase
    .from('attempts')
    .select(`
      *,
      quizzes (
        id,
        title,
        question_count,
        materials (
          id,
          title
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('completed', true)
    .order('completed_at', { ascending: false })

  return <HistoryView attempts={attempts ?? []} />
}
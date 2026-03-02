import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import QuizSession from '@/components/QuizSession'

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ quizId: string; attemptId: string }>
}) {
  const { quizId, attemptId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .single()

  if (!attempt) redirect('/dashboard')
  if (attempt.completed) redirect(`/quiz/${quizId}/results/${attemptId}`)

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*, materials(*)')
    .eq('id', quizId)
    .single()

  if (!quiz) redirect('/dashboard')

  return <QuizSession quiz={quiz} attempt={attempt} />
}
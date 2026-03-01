import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import ResultsView from '../../../../components/ResultsView'

export default async function ResultsPage({
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

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*, materials(*)')
    .eq('id', quizId)
    .single()

  if (!quiz) redirect('/dashboard')

  // Get all questions and answers for this attempt
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: true })

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('attempt_id', attemptId)
    .order('answered_at', { ascending: true })

  return (
    <ResultsView
      attempt={attempt}
      quiz={quiz}
      questions={questions ?? []}
      answers={answers ?? []}
    />
  )
}
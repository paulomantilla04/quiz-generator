import { createClient } from '../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { extractText } from 'unpdf'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { materialId, count, difficulty, weakTopics, previousQuestions, previousTopics } = await request.json()
    // Get material from DB
    const { data: material } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single()

    if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })

    // Extract text from PDF if not already done
    let extractedText = material.extracted_text

    if (!extractedText) {
      const { data: fileData } = await supabase.storage
        .from('pdfs')
        .download(material.file_path)

      if (!fileData) return NextResponse.json({ error: 'PDF not found' }, { status: 404 })

      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      const { text } = await extractText(buffer, { mergePages: true })
      extractedText = text

      // Save extracted text so we don't re-parse next time
      await supabase
        .from('materials')
        .update({ extracted_text: extractedText })
        .eq('id', materialId)
    }

    // Truncate text to avoid token limits (~12000 chars is safe)
    const truncatedText = extractedText.slice(0, 12000)

    // Build adaptive prompt
    const weakTopicsLine = weakTopics?.length
      ? `The student has struggled with these topics: ${weakTopics.join(', ')}. Include more questions on these.`
      : ''

    const difficultyLine = difficulty <= 2
      ? 'Questions should be straightforward and test basic understanding.'
      : difficulty >= 4
      ? 'Questions should be challenging, testing deep understanding and application.'
      : 'Questions should be moderate difficulty, testing solid understanding.'
    
    const askedTopicsLine = previousQuestions?.length
      ? `TOPICS ALREADY COVERED (pick a completely different topic):\n${[...new Set(previousTopics)].map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`
      : ''
    
    const previousQuestionsLine = previousQuestions?.length
      ? `QUESTIONS ALREADY ASKED (do not repeat or rephrase):\n${previousQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
      : ''
    
    const randomInstruction = [
      "Focus on the beginning of the material.",
      "Focus on the middle sections of the material.",
      "Focus on the final conclusions or summaries of the material.",
      "Pick a minor but interesting detail from the text."
    ][Math.floor(Math.random() * 4)];

    const prompt = `You are a university professor creating a quiz with strict topic diversity rules.
    
    ${randomInstruction}
    
    Based on the study material below, generate exactly ${count} multiple choice question.
    
    ${difficultyLine}
    ${weakTopicsLine}
    ${askedTopicsLine}
    ${previousQuestionsLine}
    
    STRICT RULES:
    - You MUST choose a topic not already covered above
    - Scan the entire material and pick a section that has NOT been asked about yet
    - Each question must have exactly 4 options labeled A, B, C, D
    - Only one option is correct
    - Return ONLY valid JSON, no explanation, no markdown
    
    Return this exact JSON structure:
    {
      "questions": [
        {
          "question_text": "Question here?",
          "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
          "correct_answer": "A) Option one",
          "topic": "Topic name",
          "difficulty": 3
        }
      ]
    }
    
    Study material:
    ${truncatedText}`

    const output = await replicate.run(
      "meta/meta-llama-3-70b-instruct",
      {
        input: {
          prompt,
          max_new_tokens: 4000,
          temperature: 0.8,
          system_prompt: "You are a strict JSON API. Respond ONLY with valid JSON. Do not use markdown format like ```json."
        }
      }
    )

    // Replicate returns an array of strings — join them
    const rawText = Array.isArray(output) ? output.join('') : String(output)

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Raw output:', rawText)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({ questions: parsed.questions })
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }
}
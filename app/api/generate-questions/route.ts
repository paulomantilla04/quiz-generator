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

    // 1. Simplificamos los parámetros: solo necesitamos el ID, la cantidad y la dificultad.
    const { materialId, count, difficulty } = await request.json()
    
    // Recuperar el material de la base de datos
    const { data: material } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single()

    if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })

    // Extraer texto del PDF si no se ha hecho
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

      // Guardar el texto extraído
      await supabase
        .from('materials')
        .update({ extracted_text: extractedText })
        .eq('id', materialId)
    }

    // Truncar para evitar límites de tokens (~12000 chars)
    const truncatedText = extractedText.slice(0, 12000)

    // Ajuste de dificultad
    const difficultyLine = difficulty <= 2
      ? 'Questions should be straightforward and test basic understanding.'
      : difficulty >= 4
      ? 'Questions should be challenging, testing deep understanding and application.'
      : 'Questions should be moderate difficulty, testing solid understanding.'

    // 2. Prompt optimizado para generar todo el quiz de una sola vez, sin repeticiones y en español
    const prompt = `You are a university professor creating a comprehensive quiz.
    
    Based on the study material below, generate exactly ${count} distinct multiple choice questions in a single response.
    
    ${difficultyLine}
    
    STRICT RULES:
    - CRITICAL: All generated questions, options, and correct answers MUST be written entirely in Spanish (Español).
    - Ensure the ${count} questions cover different parts and concepts from the entire material to avoid repetition.
    - Each question must have exactly 4 options labeled A, B, C, D.
    - Only one option is correct.
    - Return ONLY valid JSON, no explanation, no markdown.
    
    Return this exact JSON structure:
    {
      "questions": [
        {
          "question_text": "¿Primera pregunta aquí?",
          "options": ["A) Opción uno", "B) Opción dos", "C) Opción tres", "D) Opción cuatro"],
          "correct_answer": "A) Opción uno",
          "topic": "Nombre del tema",
          "difficulty": ${difficulty || 3}
        }
        // ... must generate exactly ${count} objects inside this array
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
          temperature: 0.7, // Bajamos un poco la temperatura (de 0.8 a 0.7) para que el formato JSON sea más estricto y menos propenso a divagar
          system_prompt: "You are a strict JSON API. Respond ONLY with valid JSON. Do not use markdown format like ```json."
        }
      }
    )

    // Replicate devuelve un array de strings — lo unimos
    const rawText = Array.isArray(output) ? output.join('') : String(output)

    // Extraer el JSON de la respuesta usando RegEx
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
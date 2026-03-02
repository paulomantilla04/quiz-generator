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
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión para continuar.' }, { status: 401 })
    }

    const { materialId, count, difficulty } = await request.json()
    
    // 1. Recuperar el material de la base de datos
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single()

    if (materialError || !material) {
      return NextResponse.json({ error: 'No se encontró el material de estudio especificado.' }, { status: 404 })
    }

    // 2. Extraer texto del PDF si no se ha hecho
    let extractedText = material.extracted_text

    if (!extractedText) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('pdfs')
        .download(material.file_path)

      if (downloadError || !fileData) {
        return NextResponse.json({ error: 'No se pudo descargar el archivo PDF desde el almacenamiento.' }, { status: 404 })
      }

      try {
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        const { text } = await extractText(buffer, { mergePages: true })
        extractedText = text

        // Guardar el texto extraído
        await supabase
          .from('materials')
          .update({ extracted_text: extractedText })
          .eq('id', materialId)
      } catch (pdfError) {
        console.error('Error extracting PDF:', pdfError)
        return NextResponse.json({ error: 'Ocurrió un error al intentar leer el contenido del PDF.' }, { status: 500 })
      }
    }

    // 3. Muestreo inteligente de texto (Mejora: evitar truncamiento ciego)
    const MAX_CHARS = 12000;
    let textToProcess = extractedText;
    
    if (textToProcess.length > MAX_CHARS) {
      // Tomamos partes proporcionales del inicio, medio y final del documento
      const partSize = Math.floor(MAX_CHARS / 3);
      const start = textToProcess.slice(0, partSize);
      const middle = textToProcess.slice(Math.floor(textToProcess.length / 2 - partSize / 2), Math.floor(textToProcess.length / 2 + partSize / 2));
      const end = textToProcess.slice(-partSize);
      textToProcess = `${start}\n\n[...texto omitido...]\n\n${middle}\n\n[...texto omitido...]\n\n${end}`;
    }

    // Ajuste de dificultad para el prompt
    const difficultyLine = difficulty <= 2
      ? 'Questions should be straightforward and test basic understanding.'
      : difficulty >= 4
      ? 'Questions should be challenging, testing deep understanding and application.'
      : 'Questions should be moderate difficulty, testing solid understanding.'

    // 4. Prompt optimizado (Mejora: se quita la dificultad estática del JSON)
    const prompt = `You are a university professor creating a comprehensive quiz.
    
    Based on the study material below, generate exactly ${count} distinct multiple choice questions in a single response.
    
    ${difficultyLine}
    
    STRICT RULES:
    - CRITICAL: All generated questions, options, and correct answers MUST be written entirely in Spanish (Español).
    - Ensure the ${count} questions cover different parts and concepts from the material to avoid repetition.
    - Each question must have exactly 4 options.
    - Only one option is correct.
    - Return ONLY valid JSON, no explanation, no markdown.
    
    Return this exact JSON structure:
    {
      "questions": [
        {
          "question_text": "¿Primera pregunta aquí?",
          "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "correct_answer": "Opción A",
          "topic": "Nombre del tema"
        }
      ]
    }
    
    Study material:
    ${textToProcess}`

    let output;
    try {
      output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        {
          input: {
            prompt,
            max_new_tokens: 4000,
            temperature: 0.7, 
            system_prompt: "You are a strict JSON API. Respond ONLY with valid JSON. Do not use markdown format like ```json."
          }
        }
      )
    } catch (aiError) {
      console.error('Replicate error:', aiError)
      return NextResponse.json({ error: 'El servicio de Inteligencia Artificial no está disponible o tardó demasiado. Intenta de nuevo.' }, { status: 503 })
    }

    const rawText = Array.isArray(output) ? output.join('') : String(output)

    // 5. Parseo seguro del JSON (Mejora: Try-Catch específico para el JSON)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Raw output missing JSON:', rawText)
      return NextResponse.json({ error: 'La IA no devolvió un formato de datos válido.' }, { status: 500 })
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('JSON Parse error:', parseError, 'Raw text:', rawText)
      return NextResponse.json({ error: 'Error al interpretar la respuesta de la IA. Por favor, intenta generar el cuestionario de nuevo.' }, { status: 500 })
    }

    // 6. Inyección de propiedades (Mejora: delegamos la dificultad al código en lugar de la IA)
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: 'Estructura de preguntas inválida generada por la IA.' }, { status: 500 })
    }

    const finalQuestions = parsed.questions.map((q: any) => ({
      ...q,
      difficulty: difficulty || 3
    }))

    return NextResponse.json({ questions: finalQuestions })
    
  } catch (err) {
    // Catch general para errores inesperados del servidor
    console.error('Unexpected server error:', err)
    return NextResponse.json({ error: 'Ocurrió un error inesperado en el servidor.' }, { status: 500 })
  }
}
import { createClient } from '../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { extractText } from 'unpdf'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

// ============================================================
// MEJORA 1: Rate limiter con auto-limpieza periódica
// ============================================================
// Problema original: el Map crecía indefinidamente (memory leak).
// Ahora cada 5 minutos se eliminan las entradas expiradas.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 1000
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT) return true

  entry.count++
  return false
}

// ============================================================
// MEJORA 2: Validación y sanitización de inputs
// ============================================================
// Problema original: count y difficulty venían del cliente sin validar.
// Un usuario malicioso podía mandar count: 9999 o difficulty: -5.
interface GenerateRequest {
  materialId: string
  count: number
  difficulty: number
}

function validateAndSanitizeInput(body: any): GenerateRequest {
  const { materialId, count, difficulty } = body

  if (!materialId || typeof materialId !== 'string') {
    throw new Error('El ID del material es obligatorio.')
  }

  return {
    materialId: materialId.trim(),
    count: Math.min(Math.max(Math.round(Number(count) || 5), 1), 20),
    difficulty: Math.min(Math.max(Math.round(Number(difficulty) || 3), 1), 5),
  }
}

// ============================================================
// MEJORA 3: Validación de la estructura de cada pregunta
// ============================================================
// Problema original: si la IA devolvía una pregunta incompleta
// (sin correct_answer, con 3 opciones, etc.), pasaba directo al frontend.
// Ahora filtramos solo las preguntas con estructura válida.
interface QuestionFromAI {
  question_text: string
  options: string[]
  correct_answer: string
  topic: string
}

function isValidQuestion(q: any): q is QuestionFromAI {
  return (
    typeof q?.question_text === 'string' &&
    q.question_text.trim().length > 0 &&
    Array.isArray(q?.options) &&
    q.options.length === 4 &&
    q.options.every((o: any) => typeof o === 'string' && o.trim().length > 0) &&
    typeof q?.correct_answer === 'string' &&
    q.options.includes(q.correct_answer) &&
    typeof q?.topic === 'string'
  )
}

// ============================================================
// MEJORA 8: Resumen progresivo del PDF completo en chunks
// ============================================================
// Problema original: si el PDF tenía más de 12,000 caracteres, se
// tomaban solo 3 fragmentos y se descartaba el resto. Un PDF de 50
// páginas perdía la mayoría de su contenido.
//
// Nuevo enfoque: dividimos el texto en chunks de ~10,000 chars,
// resumimos cada chunk con la IA, y concatenamos los resúmenes.
// Así la IA ve TODO el contenido del PDF de forma condensada.
const CHUNK_SIZE = 10000
const MAX_SUMMARY_CALLS = 6 // Máximo de chunks a resumir (protección de costo)

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

async function summarizeChunk(chunk: string, chunkIndex: number, totalChunks: number): Promise<string> {
  const output = await replicate.run(
    "meta/meta-llama-3-70b-instruct",
    {
      input: {
        prompt: `Resume el siguiente texto académico de forma detallada y completa. Este es el fragmento ${chunkIndex + 1} de ${totalChunks} de un documento más largo.

REGLAS:
- Conserva TODOS los conceptos clave, definiciones, datos, nombres, fechas y fórmulas.
- Escribe el resumen en español.
- No omitas temas ni subtemas, solo reduce la verbosidad y las repeticiones.
- El resumen debe ser lo suficientemente detallado para que alguien pueda generar preguntas de examen a partir de él.
- Responde SOLO con el resumen, sin preámbulos ni explicaciones.

Texto:
${chunk}`,
        max_new_tokens: 2000,
        temperature: 0.3,
        system_prompt: "Eres un asistente académico experto en resumir material de estudio. Respondes solo con el resumen solicitado."
      }
    }
  )
  return Array.isArray(output) ? output.join('') : String(output)
}

async function getProcessedText(fullText: string): Promise<string> {
  // Si el texto es corto, no necesita resumen
  if (fullText.length <= CHUNK_SIZE) {
    return fullText
  }

  const chunks = splitIntoChunks(fullText, CHUNK_SIZE)
  
  // Limitar la cantidad de chunks para controlar costos
  const chunksToProcess = chunks.slice(0, MAX_SUMMARY_CALLS)
  const skippedChunks = chunks.length - chunksToProcess.length

  // Resumir todos los chunks en paralelo para mayor velocidad
  const summaryPromises = chunksToProcess.map((chunk, i) =>
    summarizeChunk(chunk, i, chunks.length)
  )
  const summaries = await Promise.all(summaryPromises)

  let combinedSummary = summaries.join('\n\n')

  if (skippedChunks > 0) {
    combinedSummary += `\n\n[Nota: se omitieron ${skippedChunks} secciones adicionales del documento por límite de procesamiento.]`
  }

  return combinedSummary
}

// ============================================================
// MEJORA 4: Parseo de JSON más robusto
// ============================================================
// Problema original: el regex greedy /\{[\s\S]*\}/ podía capturar
// basura si la IA añadía texto después del JSON.
// Ahora intentamos parsear directo primero, y solo usamos regex
// como fallback con un enfoque más defensivo.
function extractJSON(raw: string): any {
  // Intento 1: parsear el texto completo directamente
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // Intento 2: buscar el JSON con regex y parsear
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('No se encontró JSON válido en la respuesta.')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión para continuar.' },
        { status: 401 }
      )
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Espera un momento antes de generar más preguntas.' },
        { status: 429 }
      )
    }

    // ── Validar inputs ──────────────────────────────────────
    let input: GenerateRequest
    try {
      const body = await request.json()
      input = validateAndSanitizeInput(body)
    } catch (validationError: any) {
      return NextResponse.json(
        { error: validationError.message || 'Datos de solicitud inválidos.' },
        { status: 400 }
      )
    }

    const { materialId, count, difficulty } = input

    // 1. Recuperar el material de la base de datos
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single()

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'No se encontró el material de estudio especificado.' },
        { status: 404 }
      )
    }

    // 2. Extraer texto del PDF si no se ha hecho
    let extractedText = material.extracted_text

    if (!extractedText) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('pdfs')
        .download(material.file_path)

      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: 'No se pudo descargar el archivo PDF desde el almacenamiento.' },
          { status: 404 }
        )
      }

      try {
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        const { text } = await extractText(buffer, { mergePages: true })
        extractedText = text
        
        await supabase
          .from('materials')
          .update({ extracted_text: extractedText })
          .eq('id', materialId)
      } catch (pdfError) {
        console.error('Error extracting PDF:', pdfError)
        return NextResponse.json(
          { error: 'Ocurrió un error al intentar leer el contenido del PDF.' },
          { status: 500 }
        )
      }
    }

    // ============================================================
    // MEJORA 5: Validar que el texto extraído tenga contenido útil
    // ============================================================
    // Problema: si el PDF es un escaneo de imagen sin OCR, extractText
    // devuelve un string vacío y la IA inventa preguntas sin contexto.
    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: 'El PDF no contiene suficiente texto legible para generar preguntas. Verifica que no sea un documento escaneado como imagen.' },
        { status: 422 }
      )
    }

    // 3. Procesar texto: resumen por chunks si es largo, texto completo si es corto
    let textToProcess: string
    try {
      textToProcess = await getProcessedText(extractedText)
    } catch (summaryError) {
      console.error('Error summarizing PDF:', summaryError)
      return NextResponse.json(
        { error: 'Ocurrió un error al procesar el contenido del PDF. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    // ============================================================
    // MEJORA 6: Prompt refinado con instrucciones más claras
    // ============================================================
    const difficultyLine =
      difficulty <= 2
        ? 'Las preguntas deben ser directas y evaluar comprensión básica de conceptos.'
        : difficulty >= 4
          ? 'Las preguntas deben ser desafiantes, evaluando comprensión profunda, análisis y aplicación.'
          : 'Las preguntas deben tener dificultad moderada, evaluando comprensión sólida de los temas.'

    const prompt = `You are a university professor creating a quiz based STRICTLY on the study material provided below.
The material may be a condensed summary of a longer document — use ALL the information available to create diverse questions.

Generate exactly ${count} distinct multiple choice questions.

${difficultyLine}

STRICT RULES:
- ALL questions, options, and topics MUST be written entirely in Spanish (Español).
- Each question must cover a DIFFERENT concept or section from the material. Do NOT repeat themes.
- Each question must have exactly 4 options labeled as text (NOT as A, B, C, D).
- Exactly ONE option must be correct.
- The "correct_answer" field must be an EXACT copy of one of the 4 options.
- The "topic" field should be a short label (2-5 words) describing the concept tested.
- Return ONLY valid JSON. No explanations, no markdown, no backticks.

JSON structure:
{
  "questions": [
    {
      "question_text": "¿Pregunta aquí?",
      "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
      "correct_answer": "Opción 1",
      "topic": "Nombre del tema"
    }
  ]
}

Study material:
${textToProcess}`

    // ============================================================
    // MEJORA 7: Temperatura más baja para consistencia de formato
    // ============================================================
    // 0.5 mantiene variedad en las preguntas pero reduce errores de
    // formato JSON comparado con 0.7.
    let output
    try {
      output = await replicate.run(
        "meta/meta-llama-3-70b-instruct",
        {
          input: {
            prompt,
            max_new_tokens: 4000,
            temperature: 0.5,
            system_prompt: "You are a strict JSON API. Respond ONLY with valid JSON. No markdown, no backticks, no explanation before or after the JSON."
          }
        }
      )
    } catch (aiError) {
      console.error('Replicate error:', aiError)
      return NextResponse.json(
        { error: 'El servicio de Inteligencia Artificial no está disponible o tardó demasiado. Intenta de nuevo.' },
        { status: 503 }
      )
    }

    const rawText = Array.isArray(output) ? output.join('') : String(output)

    // 5. Parseo seguro del JSON con la función mejorada
    let parsed
    try {
      parsed = extractJSON(rawText)
    } catch (parseError) {
      console.error('JSON Parse error:', parseError, 'Raw text:', rawText)
      return NextResponse.json(
        { error: 'Error al interpretar la respuesta de la IA. Por favor, intenta generar el cuestionario de nuevo.' },
        { status: 500 }
      )
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: 'Estructura de preguntas inválida generada por la IA.' },
        { status: 500 }
      )
    }

    // ── Filtrar solo preguntas con estructura válida ─────────
    const validQuestions = parsed.questions
      .filter(isValidQuestion)
      .map((q: QuestionFromAI) => ({
        question_text: q.question_text.trim(),
        options: q.options.map((o: string) => o.trim()),
        correct_answer: q.correct_answer.trim(),
        topic: q.topic.trim(),
        difficulty,
      }))

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: 'La IA no generó preguntas con formato válido. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions: validQuestions })

  } catch (err) {
    console.error('Unexpected server error:', err)
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado en el servidor.' },
      { status: 500 }
    )
  }
}
import type { MealAnalysisResult } from '../types'

function extractJson(text: string): MealAnalysisResult {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('Resposta da IA sem JSON')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MealAnalysisResult>
  return {
    title: String(parsed.title || 'Refeição').slice(0, 80),
    calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
    protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
    items: Array.isArray(parsed.items)
      ? parsed.items.map((i) => String(i)).filter(Boolean).slice(0, 12)
      : [],
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    notes: String(parsed.notes || '').slice(0, 240),
  }
}

/** Análise via Gemini API (chave em VITE_GEMINI_API_KEY). */
export async function analyzeMealPhotoWithGeminiKey(
  imageBase64: string,
  mimeType: string,
): Promise<MealAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey || apiKey === 'your-gemini-key') {
    throw new Error('VITE_GEMINI_API_KEY não configurada')
  }

  const prompt = `Você é nutricionista. Analise a foto de uma refeição.
Responda APENAS com JSON válido (sem markdown):
{
  "title": "nome curto da refeição em português",
  "calories": 450,
  "protein": 30,
  "carbs": 40,
  "fat": 15,
  "items": ["alimento 1", "alimento 2"],
  "confidence": 0.75,
  "notes": "observação curta"
}
Estime calorias e macros em gramas. Se não for comida, calories 0.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    },
  )

  const raw = await res.text()
  if (!res.ok) throw new Error(`Gemini (${res.status}): ${raw.slice(0, 200)}`)

  const json = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
  if (!text) throw new Error('IA não retornou texto')
  return extractJson(text)
}

export function hasGeminiBrowserKey(): boolean {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  return Boolean(key && key !== 'your-gemini-key')
}

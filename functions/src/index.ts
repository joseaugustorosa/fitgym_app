import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { GoogleAuth } from 'google-auth-library'

initializeApp()
setGlobalOptions({ region: 'southamerica-east1' })

async function assertAdmin(uid: string | undefined) {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar')
  }
  const snap = await getFirestore().collection('users').doc(uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem cadastrar alunos')
  }
}

export const createStudent = onCall(async (request) => {
  await assertAdmin(request.auth?.uid)

  const { name, email, password, unit } = (request.data ?? {}) as {
    name?: string
    email?: string
    password?: string
    unit?: string
  }

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'Informe nome, e-mail e senha com pelo menos 6 caracteres',
    )
  }

  const auth = getAuth()
  const db = getFirestore()

  let user
  try {
    user = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar usuário'
    throw new HttpsError('already-exists', message)
  }

  const avatarInitial = name.trim().charAt(0).toUpperCase()
  await db.collection('users').doc(user.uid).set({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'aluno',
    unit: unit?.trim() || 'Unidade Centro',
    avatarInitial,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    streakDays: 0,
    lastCheckInAt: null,
    assignedWorkoutPlanId: 'treino-a',
    assignedMealPlanId: 'default-meal-plan',
  })

  return { uid: user.uid }
})

type MealAnalysis = {
  title: string
  calories: number
  protein: number
  carbs: number
  fat: number
  items: string[]
  confidence: number
  notes: string
}

function extractJson(text: string): MealAnalysis {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('Resposta da IA sem JSON')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MealAnalysis>
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

async function analyzeWithVertex(imageBase64: string, mimeType: string): Promise<MealAnalysis> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const access = await client.getAccessToken()
  if (!access.token) throw new Error('Sem token para Vertex AI')

  const projectId =
    process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fitgym-31986'
  const model = 'gemini-2.0-flash-001'
  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`

  const prompt = `Você é nutricionista. Analise a foto de uma refeição.
Responda APENAS com JSON válido (sem markdown), neste formato:
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
Estime calorias e macros (gramas) com base no que vê no prato. Se a imagem não for comida, use calories 0 e explique em notes.`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  })

  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`Vertex AI (${res.status}): ${raw.slice(0, 280)}`)
  }

  const json = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
  if (!text) throw new Error('IA não retornou texto')
  return extractJson(text)
}

async function analyzeWithGeminiKey(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<MealAnalysis> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const prompt = `Você é nutricionista. Analise a foto de uma refeição.
Responda APENAS com JSON válido (sem markdown), neste formato:
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
Estime calorias e macros (gramas) com base no que vê no prato. Se a imagem não for comida, use calories 0 e explique em notes.`

  const res = await fetch(url, {
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
  })

  const raw = await res.text()
  if (!res.ok) throw new Error(`Gemini API (${res.status}): ${raw.slice(0, 280)}`)
  const json = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
  if (!text) throw new Error('IA não retornou texto')
  return extractJson(text)
}

export const analyzeMealPhoto = onCall(
  {
    timeoutSeconds: 90,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Faça login para analisar a refeição')
    }

    const { imageBase64, mimeType } = (request.data ?? {}) as {
      imageBase64?: string
      mimeType?: string
    }

    if (!imageBase64 || imageBase64.length < 100) {
      throw new HttpsError('invalid-argument', 'Envie uma foto válida da refeição')
    }
    if (imageBase64.length > 4_000_000) {
      throw new HttpsError('invalid-argument', 'Imagem muito grande. Tire outra foto mais leve.')
    }

    const safeMime =
      mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg'

    const geminiKey = process.env.GEMINI_API_KEY || ''

    try {
      return await analyzeWithVertex(imageBase64, safeMime)
    } catch (vertexErr) {
      console.warn('Vertex falhou, tentando Gemini API key', vertexErr)
      if (geminiKey) {
        try {
          return await analyzeWithGeminiKey(geminiKey, imageBase64, safeMime)
        } catch (geminiErr) {
          const message = geminiErr instanceof Error ? geminiErr.message : 'Falha Gemini'
          throw new HttpsError('internal', message)
        }
      }
      const message = vertexErr instanceof Error ? vertexErr.message : 'Falha na análise'
      throw new HttpsError(
        'failed-precondition',
        `Ative a API Vertex AI no projeto ou defina GEMINI_API_KEY. Detalhe: ${message}`,
      )
    }
  },
)

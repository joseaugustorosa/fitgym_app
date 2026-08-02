import { randomBytes } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { GoogleAuth } from 'google-auth-library'

initializeApp()
setGlobalOptions({ region: 'southamerica-east1' })

const db = getFirestore()
const auth = getAuth()

async function getUserRole(uid: string | undefined): Promise<{ role: string; gymId: string | null }> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Faça login para continuar')
  }
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) {
    throw new HttpsError('permission-denied', 'Perfil não encontrado')
  }
  const data = snap.data()!
  const role = data.role === 'admin' ? 'gym_admin' : String(data.role || 'aluno')
  return { role, gymId: (data.gymId as string) || null }
}

async function assertGymStaff(uid: string | undefined, gymId: string) {
  const { role, gymId: userGymId } = await getUserRole(uid)
  if (role === 'super_admin') return
  if ((role === 'gym_admin' || role === 'professor') && userGymId === gymId) return
  throw new HttpsError('permission-denied', 'Sem permissão para esta academia')
}

async function assertSuperAdmin(uid: string | undefined) {
  const { role } = await getUserRole(uid)
  if (role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Apenas super administradores')
  }
}

async function assertGymActive(gymId: string) {
  const gym = await db.collection('gyms').doc(gymId).get()
  if (!gym.exists || gym.data()?.active === false || gym.data()?.status === 'suspended') {
    throw new HttpsError('failed-precondition', 'Academia inativa ou suspensa')
  }
}

async function resolveBranch(gymId: string, branchId: string | null | undefined) {
  if (!branchId) return { branchId: null as string | null, branchName: '' }
  const snap = await db.collection('gymBranches').doc(branchId).get()
  if (!snap.exists || snap.data()?.gymId !== gymId || snap.data()?.active === false) {
    throw new HttpsError('invalid-argument', 'Filial inválida ou inativa')
  }
  return { branchId, branchName: String(snap.data()?.name || '').trim() }
}

function inviteToken(): string {
  return randomBytes(24).toString('hex')
}

export const createInvite = onCall(async (request) => {
  const { gymId, name, email, unit, branchId, assignedWorkoutPlanId, assignedMealPlanId } = (request.data ??
    {}) as {
    gymId?: string
    name?: string
    email?: string
    unit?: string
    branchId?: string | null
    assignedWorkoutPlanId?: string | null
    assignedMealPlanId?: string | null
  }

  if (!gymId?.trim() || !name?.trim() || !email?.trim()) {
    throw new HttpsError('invalid-argument', 'Informe academia, nome e e-mail')
  }

  const trimmedGymId = gymId.trim()
  await assertGymStaff(request.auth?.uid, trimmedGymId)
  await assertGymActive(trimmedGymId)

  const { branchId: resolvedBranchId, branchName } = await resolveBranch(trimmedGymId, branchId ?? null)

  const normalizedEmail = email.trim().toLowerCase()
  try {
    await auth.getUserByEmail(normalizedEmail)
    throw new HttpsError('already-exists', 'Este e-mail já possui conta no app')
  } catch (err) {
    if (err instanceof HttpsError) throw err
  }

  const token = inviteToken()
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()

  await db.collection('invites').doc(token).set({
    gymId: trimmedGymId,
    email: normalizedEmail,
    name: name.trim(),
    unit: branchName || unit?.trim() || '',
    branchId: resolvedBranchId,
    assignedWorkoutPlanId: assignedWorkoutPlanId || null,
    assignedMealPlanId: assignedMealPlanId || null,
    createdBy: request.auth!.uid,
    status: 'pending',
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    redeemedAt: null,
    redeemedBy: null,
  })

  return { token, expiresAt }
})

export const redeemInvite = onCall(async (request) => {
  const { token, password, name } = (request.data ?? {}) as {
    token?: string
    password?: string
    name?: string
  }

  if (!token?.trim() || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Informe convite válido e senha com pelo menos 6 caracteres')
  }

  const inviteRef = db.collection('invites').doc(token.trim())
  const inviteSnap = await inviteRef.get()
  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'Convite inválido ou expirado')
  }

  const invite = inviteSnap.data()!
  if (invite.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Este convite já foi utilizado ou expirou')
  }
  if (new Date(String(invite.expiresAt)).getTime() < Date.now()) {
    await inviteRef.update({ status: 'expired' })
    throw new HttpsError('failed-precondition', 'Convite expirado. Peça um novo link à academia.')
  }

  await assertGymActive(String(invite.gymId))

  const displayName = (name?.trim() || String(invite.name)).trim()
  if (displayName.length < 2) {
    throw new HttpsError('invalid-argument', 'Informe seu nome')
  }

  let user
  try {
    user = await auth.createUser({
      email: String(invite.email),
      password,
      displayName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar usuário'
    throw new HttpsError('already-exists', message)
  }

  const avatarInitial = displayName.charAt(0).toUpperCase()
  await db.collection('users').doc(user.uid).set({
    name: displayName,
    email: String(invite.email),
    role: 'aluno',
    gymId: invite.gymId,
    branchId: invite.branchId || null,
    unit: invite.unit || '',
    avatarInitial,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    streakDays: 0,
    lastCheckInAt: null,
    assignedWorkoutPlanId: invite.assignedWorkoutPlanId || null,
    assignedMealPlanId: invite.assignedMealPlanId || null,
  })

  await inviteRef.update({
    status: 'redeemed',
    redeemedAt: FieldValue.serverTimestamp(),
    redeemedBy: user.uid,
  })

  return { uid: user.uid }
})

export const createGymAdminInvite = onCall(async (request) => {
  await assertSuperAdmin(request.auth?.uid)

  const { gymId, name, email, role, password } = (request.data ?? {}) as {
    gymId?: string
    name?: string
    email?: string
    role?: 'gym_admin' | 'professor'
    password?: string
  }

  if (!gymId?.trim() || !name?.trim() || !email?.trim() || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'Informe academia, nome, e-mail e senha')
  }
  if (role !== 'gym_admin' && role !== 'professor') {
    throw new HttpsError('invalid-argument', 'Papel deve ser gym_admin ou professor')
  }

  const gym = await db.collection('gyms').doc(gymId.trim()).get()
  if (!gym.exists) {
    throw new HttpsError('not-found', 'Academia não encontrada')
  }

  let user
  try {
    user = await auth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: name.trim(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar usuário'
    throw new HttpsError('already-exists', message)
  }

  await db.collection('users').doc(user.uid).set({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    gymId: gymId.trim(),
    unit: '',
    avatarInitial: name.trim().charAt(0).toUpperCase(),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    streakDays: 0,
    lastCheckInAt: null,
    assignedWorkoutPlanId: null,
    assignedMealPlanId: null,
  })

  return { uid: user.uid }
})

export const createStudent = onCall(async () => {
  throw new HttpsError(
    'failed-precondition',
    'Cadastro direto desativado. Use convites (createInvite).',
  )
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
  const googleAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await googleAuth.getClient()
  const access = await client.getAccessToken()
  if (!access.token) throw new Error('Sem token para Vertex AI')

  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fitgym-31986'
  const model = 'gemini-2.0-flash-001'
  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`

  const prompt = `Você é nutricionista. Analise a foto de uma refeição.
Responda APENAS com JSON válido (sem markdown), neste formato:
{"title":"nome","calories":450,"protein":30,"carbs":40,"fat":15,"items":["a","b"],"confidence":0.75,"notes":"obs"}
Estime calorias e macros (gramas). Se não for comida, calories 0 e explique em notes.`

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
          parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  })

  const raw = await res.text()
  if (!res.ok) throw new Error(`Vertex AI (${res.status}): ${raw.slice(0, 280)}`)

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
Responda APENAS com JSON válido (sem markdown):
{"title":"nome","calories":450,"protein":30,"carbs":40,"fat":15,"items":["a"],"confidence":0.75,"notes":"obs"}`

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
  { timeoutSeconds: 90, memory: '512MiB' },
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

    const safeMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
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

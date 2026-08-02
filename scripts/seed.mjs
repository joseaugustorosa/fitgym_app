/**
 * Seed FitGym multi-tenant — exige serviceAccountKey.json na raiz.
 *
 * Cria: super_admin, 1 academia demo, gym_admin, conteúdo inicial (treino, dieta, desafios, dicas).
 *
 * Uso:
 *   node scripts/seed.mjs
 *   SUPER_EMAIL=... SUPER_PASSWORD=... GYM_NAME="Academia Demo" node scripts/seed.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const keyPath = resolve(root, 'serviceAccountKey.json')

if (!existsSync(keyPath)) {
  console.error('Arquivo serviceAccountKey.json não encontrado na raiz do projeto.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const db = getFirestore()
const auth = getAuth()

const GYM_ID = 'academia-demo'

const exercises = [
  {
    id: 'supino-reto',
    name: 'Supino reto',
    sets: '4×12',
    rest: '60s',
    muscle: 'Peitoral',
    equipment: 'Barra reta + banco',
    description: 'Deite no banco com os pés apoiados no chão.',
    tips: ['Mantenha as escápulas retraídas', 'Desça a barra até o peito'],
    videoUrl: '/videos/supino-reto.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&q=80',
  },
  {
    id: 'supino-inclinado',
    name: 'Supino inclinado',
    sets: '3×12',
    rest: '60s',
    muscle: 'Peitoral superior',
    equipment: 'Barra reta + banco inclinado',
    description: 'No banco inclinado a 30–45°.',
    tips: ['Incline o banco entre 30° e 45°'],
    videoUrl: '/videos/supino-inclinado.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&q=80',
  },
  {
    id: 'triceps-pulley',
    name: 'Tríceps pulley',
    sets: '4×12',
    rest: '45s',
    muscle: 'Tríceps',
    equipment: 'Cabo + barra reta',
    description: 'Empurre a barra para baixo estendendo os cotovelos.',
    tips: ['Cotovelos fixos ao lado do corpo'],
    videoUrl: '/videos/triceps-pulley.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2a1e?w=640&q=80',
  },
]

const mealPlan = {
  name: 'Plano padrão',
  userId: null,
  isDefault: true,
  caloriesGoal: 1850,
  waterGoalLiters: 3,
  macros: [
    { label: 'Proteína', current: 0, goal: 160, color: 'bg-blue-500', unit: 'g' },
    { label: 'Carboidratos', current: 0, goal: 200, color: 'bg-amber-500', unit: 'g' },
    { label: 'Gorduras', current: 0, goal: 60, color: 'bg-rose-500', unit: 'g' },
  ],
  meals: [
    { time: '07:00', name: 'Café da manhã', calories: 420, items: ['Ovos', 'Pão integral'], emoji: '🌅' },
    { time: '12:30', name: 'Almoço', calories: 650, items: ['Frango', 'Arroz', 'Brócolis'], emoji: '🍽️' },
    { time: '19:30', name: 'Jantar', calories: 480, items: ['Salmão', 'Batata doce'], emoji: '🌙' },
  ],
}

const gymTips = [
  { text: 'Hidrate-se antes do treino — 300ml já ajuda.', order: 0 },
  { text: 'Sequência bate intensidade: apareça hoje.', order: 1 },
  { text: 'Descanso também é treino. Durma bem.', order: 2 },
]

async function ensureSuperAdmin() {
  const email = process.env.SUPER_EMAIL || 'super@fitgym.app'
  const password = process.env.SUPER_PASSWORD || 'fitgym123'
  const name = process.env.SUPER_NAME || 'Super Admin FitGym'

  let user
  try {
    user = await auth.getUserByEmail(email)
    console.log('Super admin Auth já existe:', email)
  } catch {
    user = await auth.createUser({ email, password, displayName: name })
    console.log('Super admin criado:', email, '(senha:', password + ')')
  }

  await db.collection('users').doc(user.uid).set(
    {
      name,
      email,
      role: 'super_admin',
      gymId: null,
      unit: 'Plataforma',
      avatarInitial: name.charAt(0).toUpperCase(),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      streakDays: 0,
      lastCheckInAt: null,
      assignedWorkoutPlanId: null,
      assignedMealPlanId: null,
    },
    { merge: true },
  )
}

async function ensureGym() {
  const gymName = process.env.GYM_NAME || 'Academia Demo FitGym'
  await db.collection('gyms').doc(GYM_ID).set(
    {
      name: gymName,
      contactEmail: 'contato@academia-demo.app',
      planAmount: 299,
      billingDay: 5,
      status: 'active',
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  console.log('Academia seedada:', GYM_ID, gymName)
}

async function ensureGymAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@fitgym.app'
  const password = process.env.ADMIN_PASSWORD || 'fitgym123'
  const name = process.env.ADMIN_NAME || 'Admin Academia'

  let user
  try {
    user = await auth.getUserByEmail(email)
    console.log('Gym admin Auth já existe:', email)
  } catch {
    user = await auth.createUser({ email, password, displayName: name })
    console.log('Gym admin criado:', email, '(senha:', password + ')')
  }

  await db.collection('users').doc(user.uid).set(
    {
      name,
      email,
      role: 'gym_admin',
      gymId: GYM_ID,
      unit: '',
      avatarInitial: name.charAt(0).toUpperCase(),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      streakDays: 0,
      lastCheckInAt: null,
      assignedWorkoutPlanId: null,
      assignedMealPlanId: null,
    },
    { merge: true },
  )
}

async function seedGymContent() {
  const batch = db.batch()

  for (const ex of exercises) {
    const { id, ...data } = ex
    batch.set(db.collection('exercises').doc(id), { ...data, gymId: GYM_ID }, { merge: true })
  }

  batch.set(
    db.collection('workoutPlans').doc('programa-abc'),
    {
      gymId: GYM_ID,
      name: 'Programa ABC',
      description: 'Divisão clássica — peito/tríceps, costas/bíceps, pernas e ombros/abdômen',
      level: 'Intermediário',
      active: true,
      sessions: [
        {
          id: 'treino-a',
          label: 'Treino A',
          subtitle: 'Peito e Tríceps',
          muscleFocus: 'Peitoral',
          durationMin: 45,
          order: 0,
          exerciseIds: ['supino-reto', 'supino-inclinado', 'triceps-pulley'],
        },
        {
          id: 'treino-b',
          label: 'Treino B',
          subtitle: 'Costas e Bíceps',
          muscleFocus: 'Costas',
          durationMin: 50,
          order: 1,
          exerciseIds: ['puxada-frontal', 'remada-curvada', 'rosca-direta', 'rosca-martelo'],
        },
        {
          id: 'treino-c',
          label: 'Treino C',
          subtitle: 'Pernas completas',
          muscleFocus: 'Quadríceps',
          durationMin: 55,
          order: 2,
          exerciseIds: ['agachamento', 'leg-press', 'cadeira-extensora', 'stiff'],
        },
        {
          id: 'treino-d',
          label: 'Treino D',
          subtitle: 'Ombros e Abdômen',
          muscleFocus: 'Ombros',
          durationMin: 40,
          order: 3,
          exerciseIds: ['desenvolvimento', 'elevacao-lateral', 'prancha', 'abdominal-crunch'],
        },
      ],
    },
    { merge: true },
  )

  batch.set(
    db.collection('mealPlans').doc('default-meal-plan'),
    { ...mealPlan, gymId: GYM_ID },
    { merge: true },
  )

  batch.set(
    db.collection('challenges').doc('30-dias'),
    {
      gymId: GYM_ID,
      title: '30 dias de treino',
      emoji: '🔥',
      participants: 0,
      endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    { merge: true },
  )

  for (const [i, tip] of gymTips.entries()) {
    batch.set(
      db.collection('gymTips').doc(`tip-${i}`),
      { gymId: GYM_ID, text: tip.text, active: true, order: tip.order },
      { merge: true },
    )
  }

  await batch.commit()
  console.log('Conteúdo da academia seedado (exercícios, treino, dieta, desafio, dicas).')
}

await ensureSuperAdmin()
await ensureGym()
await ensureGymAdmin()
await seedGymContent()
console.log('Seed multi-tenant concluído.')
console.log('')
console.log('Acessos:')
console.log('  Plataforma: super@fitgym.app / fitgym123 → /platform')
console.log('  Academia:   admin@fitgym.app / fitgym123 → /admin')
console.log('  Alunos:     convite via /admin/alunos')

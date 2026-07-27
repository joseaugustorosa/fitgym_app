/**
 * Seed FitGym — exige serviceAccountKey.json na raiz do projeto.
 *
 * Uso:
 *   1. Firebase Console → Project settings → Service accounts → Generate new private key
 *   2. Salve como serviceAccountKey.json na raiz (já está no .gitignore)
 *   3. node scripts/seed.mjs
 *   4. Opcional: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... node scripts/seed.mjs
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
  console.error('Baixe a chave no Firebase Console (Service accounts) e tente de novo.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const db = getFirestore()
const auth = getAuth()

const exercises = [
  {
    id: 'supino-reto',
    name: 'Supino reto',
    sets: '4×12',
    rest: '60s',
    muscle: 'Peitoral',
    equipment: 'Barra reta + banco',
    description:
      'Deite no banco com os pés apoiados no chão. Segure a barra na largura dos ombros, desça controlando até o peito e empurre de volta.',
    tips: [
      'Mantenha as escápulas retraídas durante todo o movimento',
      'Desça a barra até a linha do mamilo',
      'Evite arquear demais a lombar',
    ],
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
    description:
      'No banco inclinado a 30–45°, desça a barra controladamente até a parte superior do peito e empurre para cima.',
    tips: [
      'Incline o banco entre 30° e 45°',
      'Foco na contração da parte superior do peito',
      'Controle a descida em 2–3 segundos',
    ],
    videoUrl: '/videos/supino-inclinado.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&q=80',
  },
  {
    id: 'crucifixo',
    name: 'Crucifixo',
    sets: '3×15',
    rest: '45s',
    muscle: 'Peitoral',
    equipment: 'Halteres + banco',
    description:
      'Deitado no banco, abra os braços com cotovelos levemente flexionados e una os halteres acima do peito em movimento de arco.',
    tips: [
      'Mantenha leve flexão nos cotovelos',
      'Desça até sentir alongamento no peito',
      'Não deixe os halteres baterem no topo',
    ],
    videoUrl: '/videos/crucifixo.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=640&q=80',
  },
  {
    id: 'triceps-pulley',
    name: 'Tríceps pulley',
    sets: '4×12',
    rest: '45s',
    muscle: 'Tríceps',
    equipment: 'Cabo + barra reta',
    description:
      'De frente para o pulley, empurre a barra para baixo estendendo os cotovelos. Retorne controlando sem mover os ombros.',
    tips: [
      'Cotovelos fixos ao lado do corpo',
      'Contraia o tríceps no final do movimento',
      'Evite usar impulso com o tronco',
    ],
    videoUrl: '/videos/triceps-pulley.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2a1e?w=640&q=80',
  },
  {
    id: 'triceps-testa',
    name: 'Tríceps testa',
    sets: '3×12',
    rest: '45s',
    muscle: 'Tríceps',
    equipment: 'Barra W ou halter',
    description:
      'Deitado no banco, desça a barra em direção à testa flexionando os cotovelos e estenda os braços de volta à posição inicial.',
    tips: [
      'Mantenha os cotovelos apontados para cima',
      'Desça devagar para proteger os cotovelos',
      'Use carga moderada com boa forma',
    ],
    videoUrl: '/videos/triceps-testa.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=640&q=80',
  },
  {
    id: 'mergulho',
    name: 'Mergulho',
    sets: '3×10',
    rest: '60s',
    muscle: 'Tríceps / Peito',
    equipment: 'Paralelas',
    description:
      'Apoie-se nas paralelas, desça o corpo flexionando os cotovelos até 90° e empurre de volta. Incline levemente para focar no peito.',
    tips: [
      'Incline o tronco para ativar mais o peito',
      'Corpo reto enfatiza o tríceps',
      'Desça até sentir alongamento confortável',
    ],
    videoUrl: '/videos/mergulho.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=640&q=80',
  },
]

const mealPlan = {
  name: 'Plano padrão',
  userId: null,
  isDefault: true,
  caloriesGoal: 1850,
  macros: [
    { label: 'Proteína', current: 98, goal: 160, color: 'bg-blue-500', unit: 'g' },
    { label: 'Carboidratos', current: 142, goal: 200, color: 'bg-amber-500', unit: 'g' },
    { label: 'Gorduras', current: 38, goal: 60, color: 'bg-rose-500', unit: 'g' },
  ],
  meals: [
    {
      time: '07:00',
      name: 'Café da manhã',
      calories: 420,
      items: ['Ovos mexidos (3)', 'Pão integral', 'Abacate'],
      emoji: '🌅',
    },
    {
      time: '10:00',
      name: 'Lanche da manhã',
      calories: 180,
      items: ['Whey protein', 'Banana'],
      emoji: '🥤',
    },
    {
      time: '12:30',
      name: 'Almoço',
      calories: 650,
      items: ['Frango grelhado 200g', 'Arroz integral', 'Brócolis'],
      emoji: '🍽️',
    },
    {
      time: '16:00',
      name: 'Lanche da tarde',
      calories: 220,
      items: ['Iogurte grego', 'Granola', 'Morangos'],
      emoji: '🫐',
    },
    {
      time: '19:30',
      name: 'Jantar',
      calories: 480,
      items: ['Salmão 180g', 'Batata doce', 'Salada verde'],
      emoji: '🌙',
    },
  ],
}

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@fitgym.app'
  const password = process.env.ADMIN_PASSWORD || 'fitgym123'
  const name = process.env.ADMIN_NAME || 'Admin FitGym'

  let user
  try {
    user = await auth.getUserByEmail(email)
    console.log('Admin Auth já existe:', email)
  } catch {
    user = await auth.createUser({ email, password, displayName: name })
    console.log('Admin Auth criado:', email, '(senha:', password + ')')
  }

  await db.collection('users').doc(user.uid).set(
    {
      name,
      email,
      role: 'admin',
      unit: 'Unidade Centro',
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
  console.log('Documento users/' + user.uid + ' com role=admin')
}

async function seedContent() {
  const batch = db.batch()
  for (const ex of exercises) {
    const { id, ...data } = ex
    batch.set(db.collection('exercises').doc(id), data, { merge: true })
  }
  batch.set(
    db.collection('workoutPlans').doc('treino-a'),
    {
      title: 'Treino A',
      subtitle: 'Peito e Tríceps',
      muscleFocus: 'Peito',
      exerciseIds: exercises.map((e) => e.id),
      durationMin: 45,
      level: 'Intermediário',
      active: true,
    },
    { merge: true },
  )
  batch.set(db.collection('mealPlans').doc('default-meal-plan'), mealPlan, { merge: true })
  batch.set(
    db.collection('challenges').doc('30-dias'),
    {
      title: '30 dias de treino',
      emoji: '🔥',
      participants: 128,
      endsAt: new Date(Date.now() + 18 * 86400000).toISOString(),
    },
    { merge: true },
  )
  batch.set(
    db.collection('challenges').doc('10k-passos'),
    {
      title: 'Desafio 10k passos',
      emoji: '👟',
      participants: 89,
      endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
    { merge: true },
  )
  await batch.commit()
  console.log('Exercícios, plano de treino, dieta e desafios seedados.')
}

await ensureAdmin()
await seedContent()
console.log('Seed concluído.')

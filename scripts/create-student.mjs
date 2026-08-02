/**
 * Cria um aluno sem Cloud Functions (útil no plano Spark/free).
 * Uso: node scripts/create-student.mjs nome email senha [unidade]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json')

if (!existsSync(keyPath)) {
  console.error('serviceAccountKey.json não encontrado')
  process.exit(1)
}

const [name, email, password, unit = ''] = process.argv.slice(2)
if (!name || !email || !password) {
  console.error('Uso: node scripts/create-student.mjs "Nome" email@x.com senha [unidade]')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })

const user = await getAuth().createUser({
  email,
  password,
  displayName: name,
})

await getFirestore()
  .collection('users')
  .doc(user.uid)
  .set({
    name,
    email: email.toLowerCase(),
    role: 'aluno',
    unit,
    avatarInitial: name.charAt(0).toUpperCase(),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    streakDays: 0,
    lastCheckInAt: null,
    assignedWorkoutPlanId: 'treino-a',
    assignedMealPlanId: 'default-meal-plan',
  })

console.log('Aluno criado:', email, 'uid:', user.uid)

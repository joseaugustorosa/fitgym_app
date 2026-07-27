import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, type Functions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your-api-key',
)

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let functions: Functions | undefined

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  functions = getFunctions(app, 'southamerica-east1')
}

export { app, auth, db, functions }

export function requireAuth(): Auth {
  if (!auth) throw new Error('Firebase Auth não configurado. Preencha o .env')
  return auth
}

export function requireDb(): Firestore {
  if (!db) throw new Error('Firestore não configurado. Preencha o .env')
  return db
}

export function requireFunctions(): Functions {
  if (!functions) throw new Error('Cloud Functions não configuradas. Preencha o .env')
  return functions
}

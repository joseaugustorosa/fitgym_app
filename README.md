# FitGym

App web mobile-first para academia (aluno + admin), com Firebase Auth, Firestore e Cloud Functions.

Baseado no protótipo em `academia_gym` (Sessão, Treino, Dieta, Comunidade), agora com login e persistência.

## Stack

- React 19 + Vite + TypeScript + Tailwind CSS 4
- Firebase Auth (e-mail/senha)
- Cloud Firestore
- Cloud Functions (convites, análise de refeição)
- **Vercel** (frontend em produção)

## Setup rápido

### 1. Instalar dependências

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Criar projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/) e crie um projeto.
2. Ative **Authentication** → método **E-mail/senha**.
3. Crie um banco **Firestore** (modo produção; as regras estão em `firestore.rules`).
4. Em Project settings → Your apps → Web, copie a config.
5. Copie o exemplo de env:

```bash
cp .env.example .env
```

Preencha:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Deploy das regras e Functions

```bash
npm i -g firebase-tools
firebase login
firebase use <seu-project-id>
firebase deploy --only firestore:rules,functions
```

### 4. Seed (admin + conteúdo inicial)

1. Firebase Console → Project settings → Service accounts → **Generate new private key**
2. Salve como `serviceAccountKey.json` na raiz (já ignorado pelo git)
3. Rode:

```bash
npm run seed
```

Credenciais padrão do admin:

- E-mail: `admin@fitgym.app`
- Senha: `fitgym123`

Customize com:

```bash
ADMIN_EMAIL=voce@email.com ADMIN_PASSWORD=senhaForte ADMIN_NAME="José" npm run seed
```

### 5. Rodar o app

```bash
npm run dev
```

Abra o endereço do Vite (geralmente `http://localhost:5173`).

- Login aluno: conta criada pelo admin em `/admin/alunos`
- Login admin: credenciais do seed → depois `/admin`

## Papéis

| Role | Acesso |
|------|--------|
| `aluno` | App mobile (`/`) — check-in, treino, dieta, comunidade |
| `admin` | Painel `/admin` + também pode abrir o app aluno |

Não há cadastro público: só o admin cria alunos (Cloud Function `createStudent`).

## Scan de calorias (foto da refeição)

Na aba **Dieta**, o botão **Fotografar refeição** abre a câmera, analisa o prato e estima kcal/macros.

Para a IA funcionar de verdade, faça **um** destes:

1. Ative [Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=fitgym-31986) no Google Cloud, **ou**
2. Crie uma chave em [Google AI Studio](https://aistudio.google.com/apikey) e adicione no `.env`:

```env
VITE_GEMINI_API_KEY=sua_chave_aqui
```

Reinicie o `npm run dev` após alterar o `.env`.

Sem chave/API, o app ainda abre o formulário com estimativa editável para você ajustar e salvar.

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run seed` | Seed Firestore + admin |
| `cd functions && npm run deploy` | Deploy Functions |

## Estrutura

```
src/
  pages/aluno/     # App do membro
  pages/admin/     # Painel admin
  pages/auth/      # Login
  services/api.ts  # Firestore + Functions
  contexts/        # Auth
functions/         # createStudent
scripts/seed.mjs   # Bootstrap
```

## Deploy

**Frontend (Vercel)** — conecte o repositório GitHub na [Vercel](https://vercel.com). Cada push em `main` gera deploy automático. Configure as mesmas variáveis do `.env` (`VITE_FIREBASE_*`, opcional `VITE_GEMINI_API_KEY`) em *Project Settings → Environment Variables*.

**Backend (Firebase)** — regras, índices e Cloud Functions:

```bash
npm run deploy:firebase
```

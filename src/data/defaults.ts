import type { Exercise } from '../types'

/** Fallback local enquanto Firestore não está seedado */
export const defaultExercises: Exercise[] = [
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

export const defaultMealPlan = {
  name: 'Plano padrão',
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

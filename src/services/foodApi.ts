import { FOOD_CATALOG, type CatalogFood } from '../data/foodCatalog'
import type { MealAnalysisResult } from '../types'
import { hasGeminiBrowserKey } from './mealAi'

export interface FoodItem {
  id: string
  name: string
  brand?: string
  imageUrl?: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  defaultGrams: number
  source: 'catalog' | 'openfoodfacts' | 'ai'
}

export interface FoodPortion {
  food: FoodItem
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

function scale(per100: number, grams: number) {
  return Math.round((per100 * grams) / 100)
}

export function portionFromFood(food: FoodItem, grams: number): FoodPortion {
  const g = Math.max(1, Math.round(grams))
  return {
    food,
    grams: g,
    calories: scale(food.caloriesPer100g, g),
    protein: scale(food.proteinPer100g, g),
    carbs: scale(food.carbsPer100g, g),
    fat: scale(food.fatPer100g, g),
  }
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function searchCatalog(query: string): FoodItem[] {
  const q = normalize(query.trim())
  if (q.length < 2) {
    return FOOD_CATALOG.slice(0, 12).map(catalogToItem)
  }
  return FOOD_CATALOG.filter((f) => normalize(f.name).includes(q))
    .slice(0, 20)
    .map(catalogToItem)
}

function catalogToItem(f: CatalogFood): FoodItem {
  return {
    id: f.id,
    name: f.name,
    brand: f.brand,
    caloriesPer100g: f.caloriesPer100g,
    proteinPer100g: f.proteinPer100g,
    carbsPer100g: f.carbsPer100g,
    fatPer100g: f.fatPer100g,
    defaultGrams: f.defaultGrams,
    source: 'catalog',
    imageUrl: null,
  }
}

/** Open Food Facts — busca por texto (sem API key). */
async function searchOpenFoodFacts(query: string): Promise<FoodItem[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '15')
  url.searchParams.set('lc', 'pt')
  url.searchParams.set('cc', 'br')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FitGym/1.0 (https://github.com/joseaugustorosa/fitgym_app)',
    },
  })
  if (!res.ok) throw new Error(`Open Food Facts (${res.status})`)
  const data = (await res.json()) as {
    products?: Array<{
      code?: string
      product_name?: string
      product_name_pt?: string
      brands?: string
      image_front_small_url?: string
      nutriments?: Record<string, number | undefined>
      serving_quantity?: number
    }>
  }

  return (data.products ?? [])
    .map((p) => {
      const n = p.nutriments ?? {}
      const kcal =
        Number(n['energy-kcal_100g']) ||
        (Number(n['energy-kj_100g']) ? Number(n['energy-kj_100g']) / 4.184 : 0) ||
        0
      const protein = Number(n.proteins_100g) || 0
      const carbs = Number(n.carbohydrates_100g) || 0
      const fat = Number(n.fat_100g) || 0
      const name = (p.product_name_pt || p.product_name || '').trim()
      if (!name || kcal <= 0) return null
      const serving = Number(p.serving_quantity) || 100
      return {
        id: `off_${p.code || name}`,
        name,
        brand: p.brands?.split(',')[0]?.trim(),
        imageUrl: p.image_front_small_url ?? null,
        caloriesPer100g: Math.round(kcal),
        proteinPer100g: Math.round(protein * 10) / 10,
        carbsPer100g: Math.round(carbs * 10) / 10,
        fatPer100g: Math.round(fat * 10) / 10,
        defaultGrams: serving > 0 && serving <= 500 ? Math.round(serving) : 100,
        source: 'openfoodfacts' as const,
      } satisfies FoodItem
    })
    .filter(Boolean)
    .slice(0, 12) as FoodItem[]
}

function extractJson(text: string): MealAnalysisResult {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('IA sem JSON')
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<MealAnalysisResult> & {
    caloriesPer100g?: number
    proteinPer100g?: number
    carbsPer100g?: number
    fatPer100g?: number
  }
  return {
    title: String(parsed.title || 'Alimento').slice(0, 80),
    calories: Math.max(0, Math.round(Number(parsed.caloriesPer100g ?? parsed.calories) || 0)),
    protein: Math.max(0, Math.round(Number(parsed.proteinPer100g ?? parsed.protein) || 0)),
    carbs: Math.max(0, Math.round(Number(parsed.carbsPer100g ?? parsed.carbs) || 0)),
    fat: Math.max(0, Math.round(Number(parsed.fatPer100g ?? parsed.fat) || 0)),
    items: [String(parsed.title || 'Alimento')],
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.55)),
    notes: String(parsed.notes || 'Estimativa por IA').slice(0, 240),
  }
}

async function estimateFoodWithGeminiBrowser(foodName: string): Promise<FoodItem> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey || apiKey === 'your-gemini-key') throw new Error('Sem chave Gemini')

  const prompt = `Estime a nutrição por 100g do alimento "${foodName}" (culinária brasileira se aplicável).
Responda APENAS JSON válido:
{
  "title": "nome do alimento",
  "caloriesPer100g": 150,
  "proteinPer100g": 10,
  "carbsPer100g": 20,
  "fatPer100g": 5,
  "confidence": 0.7,
  "notes": "breve"
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    },
  )
  const raw = await res.text()
  if (!res.ok) throw new Error(`Gemini (${res.status})`)
  const json = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
  const parsed = extractJson(text)
  return {
    id: `ai_${Date.now()}`,
    name: parsed.title,
    caloriesPer100g: parsed.calories,
    proteinPer100g: parsed.protein,
    carbsPer100g: parsed.carbs,
    fatPer100g: parsed.fat,
    defaultGrams: 100,
    source: 'ai',
    imageUrl: null,
  }
}

/** Heurística local quando não há API/IA. */
function estimateFoodHeuristic(foodName: string): FoodItem {
  const n = normalize(foodName)
  let calories = 150
  let protein = 8
  let carbs = 15
  let fat = 5
  if (n.includes('frango') || n.includes('peito') || n.includes('carne') || n.includes('ovo')) {
    calories = 165
    protein = 28
    carbs = 0
    fat = 5
  } else if (n.includes('arroz') || n.includes('macarrao') || n.includes('pao') || n.includes('batata')) {
    calories = 130
    protein = 3
    carbs = 28
    fat = 1
  } else if (n.includes('salada') || n.includes('alface') || n.includes('brocolis')) {
    calories = 25
    protein = 2
    carbs = 4
    fat = 0
  } else if (n.includes('doce') || n.includes('bolo') || n.includes('chocolate')) {
    calories = 350
    protein = 4
    carbs = 45
    fat = 15
  }
  return {
    id: `heuristic_${Date.now()}`,
    name: foodName.trim() || 'Alimento',
    caloriesPer100g: calories,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    defaultGrams: 100,
    source: 'ai',
    imageUrl: null,
  }
}

/**
 * Busca alimentos: catálogo local → Open Food Facts.
 * Se vazio, o caller pode chamar estimateFoodWithAI.
 */
export async function searchFoods(query: string): Promise<{
  results: FoodItem[]
  fromApi: boolean
}> {
  const catalog = searchCatalog(query)
  let apiResults: FoodItem[] = []
  try {
    if (query.trim().length >= 2) {
      apiResults = await searchOpenFoodFacts(query.trim())
    }
  } catch {
    apiResults = []
  }

  const seen = new Set(catalog.map((c) => normalize(c.name)))
  const merged = [
    ...catalog,
    ...apiResults.filter((r) => !seen.has(normalize(r.name))),
  ]
  return { results: merged, fromApi: apiResults.length > 0 }
}

/** Estimativa por IA (Gemini) ou heurística. */
export async function estimateFoodWithAI(foodName: string): Promise<FoodItem> {
  const name = foodName.trim()
  if (!name) throw new Error('Informe o nome do alimento')

  if (hasGeminiBrowserKey()) {
    try {
      return await estimateFoodWithGeminiBrowser(name)
    } catch {
      /* fallback heurístico */
    }
  }

  return estimateFoodHeuristic(name)
}

export function foodSourceLabel(source: FoodItem['source']) {
  if (source === 'catalog') return 'Catálogo FitGym'
  if (source === 'openfoodfacts') return 'Open Food Facts'
  return 'Estimativa IA'
}

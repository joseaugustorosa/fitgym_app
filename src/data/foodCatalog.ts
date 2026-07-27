/** Alimentos comuns (BR) — valores por 100g. */
export interface CatalogFood {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  defaultGrams: number
  source: 'catalog'
}

export const FOOD_CATALOG: CatalogFood[] = [
  { id: 'arroz-branco', name: 'Arroz branco cozido', caloriesPer100g: 128, proteinPer100g: 2.5, carbsPer100g: 28, fatPer100g: 0.2, defaultGrams: 150, source: 'catalog' },
  { id: 'arroz-integral', name: 'Arroz integral cozido', caloriesPer100g: 124, proteinPer100g: 2.6, carbsPer100g: 26, fatPer100g: 1, defaultGrams: 150, source: 'catalog' },
  { id: 'feijao-carioca', name: 'Feijão carioca cozido', caloriesPer100g: 76, proteinPer100g: 4.8, carbsPer100g: 14, fatPer100g: 0.5, defaultGrams: 100, source: 'catalog' },
  { id: 'feijao-preto', name: 'Feijão preto cozido', caloriesPer100g: 77, proteinPer100g: 4.5, carbsPer100g: 14, fatPer100g: 0.5, defaultGrams: 100, source: 'catalog' },
  { id: 'frango-grelhado', name: 'Peito de frango grelhado', caloriesPer100g: 159, proteinPer100g: 32, carbsPer100g: 0, fatPer100g: 3.2, defaultGrams: 150, source: 'catalog' },
  { id: 'carne-patinho', name: 'Carne bovina (patinho) grelhada', caloriesPer100g: 219, proteinPer100g: 32, carbsPer100g: 0, fatPer100g: 9, defaultGrams: 120, source: 'catalog' },
  { id: 'ovo-cozido', name: 'Ovo cozido', caloriesPer100g: 146, proteinPer100g: 13, carbsPer100g: 0.6, fatPer100g: 9.5, defaultGrams: 50, source: 'catalog' },
  { id: 'ovo-mexido', name: 'Ovos mexidos', caloriesPer100g: 167, proteinPer100g: 11, carbsPer100g: 1.5, fatPer100g: 12, defaultGrams: 100, source: 'catalog' },
  { id: 'batata-doce', name: 'Batata-doce cozida', caloriesPer100g: 77, proteinPer100g: 1.4, carbsPer100g: 18, fatPer100g: 0.1, defaultGrams: 150, source: 'catalog' },
  { id: 'batata-inglesa', name: 'Batata inglesa cozida', caloriesPer100g: 52, proteinPer100g: 1.2, carbsPer100g: 12, fatPer100g: 0, defaultGrams: 150, source: 'catalog' },
  { id: 'banana', name: 'Banana prata', caloriesPer100g: 98, proteinPer100g: 1.3, carbsPer100g: 26, fatPer100g: 0.1, defaultGrams: 100, source: 'catalog' },
  { id: 'maca', name: 'Maçã', caloriesPer100g: 56, proteinPer100g: 0.3, carbsPer100g: 15, fatPer100g: 0.2, defaultGrams: 130, source: 'catalog' },
  { id: 'aveia', name: 'Aveia em flocos', caloriesPer100g: 394, proteinPer100g: 14, carbsPer100g: 67, fatPer100g: 8.5, defaultGrams: 40, source: 'catalog' },
  { id: 'pao-integral', name: 'Pão integral', caloriesPer100g: 253, proteinPer100g: 9, carbsPer100g: 43, fatPer100g: 4, defaultGrams: 50, source: 'catalog' },
  { id: 'pao-frances', name: 'Pão francês', caloriesPer100g: 300, proteinPer100g: 8, carbsPer100g: 58, fatPer100g: 3.1, defaultGrams: 50, source: 'catalog' },
  { id: 'whey', name: 'Whey protein (dose)', caloriesPer100g: 400, proteinPer100g: 80, carbsPer100g: 8, fatPer100g: 5, defaultGrams: 30, source: 'catalog' },
  { id: 'iogurte-grego', name: 'Iogurte grego natural', caloriesPer100g: 97, proteinPer100g: 9, carbsPer100g: 3.6, fatPer100g: 5, defaultGrams: 150, source: 'catalog' },
  { id: 'leite-integral', name: 'Leite integral', caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.6, fatPer100g: 3.3, defaultGrams: 200, source: 'catalog' },
  { id: 'salmao', name: 'Salmão grelhado', caloriesPer100g: 208, proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 12, defaultGrams: 150, source: 'catalog' },
  { id: 'tilapia', name: 'Tilápia grelhada', caloriesPer100g: 128, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 2.7, defaultGrams: 150, source: 'catalog' },
  { id: 'brocolis', name: 'Brócolis cozido', caloriesPer100g: 35, proteinPer100g: 2.4, carbsPer100g: 7, fatPer100g: 0.4, defaultGrams: 100, source: 'catalog' },
  { id: 'alface', name: 'Alface', caloriesPer100g: 11, proteinPer100g: 1.4, carbsPer100g: 1.7, fatPer100g: 0.2, defaultGrams: 50, source: 'catalog' },
  { id: 'tomate', name: 'Tomate', caloriesPer100g: 15, proteinPer100g: 0.9, carbsPer100g: 3.1, fatPer100g: 0.2, defaultGrams: 100, source: 'catalog' },
  { id: 'abacate', name: 'Abacate', caloriesPer100g: 96, proteinPer100g: 1.2, carbsPer100g: 6, fatPer100g: 8.4, defaultGrams: 80, source: 'catalog' },
  { id: 'azeite', name: 'Azeite de oliva', caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, defaultGrams: 10, source: 'catalog' },
  { id: 'pasta-amendoim', name: 'Pasta de amendoim', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, defaultGrams: 20, source: 'catalog' },
  { id: 'tapioca', name: 'Tapioca (goma hidratada)', caloriesPer100g: 100, proteinPer100g: 0.2, carbsPer100g: 25, fatPer100g: 0, defaultGrams: 80, source: 'catalog' },
  { id: 'macarrao', name: 'Macarrão cozido', caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, defaultGrams: 180, source: 'catalog' },
  { id: 'queijo-minas', name: 'Queijo minas frescal', caloriesPer100g: 264, proteinPer100g: 17, carbsPer100g: 3.2, fatPer100g: 20, defaultGrams: 30, source: 'catalog' },
  { id: 'cafe-preto', name: 'Café preto (sem açúcar)', caloriesPer100g: 2, proteinPer100g: 0.1, carbsPer100g: 0, fatPer100g: 0, defaultGrams: 50, source: 'catalog' },
]

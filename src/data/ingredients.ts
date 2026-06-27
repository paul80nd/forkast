// The ingredient dictionary: canonical, purchasable things. Generic knowledge
// (no provider data), so it ships publicly. `purchaseUnit` is how you buy the
// item; the shopping list converts recipe units to it where it can.
// Note: "onion" and "red onion" are deliberately separate — different buys.

export interface IngredientDef {
  id: string
  name: string
  plural: string
  aisle: string
  /** Unit id you buy this in (see units.ts). */
  purchaseUnit: string
  /** Grams per ml, to bridge volume<->mass. Only set where it matters. */
  densityGPerMl?: number
  /** Alternate labels, for matching during import (used later by the importer). */
  aliases?: string[]
}

/** Shopping-list section order. Unknown aisles fall to the end. */
export const AISLE_ORDER = [
  'Produce',
  'Meat & Fish',
  'Dairy',
  'Bakery',
  'Pantry',
  'Frozen',
  'Other',
]

export const INGREDIENTS: IngredientDef[] = [
  // Produce
  { id: 'cherry-tomatoes', name: 'cherry tomatoes', plural: 'cherry tomatoes', aisle: 'Produce', purchaseUnit: 'g' },
  { id: 'garlic', name: 'garlic clove', plural: 'garlic cloves', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'basil', name: 'basil', plural: 'basil', aisle: 'Produce', purchaseUnit: 'g' },
  { id: 'onion', name: 'onion', plural: 'onions', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'red-onion', name: 'red onion', plural: 'red onions', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'ginger', name: 'piece of ginger', plural: 'pieces of ginger', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'spinach', name: 'spinach', plural: 'spinach', aisle: 'Produce', purchaseUnit: 'g' },
  { id: 'lemongrass', name: 'lemongrass stalk', plural: 'lemongrass stalks', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'carrot', name: 'carrot', plural: 'carrots', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'lime', name: 'lime', plural: 'limes', aisle: 'Produce', purchaseUnit: 'each' },
  { id: 'potatoes', name: 'potato', plural: 'potatoes', aisle: 'Produce', purchaseUnit: 'g' },
  { id: 'parsley', name: 'parsley', plural: 'parsley', aisle: 'Produce', purchaseUnit: 'g' },
  { id: 'spring-onion', name: 'spring onion', plural: 'spring onions', aisle: 'Produce', purchaseUnit: 'each' },

  // Meat & Fish
  { id: 'chicken-breast', name: 'chicken breast', plural: 'chicken breasts', aisle: 'Meat & Fish', purchaseUnit: 'each' },
  { id: 'white-fish', name: 'white fish fillet', plural: 'white fish fillets', aisle: 'Meat & Fish', purchaseUnit: 'g' },
  { id: 'beef-mince', name: 'beef mince', plural: 'beef mince', aisle: 'Meat & Fish', purchaseUnit: 'g' },

  // Dairy
  { id: 'soft-cheese', name: 'soft cheese', plural: 'soft cheese', aisle: 'Dairy', purchaseUnit: 'g' },
  { id: 'milk', name: 'milk', plural: 'milk', aisle: 'Dairy', purchaseUnit: 'ml' },
  { id: 'cheddar', name: 'cheddar', plural: 'cheddar', aisle: 'Dairy', purchaseUnit: 'g' },

  // Bakery
  { id: 'tortillas', name: 'tortilla', plural: 'tortillas', aisle: 'Bakery', purchaseUnit: 'each' },

  // Pantry
  { id: 'orzo', name: 'orzo', plural: 'orzo', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'vegetable-stock-cube', name: 'vegetable stock cube', plural: 'vegetable stock cubes', aisle: 'Pantry', purchaseUnit: 'each' },
  { id: 'chickpeas', name: 'chickpeas', plural: 'chickpeas', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'coconut-milk', name: 'coconut milk', plural: 'coconut milk', aisle: 'Pantry', purchaseUnit: 'ml' },
  { id: 'curry-powder', name: 'curry powder', plural: 'curry powder', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'jasmine-rice', name: 'jasmine rice', plural: 'jasmine rice', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'soy-sauce', name: 'soy sauce', plural: 'soy sauce', aisle: 'Pantry', purchaseUnit: 'ml' },
  { id: 'black-beans', name: 'black beans', plural: 'black beans', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'chipotle-paste', name: 'chipotle paste', plural: 'chipotle paste', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'sweetcorn', name: 'sweetcorn', plural: 'sweetcorn', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'plain-flour', name: 'plain flour', plural: 'plain flour', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'gochujang', name: 'gochujang', plural: 'gochujang', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'udon-noodles', name: 'udon noodles', plural: 'udon noodles', aisle: 'Pantry', purchaseUnit: 'g' },
  { id: 'sesame-oil', name: 'sesame oil', plural: 'sesame oil', aisle: 'Pantry', purchaseUnit: 'ml' },
]

export const INGREDIENTS_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]))

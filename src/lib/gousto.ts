import { readFileSync } from "fs";
import { join } from "path";
import Fuse from "fuse.js";

interface Recipe {
  gousto_uid: string;
  title: string;
  url: string;
}

export interface RecipeResult {
  gousto_uid: string;
  title: string;
  url: string;
  score: number;
}

export interface RecipeDetail {
  title: string;
  description: string;
  cuisine: string;
  prep_times: Record<string, number>;
  categories: string[];
  ingredients: string[];
  basics: string[];
  cooking_instructions: string[];
  allergens: string[];
  nutritional_information: {
    energy_kcal: number;
    energy_kj: number;
    fat_mg: number;
    fat_saturates_mg: number;
    carbs_mg: number;
    carbs_sugars_mg: number;
    fibre_mg: number;
    protein_mg: number;
    salt_mg: number;
    net_weight_mg: number;
  };
}

const GOUSTO_API_BASE =
  "https://production-api.gousto.co.uk/cmsreadbroker/v1/recipe";

const recipes: Recipe[] = JSON.parse(
  readFileSync(join(__dirname, "../../data/recipes.json"), "utf-8"),
);

const THRESHOLD = 0.4; // 0 = exact, 1 = match anything — 0.4 is a good balance

const fuse = new Fuse(recipes, {
  keys: ["title"],
  threshold: THRESHOLD,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
});

/**
 * Search for recipes by title
 *
 * @param query - The query to search for
 * @returns A list of recipes
 */
export function searchRecipes(query: string): RecipeResult[] {
  return fuse.search(query).map(({ item, score }) => ({
    gousto_uid: item.gousto_uid,
    title: item.title,
    url: item.url,
    score: score ?? 0,
  }));
}

/**
 * Get a recipe by its UID
 *
 * @param uid - The UID of the recipe to get
 * @returns The recipe details
 */
export async function getRecipe(
  uid: string,
): Promise<RecipeDetail | undefined> {
  const recipe = recipes.find((r) => r.gousto_uid === uid);

  if (!recipe) {
    return undefined;
  }

  const slug = recipe.url.split("/").at(-1)!;
  const response = await fetch(`${GOUSTO_API_BASE}/${slug}`);

  if (!response.ok) {
    throw new Error(
      `Gousto API returned ${response.status} for recipe "${slug}"`,
    );
  }

  const json = (await response.json()) as {
    data: {
      entry: {
        title: string;
        description: string;
        cuisine: { title: string };
        prep_times: Record<string, number>;
        categories: { title: string }[];
        ingredients: { label: string }[];
        basics: { title: string }[];
        cooking_instructions: { instruction: string }[];
        allergens: string[];
        nutritional_information: {
          per_portion: {
            energy_kcal: number;
            energy_kj: number;
            fat_mg: number;
            fat_saturates_mg: number;
            carbs_mg: number;
            carbs_sugars_mg: number;
            fibre_mg: number;
            protein_mg: number;
            salt_mg: number;
            net_weight_mg: number;
          };
        };
      };
    };
  };

  const entry = json.data.entry;

  return {
    title: entry.title,
    description: entry.description,
    cuisine: entry.cuisine.title,
    prep_times: entry.prep_times,
    categories: entry.categories.map((c) => c.title),
    ingredients: entry.ingredients.map((i) => i.label),
    basics: entry.basics.map((b) => b.title),
    cooking_instructions: entry.cooking_instructions.map((i) => i.instruction),
    allergens: entry.allergens,
    nutritional_information: entry.nutritional_information.per_portion,
  };
}

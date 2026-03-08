import { searchRecipesByTitle, getRecipe as getRecipeFromDb } from "./db";
import type { RecipeResult, RecipeDetail } from "./interfaces";

const GOUSTO_API_BASE =
  "https://production-api.gousto.co.uk/cmsreadbroker/v1/recipe";

/**
 * Search for recipes by title
 *
 * @param query - The query to search for
 * @returns A list of recipes
 */
export async function searchRecipes(query: string): Promise<RecipeResult[]> {
  const results = await searchRecipesByTitle(query);
  return results.map(({ gousto_uid, title, url, distance }) => ({
    gousto_uid,
    title,
    url,
    distance,
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
  const recipe = getRecipeFromDb(uid);

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

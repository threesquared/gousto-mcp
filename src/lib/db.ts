import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";
import { embed } from "./embeddings";
import type { Recipe } from "./interfaces";

const EMBEDDING_DIMS = 384;

const db = new DatabaseSync("data/recipes.db", { allowExtension: true });
sqliteVec.load(db);

// Initialize the database
export function initDb() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS recipes USING vec0(
      embedding float[${EMBEDDING_DIMS}],
      +gousto_uid TEXT,
      +title TEXT,
      +url TEXT
    )
  `);
}

// Add a recipe to the database
export async function addRecipe(recipe: Recipe) {
  const embedding = await embed(recipe.title);
  db.prepare(
    "INSERT INTO recipes(embedding, gousto_uid, title, url) VALUES (?, ?, ?, ?)",
  ).run(embedding, recipe.gousto_uid, recipe.title, recipe.url);
}

// Get a recipe from the database
export function getRecipe(gousto_uid: string): Recipe | undefined {
  return db
    .prepare("SELECT gousto_uid, title, url FROM recipes WHERE gousto_uid = ?")
    .get(gousto_uid) as Recipe | undefined;
}

// Close the database connection
export function closeDb() {
  db.close();
}

// Search for recipes by title
export async function searchRecipesByTitle(
  query: string,
): Promise<(Recipe & { distance: number })[]> {
  const queryEmbedding = await embed(`Represent this sentence: ${query}`);
  return db
    .prepare(
      "SELECT gousto_uid, title, url, distance FROM recipes WHERE embedding MATCH ? AND k = 5 ORDER BY distance",
    )
    .all(queryEmbedding) as unknown as (Recipe & { distance: number })[];
}

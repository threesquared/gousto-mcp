import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";
import { embed } from "./embeddings";
import type { Recipe, RecipeResult } from "./interfaces";

const EMBEDDING_DIMS = 384;
const DB_PATH = "data/recipes.db";

const db = new DatabaseSync(DB_PATH, { allowExtension: true });
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
export function getRecipe(uid: string): Recipe | undefined {
  const row = db
    .prepare("SELECT gousto_uid, title, url FROM recipes WHERE gousto_uid = ?")
    .get(uid);
  if (!row) return undefined;
  return {
    gousto_uid: String(row.gousto_uid),
    title: String(row.title),
    url: String(row.url),
  };
}

// Close the database connection
export function closeDb() {
  db.close();
}

// Search for recipes by title
export async function searchRecipesByTitle(
  query: string,
  limit: number = 5,
): Promise<RecipeResult[]> {
  const queryEmbedding = await embed(`Represent this sentence: ${query}`);
  return db
    .prepare(
      `SELECT gousto_uid, title, url, distance FROM recipes WHERE embedding MATCH ? AND k = ${limit} ORDER BY distance`,
    )
    .all(queryEmbedding)
    .map((row) => ({
      gousto_uid: String(row.gousto_uid),
      title: String(row.title),
      url: String(row.url),
      distance: Number(row.distance),
    }));
}

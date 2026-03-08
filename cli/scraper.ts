import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { initDb, addRecipe } from "../src/lib/db";
import type { Recipe } from "../src/lib/interfaces";

const BASE_URL = "https://production-api.gousto.co.uk/cmsreadbroker/v1/recipes";
const LIMIT = 50;
const CONCURRENCY = 5;
const DATA_DIR = join(process.cwd(), "data");
const JSON_PATH = join(DATA_DIR, "recipes.json");

interface ApiEntry {
  gousto_uid: string;
  title: string;
  url: string;
  [key: string]: unknown;
}

interface ApiResponse {
  status: string;
  data: {
    count: number;
    entries: ApiEntry[];
  };
  meta: {
    skip: number;
    limit: number;
  };
}

async function fetchPage(offset: number): Promise<ApiResponse> {
  const url = `${BASE_URL}?category=recipes&limit=${LIMIT}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} fetching offset=${offset}: ${res.statusText}`,
    );
  }
  return res.json() as Promise<ApiResponse>;
}

async function scrape() {
  console.log("Starting scraper...");

  const first = await fetchPage(0);
  const total = first.data.count;
  const totalPages = Math.ceil(total / LIMIT);

  mkdirSync(DATA_DIR, { recursive: true });

  const pick = ({ gousto_uid, title, url }: ApiEntry): Recipe => ({
    gousto_uid,
    title,
    url,
  });

  let allRecipes: Recipe[] = first.data.entries.map(pick);
  console.log(`  Fetched page 1/${totalPages}`);

  for (let page = 1; page < totalPages; page += CONCURRENCY) {
    const batch: Promise<ApiResponse>[] = [];

    for (let i = page; i < Math.min(page + CONCURRENCY, totalPages); i++) {
      batch.push(fetchPage(i * LIMIT));
    }

    const results = await Promise.all(batch);
    for (const result of results) {
      allRecipes = allRecipes.concat(result.data.entries.map(pick));
    }

    const pagesCompleted = Math.min(page + CONCURRENCY, totalPages);
    console.log(
      `  Fetched page ${pagesCompleted}/${totalPages} (${allRecipes.length} recipes so far)`,
    );
  }

  writeFileSync(JSON_PATH, JSON.stringify(allRecipes, null, 2), "utf-8");
  console.log(`Saved ${allRecipes.length} recipes to ${JSON_PATH}`);
}

async function embedRecipes() {
  console.log(`Reading recipes from ${JSON_PATH}...`);
  const allRecipes = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as Recipe[];
  console.log(`Loaded ${allRecipes.length} recipes`);

  mkdirSync(DATA_DIR, { recursive: true });
  initDb();

  for (let i = 0; i < allRecipes.length; i++) {
    const recipe = allRecipes[i];
    await addRecipe(recipe);

    if ((i + 1) % 100 === 0 || i + 1 === allRecipes.length) {
      console.log(`  Embedded ${i + 1}/${allRecipes.length}`);
    }
  }

  console.log("Finished");
}

const command = process.argv[2];

if (command === "scrape") {
  scrape().catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
} else if (command === "embed") {
  embedRecipes().catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
} else {
  console.error(`Usage: tsx cli/scraper.ts <scrape|embed>`);
  process.exit(1);
}

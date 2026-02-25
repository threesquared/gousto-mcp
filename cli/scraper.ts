import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE_URL = "https://production-api.gousto.co.uk/cmsreadbroker/v1/recipes";
const LIMIT = 50;
const CONCURRENCY = 5;
const DATA_DIR = join(process.cwd(), "data");

interface Recipe {
  gousto_uid: string;
  title: string;
  url: string;
}

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

  const outputPath = join(DATA_DIR, "recipes.json");
  writeFileSync(outputPath, JSON.stringify(allRecipes, null, 2), "utf-8");
  console.log("Finished");
}

scrape().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

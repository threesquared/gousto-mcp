import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createApp } from "../src/server/index.js";
import {
  connectClient,
  getToolResultText,
  withMockedGoustoFetch,
} from "./helpers.js";

describe("MCP Server Integration", () => {
  let baseUrl: string;
  let httpServer: http.Server;
  let shutdown: () => Promise<void>;

  before(async () => {
    const server = createApp();
    shutdown = server.shutdown;

    await new Promise<void>((resolve) => {
      httpServer = server.app.listen(0, () => resolve()); // 0 = random available port
    });

    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://localhost:${port}`;
    console.log(`Test server listening on ${baseUrl}`);
  });

  after(async () => {
    await shutdown();
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("Streamable HTTP: client can connect and list tools", async () => {
    const client = await connectClient(
      "test-streamable",
      new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)),
    );

    const { tools } = await client.listTools();
    assert.ok(
      tools.map((t) => t.name).includes("search_recipes"),
      "Expected 'search_recipes' in tools",
    );

    await client.close();
  });

  it("SSE: client can connect and list tools", async () => {
    const client = await connectClient(
      "test-sse",
      new SSEClientTransport(new URL(`${baseUrl}/sse`)),
    );

    const { tools } = await client.listTools();
    assert.ok(
      tools.map((t) => t.name).includes("search_recipes"),
      "Expected 'search_recipes' in tools",
    );

    await client.close();
  });

  it("search_recipes: returns matching recipes for a known query", async () => {
    const client = await connectClient(
      "test-search",
      new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)),
    );

    const result = await client.callTool({
      name: "search_recipes",
      arguments: { query: "chicken curry" },
    });

    const text = getToolResultText(result as CallToolResult);
    assert.ok(
      text.toLowerCase().includes("chicken"),
      `Expected response to mention chicken, got: ${text}`,
    );

    await client.close();
  });

  it("get_recipe: returns formatted recipe details for a known UID", async () => {
    const TEST_UID = "0159d098-9b10-4f7c-b0a3-169af3278208";

    const mockApiResponse = {
      data: {
        entry: {
          title: "Chicken, Date & Tamarind Curry With Kachumber",
          description: "A delicious curry with dates and tamarind.",
          cuisine: { title: "Indian" },
          prep_times: { for_2: 35, for_4: 45 },
          categories: [{ title: "Curry" }, { title: "Chicken" }],
          ingredients: [
            { label: "Chicken thighs" },
            { label: "Dates" },
            { label: "Tamarind paste" },
          ],
          basics: [{ title: "Oil" }, { title: "Salt" }],
          cooking_instructions: [
            { instruction: "Fry the chicken." },
            { instruction: "Add the sauce and simmer." },
          ],
          allergens: ["Gluten", "Celery"],
          nutritional_information: {
            per_portion: {
              energy_kcal: 650,
              energy_kj: 2720,
              fat_mg: 18000,
              fat_saturates_mg: 4000,
              carbs_mg: 72000,
              carbs_sugars_mg: 30000,
              fibre_mg: 5000,
              protein_mg: 42000,
              salt_mg: 1200,
              net_weight_mg: 500000,
            },
          },
        },
      },
    };

    await withMockedGoustoFetch(mockApiResponse, async () => {
      const client = await connectClient(
        "test-get-recipe-detail",
        new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)),
      );

      const result = await client.callTool({
        name: "get_recipe",
        arguments: { uid: TEST_UID },
      });

      const text = getToolResultText(result as CallToolResult);
      assert.ok(
        text.includes("Chicken, Date & Tamarind Curry With Kachumber"),
        "Expected title in response",
      );
      assert.ok(text.includes("Indian"), "Expected cuisine in response");
      assert.ok(
        text.includes("Chicken thighs"),
        "Expected ingredients in response",
      );
      assert.ok(text.includes("650"), "Expected kcal in response");

      await client.close();
    });
  });
});

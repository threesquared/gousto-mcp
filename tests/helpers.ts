import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export async function connectClient(
  name: string,
  transport: StreamableHTTPClientTransport | SSEClientTransport,
): Promise<Client> {
  const client = new Client({ name, version: "1.0.0" });
  await client.connect(transport);
  return client;
}

export function getToolResultText(result: CallToolResult): string {
  assert.equal(result.isError, undefined);
  assert.ok(Array.isArray(result.content), "Expected content to be an array");
  assert.equal(result.content.length, 1);
  return (result.content[0] as { type: string; text: string }).text;
}

export async function withMockedGoustoFetch<T>(
  mockResponse: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : (input as Request | URL).toString();
    if (url.includes("gousto.co.uk")) {
      return { ok: true, json: async () => mockResponse } as Response;
    }
    return originalFetch(input, init);
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

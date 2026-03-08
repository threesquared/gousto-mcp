# gousto-mcp

> A MCP server for Gousto recipes

## Description

This is a simple MCP server for Gousto recipes. It allows you to search for recipes by title and get details about a recipe by its UID.

It uses [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) (`Xenova/bge-small-en-v1.5`) to generate local embeddings for recipe titles, stored in a [`sqlite-vec`](https://github.com/asg017/sqlite-vec) vector database for semantic search.

## Usage

You can add the server to Home Assistant using the [Model Context Protocol](https://www.home-assistant.io/integrations/mcp/) integration. Then you can ask the LLM conversation agent for information about recipes.

<img width="524" height="507" alt="image" src="https://github.com/user-attachments/assets/5c107e1a-68f2-4879-88bf-ad961cd62e02" />

## Tools

### `search_recipes`

Search for recipes by title using semantic vector search.

### `get_recipe`

Get details about a recipe by its UID.

## Dev

First, install dependencies:

```bash
npm install
```

Scrape all recipe titles from the Gousto API and save to `data/recipes.json`:

```bash
npm run scrape
```

Generate embeddings for each recipe title and store them in the SQLite vector database:

```bash
npm run embed
```

Then start the server:

```bash
npm run start
```

Or build a Docker image:

```bash
docker buildx build --push --platform linux/arm64/v8,linux/amd64 --tag threesquared/gousto-mcp:latest .
docker run -p 3000:3000 threesquared/gousto-mcp
```

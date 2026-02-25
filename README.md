# gousto-mcp

> A MCP server for Gousto recipes

## Description

This is a simple MCP server for Gousto recipes. It allows you to search for recipes by title and get details about a recipe by its UID.

It uses Fuse.js to search a scraped file of recipe titles and then the Gousto public API to get the full recipe details.

## Usage

You can add the server to Home Assistant using the [Model Context Protocol](https://www.home-assistant.io/integrations/mcp/) integration. Then you can ask the LLM conversation agent for information about recipes.

<img width="524" height="507" alt="image" src="https://github.com/user-attachments/assets/5c107e1a-68f2-4879-88bf-ad961cd62e02" />

## Tools

### `search_recipes`

Search for recipes by title.

### `get_recipe`

Get details about a recipe by its UID.

## Dev

You need to scrape the recipe data first:

```bash
npm run scrape
```

Then you can start the server:

```bash
npm run start
```

Or build a Docker image:

```bash
docker build -t threesquared/gousto-mcp .
docker run -p 3000:3000 threesquared/gousto-mcp
```

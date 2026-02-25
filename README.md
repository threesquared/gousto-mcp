# gousto-mcp

> MCP server for Gousto recipes

## Description

This is a simple MCP server for Gousto recipes. It allows you to search for recipes by title and get details about a recipe by its UID.

It uses Fuse.js to search a scraped file of recipe titles and then the Gousto public API to get the full recipe details.

## Tools

### `search_recipes`

Search for recipes by title.

### `get_recipe`

Get details about a recipe by its UID.

## Usage

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

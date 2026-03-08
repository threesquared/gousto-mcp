import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchRecipes, getRecipe } from "./lib/gousto";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "gousto-recipes",
    description: "A MCP server for Gousto recipes",
    version: "1.0.0",
  });

  server.registerTool(
    "search_recipes",
    {
      description:
        "Search for Gousto recipes by title, returns a list of recipes with their UID. Do not return the UUID to the user, only use it to call the get_recipe tool.",
      inputSchema: z.object({
        query: z.string().describe("The query to search recipes for"),
      }),
    },
    async ({ query }) => {
      const recipes = await searchRecipes(query);

      if (!recipes.length) {
        return {
          content: [
            {
              type: "text",
              text: "No recipes found",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: recipes
              .map(({ gousto_uid, title }) => `${title}\n  uid: ${gousto_uid}`)
              .join("\n\n"),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_recipe",
    {
      description: "Get a Gousto recipe's full details by its UID",
      inputSchema: z.object({
        uid: z.string().describe("The UID of the Gousto recipe to get"),
      }),
    },
    async ({ uid }) => {
      const recipe = await getRecipe(uid);

      if (!recipe) {
        return {
          content: [{ type: "text", text: "Recipe not found" }],
        };
      }

      const text = [
        `# ${recipe.title}`,
        ``,
        recipe.description,
        ``,
        `**Cuisine:** ${recipe.cuisine}`,
        `**Prep time:** ${Object.entries(recipe.prep_times)
          .map(([k, v]) => `${v} min (${k.replace("for_", "")} people)`)
          .join(" · ")}`,
        ``,
        `**Categories:** ${recipe.categories.join(", ")}`,
        ``,
        `**Ingredients:**`,
        ...recipe.ingredients.map((i) => `- ${i}`),
        ``,
        `**Basics Required:** ${recipe.basics.join(", ")}`,
        ``,
        `**Cooking Instructions:**`,
        ...recipe.cooking_instructions.map((i) => `- ${i}`),
        ``,
        `**Allergens:** ${recipe.allergens.join(", ")}`,
        ``,
        `**Nutritional information (per portion):**`,
        `- Energy: ${recipe.nutritional_information.energy_kcal} kcal / ${recipe.nutritional_information.energy_kj} kJ`,
        `- Fat: ${recipe.nutritional_information.fat_mg} mg`,
        `- Fat saturates: ${recipe.nutritional_information.fat_saturates_mg} mg`,
        `- Carbs: ${recipe.nutritional_information.carbs_mg} mg / ${recipe.nutritional_information.carbs_sugars_mg} mg`,
        `- Fibre: ${recipe.nutritional_information.fibre_mg} mg`,
        `- Protein: ${recipe.nutritional_information.protein_mg} mg`,
        `- Salt: ${recipe.nutritional_information.salt_mg} mg / ${recipe.nutritional_information.salt_mg} mg`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
      };
    },
  );

  return server;
}

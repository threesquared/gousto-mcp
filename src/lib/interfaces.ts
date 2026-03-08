export interface Recipe {
  gousto_uid: string;
  title: string;
  url: string;
}

export interface RecipeResult extends Recipe {
  distance: number;
}

export interface RecipeDetail {
  title: string;
  description: string;
  cuisine: string;
  prep_times: Record<string, number>;
  categories: string[];
  ingredients: string[];
  basics: string[];
  cooking_instructions: string[];
  allergens: string[];
  nutritional_information: {
    energy_kcal: number;
    energy_kj: number;
    fat_mg: number;
    fat_saturates_mg: number;
    carbs_mg: number;
    carbs_sugars_mg: number;
    fibre_mg: number;
    protein_mg: number;
    salt_mg: number;
    net_weight_mg: number;
  };
}

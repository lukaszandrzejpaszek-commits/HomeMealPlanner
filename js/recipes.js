// recipes.js - Recipe storage and management (BONUS FEATURE)

class RecipeManager {
    constructor(storage) {
        this.storage = storage;
    }

    generateId() {
        return 'recipe-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    addRecipe(recipeData) {
        const recipe = {
            id: this.generateId(),
            mealId: recipeData.mealId || null,
            name: recipeData.name,
            prepTime: recipeData.prepTime || 0,
            cookTime: recipeData.cookTime || 0,
            servings: recipeData.servings || 4,
            difficulty: recipeData.difficulty || 'Medium',
            instructions: recipeData.instructions || '',
            ingredients: this.parseIngredients(recipeData.ingredients),
            notes: recipeData.notes || '',
            tags: this.parseList(recipeData.tags),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            rating: 5,
            makeAgain: true
        };

        const recipes = this.storage.get('recipes', []);
        recipes.push(recipe);
        this.storage.set('recipes', recipes);

        return recipe;
    }

    updateRecipe(id, recipeData) {
        const recipes = this.storage.get('recipes', []);
        const index = recipes.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error('Recipe not found');
        }

        recipes[index] = {
            ...recipes[index],
            name: recipeData.name || recipes[index].name,
            prepTime: recipeData.prepTime !== undefined ? recipeData.prepTime : recipes[index].prepTime,
            cookTime: recipeData.cookTime !== undefined ? recipeData.cookTime : recipes[index].cookTime,
            servings: recipeData.servings || recipes[index].servings,
            difficulty: recipeData.difficulty || recipes[index].difficulty,
            instructions: recipeData.instructions || recipes[index].instructions,
            ingredients: recipeData.ingredients ? this.parseIngredients(recipeData.ingredients) : recipes[index].ingredients,
            notes: recipeData.notes || recipes[index].notes,
            tags: recipeData.tags ? this.parseList(recipeData.tags) : recipes[index].tags,
            rating: recipeData.rating !== undefined ? recipeData.rating : recipes[index].rating,
            makeAgain: recipeData.makeAgain !== undefined ? recipeData.makeAgain : recipes[index].makeAgain,
            lastModified: new Date().toISOString()
        };

        this.storage.set('recipes', recipes);
        return recipes[index];
    }

    deleteRecipe(id) {
        const recipes = this.storage.get('recipes', []);
        const filtered = recipes.filter(r => r.id !== id);
        this.storage.set('recipes', filtered);
    }

    getRecipe(id) {
        const recipes = this.storage.get('recipes', []);
        return recipes.find(r => r.id === id) || null;
    }

    getAllRecipes() {
        return this.storage.get('recipes', []);
    }

    getRecipesByMeal(mealId) {
        const recipes = this.storage.get('recipes', []);
        return recipes.filter(r => r.mealId === mealId);
    }

    searchRecipes(query) {
        const recipes = this.storage.get('recipes', []);
        const q = query.toLowerCase();

        return recipes.filter(r =>
            r.name.toLowerCase().includes(q) ||
            r.instructions.toLowerCase().includes(q) ||
            r.tags.some(t => t.toLowerCase().includes(q)) ||
            r.ingredients.some(ing => ing.name.toLowerCase().includes(q))
        );
    }

    getRatedRecipes() {
        return this.getAllRecipes()
            .filter(r => r.makeAgain)
            .sort((a, b) => b.rating - a.rating);
    }

    rateRecipe(id, rating) {
        const recipes = this.storage.get('recipes', []);
        const recipe = recipes.find(r => r.id === id);

        if (recipe) {
            recipe.rating = Math.max(1, Math.min(5, rating));
            this.storage.set('recipes', recipes);
        }

        return recipe;
    }

    setMakeAgain(id, makeAgain) {
        const recipes = this.storage.get('recipes', []);
        const recipe = recipes.find(r => r.id === id);

        if (recipe) {
            recipe.makeAgain = makeAgain;
            this.storage.set('recipes', recipes);
        }

        return recipe;
    }

    exportRecipe(id) {
        const recipe = this.getRecipe(id);
        if (!recipe) return null;

        let text = `RECIPE: ${recipe.name}\n`;
        text += '='.repeat(50) + '\n\n';
        text += `Difficulty: ${recipe.difficulty}\n`;
        text += `Prep Time: ${recipe.prepTime} min | Cook Time: ${recipe.cookTime} min\n`;
        text += `Servings: ${recipe.servings}\n`;
        text += `Rating: ${'★'.repeat(recipe.rating)}${'☆'.repeat(5 - recipe.rating)}\n\n`;

        text += 'INGREDIENTS:\n';
        text += '-'.repeat(50) + '\n';
        recipe.ingredients.forEach(ing => {
            text += `• ${ing.amount} ${ing.unit} - ${ing.name}\n`;
        });

        text += '\n\nINSTRUCTIONS:\n';
        text += '-'.repeat(50) + '\n';
        text += recipe.instructions;

        if (recipe.notes) {
            text += '\n\nNOTES:\n';
            text += '-'.repeat(50) + '\n';
            text += recipe.notes;
        }

        return text;
    }

    exportAllRecipes() {
        return JSON.stringify(this.getAllRecipes(), null, 2);
    }

    importRecipes(jsonString) {
        try {
            const recipes = JSON.parse(jsonString);
            if (!Array.isArray(recipes)) {
                throw new Error('Invalid format');
            }

            const validRecipes = recipes.filter(r => r.name && r.instructions);
            this.storage.set('recipes', validRecipes);
            return validRecipes.length;
        } catch (e) {
            console.error('Import error:', e);
            return 0;
        }
    }

    // Parse ingredients from text format
    parseIngredients(ingredientText) {
        if (Array.isArray(ingredientText)) {
            return ingredientText.map(ing => {
                if (typeof ing === 'string') {
                    return this.parseIngredientLine(ing);
                }
                return ing;
            });
        }

        if (typeof ingredientText === 'string') {
            return ingredientText.split('\n')
                .filter(line => line.trim())
                .map(line => this.parseIngredientLine(line));
        }

        return [];
    }

    parseIngredientLine(line) {
        // Format: "2 cups flour" or "200g butter"
        const match = line.match(/^([\d.]+)\s*(\w+)\s*-?\s*(.+)$/);

        if (match) {
            return {
                amount: parseFloat(match[1]),
                unit: match[2],
                name: match[3].trim()
            };
        }

        return {
            amount: 1,
            unit: 'unit',
            name: line.trim()
        };
    }

    parseList(input) {
        if (Array.isArray(input)) {
            return input.filter(i => i && typeof i === 'string').map(i => i.trim());
        }
        if (typeof input === 'string') {
            return input.split(',').map(i => i.trim()).filter(i => i);
        }
        return [];
    }

    calculateTotalTime(recipe) {
        return recipe.prepTime + recipe.cookTime;
    }

    getQuickRecipes(maxMinutes = 30) {
        return this.getAllRecipes().filter(r =>
            this.calculateTotalTime(r) <= maxMinutes
        );
    }
}

// Initialize global recipe manager
window.recipeManager = new RecipeManager(window.storage);

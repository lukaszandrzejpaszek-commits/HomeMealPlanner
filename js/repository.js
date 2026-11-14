// repository.js - Meal repository management

class Repository {
    constructor(storage) {
        this.storage = storage;
    }

    generateId() {
        return 'meal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    addMeal(mealData) {
        const meal = {
            id: this.generateId(),
            name: mealData.name,
            mealType: mealData.mealType,
            cuisine: mealData.cuisine || 'Other',
            protein: mealData.protein || '',
            foodGroups: this.parseList(mealData.foodGroups),
            mealPrepFriendly: mealData.mealPrepFriendly || false,
            mealPrepDays: mealData.mealPrepDays || 0,
            difficulty: mealData.difficulty || 'Medium',
            ingredients: this.parseList(mealData.ingredients),
            tags: this.parseList(mealData.tags),
            createdAt: new Date().toISOString(),
            lastUsed: null,
            useCount: 0
        };

        const meals = this.storage.get('meals', []);
        meals.push(meal);
        this.storage.set('meals', meals);

        return meal;
    }

    updateMeal(id, mealData) {
        const meals = this.storage.get('meals', []);
        const index = meals.findIndex(m => m.id === id);

        if (index === -1) {
            throw new Error('Meal not found');
        }

        meals[index] = {
            ...meals[index],
            name: mealData.name,
            mealType: mealData.mealType,
            cuisine: mealData.cuisine || 'Other',
            protein: mealData.protein || '',
            foodGroups: this.parseList(mealData.foodGroups),
            mealPrepFriendly: mealData.mealPrepFriendly || false,
            mealPrepDays: mealData.mealPrepDays || 0,
            difficulty: mealData.difficulty || 'Medium',
            ingredients: this.parseList(mealData.ingredients),
            tags: this.parseList(mealData.tags)
        };

        this.storage.set('meals', meals);
        return meals[index];
    }

    deleteMeal(id) {
        const meals = this.storage.get('meals', []);
        const filtered = meals.filter(m => m.id !== id);
        this.storage.set('meals', filtered);

        const recipes = this.storage.get('recipes', []);
        const linkedRecipes = recipes.map(recipe =>
            recipe.mealId === id ? { ...recipe, mealId: null } : recipe
        );
        this.storage.set('recipes', linkedRecipes);
    }

    getMeal(id) {
        const meals = this.storage.get('meals', []);
        return meals.find(m => m.id === id) || null;
    }

    getAllMeals() {
        return this.storage.get('meals', []);
    }

    getMealsByType(type) {
        const meals = this.storage.get('meals', []);
        return meals.filter(m => m.mealType === type);
    }

    getMealComponents() {
        return this.storage.get('meal-components', {
            proteins: [],
            starches: [],
            vegetables: []
        });
    }

    saveMealComponents(components) {
        const normalized = {
            proteins: this.parseList(components.proteins),
            starches: this.parseList(components.starches),
            vegetables: this.parseList(components.vegetables)
        };
        this.storage.set('meal-components', normalized);
        return normalized;
    }

    getPlanningMealsByType(type) {
        if (type !== 'Dinner') {
            return this.getMealsByType(type);
        }

        const { proteins, starches, vegetables } = this.getMealComponents();
        if (!proteins.length || !starches.length || !vegetables.length) {
            return this.getMealsByType(type);
        }

        const combinations = [];
        proteins.forEach(protein => {
            starches.forEach(starch => {
                vegetables.forEach(vegetable => {
                    combinations.push({
                        id: `components:${JSON.stringify([protein, starch, vegetable])}`,
                        name: `${protein} with ${starch} and ${vegetable}`,
                        mealType: 'Dinner',
                        cuisine: 'Home',
                        protein,
                        foodGroups: [protein, starch, vegetable],
                        mealPrepFriendly: false,
                        mealPrepDays: 0,
                        difficulty: 'Easy',
                        ingredients: [protein, starch, vegetable],
                        tags: [],
                        components: { protein, starch, vegetable }
                    });
                });
            });
        });
        return combinations;
    }

    searchMeals(query) {
        const meals = this.storage.get('meals', []);
        const q = query.toLowerCase();
        return meals.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.cuisine.toLowerCase().includes(q) ||
            m.protein.toLowerCase().includes(q) ||
            m.tags.some(t => t.toLowerCase().includes(q))
        );
    }

    filterMeals(type, cuisine) {
        let meals = this.storage.get('meals', []);

        if (type) {
            meals = meals.filter(m => m.mealType === type);
        }

        if (cuisine) {
            meals = meals.filter(m => m.cuisine === cuisine);
        }

        return meals;
    }

    recordMealUsage(mealId) {
        const meals = this.storage.get('meals', []);
        const meal = meals.find(m => m.id === mealId);

        if (meal) {
            meal.lastUsed = new Date().toISOString();
            meal.useCount = (meal.useCount || 0) + 1;
            this.storage.set('meals', meals);
        }
    }

    getMostUsedMeals(limit = 5) {
        const meals = this.storage.get('meals', []);
        return meals
            .filter(m => m.useCount > 0)
            .sort((a, b) => b.useCount - a.useCount)
            .slice(0, limit);
    }

    exportMeals() {
        const meals = this.getAllMeals();
        return JSON.stringify(meals, null, 2);
    }

    importMeals(jsonString) {
        try {
            const meals = JSON.parse(jsonString);
            if (!Array.isArray(meals)) {
                throw new Error('Invalid format');
            }

            // Validate and import
            const validMeals = meals.filter(m =>
                m.name && m.mealType && (m.mealType === 'Breakfast' || m.mealType === 'Lunch' || m.mealType === 'Dinner')
            );

            this.storage.set('meals', validMeals);
            return validMeals.length;
        } catch (e) {
            console.error('Import error:', e);
            return 0;
        }
    }

    // Helper to parse comma-separated strings into arrays
    parseList(input) {
        if (Array.isArray(input)) {
            return input.filter(i => i && typeof i === 'string').map(i => i.trim());
        }
        if (typeof input === 'string') {
            return input.split(',').map(i => i.trim()).filter(i => i);
        }
        return [];
    }

    // Get unique cuisines for UI filters
    getUniqueCuisines() {
        const meals = this.storage.get('meals', []);
        const cuisines = new Set();
        meals.forEach(m => {
            if (m.cuisine) {
                cuisines.add(m.cuisine);
            }
        });
        return Array.from(cuisines).sort();
    }

    // Get unique proteins for UI filters
    getUniqueProteins() {
        const meals = this.storage.get('meals', []);
        const proteins = new Set();
        meals.forEach(m => {
            if (m.protein) {
                proteins.add(m.protein);
            }
        });
        return Array.from(proteins).sort();
    }

    // Get ingredient statistics
    getIngredientStats() {
        const meals = this.storage.get('meals', []);
        const stats = {};

        meals.forEach(m => {
            m.ingredients.forEach(ing => {
                stats[ing] = (stats[ing] || 0) + 1;
            });
        });

        return Object.entries(stats)
            .map(([ingredient, count]) => ({ ingredient, count }))
            .sort((a, b) => b.count - a.count);
    }
}

// Initialize global repository
window.repository = new Repository(window.storage);

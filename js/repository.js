// repository.js - Meal repository management

class Repository {
    constructor(storage) {
        this.storage = storage;
    }

    generateId() {
        return 'meal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    addMeal(mealData, id = this.generateId()) {
        const mealTypes = this.normalizeMealTypes(mealData.mealTypes || mealData.mealType);
        const meal = {
            id,
            name: mealData.name,
            mealType: mealTypes[0] || mealData.mealType || '',
            mealTypes,
            categories: this.normalizeCategories(mealData.categories !== undefined
                ? mealData.categories : this.parseList(mealData.foodGroups)),
            imageUrl: mealData.imageUrl || '',
            imageCredit: mealData.imageCredit || null,
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
            mealType: this.normalizeMealTypes(mealData.mealTypes || mealData.mealType)[0] || mealData.mealType || '',
            mealTypes: this.normalizeMealTypes(mealData.mealTypes || mealData.mealType),
            categories: mealData.categories !== undefined
                ? this.normalizeCategories(mealData.categories)
                : this.getMealCategories(meals[index]),
            imageUrl: mealData.imageUrl !== undefined ? mealData.imageUrl : (meals[index].imageUrl || ''),
            imageCredit: mealData.imageCredit !== undefined ? mealData.imageCredit
                : mealData.imageUrl !== undefined && mealData.imageUrl !== (meals[index].imageUrl || '')
                    ? null : (meals[index].imageCredit || null),
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
        const simple = this.findSimpleMealComponent(id);
        if (simple) {
            this.removeSimpleMealComponent(simple.category, simple.index);
            return;
        }
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
        return meals.filter(meal => this.normalizeMealTypes(meal.mealTypes || meal.mealType).includes(type));
    }

    normalizeCategories(input) {
        const values = Array.isArray(input) ? input : [];
        return ['Protein', 'Starch', 'Fruit', 'Vegetables'].filter(category =>
            values.some(value => typeof value === 'string' && value.toLowerCase() === category.toLowerCase())
        );
    }

    getMealCategories(meal) {
        const recipes = this.storage.get('recipes', []).filter(recipe => recipe.mealId === meal.id);
        return this.normalizeCategories([
            ...(Array.isArray(meal.categories) ? meal.categories : (meal.foodGroups || [])),
            ...recipes.flatMap(recipe => Array.isArray(recipe.categories) ? recipe.categories : [recipe.category])
        ]);
    }

    getMealComponents() {
        return this.storage.get('meal-components', {
            proteins: [],
            starches: [],
            vegetables: []
        });
    }

    getSimpleComponentId(category, name) {
        return `component:${category}:${name.trim().toLowerCase()}`;
    }

    getSimpleMealComponents() {
        const components = this.getMealComponents();
        return [
            ['proteins', 'Protein'],
            ['starches', 'Starch'],
            ['vegetables', 'Vegetables']
        ].flatMap(([key, category]) => components[key].map(name => ({
            id: this.getSimpleComponentId(key, name),
            name,
            categories: [category],
            mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
            cuisine: 'Home',
            protein: category === 'Protein' ? name : '',
            foodGroups: [name],
            ingredients: [name],
            difficulty: 'Easy',
            mealPrepFriendly: false,
            mealPrepDays: 0,
            tags: []
        })));
    }

    getComponent(id) {
        return this.getMeal(id) || this.getSimpleMealComponents().find(item => item.id === id) || null;
    }

    findSimpleMealComponent(id) {
        const components = this.getMealComponents();
        for (const category of ['proteins', 'starches', 'vegetables']) {
            const index = components[category].findIndex(name => this.getSimpleComponentId(category, name) === id);
            if (index !== -1) return { category, index };
        }
        return null;
    }

    updateSimpleMealComponent(id, mealData) {
        const simple = this.findSimpleMealComponent(id);
        if (!simple || this.getMeal(id)) throw new Error('Component not found or duplicated');
        const components = this.getMealComponents();
        const meal = this.addMeal(mealData, id);
        components[simple.category].splice(simple.index, 1);
        this.saveMealComponents(components);
        return meal;
    }

    removeSimpleMealComponent(category, index) {
        const components = this.getMealComponents();
        const name = components[category][index];
        const id = this.getSimpleComponentId(category, name);
        components[category].splice(index, 1);
        this.saveMealComponents(components);
        const recipes = this.storage.get('recipes', []);
        this.storage.set('recipes', recipes.map(recipe =>
            recipe.mealId === id ? { ...recipe, mealId: null } : recipe
        ));
        return name;
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

    getMealSlots(type) {
        return [
            { key: 'protein', category: 'Protein', icon: '🍗' },
            { key: 'starch', category: 'Starch', icon: '🍚' },
            type.toLowerCase() === 'breakfast'
                ? { key: 'fruit', category: 'Fruit', icon: '🍎' }
                : { key: 'vegetable', category: 'Vegetables', icon: '🥦' }
        ];
    }

    getComponentsByCategory(type, category) {
        return [...this.getSimpleMealComponents(), ...this.getMealsByType(type)]
            .filter(item => this.getMealCategories(item).includes(category));
    }

    createComponentMeal(type, componentItems) {
        const slots = this.getMealSlots(type);
        const items = slots.map(slot => componentItems[slot.key]).filter(Boolean);
        if (!items.length) throw new Error('A meal must contain at least one component.');
        const uniqueItems = [...new Map(items.map(item => [item.id, item])).values()];
        const protein = componentItems.protein;
        return {
            id: `components:${JSON.stringify(slots.map(slot => componentItems[slot.key]?.id || null))}`,
            name: items.map(item => item.name).join(' with '),
            mealType: type,
            mealTypes: [type],
            cuisine: protein?.cuisine || 'Home',
            protein: protein?.protein || protein?.name || 'N/A',
            foodGroups: uniqueItems.flatMap(item => (item.foodGroups || [])
                .filter(group => !['protein', 'starch', 'fruit', 'vegetables'].includes(group.toLowerCase()))),
            mealPrepFriendly: slots.every(slot => componentItems[slot.key]) &&
                uniqueItems.every(item => item.mealPrepFriendly && item.mealPrepDays >= 2),
            mealPrepDays: Math.min(...uniqueItems.map(item => item.mealPrepDays || 0)),
            difficulty: uniqueItems.some(item => item.difficulty === 'Hard') ? 'Hard'
                : uniqueItems.some(item => item.difficulty === 'Medium') ? 'Medium' : 'Easy',
            ingredients: uniqueItems.flatMap(item => item.ingredients?.length ? item.ingredients : [item.name]),
            tags: uniqueItems.flatMap(item => item.tags || []),
            components: Object.fromEntries(slots.filter(slot => componentItems[slot.key])
                .map(slot => [slot.key, componentItems[slot.key].name])),
            componentItems: Object.fromEntries(slots.filter(slot => componentItems[slot.key])
                .map(slot => [slot.key, componentItems[slot.key]]))
        };
    }

    getPlanningMealsByType(type) {
        const slots = this.getMealSlots(type);
        const groups = slots.map(slot => this.getComponentsByCategory(type, slot.category));
        if (groups.some(group => !group.length)) return [];

        const combinations = [];
        groups[0].forEach(protein => {
            groups[1].forEach(starch => {
                groups[2].forEach(produce => {
                    combinations.push(this.createComponentMeal(type, {
                        protein, starch, [slots[2].key]: produce
                    }));
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
            meals = meals.filter(meal => this.normalizeMealTypes(meal.mealTypes || meal.mealType).includes(type));
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
            const validMeals = meals
                .filter(meal => meal.name && this.normalizeMealTypes(meal.mealTypes || meal.mealType).length)
                .map(meal => {
                    const mealTypes = this.normalizeMealTypes(meal.mealTypes || meal.mealType);
                    return { ...meal, mealType: meal.mealType || mealTypes[0], mealTypes };
                });

            this.storage.set('meals', validMeals);
            return validMeals.length;
        } catch (e) {
            console.error('Import error:', e);
            return 0;
        }
    }

    // Helper to parse comma-separated strings into arrays
    normalizeMealTypes(input) {
        const supportedTypes = ['Breakfast', 'Lunch', 'Dinner'];
        const values = Array.isArray(input) ? input : [input];
        return supportedTypes.filter(type => values.includes(type));
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

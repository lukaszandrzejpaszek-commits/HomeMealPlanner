// rules.js - Rule engine for meal planning

class RuleEngine {
    constructor(storage, repository) {
        this.storage = storage;
        this.repository = repository;
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }

    getRules() {
        return this.storage.get('rules', []);
    }

    updateRule(ruleId, updates) {
        const rules = this.getRules();
        const rule = rules.find(r => r.id === ruleId);

        if (rule) {
            Object.assign(rule, updates);
            this.storage.set('rules', rules);
        }

        return rule;
    }

    addCustomRule(name, description) {
        const rules = this.getRules();
        const customRule = {
            id: 'custom-' + Date.now(),
            name,
            description,
            enabled: true,
            strength: 50,
            type: 'custom'
        };

        rules.push(customRule);
        this.storage.set('rules', rules);
        return customRule;
    }

    deleteRule(ruleId) {
        const rules = this.getRules();
        const filtered = rules.filter(r => r.id !== ruleId);
        this.storage.set('rules', filtered);
    }

    // Score a meal placement based on rules
    scoreMealPlacement(meal, plan, dayIndex, mealTimeType) {
        const rules = this.getRules().filter(r => r.enabled);
        let totalScore = 0;

        for (const rule of rules) {
            const ruleScore = this.applyRule(rule, meal, plan, dayIndex, mealTimeType);
            totalScore += (ruleScore * rule.strength) / 100;
        }

        return totalScore;
    }

    applyRule(rule, meal, plan, dayIndex, mealTimeType) {
        switch (rule.id) {
            case 'avoid-consecutive':
                return this.ruleAvoidConsecutive(meal, plan, dayIndex, mealTimeType);

            case 'avoid-same-meal-day':
                return this.ruleAvoidSameMealDay(meal, plan, dayIndex, mealTimeType);

            case 'avoid-same-foodgroup':
                return this.ruleAvoidSameFoodGroup(meal, plan, dayIndex, mealTimeType);

            case 'balance-cuisine':
                return this.ruleBalanceCuisine(meal, plan, dayIndex);

            case 'balance-proteins':
                return this.ruleBalanceProteins(meal, plan, dayIndex);

            case 'prefer-mealprep':
                return this.rulePreferMealPrep(meal, plan);

            case 'avoid-recent-meals':
                return this.ruleAvoidRecentMeals(meal);

            case 'reuse-ingredients':
                return this.ruleReuseIngredients(meal, plan, dayIndex);

            case 'avoid-difficult-consecutive':
                return this.ruleAvoidDifficultConsecutive(meal, plan, dayIndex, mealTimeType);

            default:
                return 0;
        }
    }

    ruleAvoidConsecutive(meal, plan, dayIndex, mealTimeType) {
        for (const item of this.getMealItems(meal)) {
            let consecutiveDays = 1;
            for (const direction of [-1, 1]) {
                for (let index = dayIndex + direction; index >= 0 && index < this.days.length; index += direction) {
                    const adjacentDay = this.getDayPlan(plan, index);
                    if (!adjacentDay || !['breakfast', 'lunch', 'dinner'].some(type =>
                        this.getMealItems(adjacentDay[type]).some(previous => previous.id === item.id)
                    )) break;
                    consecutiveDays++;
                }
            }
            if (consecutiveDays > 1 &&
                !(item.mealPrepFriendly && item.mealPrepDays >= 2 && consecutiveDays <= item.mealPrepDays)) return 0;
        }
        return 100;
    }

    ruleAvoidSameMealDay(meal, plan, dayIndex, mealTimeType) {
        const day = this.getDayPlan(plan, dayIndex);
        if (!day) return 100;
        const ids = new Set(this.getMealItems(meal).map(item => item.id));
        return ['breakfast', 'lunch', 'dinner'].some(type =>
            type !== mealTimeType && this.getMealItems(day[type]).some(item => ids.has(item.id))
        ) ? 0 : 100;
    }

    getMealItems(meal) {
        if (!meal) return [];
        if (meal.componentItems) {
            return [...new Map(Object.values(meal.componentItems).map(item => [item.id, item])).values()];
        }
        if (meal.components) {
            const keys = { breakfast: 'breakfasts', protein: 'proteins', starch: 'starches', fruit: 'fruits', vegetable: 'vegetables' };
            return Object.entries(keys)
                .filter(([key]) => typeof meal.components[key] === 'string')
                .map(([key, group]) => ({
                    id: `component:${group}:${meal.components[key].trim().toLowerCase()}`,
                    mealPrepFriendly: false,
                    mealPrepDays: 0
                }));
        }
        return meal.id ? [meal] : [];
    }

    ruleAvoidSameFoodGroup(meal, plan, dayIndex, mealTimeType) {
        if (mealTimeType === 'breakfast') return 100;

        const sameDay = this.getDayPlan(plan, dayIndex);
        if (!sameDay) return 100;
        const otherMealType = mealTimeType === 'lunch' ? 'dinner' : 'lunch';
        const otherMeal = sameDay[otherMealType];

        if (!otherMeal || !otherMeal.id) return 100;

        const sharedGroups = meal.foodGroups.filter(fg =>
            otherMeal.foodGroups.includes(fg)
        );

        if (sharedGroups.length > 0) {
            return 0; // Bad
        }

        return 100;
    }

    ruleBalanceCuisine(meal, plan, dayIndex) {
        const window = 3; // Look at last 3 days
        const startDay = Math.max(0, dayIndex - window);
        let cuisineCount = {};

        for (let i = startDay; i < dayIndex; i++) {
            const day = this.getDayPlan(plan, i);
            if (!day) continue;
            ['breakfast', 'lunch', 'dinner'].forEach(type => {
                if (day[type] && day[type].id) {
                    cuisineCount[day[type].cuisine] = (cuisineCount[day[type].cuisine] || 0) + 1;
                }
            });
        }

        const count = cuisineCount[meal.cuisine] || 0;

        // Penalize if cuisine is overused
        if (count >= 3) return 10;
        if (count >= 2) return 50;
        return 100;
    }

    ruleBalanceProteins(meal, plan, dayIndex) {
        const window = 7;
        const startDay = Math.max(0, dayIndex - window);
        let proteinCount = {};

        for (let i = startDay; i < dayIndex; i++) {
            const day = this.getDayPlan(plan, i);
            if (!day) continue;
            ['breakfast', 'lunch', 'dinner'].forEach(type => {
                if (day[type] && day[type].id) {
                    const protein = day[type].protein || 'Unknown';
                    proteinCount[protein] = (proteinCount[protein] || 0) + 1;
                }
            });
        }

        const count = proteinCount[meal.protein] || 0;

        // Penalize overused proteins
        if (count >= 5) return 10;
        if (count >= 3) return 40;
        return 100;
    }

    rulePreferMealPrep(meal, plan) {
        if (meal.mealPrepFriendly) {
            return 100;
        }
        return 70;
    }

    ruleAvoidRecentMeals(meal) {
        const settings = this.storage.get('settings', {});
        const historyWeeks = settings.historyWeeksToAvoid || 4;
        const history = this.storage.get('history', {});

        let recentMealIds = new Set();
        const currentDate = new Date();
        const recentWeeks = new Set();

        for (let i = 0; i < historyWeeks; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - (i * 7));
            const weekNum = this.getWeekNumber(date);
            const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
            recentWeeks.add(`${thursday.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`);
        }

        for (const item of Object.values(history)) {
            const key = `${item.year}-W${String(item.weekNumber).padStart(2, '0')}`;
            if (recentWeeks.has(key) && item.plan) {
                this.collectMealIds(item.plan, recentMealIds);
            }
        }

        if (recentMealIds.has(meal.id) || this.getMealItems(meal).some(item => recentMealIds.has(item.id))) {
            return 30; // Penalize recent meals
        }

        return 100;
    }

    ruleReuseIngredients(meal, plan, dayIndex) {
        const window = 2;
        const startDay = Math.max(0, dayIndex - window);
        let usedIngredients = new Set();

        for (let i = startDay; i < dayIndex; i++) {
            const day = this.getDayPlan(plan, i);
            if (!day) continue;
            ['breakfast', 'lunch', 'dinner'].forEach(type => {
                if (day[type] && day[type].id) {
                    day[type].ingredients.forEach(ing => usedIngredients.add(ing));
                }
            });
        }

        const sharedIngs = meal.ingredients.filter(ing =>
            usedIngredients.has(ing)
        ).length;

        // Bonus for reusing ingredients
        if (sharedIngs >= 2) {
            return 120; // Over 100 to give bonus
        }
        if (sharedIngs >= 1) {
            return 110;
        }

        return 100;
    }

    ruleAvoidDifficultConsecutive(meal, plan, dayIndex, mealTimeType) {
        if (dayIndex === 0) return 100;

        if (meal.difficulty !== 'Hard') {
            return 100;
        }

        const prevDay = this.getDayPlan(plan, dayIndex - 1);
        if (!prevDay) return 100;
        const prevMeal = prevDay[mealTimeType];

        if (prevMeal && prevMeal.id && prevMeal.difficulty === 'Hard') {
            return 40; // Penalize
        }

        return 100;
    }

    // Helper to get week number
    getDayPlan(plan, dayIndex) {
        return plan[this.days[dayIndex]];
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    }

    // Helper to collect meal IDs from a plan
    collectMealIds(plan, mealIdSet) {
        if (!plan) return;

        Object.values(plan).forEach(day => {
            if (day && typeof day === 'object') {
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    if (day[type] && day[type].id) {
                        mealIdSet.add(day[type].id);
                        this.getMealItems(day[type]).forEach(item => mealIdSet.add(item.id));
                    }
                });
            }
        });
    }
}

// Initialize global rule engine
window.ruleEngine = new RuleEngine(window.storage, window.repository);

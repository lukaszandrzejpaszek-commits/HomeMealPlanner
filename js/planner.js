// planner.js - Meal planning algorithm

class Planner {
    constructor(storage, repository, ruleEngine) {
        this.storage = storage;
        this.repository = repository;
        this.ruleEngine = ruleEngine;
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        this.mealTypes = ['breakfast', 'lunch', 'dinner'];
    }

    generateWeekPlan() {
        const settings = this.storage.get('settings', {});
        const meals = this.repository.getAllMeals();

        if (meals.length === 0) {
            return this.createEmptyPlan();
        }

        const plan = this.initializeEmptyPlan(settings);
        const mealsByType = {
            breakfast: this.repository.getMealsByType('Breakfast'),
            lunch: this.repository.getMealsByType('Lunch'),
            dinner: this.repository.getMealsByType('Dinner')
        };

        // Fill the plan
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const day = this.days[dayIndex];
            const dayPlan = plan[day];

            // Breakfast
            if (mealsByType.breakfast.length > 0) {
                const breakfast = this.selectBestMeal(mealsByType.breakfast, plan, dayIndex, 'breakfast');
                if (breakfast) {
                    dayPlan.breakfast = breakfast;
                }
            }

            // Lunch
            if (dayPlan.schoolLunch) {
                dayPlan.lunch = null;
            } else if (mealsByType.lunch.length > 0) {
                const lunch = this.selectBestMeal(mealsByType.lunch, plan, dayIndex, 'lunch');
                if (lunch) {
                    dayPlan.lunch = lunch;
                }
            }

            // Dinner
            if (mealsByType.dinner.length > 0) {
                const dinner = this.selectBestMeal(mealsByType.dinner, plan, dayIndex, 'dinner');
                if (dinner) {
                    dayPlan.dinner = dinner;
                }
            }
        }

        // Save the plan
        this.storage.set('current-week', {
            plan,
            status: 'Draft',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        });

        return plan;
    }

    regenerateMealType(mealType) {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            return this.generateWeekPlan();
        }

        const plan = currentWeek.plan;
        const meals = this.repository.getMealsByType(this.capitalize(mealType));

        if (meals.length === 0) {
            return plan;
        }

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const day = this.days[dayIndex];
            const dayPlan = plan[day];

            if (mealType === 'lunch' && dayPlan.schoolLunch) {
                continue;
            }

            const selected = this.selectBestMeal(meals, plan, dayIndex, mealType);
            if (selected) {
                dayPlan[mealType] = selected;
            }
        }

        currentWeek.plan = plan;
        currentWeek.lastModified = new Date().toISOString();
        this.storage.set('current-week', currentWeek);

        return plan;
    }

    regenerateDay(dayIndex) {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            return this.generateWeekPlan();
        }

        const plan = currentWeek.plan;
        const day = this.days[dayIndex];
        const dayPlan = plan[day];

        for (const mealType of this.mealTypes) {
            if (mealType === 'lunch' && dayPlan.schoolLunch) {
                continue;
            }

            const meals = this.repository.getMealsByType(this.capitalize(mealType));
            if (meals.length > 0) {
                const selected = this.selectBestMeal(meals, plan, dayIndex, mealType);
                if (selected) {
                    dayPlan[mealType] = selected;
                }
            }
        }

        currentWeek.plan = plan;
        currentWeek.lastModified = new Date().toISOString();
        this.storage.set('current-week', currentWeek);

        return plan;
    }

    selectBestMeal(availableMeals, plan, dayIndex, mealType) {
        let bestMeal = null;
        let bestScore = -1;

        for (const meal of availableMeals) {
            const score = this.ruleEngine.scoreMealPlacement(meal, plan, dayIndex, mealType);

            if (score > bestScore) {
                bestScore = score;
                bestMeal = { ...meal };
            }
        }

        return bestMeal || availableMeals[0];
    }

    replaceMeal(dayIndex, mealType, newMealId) {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            return null;
        }

        const plan = currentWeek.plan;
        const day = this.days[dayIndex];
        const meal = this.repository.getMeal(newMealId);

        if (meal) {
            plan[day][mealType] = { ...meal };
            currentWeek.lastModified = new Date().toISOString();
            this.storage.set('current-week', currentWeek);
            return plan[day][mealType];
        }

        return null;
    }

    getCurrentWeek() {
        return this.storage.get('current-week');
    }

    approvePlan() {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            return false;
        }

        const now = new Date();
        const weekNumber = this.getWeekNumber(now);
        const year = now.getFullYear();

        // Record meal usage
        this.recordPlanMealUsage(currentWeek.plan);

        // Calculate statistics
        const statistics = this.calculatePlanStatistics(currentWeek.plan);

        // Save to history
        this.storage.saveToHistory(weekNumber, year, currentWeek.plan, statistics);

        // Update current week status
        currentWeek.status = 'Approved';
        currentWeek.approvedDate = now.toISOString();
        this.storage.set('current-week', currentWeek);

        return true;
    }

    recordPlanMealUsage(plan) {
        for (const day of Object.values(plan)) {
            if (day && typeof day === 'object') {
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    if (day[type] && day[type].id) {
                        this.repository.recordMealUsage(day[type].id);
                    }
                });
            }
        }
    }

    calculatePlanStatistics(plan) {
        const stats = {
            totalMeals: 0,
            mealPrepCount: 0,
            cuisines: {},
            proteins: {},
            difficulty: {}
        };

        for (const day of Object.values(plan)) {
            if (day && typeof day === 'object') {
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    if (day[type] && day[type].id) {
                        stats.totalMeals++;

                        if (day[type].mealPrepFriendly) {
                            stats.mealPrepCount++;
                        }

                        stats.cuisines[day[type].cuisine] = (stats.cuisines[day[type].cuisine] || 0) + 1;
                        stats.proteins[day[type].protein] = (stats.proteins[day[type].protein] || 0) + 1;
                        stats.difficulty[day[type].difficulty] = (stats.difficulty[day[type].difficulty] || 0) + 1;
                    }
                });
            }
        }

        return stats;
    }

    initializeEmptyPlan(settings) {
        const plan = {};

        for (const day of this.days) {
            plan[day] = {
                breakfast: null,
                lunch: null,
                dinner: null,
                schoolLunch: settings.defaultSchoolLunchDays.includes(day)
            };
        }

        return plan;
    }

    createEmptyPlan() {
        const currentWeek = this.storage.get('current-week');
        if (currentWeek) {
            return currentWeek.plan;
        }

        const settings = this.storage.get('settings', {});
        return this.initializeEmptyPlan(settings);
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    }

    getCurrentWeekInfo() {
        const now = new Date();
        const weekNum = this.getWeekNumber(now);
        const year = now.getFullYear();
        return { weekNum, year };
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize global planner
window.planner = new Planner(window.storage, window.repository, window.ruleEngine);

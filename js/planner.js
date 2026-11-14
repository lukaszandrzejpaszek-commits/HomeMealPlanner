// planner.js - Meal planning algorithm

class Planner {
    constructor(storage, repository, ruleEngine) {
        this.storage = storage;
        this.repository = repository;
        this.ruleEngine = ruleEngine;
        this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        this.mealTypes = ['breakfast', 'lunch', 'dinner'];
        this.selectedWeekStart = this.getWeekStart(new Date());

        const currentWeek = this.storage.get('current-week');
        if (currentWeek) {
            if (currentWeek.weekStartDate) {
                const weekStart = new Date(`${currentWeek.weekStartDate}T00:00:00Z`);
                if (!Number.isNaN(weekStart.getTime())) this.selectedWeekStart = weekStart;
            }
            this.saveCurrentWeek(currentWeek);
        } else {
            const weekInfo = this.getCurrentWeekInfo();
            const savedWeek = this.storage.get('weekly-plans', {})[weekInfo.weekKey];
            if (savedWeek) {
                this.storage.set('current-week', savedWeek);
            }
        }
    }

    generateWeekPlan() {
        const mealsByType = {
            breakfast: this.repository.getPlanningMealsByType('Breakfast'),
            lunch: this.repository.getPlanningMealsByType('Lunch'),
            dinner: this.repository.getPlanningMealsByType('Dinner')
        };

        const previousPlan = this.getCurrentWeek()?.plan;
        const plan = this.initializeEmptyPlan();
        if (previousPlan) {
            this.days.forEach(day => {
                plan[day].schoolLunch = Boolean(previousPlan[day]?.schoolLunch);
            });
        }

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
        const previousWeek = this.getCurrentWeek();
        this.saveCurrentWeek({
            ...this.createWeekRecord(plan),
            createdAt: previousWeek?.createdAt || new Date().toISOString(),
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
        const meals = this.repository.getPlanningMealsByType(this.capitalize(mealType));

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
        this.saveCurrentWeek(currentWeek);

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

            const meals = this.repository.getPlanningMealsByType(this.capitalize(mealType));
            if (meals.length > 0) {
                const selected = this.selectBestMeal(meals, plan, dayIndex, mealType);
                if (selected) {
                    dayPlan[mealType] = selected;
                }
            }
        }

        currentWeek.plan = plan;
        currentWeek.lastModified = new Date().toISOString();
        this.saveCurrentWeek(currentWeek);

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
        const meal = this.repository.getPlanningMealsByType(this.capitalize(mealType))
            .find(candidate => candidate.id === newMealId);

        if (meal) {
            plan[day][mealType] = { ...meal };
            currentWeek.lastModified = new Date().toISOString();
            this.saveCurrentWeek(currentWeek);
            return plan[day][mealType];
        }

        return null;
    }

    setSchoolLunch(dayIndex, enabled) {
        let currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            currentWeek = {
                plan: this.createEmptyPlan(),
                status: 'Draft',
                createdAt: new Date().toISOString()
            };
        }

        const day = this.days[dayIndex];
        if (!day || !currentWeek.plan[day]) {
            throw new Error('Invalid planner day');
        }

        currentWeek.plan[day].schoolLunch = Boolean(enabled);
        if (enabled) {
            currentWeek.plan[day].lunch = null;
        }
        currentWeek.lastModified = new Date().toISOString();
        this.saveCurrentWeek(currentWeek);
        return currentWeek.plan;
    }

    setTargetWeek(weekValue) {
        const match = /^(\d{4})-W(\d{2})$/.exec(weekValue || '');
        if (!match) {
            throw new Error('Choose a valid week.');
        }

        const year = parseInt(match[1], 10);
        const weekNumber = parseInt(match[2], 10);
        if (weekNumber < 1 || weekNumber > 53) {
            throw new Error('Choose a valid ISO week number.');
        }

        const januaryFourth = new Date(Date.UTC(year, 0, 4));
        const weekStart = new Date(januaryFourth);
        const day = weekStart.getUTCDay() || 7;
        weekStart.setUTCDate(weekStart.getUTCDate() - day + 1 + ((weekNumber - 1) * 7));
        const selectedInfo = this.getWeekInfo(weekStart);
        if (selectedInfo.year !== year || selectedInfo.weekNumber !== weekNumber) {
            throw new Error('That ISO week does not exist in the selected year.');
        }

        const currentWeek = this.getCurrentWeek();
        if (currentWeek) this.saveCurrentWeek(currentWeek);

        this.selectedWeekStart = weekStart;
        const savedWeeks = this.storage.get('weekly-plans', {});
        const targetWeek = savedWeeks[selectedInfo.weekKey] || this.createWeekRecord(this.initializeEmptyPlan());
        this.saveCurrentWeek(targetWeek);
        return selectedInfo;
    }

    getWeekInputValue() {
        const info = this.getCurrentWeekInfo();
        return `${info.year}-W${String(info.weekNumber).padStart(2, '0')}`;
    }

    getCurrentWeek() {
        return this.storage.get('current-week');
    }

    getWeekStart(date) {
        const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = start.getUTCDay() || 7;
        start.setUTCDate(start.getUTCDate() - day + 1);
        return start;
    }

    getWeekInfo(weekStart) {
        const start = new Date(Date.UTC(
            weekStart.getUTCFullYear(),
            weekStart.getUTCMonth(),
            weekStart.getUTCDate()
        ));
        const thursday = new Date(start);
        thursday.setUTCDate(thursday.getUTCDate() + 3);
        const weekNumber = this.getWeekNumber(thursday);
        const year = thursday.getUTCFullYear();
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);

        return {
            weekNum: weekNumber,
            weekNumber,
            year,
            weekKey: `${year}-W${String(weekNumber).padStart(2, '0')}`,
            weekStartDate: start.toISOString().slice(0, 10),
            weekEndDate: end.toISOString().slice(0, 10)
        };
    }

    createWeekRecord(plan) {
        const now = new Date().toISOString();
        return {
            ...this.getCurrentWeekInfo(),
            plan,
            status: 'Draft',
            createdAt: now,
            lastModified: now
        };
    }

    saveCurrentWeek(week) {
        const record = { ...week, ...this.getCurrentWeekInfo() };
        this.storage.set('current-week', record);

        const weeklyPlans = this.storage.get('weekly-plans', {});
        weeklyPlans[record.weekKey] = record;
        this.storage.set('weekly-plans', weeklyPlans);
        return record;
    }

    approvePlan() {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek) {
            return false;
        }

        const now = new Date();
        const info = this.getCurrentWeekInfo();

        // Record meal usage
        this.recordPlanMealUsage(currentWeek.plan);

        // Calculate statistics
        const statistics = this.calculatePlanStatistics(currentWeek.plan);

        // Save to history
        this.storage.saveToHistory(info.weekNumber, info.year, currentWeek.plan, statistics, info);

        // Update current week status
        currentWeek.status = 'Approved';
        currentWeek.approvedDate = now.toISOString();
        this.saveCurrentWeek(currentWeek);

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

    initializeEmptyPlan() {
        const plan = {};

        for (const day of this.days) {
            plan[day] = {
                breakfast: null,
                lunch: null,
                dinner: null,
                schoolLunch: false
            };
        }

        return plan;
    }

    createEmptyPlan() {
        const currentWeek = this.storage.get('current-week');
        if (currentWeek) {
            return currentWeek.plan;
        }

        return this.initializeEmptyPlan();
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    }

    getCurrentWeekInfo() {
        return this.getWeekInfo(this.selectedWeekStart);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize global planner
window.planner = new Planner(window.storage, window.repository, window.ruleEngine);

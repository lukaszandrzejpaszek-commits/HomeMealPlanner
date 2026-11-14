// history.js - Planning history management

class HistoryManager {
    constructor(storage) {
        this.storage = storage;
    }

    getAllHistory() {
        return this.storage.getAllHistory();
    }

    getHistoryList() {
        const history = this.getAllHistory();
        return Object.values(history)
            .sort((a, b) => {
                const aDate = new Date(a.approvedDate);
                const bDate = new Date(b.approvedDate);
                return bDate - aDate;
            });
    }

    getHistoryWeek(weekNumber, year) {
        return this.storage.getHistoryWeek(weekNumber, year);
    }

    searchHistory(query) {
        const history = this.getHistoryList();
        const q = query.toLowerCase();

        return history.filter(item => {
            if (!item.plan) return false;

            for (const day of Object.values(item.plan)) {
                if (day && typeof day === 'object') {
                    for (const mealType of ['breakfast', 'lunch', 'dinner']) {
                        const meal = day[mealType];
                        if (meal && meal.id) {
                            if (meal.name.toLowerCase().includes(q) ||
                                meal.cuisine.toLowerCase().includes(q) ||
                                meal.protein.toLowerCase().includes(q)) {
                                return true;
                            }
                        }
                    }
                }
            }

            return false;
        });
    }

    copyHistoryToCurrent(weekNumber, year) {
        const historyWeek = this.getHistoryWeek(weekNumber, year);
        if (!historyWeek) {
            return false;
        }

        const currentWeek = {
            plan: JSON.parse(JSON.stringify(historyWeek.plan)),
            status: 'Draft',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        this.storage.set('current-week', currentWeek);
        return true;
    }

    getHistoryStatistics() {
        const history = this.getHistoryList();

        const stats = {
            totalWeeks: history.length,
            totalMeals: 0,
            mealPrepUsage: 0,
            cuisineFrequency: {},
            proteinFrequency: {},
            mostUsedMeals: {}
        };

        history.forEach(item => {
            if (item.statistics) {
                stats.totalMeals += item.statistics.totalMeals || 0;
                stats.mealPrepUsage += item.statistics.mealPrepCount || 0;

                Object.assign(stats.cuisineFrequency, item.statistics.cuisines || {});
                Object.assign(stats.proteinFrequency, item.statistics.proteins || {});
            }

            // Track meal usage
            if (item.plan) {
                for (const day of Object.values(item.plan)) {
                    if (day && typeof day === 'object') {
                        ['breakfast', 'lunch', 'dinner'].forEach(type => {
                            if (day[type] && day[type].name) {
                                const mealName = day[type].name;
                                stats.mostUsedMeals[mealName] = (stats.mostUsedMeals[mealName] || 0) + 1;
                            }
                        });
                    }
                }
            }
        });

        return stats;
    }
}

// Initialize global history manager
window.historyManager = new HistoryManager(window.storage);

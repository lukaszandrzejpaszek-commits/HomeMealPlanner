// storage.js - Handle JSON file persistence using localStorage (since there's no backend)
// In a real application with a backend, this would use fetch() to read/write files

class Storage {
    constructor() {
        this.prefix = 'hmp_';
        this.initializeDefaultData();
    }

    initializeDefaultData() {
        // Initialize default data structures if they don't exist
        if (!this.get('meals')) {
            this.set('meals', []);
        }
        if (!this.get('rules')) {
            this.set('rules', this.getDefaultRules());
        }
        if (!this.get('settings')) {
            this.set('settings', this.getDefaultSettings());
        }
        if (!this.get('current-week')) {
            this.set('current-week', null);
        }
        if (!this.get('weekly-plans')) {
            this.set('weekly-plans', {});
        }
        if (!this.get('shopping-list')) {
            this.set('shopping-list', []);
        }
        if (!this.get('history')) {
            this.set('history', {});
        }
    }

    getDefaultRules() {
        return [
            {
                id: 'avoid-consecutive',
                name: 'Avoid identical meals on consecutive days',
                description: 'Exception: Allowed if meal prep friendly with 2+ prep days',
                enabled: true,
                strength: 75,
                type: 'builtin'
            },
            {
                id: 'avoid-same-foodgroup',
                name: 'Avoid same food group for lunch and dinner',
                description: 'Prevents eating the same ingredient twice in one day',
                enabled: true,
                strength: 60,
                type: 'builtin'
            },
            {
                id: 'balance-cuisine',
                name: 'Balance cuisines throughout week',
                description: 'Avoid repeating the same cuisine too often',
                enabled: true,
                strength: 70,
                type: 'builtin'
            },
            {
                id: 'balance-proteins',
                name: 'Balance proteins throughout week',
                description: 'Mix different protein sources',
                enabled: true,
                strength: 80,
                type: 'builtin'
            },
            {
                id: 'prefer-mealprep',
                name: 'Prefer meal-prep-friendly meals',
                description: 'Optimize for efficiency',
                enabled: true,
                strength: 50,
                type: 'builtin'
            },
            {
                id: 'avoid-recent-meals',
                name: 'Avoid meals seen in recent weeks',
                description: 'Keep variety by not repeating recent meals',
                enabled: true,
                strength: 65,
                type: 'builtin'
            },
            {
                id: 'reuse-ingredients',
                name: 'Reuse ingredients when practical',
                description: 'Optimize grocery usage',
                enabled: true,
                strength: 55,
                type: 'builtin'
            },
            {
                id: 'avoid-difficult-consecutive',
                name: 'Avoid difficult meals on consecutive days',
                description: 'Balance workload throughout week',
                enabled: true,
                strength: 70,
                type: 'builtin'
            }
        ];
    }

    getDefaultSettings() {
        return {
            cookForDays: 2,
            historyWeeksToAvoid: 4,
            darkMode: false
        };
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.error('Storage error:', e);
        }
    }

    // History management
    saveToHistory(weekNumber, year, plan, statistics = {}, weekDates = {}) {
        const key = `${year}-W${String(weekNumber).padStart(2, '0')}`;
        const historyItem = {
            weekNumber,
            year,
            key,
            weekStartDate: weekDates.weekStartDate || null,
            weekEndDate: weekDates.weekEndDate || null,
            plan,
            statistics,
            approvedDate: new Date().toISOString(),
            status: 'approved'
        };
        
        const history = this.get('history', {});
        history[key] = historyItem;
        this.set('history', history);
        
        return historyItem;
    }

    getHistoryWeek(weekNumber, year) {
        const key = `${year}-W${String(weekNumber).padStart(2, '0')}`;
        const history = this.get('history', {});
        return history[key] || null;
    }

    getAllHistory() {
        return this.get('history', {});
    }

    // Backup and restore
    exportData() {
        const data = {
            meals: this.get('meals', []),
            rules: this.get('rules', []),
            settings: this.get('settings', {}),
            currentWeek: this.get('current-week'),
            weeklyPlans: this.get('weekly-plans', {}),
            shoppingList: this.get('shopping-list', []),
            history: this.get('history', {}),
            recipes: this.get('recipes', []),
            mealComponents: this.get('meal-components', { proteins: [], starches: [], vegetables: [] }),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.set('meals', data.meals || []);
            this.set('rules', data.rules || this.getDefaultRules());
            this.set('settings', data.settings || this.getDefaultSettings());
            this.set('current-week', data.currentWeek || null);
            this.set('weekly-plans', data.weeklyPlans || {});
            this.set('shopping-list', data.shoppingList || []);
            this.set('history', data.history || {});
            this.set('recipes', data.recipes || []);
            this.set('meal-components', data.mealComponents || { proteins: [], starches: [], vegetables: [] });
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }

    // Backup download/restore upload
    downloadBackup() {
        const data = this.exportData();
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
        element.setAttribute('download', `meal-planner-backup-${new Date().toISOString().split('T')[0]}.json`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

// Initialize global storage
window.storage = new Storage();

// settings.js - Settings management

class SettingsManager {
    constructor(storage) {
        this.storage = storage;
    }

    getSettings() {
        return this.storage.get('settings', this.getDefaultSettings());
    }

    getDefaultSettings() {
        return {
            cookForDays: 2,
            historyWeeksToAvoid: 4,
            darkMode: false,
            recipeProxyUrl: ''
        };
    }

    updateSettings(updates) {
        const settings = this.getSettings();
        Object.assign(settings, updates);
        this.storage.set('settings', settings);
        return settings;
    }

    isDarkMode() {
        return this.getSettings().darkMode;
    }

    setDarkMode(enabled) {
        this.updateSettings({ darkMode: enabled });
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    toggleDarkMode() {
        this.setDarkMode(!this.isDarkMode());
    }
}

// Initialize global settings manager
window.settingsManager = new SettingsManager(window.storage);

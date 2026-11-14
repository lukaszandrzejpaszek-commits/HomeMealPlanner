// ui.js - UI initialization and event handling

class UIManager {
    constructor() {
        this.currentEditingMealId = null;
        this.currentEditingRuleId = null;
        this.currentMealPickerContext = null;
    }

    init() {
        this.setupEventListeners();
        this.loadInitialState();
        this.setupDarkMode();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPage(e.target.dataset.page));
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            window.settingsManager.toggleDarkMode();
            this.updateThemeIcon();
        });

        // Planner page
        document.getElementById('week-selector').addEventListener('change', (e) => {
            try {
                window.planner.setTargetWeek(e.target.value);
                this.displayCurrentWeek();
            } catch (error) {
                alert(error.message);
                e.target.value = window.planner.getWeekInputValue();
            }
        });
        document.getElementById('btn-generate-week').addEventListener('click', () => this.generateWeek());
        document.getElementById('btn-approve-plan').addEventListener('click', () => this.approvePlan());
        document.getElementById('btn-regenerate-breakfast').addEventListener('click', () => this.regenerateMealType('breakfast'));
        document.getElementById('btn-regenerate-lunch').addEventListener('click', () => this.regenerateMealType('lunch'));
        document.getElementById('btn-regenerate-dinner').addEventListener('click', () => this.regenerateMealType('dinner'));

        // Meals page
        document.getElementById('btn-add-meal').addEventListener('click', () => this.openMealModal());
        document.getElementById('meal-search').addEventListener('input', () => this.filterMeals());
        document.getElementById('meal-filter-type').addEventListener('change', () => this.filterMeals());
        document.getElementById('meal-filter-cuisine').addEventListener('change', () => this.filterMeals());
        document.getElementById('meal-form').addEventListener('submit', (e) => this.saveMeal(e));
        document.getElementById('meal-prep-friendly').addEventListener('change', (e) => {
            document.getElementById('meal-prep-days-group').style.display = e.target.checked ? 'grid' : 'none';
        });

        // Recipes page
        if (document.getElementById('btn-add-recipe')) {
            document.getElementById('btn-add-recipe').addEventListener('click', () => this.openRecipeModal());
            document.getElementById('recipe-search').addEventListener('input', () => this.filterRecipes());
            document.getElementById('recipe-form').addEventListener('submit', (e) => this.saveRecipe(e));
            document.getElementById('btn-import-recipe-url').addEventListener('click', () => this.importRecipeFromUrl());
            document.getElementById('btn-save-meal-components').addEventListener('click', () => this.saveMealComponents());
            ['recipe-name', 'recipe-source-url', 'recipe-image-url', 'recipe-ingredients', 'recipe-instructions'].forEach(id => {
                document.getElementById(id).addEventListener('input', () => this.refreshRecipePreview());
            });
        }

        // Rules page
        document.getElementById('btn-add-rule').addEventListener('click', () => this.openRuleModal());
        document.getElementById('rule-form').addEventListener('submit', (e) => this.saveRule(e));

        // Settings page
        document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('btn-backup').addEventListener('click', () => this.backupData());
        document.getElementById('btn-restore').addEventListener('click', () => this.restoreData());
        document.getElementById('btn-export-meals').addEventListener('click', () => this.exportMeals());
        document.getElementById('btn-import-meals').addEventListener('click', () => this.importMeals());

        // Shopping page
        document.getElementById('btn-print-shopping').addEventListener('click', () => this.printShoppingList());
        document.getElementById('btn-export-shopping').addEventListener('click', () => this.exportShoppingList());

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Modal background close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    loadInitialState() {
        this.displayCurrentWeek();
        this.displayMeals();
        this.loadMealComponents();
        this.displayRecipes();
        this.displayRules();
        this.displayHistory();
        this.updateShoppingList();
        this.loadSettings();
        this.setupDarkMode();
    }

    setupDarkMode() {
        if (window.settingsManager.isDarkMode()) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const isDark = document.body.classList.contains('dark-mode');
        document.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    }

    switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // Show selected page
        const pageElement = document.getElementById(pageName + '-page');
        if (pageElement) {
            pageElement.classList.add('active');
        }

        // Update nav button
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Refresh page data
        if (pageName === 'planner') {
            this.displayCurrentWeek();
        } else if (pageName === 'meals') {
            this.displayMeals();
        } else if (pageName === 'recipes') {
            this.displayRecipes();
        } else if (pageName === 'rules') {
            this.displayRules();
        } else if (pageName === 'history') {
            this.displayHistory();
        } else if (pageName === 'shopping') {
            this.updateShoppingList();
        } else if (pageName === 'settings') {
            this.loadSettings();
        }
    }

    // ===== PLANNER PAGE =====

    displayCurrentWeek() {
        const currentWeek = window.planner.getCurrentWeek();
        const plan = currentWeek ? currentWeek.plan : window.planner.createEmptyPlan();
        const info = window.planner.getCurrentWeekInfo();

        const startDate = new Date(`${info.weekStartDate}T00:00:00Z`);
        const endDate = new Date(`${info.weekEndDate}T00:00:00Z`);
        const dateFormat = new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
        });
        document.getElementById('week-selector').value = window.planner.getWeekInputValue();
        document.getElementById('week-display').textContent =
            `Week ${info.weekNumber}, ${info.year} · ${dateFormat.format(startDate)}–${dateFormat.format(endDate)}`;

        // Update status
        const statusBadge = document.getElementById('status-badge');
        const status = currentWeek?.status || 'Draft';
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge ' + status.toLowerCase();

        // Calculate dashboard stats
        this.updateDashboardStats(plan);

        // Render week view
        const weekView = document.getElementById('week-view');
        weekView.innerHTML = '';

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.forEach((day, dayIndex) => {
            const dayPlan = plan[day];
            const dayCard = this.createDayCard(day, dayIndex, dayPlan);
            weekView.appendChild(dayCard);
        });
    }

    createDayCard(dayName, dayIndex, dayPlan) {
        const card = document.createElement('div');
        card.className = 'day-card';

        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = dayName;
        card.appendChild(header);

        const mealsContainer = document.createElement('div');
        mealsContainer.className = 'day-meals';

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const slot = document.createElement('div');
            slot.className = 'meal-slot';

            const label = document.createElement('div');
            label.className = 'meal-slot-label';
            label.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
            if (mealType === 'lunch') {
                const schoolLunchLabel = document.createElement('label');
                schoolLunchLabel.className = 'school-lunch-toggle';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = Boolean(dayPlan.schoolLunch);
                checkbox.addEventListener('change', () => {
                    window.planner.setSchoolLunch(dayIndex, checkbox.checked);
                    this.displayCurrentWeek();
                });
                schoolLunchLabel.append(checkbox, document.createTextNode('School lunch'));
                label.appendChild(schoolLunchLabel);
            }
            slot.appendChild(label);

            let mealItem = document.createElement('div');
            mealItem.className = 'meal-item';

            if (mealType === 'lunch' && dayPlan.schoolLunch) {
                mealItem.className += ' school-lunch';
                mealItem.textContent = 'School Lunch';
            } else if (!dayPlan[mealType]) {
                mealItem.className += ' empty';
                mealItem.textContent = '+ Add Meal';
                mealItem.addEventListener('click', () => this.openMealPicker(dayIndex, mealType));
            } else {
                const meal = dayPlan[mealType];
                mealItem.innerHTML = `
                    <div class="meal-name">${meal.name}</div>
                    <div class="meal-info">${meal.cuisine} • ${meal.protein || 'N/A'}</div>
                `;
                mealItem.addEventListener('click', () => this.openMealPicker(dayIndex, mealType));
            }

            slot.appendChild(mealItem);
            mealsContainer.appendChild(slot);
        });

        card.appendChild(mealsContainer);
        return card;
    }

    updateDashboardStats(plan) {
        let mealPrepCount = 0;
        let cuisines = {};

        for (const day of Object.values(plan)) {
            if (day && typeof day === 'object') {
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    if (day[type] && day[type].id) {
                        if (day[type].mealPrepFriendly) {
                            mealPrepCount++;
                        }
                        cuisines[day[type].cuisine] = (cuisines[day[type].cuisine] || 0) + 1;
                    }
                });
            }
        }

        document.getElementById('meal-prep-count').textContent = `${mealPrepCount} meals`;

        const cuisineList = Object.entries(cuisines)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cuisine, count]) => `${cuisine} (${count})`)
            .join(', ');

        document.getElementById('cuisine-summary').textContent = cuisineList || 'No meals planned';
    }

    generateWeek() {
        const plan = window.planner.generateWeekPlan();
        this.displayCurrentWeek();
        const hasPlannedMeals = Object.values(plan).some(day =>
            ['breakfast', 'lunch', 'dinner'].some(mealType => day[mealType])
        );
        alert(hasPlannedMeals
            ? 'Week plan generated successfully!'
            : 'No meals are available for this week. Add meals or complete all three dinner component lists first.');
    }

    regenerateMealType(mealType) {
        window.planner.regenerateMealType(mealType);
        this.displayCurrentWeek();
        alert(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meals regenerated!`);
    }

    approvePlan() {
        if (confirm('Approve this meal plan for the week? This will save it to history.')) {
            const success = window.planner.approvePlan();
            if (success) {
                this.displayCurrentWeek();
                alert('Plan approved and saved to history!');
            }
        }
    }

    openMealPicker(dayIndex, mealType) {
        this.currentMealPickerContext = { dayIndex, mealType };
        const meals = window.repository.getPlanningMealsByType(mealType.charAt(0).toUpperCase() + mealType.slice(1));

        const list = document.getElementById('meal-picker-list');
        list.innerHTML = '';

        meals.forEach(meal => {
            const item = document.createElement('div');
            item.className = 'meal-picker-item';
            item.innerHTML = `
                <div class="meal-name">${meal.name}</div>
                <div class="meal-info">${meal.cuisine} • ${meal.protein || 'N/A'}</div>
            `;
            item.addEventListener('click', () => this.selectMeal(meal.id));
            list.appendChild(item);
        });

        document.getElementById('meal-picker-modal').classList.add('active');
    }

    selectMeal(mealId) {
        const ctx = this.currentMealPickerContext;
        window.planner.replaceMeal(ctx.dayIndex, ctx.mealType, mealId);
        document.getElementById('meal-picker-modal').classList.remove('active');
        this.displayCurrentWeek();
    }

    // ===== MEALS PAGE =====

    displayMeals() {
        const meals = window.repository.getAllMeals();
        const grid = document.getElementById('meals-grid');
        grid.innerHTML = '';

        if (meals.length === 0) {
            grid.innerHTML = '<div class="empty-state">No meals yet. Add your first meal!</div>';
            return;
        }

        meals.forEach(meal => {
            const card = this.createMealCard(meal);
            grid.appendChild(card);
        });
    }

    loadMealComponents() {
        const components = window.repository.getMealComponents();
        document.getElementById('meal-component-proteins').value = components.proteins.join(', ');
        document.getElementById('meal-component-starches').value = components.starches.join(', ');
        document.getElementById('meal-component-vegetables').value = components.vegetables.join(', ');
    }

    saveMealComponents() {
        const components = window.repository.saveMealComponents({
            proteins: document.getElementById('meal-component-proteins').value,
            starches: document.getElementById('meal-component-starches').value,
            vegetables: document.getElementById('meal-component-vegetables').value
        });
        const status = document.getElementById('meal-components-status');
        const allCategoriesReady = components.proteins.length &&
            components.starches.length && components.vegetables.length;
        status.textContent = allCategoriesReady
            ? 'Options saved. Dinner plans will combine one from each category.'
            : 'Options saved. Add at least one item to all three categories to assemble dinners.';
        this.displayMeals();
    }

    createMealCard(meal) {
        const card = document.createElement('div');
        card.className = 'meal-card';

        const tagsHtml = meal.tags.map(tag => `<span class="badge">${tag}</span>`).join('');
        const prepIcon = meal.mealPrepFriendly ? '🍱' : '';

        card.innerHTML = `
            <div class="meal-card-header">
                <div>
                    <div class="meal-card-title">${meal.name} ${prepIcon}</div>
                </div>
            </div>
            <div class="meal-card-meta">
                <span class="badge">${meal.mealType}</span>
                <span class="badge">${meal.cuisine}</span>
                <span class="badge">${meal.protein || 'N/A'}</span>
                <span class="badge">${meal.difficulty}</span>
                ${tagsHtml}
            </div>
            <div class="meal-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="window.ui.editMeal('${meal.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="window.ui.deleteMeal('${meal.id}')">Delete</button>
            </div>
        `;

        const linkedRecipes = window.recipeManager.getRecipesByMeal(meal.id);
        if (linkedRecipes.length) {
            const recipeNames = document.createElement('div');
            recipeNames.className = 'meal-info linked-recipes';
            recipeNames.textContent = `Recipes: ${linkedRecipes.map(recipe => recipe.name).join(', ')}`;
            card.querySelector('.meal-card-actions').before(recipeNames);
        }

        return card;
    }

    filterMeals() {
        const search = document.getElementById('meal-search').value;
        const type = document.getElementById('meal-filter-type').value;
        const cuisine = document.getElementById('meal-filter-cuisine').value;

        let meals = window.repository.getAllMeals();

        if (search) {
            meals = meals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        }

        if (type) {
            meals = meals.filter(m => m.mealType === type);
        }

        if (cuisine) {
            meals = meals.filter(m => m.cuisine === cuisine);
        }

        const grid = document.getElementById('meals-grid');
        grid.innerHTML = '';

        if (meals.length === 0) {
            grid.innerHTML = '<div class="empty-state">No meals match your filters.</div>';
            return;
        }

        meals.forEach(meal => {
            grid.appendChild(this.createMealCard(meal));
        });
    }

    openMealModal() {
        this.currentEditingMealId = null;
        document.getElementById('meal-modal-title').textContent = 'Add Meal';
        document.getElementById('meal-form').reset();
        document.getElementById('meal-prep-days-group').style.display = 'none';
        document.getElementById('meal-modal').classList.add('active');
    }

    editMeal(mealId) {
        const meal = window.repository.getMeal(mealId);
        if (!meal) return;

        this.currentEditingMealId = mealId;
        document.getElementById('meal-modal-title').textContent = 'Edit Meal';

        document.getElementById('meal-name').value = meal.name;
        document.getElementById('meal-type').value = meal.mealType;
        document.getElementById('meal-cuisine').value = meal.cuisine;
        document.getElementById('meal-protein').value = meal.protein || '';
        document.getElementById('meal-difficulty').value = meal.difficulty;
        document.getElementById('meal-prep-friendly').checked = meal.mealPrepFriendly;
        document.getElementById('meal-prep-days').value = meal.mealPrepDays || 2;
        document.getElementById('meal-prep-days-group').style.display = meal.mealPrepFriendly ? 'grid' : 'none';
        document.getElementById('meal-ingredients').value = meal.ingredients.join(', ');
        document.getElementById('meal-food-groups').value = meal.foodGroups.join(', ');
        document.getElementById('meal-tags').value = meal.tags.join(', ');

        document.getElementById('meal-modal').classList.add('active');
    }

    deleteMeal(mealId) {
        if (confirm('Are you sure you want to delete this meal?')) {
            window.repository.deleteMeal(mealId);
            this.displayMeals();
            alert('Meal deleted!');
        }
    }

    saveMeal(e) {
        e.preventDefault();

        const mealData = {
            name: document.getElementById('meal-name').value,
            mealType: document.getElementById('meal-type').value,
            cuisine: document.getElementById('meal-cuisine').value,
            protein: document.getElementById('meal-protein').value || document.getElementById('meal-protein-custom').value,
            difficulty: document.getElementById('meal-difficulty').value,
            mealPrepFriendly: document.getElementById('meal-prep-friendly').checked,
            mealPrepDays: parseInt(document.getElementById('meal-prep-days').value) || 0,
            ingredients: document.getElementById('meal-ingredients').value,
            foodGroups: document.getElementById('meal-food-groups').value,
            tags: document.getElementById('meal-tags').value
        };

        try {
            if (this.currentEditingMealId) {
                window.repository.updateMeal(this.currentEditingMealId, mealData);
                alert('Meal updated!');
            } else {
                window.repository.addMeal(mealData);
                alert('Meal added!');
            }

            document.getElementById('meal-modal').classList.remove('active');
            this.displayMeals();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    // ===== RULES PAGE =====

    displayRules() {
        const rules = window.ruleEngine.getRules();
        const list = document.getElementById('rules-list');
        list.innerHTML = '';

        rules.forEach(rule => {
            const item = this.createRuleItem(rule);
            list.appendChild(item);
        });
    }

    createRuleItem(rule) {
        const item = document.createElement('div');
        item.className = 'rule-item';

        const strengthLabel = this.getStrengthLabel(rule.strength);

        item.innerHTML = `
            <div class="rule-info">
                <h3>${rule.name}</h3>
                <p>${rule.description || ''}</p>
                ${rule.type === 'custom' ? `<button class="btn btn-danger btn-sm" onclick="window.ui.deleteRule('${rule.id}')">Delete Custom Rule</button>` : ''}
            </div>
            <div class="rule-controls">
                <div class="rule-toggle">
                    <span>Enabled</span>
                    <div class="toggle-switch ${rule.enabled ? 'active' : ''}" onclick="window.ui.toggleRule('${rule.id}')"></div>
                </div>
                <div class="rule-strength">
                    <input type="range" class="rule-strength-slider" min="0" max="100" value="${rule.strength}" 
                        onchange="window.ui.updateRuleStrength('${rule.id}', this.value)">
                    <span class="rule-strength-label">${strengthLabel}</span>
                </div>
            </div>
        `;

        return item;
    }

    getStrengthLabel(strength) {
        if (strength === 0) return 'Off';
        if (strength <= 25) return 'Low';
        if (strength <= 50) return 'Medium';
        if (strength <= 75) return 'Strong';
        return 'Mandatory';
    }

    toggleRule(ruleId) {
        const rule = window.ruleEngine.getRules().find(r => r.id === ruleId);
        if (rule) {
            window.ruleEngine.updateRule(ruleId, { enabled: !rule.enabled });
            this.displayRules();
        }
    }

    updateRuleStrength(ruleId, strength) {
        window.ruleEngine.updateRule(ruleId, { strength: parseInt(strength) });
    }

    openRuleModal() {
        this.currentEditingRuleId = null;
        document.getElementById('rule-modal-title').textContent = 'Add Custom Rule';
        document.getElementById('rule-form').reset();
        document.getElementById('rule-modal').classList.add('active');
    }

    deleteRule(ruleId) {
        if (confirm('Delete this custom rule?')) {
            window.ruleEngine.deleteRule(ruleId);
            this.displayRules();
            alert('Rule deleted!');
        }
    }

    saveRule(e) {
        e.preventDefault();

        const name = document.getElementById('rule-name').value;
        const description = document.getElementById('rule-description').value;

        if (name) {
            window.ruleEngine.addCustomRule(name, description);
            document.getElementById('rule-modal').classList.remove('active');
            this.displayRules();
            alert('Custom rule added!');
        }
    }

    // ===== HISTORY PAGE =====

    displayHistory() {
        const history = window.historyManager.getHistoryList();
        const list = document.getElementById('history-list');
        list.innerHTML = '';

        if (history.length === 0) {
            list.innerHTML = '<div class="empty-state">No approved plans yet.</div>';
            return;
        }

        history.forEach(item => {
            const historyItem = this.createHistoryItem(item);
            list.appendChild(historyItem);
        });
    }

    createHistoryItem(item) {
        const element = document.createElement('div');
        element.className = 'history-item';

        const date = new Date(item.approvedDate);
        const dateStr = date.toLocaleDateString();
        const weekDates = item.weekStartDate && item.weekEndDate
            ? `${item.weekStartDate} – ${item.weekEndDate}`
            : '';

        let previewHtml = '';
        if (item.plan) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            previewHtml = days.map((dayLabel, idx) => {
                const dayName = dayNames[idx];
                const dayPlan = item.plan[dayName];
                const meals = [];

                if (dayPlan) {
                    if (dayPlan.breakfast && dayPlan.breakfast.name) meals.push(dayPlan.breakfast.name.substring(0, 15));
                    if (dayPlan.lunch && dayPlan.lunch.name) meals.push(dayPlan.lunch.name.substring(0, 15));
                    if (dayPlan.dinner && dayPlan.dinner.name) meals.push(dayPlan.dinner.name.substring(0, 15));
                }

                return `
                    <div class="history-day-preview">
                        <div class="history-day-preview-title">${dayLabel}</div>
                        <div>${meals.join('<br>')}</div>
                    </div>
                `;
            }).join('');
        }

        element.innerHTML = `
            <div class="history-header">
                <div>
                    <div class="history-week-info">Week ${item.weekNumber}, ${item.year}${weekDates ? ` · ${weekDates}` : ''}</div>
                    <div class="history-date">Approved: ${dateStr}</div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.ui.copyHistoryToCurrent(${item.weekNumber}, ${item.year})">Copy to Selected Week</button>
                </div>
            </div>
            <div class="history-preview">
                ${previewHtml}
            </div>
        `;

        return element;
    }

    copyHistoryToCurrent(weekNumber, year) {
        if (confirm('Copy this plan to the selected week? This will overwrite its current plan.')) {
            window.historyManager.copyHistoryToCurrent(weekNumber, year);
            this.switchPage('planner');
            alert('Plan copied to the selected week!');
        }
    }

    // ===== SHOPPING PAGE =====

    updateShoppingList() {
        window.shoppingManager.generateShoppingList();
        this.displayShoppingList();
    }

    displayShoppingList() {
        const list = window.shoppingManager.getShoppingList();
        const container = document.getElementById('shopping-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">No shopping list yet. Generate a week plan first!</div>';
            return;
        }

        list.forEach(item => {
            const elem = document.createElement('div');
            elem.className = 'shopping-item ' + (item.purchased ? 'purchased' : '');
            elem.innerHTML = `
                <input type="checkbox" class="shopping-item-checkbox" ${item.purchased ? 'checked' : ''} 
                    onchange="window.ui.toggleShoppingItem('${item.id}', this.checked)">
                <div class="shopping-item-name">${item.name}</div>
                <div class="shopping-item-quantity">${item.quantity} units</div>
            `;
            container.appendChild(elem);
        });
    }

    toggleShoppingItem(itemId, purchased) {
        if (purchased) {
            window.shoppingManager.markItemPurchased(itemId);
        } else {
            window.shoppingManager.markItemUnpurchased(itemId);
        }
        this.displayShoppingList();
    }

    printShoppingList() {
        window.shoppingManager.printShoppingList();
    }

    exportShoppingList() {
        const text = window.shoppingManager.exportShoppingList();
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', 'shopping-list.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // ===== SETTINGS PAGE =====

    loadSettings() {
        const settings = window.settingsManager.getSettings();

        document.getElementById('cook-for-days').value = settings.cookForDays;
        document.getElementById('history-weeks').value = settings.historyWeeksToAvoid;
    }

    saveSettings() {
        window.settingsManager.updateSettings({
            cookForDays: parseInt(document.getElementById('cook-for-days').value),
            historyWeeksToAvoid: parseInt(document.getElementById('history-weeks').value)
        });

        alert('Settings saved!');
    }

    backupData() {
        window.storage.downloadBackup();
        alert('Backup downloaded!');
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const success = window.storage.importData(event.target.result);
                if (success) {
                    alert('Data restored successfully!');
                    location.reload();
                } else {
                    alert('Error restoring data. Invalid file format.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    exportMeals() {
        const data = window.repository.exportMeals();
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
        element.setAttribute('download', 'meals-export.json');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    importMeals() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const count = window.repository.importMeals(event.target.result);
                alert(`${count} meals imported successfully!`);
                this.displayMeals();
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ===== RECIPES PAGE (BONUS) =====

    displayRecipes() {
        const recipes = window.recipeManager.getAllRecipes();
        const grid = document.getElementById('recipes-grid');
        grid.innerHTML = '';

        if (recipes.length === 0) {
            grid.innerHTML = '<div class="empty-state">No recipes yet. Add your first recipe!</div>';
            return;
        }

        recipes.forEach(recipe => {
            const card = this.createRecipeCard(recipe);
            grid.appendChild(card);
        });
    }

    createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'meal-card';
        const totalTime = recipe.prepTime + recipe.cookTime;
        const ratingStars = '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating);

        if (recipe.imageUrl) {
            try {
                const imageUrl = new URL(recipe.imageUrl);
                if (imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:') {
                    const image = document.createElement('img');
                    image.className = 'recipe-card-image';
                    image.src = imageUrl.href;
                    image.alt = recipe.name;
                    image.loading = 'lazy';
                    image.referrerPolicy = 'no-referrer';
                    card.appendChild(image);
                }
            } catch (error) {
                // Ignore invalid image URLs in older imported data.
            }
        }

        const header = document.createElement('div');
        header.className = 'meal-card-header';
        const titleGroup = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'meal-card-title';
        title.textContent = recipe.name;
        const rating = document.createElement('div');
        rating.className = 'meal-info';
        rating.textContent = ratingStars;
        titleGroup.append(title, rating);
        header.appendChild(titleGroup);

        const meta = document.createElement('div');
        meta.className = 'meal-card-meta';
        [ `⏱️ ${totalTime}min`, recipe.difficulty, `👥 ${recipe.servings}`, ...(recipe.tags || []) ]
            .forEach(label => {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = label;
                meta.appendChild(badge);
            });

        card.append(header, meta);

        const linkedMeal = recipe.mealId ? window.repository.getMeal(recipe.mealId) : null;
        if (linkedMeal) {
            const mealLabel = document.createElement('div');
            mealLabel.className = 'meal-info';
            mealLabel.textContent = `Linked meal: ${linkedMeal.name}`;
            card.appendChild(mealLabel);
        }

        if (recipe.sourceUrl) {
            try {
                const sourceUrl = new URL(recipe.sourceUrl);
                if (sourceUrl.protocol === 'http:' || sourceUrl.protocol === 'https:') {
                    const sourceLink = document.createElement('a');
                    sourceLink.className = 'recipe-source-link';
                    sourceLink.href = sourceUrl.href;
                    sourceLink.target = '_blank';
                    sourceLink.rel = 'noopener noreferrer';
                    sourceLink.textContent = 'Open original recipe';
                    card.appendChild(sourceLink);
                }
            } catch (error) {
                // Ignore invalid source URLs in older imported data.
            }
        }

        const actions = document.createElement('div');
        actions.className = 'meal-card-actions';
        [
            ['View', 'btn-secondary', () => this.viewRecipe(recipe.id)],
            ['Edit', 'btn-secondary', () => this.editRecipe(recipe.id)],
            ['Delete', 'btn-danger', () => this.deleteRecipe(recipe.id)]
        ].forEach(([label, style, handler]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn ${style} btn-sm`;
            button.textContent = label;
            button.addEventListener('click', handler);
            actions.appendChild(button);
        });
        card.appendChild(actions);

        return card;
    }

    filterRecipes() {
        const search = document.getElementById('recipe-search').value;
        const recipes = window.recipeManager.getAllRecipes();

        let filtered = recipes;
        if (search) {
            filtered = recipes.filter(r =>
                r.name.toLowerCase().includes(search.toLowerCase()) ||
                r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
            );
        }

        const grid = document.getElementById('recipes-grid');
        grid.innerHTML = '';

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">No recipes match your search.</div>';
            return;
        }

        filtered.forEach(recipe => {
            grid.appendChild(this.createRecipeCard(recipe));
        });
    }

    openRecipeModal() {
        this.currentEditingRecipeId = null;
        document.getElementById('recipe-modal-title').textContent = 'Add Recipe';
        document.getElementById('recipe-form').reset();
        document.getElementById('recipe-import-status').textContent = '';
        document.getElementById('recipe-import-status').className = 'recipe-import-status';
        document.getElementById('recipe-import-preview').hidden = true;
        this.populateRecipeMealOptions(null);
        document.getElementById('recipe-modal').classList.add('active');
    }

    populateRecipeMealOptions(selectedMealId) {
        const select = document.getElementById('recipe-meal-link');
        select.replaceChildren(new Option('Not linked to a meal', ''));
        window.repository.getAllMeals().forEach(meal => {
            const option = new Option(`${meal.name} (${meal.mealType})`, meal.id);
            select.appendChild(option);
        });
        select.value = selectedMealId || '';
    }

    async importRecipeFromUrl() {
        const urlInput = document.getElementById('recipe-import-url');
        const status = document.getElementById('recipe-import-status');
        const button = document.getElementById('btn-import-recipe-url');
        const sourceUrl = urlInput.value.trim();

        if (!sourceUrl) {
            status.textContent = 'Enter a recipe webpage link first.';
            status.className = 'recipe-import-status error';
            return;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(sourceUrl);
        } catch (error) {
            status.textContent = 'Enter a valid recipe webpage link.';
            status.className = 'recipe-import-status error';
            return;
        }

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            status.textContent = 'Recipe links must start with http:// or https://.';
            status.className = 'recipe-import-status error';
            return;
        }

        button.disabled = true;
        status.textContent = 'Loading recipe details...';
        status.className = 'recipe-import-status';

        try {
            const response = await fetch(parsedUrl.href, { credentials: 'omit' });
            if (!response.ok) {
                throw new Error(`The website returned ${response.status}.`);
            }

            const html = await response.text();
            const recipeData = this.extractRecipeData(html);
            if (!recipeData) {
                throw new Error('No supported recipe data was found on that page.');
            }
            if (recipeData.imageUrl) {
                const imageUrl = new URL(recipeData.imageUrl, parsedUrl.href);
                recipeData.imageUrl = imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:'
                    ? imageUrl.href
                    : '';
            }

            document.getElementById('recipe-source-url').value = parsedUrl.href;
            if (recipeData.name) document.getElementById('recipe-name').value = recipeData.name;
            if (recipeData.prepTime !== null) document.getElementById('recipe-prep-time').value = recipeData.prepTime;
            if (recipeData.cookTime !== null) document.getElementById('recipe-cook-time').value = recipeData.cookTime;
            if (recipeData.servings !== null) document.getElementById('recipe-servings').value = recipeData.servings;
            if (recipeData.ingredients.length) {
                document.getElementById('recipe-ingredients').value = recipeData.ingredients.join('\n');
            }
            if (recipeData.instructions.length) {
                document.getElementById('recipe-instructions').value = recipeData.instructions.join('\n');
            }
            if (recipeData.description) document.getElementById('recipe-notes').value = recipeData.description;
            if (recipeData.tags.length) document.getElementById('recipe-tags').value = recipeData.tags.join(', ');
            if (recipeData.imageUrl) document.getElementById('recipe-image-url').value = recipeData.imageUrl;

            document.getElementById('recipe-import-preview').hidden = false;
            this.refreshRecipePreview();
            status.textContent = 'Recipe details loaded. Review them and save the recipe.';
            status.className = 'recipe-import-status success';
        } catch (error) {
            status.textContent = `${error.message} This site may block browser access (CORS). You can still save the link and enter the details manually.`;
            status.className = 'recipe-import-status error';
        } finally {
            button.disabled = false;
        }
    }

    refreshRecipePreview() {
        const preview = document.getElementById('recipe-import-preview');
        if (preview.hidden) return;

        preview.replaceChildren();
        const heading = document.createElement('h3');
        heading.textContent = document.getElementById('recipe-name').value || 'Recipe preview';
        preview.appendChild(heading);

        const sourceUrl = document.getElementById('recipe-source-url').value.trim();
        if (sourceUrl) {
            try {
                const parsedSourceUrl = new URL(sourceUrl);
                if (parsedSourceUrl.protocol === 'http:' || parsedSourceUrl.protocol === 'https:') {
                    const sourceLink = document.createElement('a');
                    sourceLink.href = parsedSourceUrl.href;
                    sourceLink.target = '_blank';
                    sourceLink.rel = 'noopener noreferrer';
                    sourceLink.textContent = 'Open source page';
                    preview.appendChild(sourceLink);
                }
            } catch (error) {
                // An invalid or partial source URL is omitted from the preview.
            }
        }

        const imageUrl = document.getElementById('recipe-image-url').value.trim();
        if (imageUrl) {
            try {
                const parsedImageUrl = new URL(imageUrl);
                if (parsedImageUrl.protocol === 'http:' || parsedImageUrl.protocol === 'https:') {
                    const image = document.createElement('img');
                    image.src = parsedImageUrl.href;
                    image.alt = heading.textContent;
                    image.loading = 'lazy';
                    image.referrerPolicy = 'no-referrer';
                    preview.appendChild(image);
                }
            } catch (error) {
                // An invalid or partial image URL is omitted from the preview.
            }
        }

        const ingredients = document.getElementById('recipe-ingredients').value
            .split('\n').map(line => line.trim()).filter(Boolean);
        const instructions = document.getElementById('recipe-instructions').value
            .split('\n').map(line => line.trim()).filter(Boolean);
        this.appendRecipePreviewList(preview, 'Ingredients', ingredients, 'ul');
        this.appendRecipePreviewList(preview, 'Steps', instructions, 'ol');
    }

    appendRecipePreviewList(container, title, values, listTag) {
        const section = document.createElement('section');
        const heading = document.createElement('h4');
        heading.textContent = title;
        section.appendChild(heading);

        if (values.length) {
            const list = document.createElement(listTag);
            values.forEach(value => {
                const item = document.createElement('li');
                item.textContent = value;
                list.appendChild(item);
            });
            section.appendChild(list);
        } else {
            const empty = document.createElement('p');
            empty.textContent = `No ${title.toLowerCase()} found.`;
            section.appendChild(empty);
        }
        container.appendChild(section);
    }

    extractRecipeData(html) {
        const documentFromPage = new DOMParser().parseFromString(html, 'text/html');
        const recipeNodes = [];

        const collectRecipes = (value) => {
            if (Array.isArray(value)) {
                value.forEach(collectRecipes);
                return;
            }
            if (!value || typeof value !== 'object') return;

            const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
            if (types.includes('Recipe')) recipeNodes.push(value);
            Object.values(value).forEach(collectRecipes);
        };

        documentFromPage.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                collectRecipes(JSON.parse(script.textContent));
            } catch (error) {
                // Ignore malformed JSON-LD blocks and inspect the other structured data.
            }
        });

        const recipe = recipeNodes[0];
        if (!recipe) return null;

        const toMinutes = (duration) => {
            if (typeof duration !== 'string') return null;
            const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
            if (!match) return null;
            return (parseInt(match[1] || '0', 10) * 60) +
                parseInt(match[2] || '0', 10) +
                (parseInt(match[3] || '0', 10) > 0 ? 1 : 0);
        };

        const flattenInstructions = (instructions) => {
            if (typeof instructions === 'string') return [instructions.trim()].filter(Boolean);
            if (!Array.isArray(instructions)) instructions = instructions ? [instructions] : [];
            return instructions.flatMap(step => {
                if (typeof step === 'string') return [step.trim()].filter(Boolean);
                if (!step || typeof step !== 'object') return [];
                if (step.itemListElement) return flattenInstructions(step.itemListElement);
                if (step.text || step.name) return [String(step.text || step.name).trim()];
                return [];
            }).filter(Boolean);
        };

        const yieldValue = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
        const servingsMatch = String(yieldValue || '').match(/\d+/);
        const keywords = Array.isArray(recipe.keywords)
            ? recipe.keywords
            : String(recipe.keywords || '').split(',');
        const categories = Array.isArray(recipe.recipeCategory)
            ? recipe.recipeCategory
            : [recipe.recipeCategory];
        const imageValue = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
        const imageUrl = typeof imageValue === 'string'
            ? imageValue
            : imageValue && typeof imageValue === 'object'
                ? (imageValue.url || imageValue.contentUrl || '')
                : '';

        return {
            name: typeof recipe.name === 'string' ? recipe.name : '',
            prepTime: toMinutes(recipe.prepTime),
            cookTime: toMinutes(recipe.cookTime),
            servings: servingsMatch ? parseInt(servingsMatch[0], 10) : null,
            ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
            instructions: flattenInstructions(recipe.recipeInstructions),
            description: typeof recipe.description === 'string' ? recipe.description : '',
            imageUrl,
            tags: [...keywords, ...categories].filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean)
        };
    }

    viewRecipe(recipeId) {
        const recipe = window.recipeManager.getRecipe(recipeId);
        if (!recipe) return;

        const text = window.recipeManager.exportRecipe(recipeId);
        alert(text);
    }

    editRecipe(recipeId) {
        const recipe = window.recipeManager.getRecipe(recipeId);
        if (!recipe) return;

        this.currentEditingRecipeId = recipeId;
        document.getElementById('recipe-modal-title').textContent = 'Edit Recipe';
        document.getElementById('recipe-import-preview').hidden = true;
        this.populateRecipeMealOptions(recipe.mealId);

        document.getElementById('recipe-name').value = recipe.name;
        document.getElementById('recipe-source-url').value = recipe.sourceUrl || '';
        document.getElementById('recipe-import-url').value = recipe.sourceUrl || '';
        document.getElementById('recipe-image-url').value = recipe.imageUrl || '';
        document.getElementById('recipe-import-status').textContent = '';
        document.getElementById('recipe-import-status').className = 'recipe-import-status';
        document.getElementById('recipe-difficulty').value = recipe.difficulty;
        document.getElementById('recipe-prep-time').value = recipe.prepTime;
        document.getElementById('recipe-cook-time').value = recipe.cookTime;
        document.getElementById('recipe-servings').value = recipe.servings;
        document.getElementById('recipe-ingredients').value = recipe.ingredients
            .map(ing => `${ing.amount} ${ing.unit} - ${ing.name}`)
            .join('\n');
        document.getElementById('recipe-instructions').value = recipe.instructions;
        document.getElementById('recipe-notes').value = recipe.notes;
        document.getElementById('recipe-tags').value = recipe.tags.join(', ');

        document.getElementById('recipe-modal').classList.add('active');
    }

    deleteRecipe(recipeId) {
        if (confirm('Are you sure you want to delete this recipe?')) {
            window.recipeManager.deleteRecipe(recipeId);
            this.displayRecipes();
            alert('Recipe deleted!');
        }
    }

    saveRecipe(e) {
        e.preventDefault();

        const recipeData = {
            name: document.getElementById('recipe-name').value,
            sourceUrl: document.getElementById('recipe-source-url').value,
            imageUrl: document.getElementById('recipe-image-url').value,
            mealId: document.getElementById('recipe-meal-link').value || null,
            difficulty: document.getElementById('recipe-difficulty').value,
            prepTime: parseInt(document.getElementById('recipe-prep-time').value) || 0,
            cookTime: parseInt(document.getElementById('recipe-cook-time').value) || 0,
            servings: parseInt(document.getElementById('recipe-servings').value) || 4,
            ingredients: document.getElementById('recipe-ingredients').value,
            instructions: document.getElementById('recipe-instructions').value,
            notes: document.getElementById('recipe-notes').value,
            tags: document.getElementById('recipe-tags').value
        };

        try {
            if (this.currentEditingRecipeId) {
                window.recipeManager.updateRecipe(this.currentEditingRecipeId, recipeData);
                alert('Recipe updated!');
            } else {
                window.recipeManager.addRecipe(recipeData);
                alert('Recipe added!');
            }

            document.getElementById('recipe-modal').classList.remove('active');
            this.displayRecipes();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new UIManager();
    window.ui.init();
});

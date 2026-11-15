// ui.js - UI initialization and event handling

const cuisineFlags = new Map([
    ['american', 'us'], ['brazilian', 'br'], ['british', 'gb'],
    ['chinese', 'cn'], ['danish', 'dk'], ['french', 'fr'],
    ['german', 'de'], ['greek', 'gr'], ['indian', 'in'],
    ['irish', 'ie'], ['italian', 'it'], ['japanese', 'jp'],
    ['korean', 'kr'], ['lebanese', 'lb'], ['mexican', 'mx'],
    ['moroccan', 'ma'], ['norwegian', 'no'], ['polish', 'pl'],
    ['portuguese', 'pt'], ['spanish', 'es'], ['swedish', 'se'],
    ['thai', 'th'], ['turkish', 'tr'], ['ukrainian', 'ua'],
    ['vietnamese', 'vn']
]);
const cuisineFlagBase = new URL('../assets/flags/', document.currentScript.src);

class UIManager {
    constructor() {
        this.currentEditingMealId = null;
        this.currentEditingRuleId = null;
        this.currentMealPickerContext = null;
        this.recipeMealCreationPending = false;
        this.componentPhotoCredit = null;
        this.componentPhotoUrl = '';
        this.photoSearchController = null;
        this.componentInfoController = null;
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
        document.getElementById('btn-clear-plan').addEventListener('click', () => this.clearPlan());
        document.getElementById('btn-approve-plan').addEventListener('click', () => this.approvePlan());
        document.getElementById('btn-regenerate-breakfast').addEventListener('click', () => this.regenerateMealType('breakfast'));
        document.getElementById('btn-regenerate-lunch').addEventListener('click', () => this.regenerateMealType('lunch'));
        document.getElementById('btn-regenerate-dinner').addEventListener('click', () => this.regenerateMealType('dinner'));
        document.getElementById('picker-search').addEventListener('input', () => this.displayComponentPicker());

        // Meals page
        document.getElementById('btn-add-meal').addEventListener('click', () => this.openMealModal());
        document.getElementById('meal-search').addEventListener('input', () => this.filterMeals());
        document.getElementById('meal-filter-category').addEventListener('change', () => this.filterMeals());
        document.getElementById('meal-filter-type').addEventListener('change', () => this.filterMeals());
        document.getElementById('meal-filter-cuisine').addEventListener('change', () => this.filterMeals());
        document.getElementById('meal-form').addEventListener('submit', (e) => this.saveMeal(e));
        document.getElementById('btn-cancel-meal').addEventListener('click', () => this.cancelMealModal());
        document.getElementById('btn-find-component-info').addEventListener('click', () => this.searchComponentInfo());
        document.getElementById('meal-name').addEventListener('input', () => this.resetComponentInfo());
        document.getElementById('btn-search-component-photo').addEventListener('click', () => this.searchComponentPhotos());
        document.getElementById('meal-image-url').addEventListener('input', () => {
            this.componentPhotoCredit = null;
            this.componentPhotoUrl = '';
            document.getElementById('component-photo-credit').replaceChildren();
            this.updateComponentPhotoPreview();
        });
        document.querySelectorAll('input[name="meal-category"]').forEach(input => {
            input.addEventListener('change', () => {
                this.updateMealProteinVisibility();
                this.renderMealPairingOptions();
            });
        });
        document.getElementById('meal-prep-friendly').addEventListener('change', (e) => {
            document.getElementById('meal-prep-days-group').style.display = e.target.checked ? 'grid' : 'none';
        });
        // Recipes page
        if (document.getElementById('btn-add-recipe')) {
            document.getElementById('btn-add-recipe').addEventListener('click', () => this.openRecipeModal());
            document.getElementById('btn-load-recipe-link').addEventListener('click', () => this.openRecipeLinkModal());
            document.getElementById('recipe-search').addEventListener('input', () => this.filterRecipes());
            document.getElementById('recipe-form').addEventListener('submit', (e) => this.saveRecipe(e));
            document.getElementById('btn-import-recipe-url').addEventListener('click', () => this.importRecipeFromUrl());
            document.getElementById('btn-create-meal-from-recipe').addEventListener('click', () => this.createMealFromRecipe());
            document.getElementById('recipe-meal-link').addEventListener('change', () => this.updateCreateMealButtonVisibility());
            document.getElementById('recipe-name').addEventListener('input', () => this.updateCreateMealButtonVisibility());
            document.querySelectorAll('input[name="recipe-category"]').forEach(input => {
                input.addEventListener('change', () => this.refreshRecipePreview());
            });
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
            btn.addEventListener('click', (event) => {
                this.closeModal(event.currentTarget.closest('.modal'));
            });
        });

        // Modal background close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    closeModal(modal) {
        modal.classList.remove('active');
        if (modal.id === 'meal-modal' && this.photoSearchController) this.photoSearchController.abort();
        if (modal.id === 'meal-modal' && this.componentInfoController) this.componentInfoController.abort();
        if (modal.id === 'meal-modal' && this.recipeMealCreationPending) {
            this.recipeMealCreationPending = false;
            document.getElementById('recipe-modal').classList.add('active');
        }
    }

    cancelMealModal() {
        this.closeModal(document.getElementById('meal-modal'));
    }

    loadInitialState() {
        this.displayCurrentWeek();
        this.displayMeals();
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
        document.getElementById('week-approved-badge').hidden = status.toLowerCase() !== 'approved';
        document.getElementById('history-edit-indicator').hidden = !currentWeek?.editingHistoryKey;

        // Calculate dashboard stats
        this.updateDashboardStats(plan);

        // Render week view
        const weekView = document.getElementById('week-view');
        weekView.innerHTML = '';

        window.planner.days.forEach((day, dayIndex) => {
            const dayPlan = plan[day];
            const date = new Date(startDate);
            date.setUTCDate(date.getUTCDate() + dayIndex);
            const dayCard = this.createDayCard(day, dayIndex, dayPlan, dateFormat.format(date));
            weekView.appendChild(dayCard);
        });
    }

    createDayCard(dayName, dayIndex, dayPlan, dateLabel) {
        const card = document.createElement('div');
        card.className = 'day-card';

        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = `${dayName} · ${dateLabel}`;
        card.appendChild(header);

        const mealsContainer = document.createElement('div');
        mealsContainer.className = 'day-meals';

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const slot = document.createElement('div');
            slot.className = 'meal-slot';

            const label = document.createElement('div');
            label.className = 'meal-slot-label';
            label.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);
            const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
            const canOrder = ['Friday', 'Saturday', 'Sunday'].includes(dayName) && mealType !== 'breakfast';
            if (mealType === 'lunch' || canOrder) {
                const lunchOptions = document.createElement('div');
                lunchOptions.className = 'lunch-options';
                if (mealType === 'lunch' && !isWeekend) {
                    const schoolLunchLabel = document.createElement('label');
                    schoolLunchLabel.className = 'school-lunch-toggle';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = Boolean(dayPlan.schoolLunch);
                    checkbox.addEventListener('change', () => {
                        const plan = window.planner.setSchoolLunch(dayIndex, checkbox.checked);
                        this.displayMealExclusionChange(plan, dayName, 'lunch', checkbox.checked);
                    });
                    schoolLunchLabel.append(checkbox, document.createTextNode('School lunch'));
                    lunchOptions.appendChild(schoolLunchLabel);
                }
                if (mealType === 'lunch' && isWeekend) {
                    const skipLabel = document.createElement('label');
                    skipLabel.className = 'school-lunch-toggle';
                    const skipCheckbox = document.createElement('input');
                    skipCheckbox.type = 'checkbox';
                    skipCheckbox.checked = Boolean(dayPlan.skipLunch);
                    skipCheckbox.setAttribute('aria-label', `Skip lunch on ${dayName}`);
                    skipCheckbox.addEventListener('change', () => {
                        const plan = window.planner.setSkipLunch(dayIndex, skipCheckbox.checked);
                        this.displayMealExclusionChange(plan, dayName, 'lunch', skipCheckbox.checked);
                    });
                    skipLabel.append(skipCheckbox, document.createTextNode('Skip lunch'));
                    lunchOptions.appendChild(skipLabel);
                }
                if (canOrder) {
                    const orderLabel = document.createElement('label');
                    orderLabel.className = 'school-lunch-toggle';
                    const orderCheckbox = document.createElement('input');
                    orderCheckbox.type = 'checkbox';
                    orderCheckbox.checked = Boolean(dayPlan[mealType === 'lunch' ? 'orderedLunch' : 'orderedDinner']);
                    orderCheckbox.setAttribute('aria-label', `Order ${mealType} on ${dayName}`);
                    orderCheckbox.addEventListener('change', () => {
                        const plan = window.planner.setOrderedMeal(dayIndex, mealType, orderCheckbox.checked);
                        this.displayMealExclusionChange(plan, dayName, mealType, orderCheckbox.checked);
                    });
                    orderLabel.append(orderCheckbox, document.createTextNode('Order food'));
                    lunchOptions.appendChild(orderLabel);
                }
                label.appendChild(lunchOptions);
            }
            slot.appendChild(label);

            const mealItem = document.createElement('div');
            mealItem.className = 'meal-item';

            if (mealType === 'lunch' && dayPlan.schoolLunch) {
                mealItem.className += ' school-lunch';
                mealItem.textContent = 'School Lunch';
                if (isWeekend) {
                    const clearSchoolLunch = document.createElement('button');
                    clearSchoolLunch.type = 'button';
                    clearSchoolLunch.className = 'btn btn-secondary btn-sm';
                    clearSchoolLunch.textContent = 'Remove previous school lunch';
                    clearSchoolLunch.addEventListener('click', () => {
                        const plan = window.planner.setSchoolLunch(dayIndex, false);
                        this.displayMealExclusionChange(plan, dayName, 'lunch', false);
                    });
                    mealItem.appendChild(clearSchoolLunch);
                }
            } else if (mealType === 'lunch' && dayPlan.skipLunch) {
                mealItem.textContent = 'Lunch skipped';
            } else if ((mealType === 'lunch' && dayPlan.orderedLunch) ||
                (mealType === 'dinner' && dayPlan.orderedDinner)) {
                mealItem.textContent = 'Order food';
            } else {
                const meal = dayPlan[mealType];
                const slots = window.repository.getMealSlots(mealType);
                if (meal && !meal.componentItems) {
                    const legacy = document.createElement('button');
                    legacy.type = 'button';
                    legacy.className = 'planner-meal-open';
                    legacy.textContent = `Previous meal: ${meal.name}`;
                    legacy.addEventListener('click', () => this.viewRecipesForMeal(meal.id));
                    const photo = this.createComponentPhoto(meal, 'planner-meal-image');
                    if (photo) legacy.prepend(photo.image);
                    mealItem.appendChild(legacy);
                    if (photo?.credit) mealItem.appendChild(this.createPhotoCredit(photo.credit));
                } else if (meal?.componentItems) {
                    Object.entries(meal.componentItems)
                        .filter(([key]) => !slots.some(slot => slot.key === key))
                        .forEach(([key, item]) => {
                            const legacy = document.createElement('button');
                            legacy.type = 'button';
                            legacy.className = 'planner-meal-open';
                            legacy.textContent = `Previous ${key}: ${item.name}`;
                            legacy.addEventListener('click', () => this.viewRecipesForMeal(item.id));
                            const photo = this.createComponentPhoto(item, 'planner-meal-image');
                            if (photo) legacy.prepend(photo.image);
                            mealItem.appendChild(legacy);
                            if (photo?.credit) mealItem.appendChild(this.createPhotoCredit(photo.credit));
                        });
                }
                const components = document.createElement('div');
                components.className = 'planner-components';
                if (mealType === 'breakfast') components.classList.add('planner-components-breakfast');
                slots.forEach(({ key, category, icon }) => {
                    const item = meal?.componentItems?.[key];
                    const component = document.createElement('div');
                    component.className = 'planner-component';
                    const label = document.createElement('div');
                    label.className = 'planner-component-label';
                    label.textContent = `${icon} ${category}`;
                    component.appendChild(label);
                    if (item) {
                        const openRecipe = document.createElement('button');
                        openRecipe.type = 'button';
                        openRecipe.className = 'planner-meal-open';
                        openRecipe.setAttribute('aria-label', `View recipe for ${item.name}`);
                        const name = document.createElement('span');
                        name.className = 'meal-name';
                        name.textContent = item.name;
                        openRecipe.appendChild(name);
                        const photo = this.createComponentPhoto(item, 'planner-meal-image');
                        if (photo) openRecipe.prepend(photo.image);
                        openRecipe.addEventListener('click', () => this.viewRecipesForMeal(item.id));
                        component.appendChild(openRecipe);
                        if (photo?.credit) component.appendChild(this.createPhotoCredit(photo.credit));
                    } else if (meal?.omittedComponents?.includes(key)) {
                        const omitted = document.createElement('span');
                        omitted.textContent = 'Not needed';
                        component.appendChild(omitted);
                    }
                    const add = document.createElement('button');
                    add.type = 'button';
                    add.className = 'btn btn-secondary btn-sm planner-add-component';
                    add.textContent = '+';
                    add.setAttribute('aria-label', `${item ? 'Change' : 'Add'} ${category} for ${dayName} ${mealType}`);
                    add.addEventListener('click', () => this.openMealPicker(dayIndex, mealType, key));
                    component.appendChild(add);
                    components.appendChild(component);
                });
                mealItem.appendChild(components);
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
            .slice(0, 3);
        const summary = document.getElementById('cuisine-summary');
        summary.replaceChildren();
        if (!cuisineList.length) {
            summary.textContent = 'No meals planned';
            return;
        }
        cuisineList.forEach(([cuisine, count], index) => {
            if (index) summary.append(', ');
            const cuisineKey = cuisine.trim().toLowerCase();
            const flag = cuisineFlags.get(cuisineKey);
            if (flag) {
                const image = document.createElement('img');
                image.className = 'cuisine-flag';
                image.src = new URL(`${flag}.svg`, cuisineFlagBase).href;
                image.alt = '';
                summary.appendChild(image);
            } else if (cuisineKey === 'home') {
                const icon = document.createElement('span');
                icon.className = 'cuisine-home-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = '🏠';
                summary.appendChild(icon);
            }
            summary.append(`${cuisine} (${count})`);
        });
    }

    displayMealExclusionChange(plan, dayName, mealType, enabled) {
        this.displayCurrentWeek();
        if (!enabled && !plan[dayName][mealType] &&
            !window.planner.isMealExcluded(plan[dayName], mealType)) {
            alert(`No meal could be generated for ${dayName} ${mealType}.` +
                this.getEmptySlotsMessage({ [dayName]: plan[dayName] }, [mealType]));
        }
    }

    generateWeek() {
        const plan = window.planner.generateWeekPlan();
        this.displayCurrentWeek();
        const hasPlannedMeals = Object.values(plan).some(day =>
            ['breakfast', 'lunch', 'dinner'].some(mealType => day[mealType])
        );
        alert(hasPlannedMeals
            ? 'Week plan generated.' + this.getEmptySlotsMessage(plan)
            : 'No complete meals are available.' + this.getEmptySlotsMessage(plan));
    }

    clearPlan() {
        if (!confirm('Clear all meals, lunch and ordering selections from this week? Approved history will not change.')) return;
        try {
            window.planner.clearPlan();
            this.displayCurrentWeek();
        } catch (error) {
            alert(`Could not clear the plan: ${error.message}`);
        }
    }

    regenerateMealType(mealType) {
        const plan = window.planner.regenerateMealType(mealType);
        this.displayCurrentWeek();
        alert(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} meals regenerated.` +
            this.getEmptySlotsMessage(plan, [mealType]));
    }

    getEmptySlotsMessage(plan, mealTypes = ['breakfast', 'lunch', 'dinner']) {
        let missing = 0;
        let conflicts = 0;
        let pairings = 0;
        let weekendOnly = 0;
        let manualOnly = 0;
        const available = Object.fromEntries(mealTypes.map(type =>
            [type, window.repository.getPlanningMealsByType(type.charAt(0).toUpperCase() + type.slice(1), { automaticOnly: true })]
        ));
        Object.entries(plan).forEach(([dayName, day]) => {
            mealTypes.forEach(type => {
                if (day[type] || window.planner.isMealExcluded(day, type)) return;
                if (available[type].length && !available[type].some(meal =>
                    window.planner.isMealAvailableOnDay(meal, window.planner.days.indexOf(dayName))
                )) weekendOnly++;
                else if (available[type].length) conflicts++;
                else {
                    const slots = window.repository.getMealSlots(type);
                    const groups = slots.map(slot => window.repository.getComponentsByCategory(
                        type.charAt(0).toUpperCase() + type.slice(1), slot.category
                    ));
                    if (groups.some(group => group.length && group.every(component => component.manualOnly === true))) manualOnly++;
                    else if (type !== 'breakfast' && groups.every(group => group.some(component => !component.manualOnly))) pairings++;
                    else missing++;
                }
            });
        });
        const messages = [];
        if (conflicts) messages.push(`${conflicts} slot(s) left empty to follow the component repetition rules.`);
        if (missing) messages.push(`${missing} slot(s) lack required components for that meal type.`);
        if (pairings) messages.push(`${pairings} slot(s) have no allowed protein, starch and vegetable combination. Check protein pairings, component meal types and manual-only settings.`);
        if (weekendOnly) messages.push(`${weekendOnly} slot(s) have only weekend-only combinations available.`);
        if (manualOnly) messages.push(`${manualOnly} slot(s) need components that are available for automatic planning; manual-only components are excluded.`);
        if (messages.length) messages.push('Add more meals or meal components, then regenerate.');
        return messages.length ? '\n\n' + messages.join('\n') : '';
    }

    approvePlan() {
        const message = 'Approve this meal plan? Existing history entries for these dates will be replaced.';
        if (confirm(message)) {
            try {
                const success = window.planner.approvePlan();
                if (success) {
                    this.displayCurrentWeek();
                    alert('Plan approved and saved to history!');
                }
            } catch (error) {
                alert(`Could not approve plan: ${error.message}`);
            }
        }
    }

    openMealPicker(dayIndex, mealType, slotKey) {
        this.currentMealPickerContext = { dayIndex, mealType, slotKey };
        document.getElementById('picker-search').value = '';
        this.displayComponentPicker();
        document.getElementById('meal-picker-modal').classList.add('active');
        document.getElementById('picker-search').focus();
    }

    displayComponentPicker() {
        const { mealType, slotKey } = this.currentMealPickerContext;
        const slot = window.repository.getMealSlots(mealType).find(item => item.key === slotKey);
        const search = document.getElementById('picker-search').value.trim().toLowerCase();
        const components = window.repository.getComponentsByCategory(
            mealType.charAt(0).toUpperCase() + mealType.slice(1), slot.category
        ).filter(item => item.name.toLowerCase().includes(search));
        document.getElementById('meal-picker-title').textContent = `Select ${slot.category} for ${mealType}`;

        const list = document.getElementById('meal-picker-list');
        list.innerHTML = '';

        if (!components.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = search
                ? 'No components match your search.'
                : `No ${slot.category.toLowerCase()} components are available for ${mealType}. Add one in Meal Components.`;
            list.appendChild(empty);
        }

        components.forEach(component => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'meal-picker-item';
            const restrictions = [
                component.manualOnly ? 'Manual only' : '',
                component.weekendOnly ? 'Weekend only' : ''
            ].filter(Boolean);
            item.textContent = component.name + (restrictions.length ? ` (${restrictions.join(', ')})` : '');
            item.addEventListener('click', () => this.selectMealComponent(component.id));
            list.appendChild(item);
        });
    }

    selectMealComponent(componentId) {
        const ctx = this.currentMealPickerContext;
        const day = window.planner.days[ctx.dayIndex];
        const meal = window.planner.getCurrentWeek()?.plan[day]?.[ctx.mealType];
        const slotKeys = window.repository.getMealSlots(ctx.mealType).map(slot => slot.key);
        if (meal && (!meal.componentItems || Object.keys(meal.componentItems).some(key => !slotKeys.includes(key))) &&
            !confirm('This changes an older meal format. Its previous meal or extra component will be removed. Continue?')) return;
        try {
            window.planner.setMealComponent(ctx.dayIndex, ctx.mealType, ctx.slotKey, componentId);
            document.getElementById('meal-picker-modal').classList.remove('active');
            this.displayCurrentWeek();
        } catch (error) {
            alert(error.message);
        }
    }

    // ===== MEALS PAGE =====

    displayMeals() {
        this.filterMeals();
    }

    getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
            .map(input => input.value);
    }

    getMealTypes(meal) {
        const supportedTypes = ['Breakfast', 'Lunch', 'Dinner'];
        const mealTypes = Array.isArray(meal.mealTypes) && meal.mealTypes.length
            ? meal.mealTypes
            : [meal.mealType];
        return supportedTypes.filter(type => mealTypes.includes(type));
    }

    setMealTypes(mealTypes) {
        document.querySelectorAll('input[name="meal-type"]').forEach(input => {
            input.checked = mealTypes.includes(input.value);
        });
    }

    setMealCategories(categories) {
        document.querySelectorAll('input[name="meal-category"]').forEach(input => {
            input.checked = categories.includes(input.value);
        });
        this.updateMealProteinVisibility();
    }

    updateMealProteinVisibility() {
        const linkedProtein = this.currentEditingMealId &&
            window.recipeManager.getRecipesByMeal(this.currentEditingMealId)
                .some(recipe => this.getRecipeCategories(recipe).includes('Protein'));
        const hidden = !this.getCheckedValues('meal-category').includes('Protein') && !linkedProtein;
        document.getElementById('meal-protein-group').hidden = hidden;
        document.getElementById('meal-pairing-group').hidden = hidden;
    }

    renderMealPairingOptions(pairings) {
        const selected = pairings || {
            starches: this.getCheckedValues('pairing-starches'),
            vegetables: this.getCheckedValues('pairing-vegetables')
        };
        const allComponents = [...window.repository.getAllMeals(), ...window.repository.getSimpleMealComponents()];
        const linkedCategories = this.currentEditingMealId
            ? window.recipeManager.getRecipesByMeal(this.currentEditingMealId).flatMap(recipe => this.getRecipeCategories(recipe))
            : [];
        const ownCategories = [...this.getCheckedValues('meal-category'), ...linkedCategories];
        const selfId = this.currentEditingMealId || '@self';
        for (const [key, category] of [['starches', 'Starch'], ['vegetables', 'Vegetables']]) {
            const container = document.getElementById(`meal-pairing-${key}`);
            const selectedIds = Array.isArray(selected[key]) ? selected[key] : [];
            const choices = allComponents.filter(item => item.id !== this.currentEditingMealId &&
                window.repository.getMealCategories(item).includes(category));
            if (ownCategories.includes(category)) choices.push({ id: selfId, name: 'This component itself' });
            choices.sort((a, b) => a.name.localeCompare(b.name));
            const hasComponents = choices.length > 0;
            choices.unshift({ id: '@none', name: key === 'starches' ? 'No starch' : 'No vegetables' });
            const knownIds = new Set(choices.map(item => item.id));
            const unavailable = selectedIds.filter(id => !knownIds.has(id)).map(id => ({
                id,
                name: `${allComponents.find(item => item.id === id)?.name || id} (unavailable; uncheck to remove)`
            }));
            container.replaceChildren();
            [...choices, ...unavailable].forEach(item => {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = `pairing-${key}`;
                input.value = item.id;
                input.checked = selectedIds.includes(item.id);
                label.append(input, document.createTextNode(item.name));
                container.appendChild(label);
            });
            if (!hasComponents) container.appendChild(document.createTextNode(`No ${category.toLowerCase()} components available. Add one if needed.`));
        }
    }

    setMealProtein(protein) {
        const select = document.getElementById('meal-protein');
        const custom = document.getElementById('meal-protein-custom');
        const hasOption = Array.from(select.options).some(option => option.value === protein);
        select.value = hasOption ? protein : '';
        custom.value = hasOption ? '' : protein;
    }

    getRecipeCategories(recipe) {
        const categories = Array.isArray(recipe.categories)
            ? recipe.categories
            : recipe.category && recipe.category !== 'Other' ? [recipe.category] : [];
        return ['Breakfast', 'Protein', 'Starch', 'Fruit', 'Vegetables', 'Dessert']
            .filter(category => categories.includes(category));
    }

    setRecipeCategories(categories) {
        document.querySelectorAll('input[name="recipe-category"]').forEach(input => {
            input.checked = categories.includes(input.value);
        });
    }

    createMealCard(meal) {
        const card = document.createElement('div');
        card.className = 'meal-card';

        const mealTypes = this.getMealTypes(meal);
        const categories = window.repository.getMealCategories(meal);
        const tagsHtml = meal.tags.map(tag => `<span class="badge">${tag}</span>`).join('');
        const prepIcon = meal.mealPrepFriendly ? '🍱' : '';

        card.innerHTML = `
            <div class="meal-card-header">
                <div>
                    <div class="meal-card-title">${meal.name} ${prepIcon}</div>
                </div>
            </div>
            <div class="meal-card-meta">
                <span class="badge">${mealTypes.join(', ')}</span>
                ${categories.map(category => `<span class="badge">${category}</span>`).join('')}
                <span class="badge">${meal.cuisine}</span>
                ${meal.manualOnly ? '<span class="badge">Manual only</span>' : ''}
                ${meal.weekendOnly ? '<span class="badge">Weekend only</span>' : ''}
                ${categories.includes('Protein') && meal.protein ? `<span class="badge">${meal.protein}</span>` : ''}
                ${categories.includes('Protein') && (meal.pairings?.starches?.length || meal.pairings?.vegetables?.length) ? '<span class="badge">Pairings restricted</span>' : ''}
                <span class="badge">${meal.difficulty}</span>
                ${tagsHtml}
            </div>
            <div class="meal-card-actions">
                <button type="button" class="btn btn-secondary btn-sm">Edit</button>
                <button type="button" class="btn btn-danger btn-sm">Delete</button>
            </div>
        `;

        const [edit, remove] = card.querySelectorAll('.meal-card-actions button');
        edit.addEventListener('click', () => this.editMeal(meal.id));
        remove.addEventListener('click', () => this.deleteMeal(meal.id));
        const photo = this.createComponentPhoto(meal, 'recipe-card-image');
        if (photo) {
            card.prepend(photo.image);
            if (photo.credit) photo.image.after(this.createPhotoCredit(photo.credit));
        }
        const recipeLinks = this.createLinkedRecipeLinks(meal.id);
        if (recipeLinks) card.querySelector('.meal-card-actions').before(recipeLinks);

        return card;
    }

    createLinkedRecipeLinks(mealId) {
        const recipes = window.recipeManager.getRecipesByMeal(mealId);
        if (!recipes.length) return null;

        const links = document.createElement('div');
        links.className = 'meal-info linked-recipes';
        links.appendChild(document.createTextNode('Recipes: '));
        recipes.forEach(recipe => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'linked-recipe-button';
            button.textContent = recipe.name;
            button.addEventListener('click', event => {
                event.stopPropagation();
                this.viewRecipe(recipe.id);
            });
            links.appendChild(button);
        });
        return links;
    }

    filterMeals() {
        const search = document.getElementById('meal-search').value;
        const category = document.getElementById('meal-filter-category').value;
        const type = document.getElementById('meal-filter-type').value;
        const cuisine = document.getElementById('meal-filter-cuisine').value;

        let meals = [...window.repository.getAllMeals(), ...window.repository.getSimpleMealComponents()];

        if (search) {
            meals = meals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
        }

        if (type) {
            meals = meals.filter(m => this.getMealTypes(m).includes(type));
        }

        if (category) {
            meals = meals.filter(meal => window.repository.getMealCategories(meal).includes(category));
        }

        if (cuisine) {
            meals = meals.filter(m => m.cuisine === cuisine);
        }

        const grid = document.getElementById('meals-grid');
        grid.innerHTML = '';

        if (meals.length === 0) {
            grid.innerHTML = '<div class="empty-state">No components match your filters.</div>';
            return;
        }

        meals.forEach(meal => {
            grid.appendChild(this.createMealCard(meal));
        });
    }

    openMealModal() {
        if (this.photoSearchController) this.photoSearchController.abort();
        this.currentEditingMealId = null;
        this.recipeMealCreationPending = false;
        document.getElementById('meal-modal-title').textContent = 'Add Component';
        document.getElementById('meal-form').reset();
        this.resetComponentInfo();
        this.resetComponentPhoto();
        this.updateMealProteinVisibility();
        this.renderMealPairingOptions({ starches: [], vegetables: [] });
        document.getElementById('meal-prep-days-group').style.display = 'none';
        document.getElementById('meal-modal').classList.add('active');
    }

    editMeal(mealId) {
        const meal = window.repository.getComponent(mealId);
        if (!meal) return;

        this.currentEditingMealId = mealId;
        this.resetComponentInfo();
        document.getElementById('meal-modal-title').textContent = 'Edit Component';

        document.getElementById('meal-name').value = meal.name;
        this.resetComponentPhoto(meal.imageUrl, meal.imageCredit);
        this.setMealTypes(this.getMealTypes(meal));
        this.setMealCategories(window.repository.normalizeCategories(
            Array.isArray(meal.categories) ? meal.categories : (meal.foodGroups || [])
        ));
        this.renderMealPairingOptions(meal.pairings || { starches: [], vegetables: [] });
        document.getElementById('meal-cuisine').value = meal.cuisine;
        this.setMealProtein(meal.protein || '');
        document.getElementById('meal-difficulty').value = meal.difficulty;
        document.getElementById('meal-weekend-only').checked = meal.weekendOnly === true;
        document.getElementById('meal-manual-only').checked = meal.manualOnly === true;
        document.getElementById('meal-prep-friendly').checked = meal.mealPrepFriendly;
        document.getElementById('meal-prep-days').value = meal.mealPrepDays || 2;
        document.getElementById('meal-prep-days-group').style.display = meal.mealPrepFriendly ? 'grid' : 'none';
        document.getElementById('meal-ingredients').value = meal.ingredients.join(', ');
        document.getElementById('meal-food-groups').value = meal.foodGroups.join(', ');
        document.getElementById('meal-tags').value = meal.tags.join(', ');

        document.getElementById('meal-modal').classList.add('active');
    }

    deleteMeal(mealId) {
        if (confirm('Delete this component? Its recipes will be unlinked.')) {
            window.repository.deleteMeal(mealId);
            this.displayMeals();
            alert('Component deleted!');
        }
    }

    saveMeal(e) {
        e.preventDefault();
        const mealTypes = this.getCheckedValues('meal-type');
        if (!mealTypes.length) {
            alert('Select at least one meal type.');
            return;
        }

        const mealData = {
            name: document.getElementById('meal-name').value,
            mealTypes,
            mealType: mealTypes[0],
            categories: this.getCheckedValues('meal-category'),
            imageUrl: document.getElementById('meal-image-url').value,
            cuisine: document.getElementById('meal-cuisine').value,
            protein: document.getElementById('meal-protein').value || document.getElementById('meal-protein-custom').value,
            difficulty: document.getElementById('meal-difficulty').value,
            weekendOnly: document.getElementById('meal-weekend-only').checked,
            manualOnly: document.getElementById('meal-manual-only').checked,
            mealPrepFriendly: document.getElementById('meal-prep-friendly').checked,
            mealPrepDays: parseInt(document.getElementById('meal-prep-days').value) || 0,
            ingredients: document.getElementById('meal-ingredients').value,
            foodGroups: document.getElementById('meal-food-groups').value,
            tags: document.getElementById('meal-tags').value
        };

        try {
            if (!document.getElementById('meal-pairing-group').hidden) {
                mealData.pairings = {
                    starches: this.getCheckedValues('pairing-starches'),
                    vegetables: this.getCheckedValues('pairing-vegetables')
                };
            }
            mealData.imageUrl = window.recipeManager.normalizeSourceUrl(mealData.imageUrl);
            mealData.imageCredit = mealData.imageUrl === this.componentPhotoUrl ? this.componentPhotoCredit : null;
            let createdMeal = null;
            if (this.currentEditingMealId) {
                if (window.repository.findSimpleMealComponent(this.currentEditingMealId)) {
                    window.repository.updateSimpleMealComponent(this.currentEditingMealId, mealData);
                } else {
                    window.repository.updateMeal(this.currentEditingMealId, mealData);
                }
                alert('Component updated!');
            } else {
                createdMeal = window.repository.addMeal(mealData);
                alert('Component added!');
            }

            document.getElementById('meal-modal').classList.remove('active');
            if (this.photoSearchController) this.photoSearchController.abort();
            if (this.componentInfoController) this.componentInfoController.abort();
            this.displayMeals();
            if (this.recipeMealCreationPending && createdMeal) {
                this.recipeMealCreationPending = false;
                this.populateRecipeMealOptions(createdMeal.id);
                const status = document.getElementById('recipe-import-status');
                status.textContent = 'Component created and selected. Save the recipe to keep this connection.';
                status.className = 'recipe-import-status success';
                document.getElementById('recipe-modal').classList.add('active');
            }
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
                ${rule.id === 'component-repeat-policy' ? '<p>Slots may remain empty when no suitable combination is available. Manual choices can override this rule.</p>' : ''}
                ${rule.type === 'custom' ? `<button class="btn btn-danger btn-sm" onclick="window.ui.deleteRule('${rule.id}')">Delete Custom Rule</button>` : ''}
            </div>
            <div class="rule-controls">
                <div class="rule-toggle">
                    <span>Enabled</span>
                    <div class="toggle-switch ${rule.enabled ? 'active' : ''}" onclick="window.ui.toggleRule('${rule.id}')"></div>
                </div>
                ${rule.id !== 'component-repeat-policy' ? `<div class="rule-strength">
                    <input type="range" class="rule-strength-slider" min="0" max="100" value="${rule.strength}" 
                        onchange="window.ui.updateRuleStrength('${rule.id}', this.value)">
                    <span class="rule-strength-label">${strengthLabel}</span>
                </div>` : ''}
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

        element.innerHTML = `
            <div class="history-header">
                <div>
                    <div class="history-week-info">Week ${item.weekNumber}, ${item.year}${weekDates ? ` · ${weekDates}` : ''}</div>
                    <div class="history-date">Approved: ${dateStr}</div>
                </div>
                <div class="history-actions">
                    <button type="button" class="btn btn-secondary btn-sm" data-action="edit">Edit</button>
                    <button type="button" class="btn btn-danger btn-sm" data-action="delete">Delete</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-action="copy">Copy to Selected Week</button>
                </div>
            </div>
            <div class="history-preview"></div>
        `;

        if (item.plan) {
            const mondayFirst = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const start = item.weekStartDate ? new Date(`${item.weekStartDate}T00:00:00Z`) : null;
            const index = start && !Number.isNaN(start.getTime()) ? (start.getUTCDay() + 6) % 7 : 0;
            const dayNames = [...mondayFirst.slice(index), ...mondayFirst.slice(0, index)];
            const preview = element.querySelector('.history-preview');
            dayNames.forEach(dayName => {
                const day = document.createElement('div');
                day.className = 'history-day-preview';
                const title = document.createElement('div');
                title.className = 'history-day-preview-title';
                title.textContent = dayName.slice(0, 3);
                day.appendChild(title);
                const dayPlan = item.plan[dayName];
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    const row = document.createElement('div');
                    row.className = 'history-meal';
                    const label = document.createElement('strong');
                    label.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: `;
                    const name = type === 'lunch' && dayPlan?.schoolLunch ? 'School Lunch'
                        : type === 'lunch' && dayPlan?.skipLunch ? 'Skipped'
                        : (type === 'lunch' && dayPlan?.orderedLunch) || (type === 'dinner' && dayPlan?.orderedDinner) ? 'Order food'
                        : dayPlan?.[type]?.name || 'Not planned';
                    row.append(label, document.createTextNode(name));
                    day.appendChild(row);
                });
                preview.appendChild(day);
            });
        }

        element.querySelector('[data-action="edit"]').addEventListener('click', () => this.editHistoryEntry(item.key));
        element.querySelector('[data-action="delete"]').addEventListener('click', () => this.deleteHistoryEntry(item.key));
        element.querySelector('[data-action="copy"]').addEventListener('click', () => this.copyHistoryToCurrent(item.key));
        return element;
    }

    editHistoryEntry(key) {
        if (!confirm('Open this history entry as a draft in its original week? This may replace that week’s current planner draft. Approving will replace history entries for these dates.')) return;
        try {
            window.planner.editHistoryEntry(key);
            this.switchPage('planner');
        } catch (error) {
            alert(`Could not edit history: ${error.message}`);
        }
    }

    deleteHistoryEntry(key) {
        if (!confirm('Delete this history entry? This cannot be undone. Any draft editing it will remain in the planner.')) return;
        try {
            window.historyManager.deleteHistoryEntry(key);
            this.displayHistory();
            alert('History entry deleted.');
        } catch (error) {
            alert(`Could not delete history: ${error.message}`);
        }
    }

    copyHistoryToCurrent(key) {
        if (confirm('Copy this plan to the selected week? This will overwrite its current plan.')) {
            if (!window.historyManager.copyHistoryToCurrent(key)) {
                alert('History entry not found.');
                return;
            }
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
        document.getElementById('planning-start-day').value = settings.planningStartDay || 'Monday';
        document.getElementById('recipe-proxy-url').value = settings.recipeProxyUrl || '';
    }

    saveSettings() {
        const recipeProxyUrl = document.getElementById('recipe-proxy-url').value.trim();
        if (recipeProxyUrl) {
            try {
                const parsedProxyUrl = new URL(recipeProxyUrl);
                if (parsedProxyUrl.protocol !== 'https:' || parsedProxyUrl.username || parsedProxyUrl.password) {
                    throw new Error('The recipe proxy URL must use HTTPS and cannot include credentials.');
                }
            } catch (error) {
                alert(error.message || 'Enter a valid HTTPS recipe proxy URL.');
                return;
            }
        }

        const planningStartDay = document.getElementById('planning-start-day').value;
        if (!window.planner.weekdays.includes(planningStartDay)) {
            alert('Choose a valid planning start day.');
            return;
        }
        window.settingsManager.updateSettings({
            cookForDays: parseInt(document.getElementById('cook-for-days').value),
            historyWeeksToAvoid: parseInt(document.getElementById('history-weeks').value),
            planningStartDay,
            recipeProxyUrl
        });
        window.planner.setPlanningStartDay(planningStartDay);
        this.displayCurrentWeek();

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
                alert(`${count} component details imported successfully!`);
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

    resetComponentInfo() {
        if (this.componentInfoController) this.componentInfoController.abort();
        document.getElementById('component-info-status').textContent = '';
        document.getElementById('component-info-results').replaceChildren();
        document.getElementById('component-info-preview').replaceChildren();
    }

    async queryWikidata(params, signal) {
        const query = new URLSearchParams({ ...params, format: 'json', origin: '*' });
        const response = await fetch(`https://www.wikidata.org/w/api.php?${query}`, {
            signal, credentials: 'omit'
        });
        if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}.`);
        const data = await response.json();
        if (data.error) throw new Error(data.error.info || 'Wikidata returned an error.');
        return data;
    }

    async searchComponentInfo() {
        const name = document.getElementById('meal-name').value.trim();
        this.resetComponentInfo();
        const status = document.getElementById('component-info-status');
        if (!name) {
            status.textContent = 'Enter a component name first.';
            return;
        }
        const controller = new AbortController();
        this.componentInfoController = controller;
        status.textContent = 'Searching Wikidata...';
        try {
            const data = await this.queryWikidata({
                action: 'wbsearchentities', search: name, language: 'en', limit: '10'
            }, controller.signal);
            if (controller.signal.aborted) return;
            if (!Array.isArray(data.search)) throw new Error('Wikidata returned an unexpected search response.');
            const results = document.getElementById('component-info-results');
            const matches = data.search.filter(item =>
                /^Q\d+$/.test(item.id) && typeof item.label === 'string'
            );
            matches.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-secondary btn-sm';
                button.textContent = `${item.label}${item.description ? ` — ${item.description}` : ''}`;
                button.addEventListener('click', () => this.loadComponentInfo(item));
                results.appendChild(button);
            });
            status.textContent = matches.length
                ? 'Select the correct food; some matches may be unrelated.'
                : 'No matches found. Try a different component name.';
        } catch (error) {
            if (error.name !== 'AbortError') status.textContent = `Lookup failed: ${error.message}`;
        } finally {
            if (this.componentInfoController === controller) this.componentInfoController = null;
        }
    }

    async loadComponentInfo(item) {
        if (this.componentInfoController) this.componentInfoController.abort();
        const controller = new AbortController();
        this.componentInfoController = controller;
        const status = document.getElementById('component-info-status');
        const preview = document.getElementById('component-info-preview');
        preview.replaceChildren();
        status.textContent = 'Loading suggestions...';
        try {
            const data = await this.queryWikidata({
                action: 'wbgetentities', ids: item.id, props: 'claims', languages: 'en'
            }, controller.signal);
            const entity = data.entities?.[item.id];
            if (!entity || entity.missing !== undefined) throw new Error('The selected Wikidata item was not found.');
            const getIds = property => (entity.claims?.[property] || [])
                .filter(claim => claim.rank !== 'deprecated')
                .map(claim => claim.mainsnak?.datavalue?.value?.id)
                .filter(id => typeof id === 'string' && /^Q\d+$/.test(id));
            const ingredientIds = [...new Set(getIds('P186'))];
            const tagIds = [...new Set([...getIds('P31'), ...getIds('P279')])];
            const allIds = [...new Set([...ingredientIds, ...tagIds])];
            const requestedIds = allIds.slice(0, 50);
            let labels = {};
            if (requestedIds.length) {
                const labelData = await this.queryWikidata({
                    action: 'wbgetentities', ids: requestedIds.join('|'), props: 'labels', languages: 'en'
                }, controller.signal);
                if (!labelData.entities) throw new Error('Wikidata did not return labels.');
                labels = labelData.entities;
            }
            if (controller.signal.aborted) return;
            const names = ids => ids.filter(id => requestedIds.includes(id))
                .map(id => labels[id]?.labels?.en?.value)
                .filter(name => typeof name === 'string' && name.trim());
            const ingredients = names(ingredientIds);
            const tags = names(tagIds);
            const singleFood = !ingredients.length && !ingredientIds.length &&
                /^(?:an? )?(?:edible )?(?:fruit|vegetable|grain|seed)\b/i.test(item.description || '');
            if (singleFood) ingredients.push(item.label);

            const source = document.createElement('a');
            source.href = `https://www.wikidata.org/wiki/${item.id}`;
            source.target = '_blank';
            source.rel = 'noopener noreferrer';
            source.textContent = `Source: ${item.label} on Wikidata`;
            const ingredientText = document.createElement('p');
            ingredientText.textContent = `Ingredients: ${ingredients.join(', ') || 'None listed'}`;
            const tagText = document.createElement('p');
            tagText.textContent = `Tags: ${tags.join(', ') || 'None listed'}`;
            const note = document.createElement('small');
            note.textContent = singleFood
                ? 'For this single food, its name is suggested as the ingredient. Review before adding.'
                : 'Ingredients come from “made from material” statements and may not be a complete recipe. Review carefully.';
            preview.append(source, ingredientText, tagText, note);
            if (ingredients.length || tags.length) {
                const apply = document.createElement('button');
                apply.type = 'button';
                apply.className = 'btn btn-primary btn-sm';
                apply.textContent = 'Add suggestions';
                apply.addEventListener('click', () => {
                    for (const [fieldId, additions] of [['meal-ingredients', ingredients], ['meal-tags', tags]]) {
                        const field = document.getElementById(fieldId);
                        const values = window.repository.parseList(field.value);
                        additions.forEach(value => {
                            if (!values.some(existing => existing.toLowerCase() === value.toLowerCase())) values.push(value);
                        });
                        field.value = values.join(', ');
                    }
                    status.textContent = 'Suggestions added. Review and edit before saving.';
                });
                preview.appendChild(apply);
            }
            const unavailable = allIds.length > requestedIds.length ||
                requestedIds.some(id => !labels[id]?.labels?.en?.value);
            status.textContent = unavailable
                ? 'Some suggestions were omitted because of the lookup limit or missing English labels.'
                : ingredients.length || tags.length
                    ? 'Review these suggestions before adding them.'
                    : 'No ingredients or tags are available for this item.';
        } catch (error) {
            if (error.name !== 'AbortError') status.textContent = `Lookup failed: ${error.message}`;
        } finally {
            if (this.componentInfoController === controller) this.componentInfoController = null;
        }
    }

    resetComponentPhoto(imageUrl = '', credit = null) {
        if (this.photoSearchController) this.photoSearchController.abort();
        this.componentPhotoUrl = imageUrl || '';
        this.componentPhotoCredit = credit || null;
        document.getElementById('meal-image-url').value = imageUrl || '';
        document.getElementById('meal-photo-query').value = '';
        document.getElementById('component-photo-status').textContent = '';
        document.getElementById('component-photo-results').replaceChildren();
        this.updateComponentPhotoPreview();
        const creditContainer = document.getElementById('component-photo-credit');
        creditContainer.replaceChildren();
        if (credit) creditContainer.appendChild(this.createPhotoCredit(credit));
    }

    updateComponentPhotoPreview() {
        const preview = document.getElementById('component-photo-preview');
        preview.replaceChildren();
        const image = this.createRecipeImage({
            name: 'Selected component photo',
            imageUrl: document.getElementById('meal-image-url').value
        }, 'component-photo-preview-image');
        if (image) {
            image.addEventListener('error', () => {
                document.getElementById('component-photo-status').textContent =
                    'The photo could not be loaded. Check the URL or choose another photo.';
            });
            preview.appendChild(image);
        }
    }

    createPhotoCredit(credit) {
        const caption = document.createElement('div');
        caption.className = 'component-photo-credit';
        const appendLink = (text, url) => {
            try {
                const parsed = new URL(url);
                if (parsed.protocol === 'https:') {
                    const link = document.createElement('a');
                    link.textContent = text;
                    link.href = parsed.href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    caption.appendChild(link);
                    return;
                }
            } catch (error) {
                // Older imported photo credits may have invalid links.
            }
            caption.appendChild(document.createTextNode(`${text} (link unavailable)`));
        };
        appendLink(credit.title || 'Photo', credit.sourceUrl);
        caption.appendChild(document.createTextNode(` by ${credit.author || 'unknown'} · `));
        appendLink(credit.license || 'License', credit.licenseUrl);
        return caption;
    }

    createComponentPhoto(component, className) {
        const current = window.repository.getComponent(component.id) || component;
        const ownImage = this.createRecipeImage(current, className);
        if (ownImage) return { image: ownImage, credit: current.imageCredit || null };
        for (const recipe of window.recipeManager.getRecipesByMeal(component.id)) {
            const image = this.createRecipeImage(recipe, className);
            if (image) return { image, credit: null };
        }
        return null;
    }

    async searchComponentPhotos() {
        const query = document.getElementById('meal-photo-query').value.trim() ||
            document.getElementById('meal-name').value.trim();
        const status = document.getElementById('component-photo-status');
        const results = document.getElementById('component-photo-results');
        results.replaceChildren();
        if (this.photoSearchController) this.photoSearchController.abort();
        if (!query) {
            status.textContent = 'Enter a component name or photo search terms first.';
            return;
        }
        const controller = new AbortController();
        this.photoSearchController = controller;
        status.textContent = 'Searching Wikimedia Commons...';
        const params = new URLSearchParams({
            action: 'query',
            generator: 'search',
            gsrsearch: `${query} food filetype:bitmap`,
            gsrnamespace: '6',
            gsrlimit: '12',
            prop: 'imageinfo',
            iiprop: 'url|mime|extmetadata',
            iiurlwidth: '400',
            iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
            format: 'json',
            formatversion: '2',
            origin: '*'
        });
        try {
            const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
                signal: controller.signal,
                credentials: 'omit'
            });
            if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}.`);
            const data = await response.json();
            if (controller.signal.aborted) return;
            if (data.error) throw new Error(data.error.info || 'Wikimedia Commons returned an error.');
            const textFromHtml = value => {
                const template = document.createElement('template');
                template.innerHTML = value || '';
                return template.content.textContent.trim();
            };
            const pages = (data.query?.pages || []).sort((a, b) => a.index - b.index);
            let count = 0;
            pages.forEach(page => {
                const info = page.imageinfo?.[0];
                if (!info || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return;
                const metadata = info.extmetadata || {};
                const author = textFromHtml(metadata.Artist?.value);
                const license = textFromHtml(metadata.LicenseShortName?.value);
                const licenseUrl = metadata.LicenseUrl?.value;
                if (!author || !/^(CC BY(?:-SA)? [\d.]+|CC0(?: 1\.0)?)$/i.test(license) || !licenseUrl) return;
                let imageUrl, sourceUrl, parsedLicenseUrl;
                try {
                    imageUrl = new URL(info.thumburl);
                    sourceUrl = new URL(info.descriptionurl);
                    parsedLicenseUrl = new URL(licenseUrl);
                } catch (error) {
                    return;
                }
                if (imageUrl.protocol !== 'https:' || !imageUrl.hostname.endsWith('.wikimedia.org') ||
                    sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'commons.wikimedia.org' ||
                    parsedLicenseUrl.protocol !== 'https:') return;
                const credit = {
                    title: page.title.replace(/^File:/, ''),
                    author,
                    license,
                    sourceUrl: sourceUrl.href,
                    licenseUrl: parsedLicenseUrl.href
                };
                const result = document.createElement('div');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'component-photo-result';
                const image = this.createRecipeImage({ imageUrl: imageUrl.href, name: credit.title }, 'component-photo-thumbnail');
                const title = document.createElement('span');
                title.textContent = credit.title;
                button.append(image, title);
                button.addEventListener('click', () => {
                    document.getElementById('meal-image-url').value = imageUrl.href;
                    this.componentPhotoUrl = imageUrl.href;
                    this.componentPhotoCredit = credit;
                    document.getElementById('component-photo-credit').replaceChildren(this.createPhotoCredit(credit));
                    this.updateComponentPhotoPreview();
                    results.replaceChildren();
                    status.textContent = 'Photo selected. Save the component to keep it.';
                });
                result.append(button, this.createPhotoCredit(credit));
                results.appendChild(result);
                count++;
            });
            status.textContent = count
                ? 'Choose a photo. Credits and license information will be shown with it.'
                : 'No suitable photos found. Try different search terms or enter a photo URL.';
        } catch (error) {
            if (error.name !== 'AbortError') status.textContent = `Photo search failed: ${error.message}`;
        } finally {
            if (this.photoSearchController === controller) this.photoSearchController = null;
        }
    }

    createRecipeImage(recipe, className) {
        if (recipe.imageUrl) {
            try {
                const imageUrl = new URL(recipe.imageUrl);
                if (imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:') {
                    const image = document.createElement('img');
                    image.className = className;
                    image.src = imageUrl.href;
                    image.alt = recipe.name;
                    image.loading = 'lazy';
                    image.referrerPolicy = 'no-referrer';
                    return image;
                }
            } catch (error) {
                // Ignore invalid image URLs in older imported data.
            }
        }
        return null;
    }

    createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'meal-card';
        const totalTime = recipe.prepTime + recipe.cookTime;
        const ratingStars = '★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating);

        const image = this.createRecipeImage(recipe, 'recipe-card-image');
        if (image) card.appendChild(image);

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
        [ this.getRecipeCategoryLabel(recipe), `⏱️ ${totalTime}min`, recipe.difficulty, `👥 ${recipe.servings}`, ...(recipe.tags || []) ]
            .forEach(label => {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = label;
                meta.appendChild(badge);
            });

        card.append(header, meta);

        const linkedMeal = recipe.mealId ? window.repository.getComponent(recipe.mealId) : null;
        if (linkedMeal) {
            const mealLabel = document.createElement('div');
            mealLabel.className = 'meal-info';
            mealLabel.textContent = `Linked component: ${linkedMeal.name}`;
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
                this.getRecipeCategoryLabel(r).toLowerCase().includes(search.toLowerCase()) ||
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
        this.recipeMealCreationPending = false;
        document.getElementById('recipe-modal-title').textContent = 'Add Recipe';
        document.getElementById('recipe-form').reset();
        document.getElementById('recipe-import-status').textContent = '';
        document.getElementById('recipe-import-status').className = 'recipe-import-status';
        document.getElementById('recipe-import-preview').hidden = true;
        this.populateRecipeMealOptions(null);
        document.getElementById('recipe-modal').classList.add('active');
    }

    openRecipeLinkModal() {
        this.openRecipeModal();
        document.getElementById('recipe-import-url').focus();
    }

    populateRecipeMealOptions(selectedMealId) {
        const select = document.getElementById('recipe-meal-link');
        select.replaceChildren(new Option('Not linked to a component', ''));
        [...window.repository.getAllMeals(), ...window.repository.getSimpleMealComponents()].forEach(meal => {
            const option = new Option(`${meal.name} (${this.getMealTypes(meal).join(', ')})`, meal.id);
            select.appendChild(option);
        });
        select.value = selectedMealId || '';
        this.updateCreateMealButtonVisibility();
    }

    updateCreateMealButtonVisibility() {
        const recipeName = document.getElementById('recipe-name').value.trim();
        const linkedMealId = document.getElementById('recipe-meal-link').value;
        document.getElementById('recipe-create-meal-group').hidden = !recipeName || Boolean(linkedMealId);
    }

    createMealFromRecipe() {
        const recipeName = document.getElementById('recipe-name').value.trim();
        if (!recipeName) {
            document.getElementById('recipe-import-status').textContent = 'Load a recipe or enter its name before creating a component.';
            document.getElementById('recipe-import-status').className = 'recipe-import-status error';
            return;
        }

        const categories = this.getCheckedValues('recipe-category');
        const ingredients = document.getElementById('recipe-ingredients').value
            .split(/\r?\n/).map(line => line.trim()).filter(Boolean);

        this.openMealModal();
        document.getElementById('meal-name').value = recipeName;
        document.getElementById('meal-difficulty').value = document.getElementById('recipe-difficulty').value;
        document.getElementById('meal-ingredients').value = ingredients.join(', ');
        document.getElementById('meal-food-groups').value = categories
            .filter(category => category !== 'Dessert').join(', ');
        this.setMealCategories(categories);
        this.renderMealPairingOptions();
        document.getElementById('meal-tags').value = document.getElementById('recipe-tags').value;
        this.setMealProtein(categories.includes('Protein') ? this.suggestRecipeProtein() : '');

        this.recipeMealCreationPending = true;
        document.getElementById('recipe-modal').classList.remove('active');
        document.getElementById('meal-modal').classList.add('active');
        document.querySelector('input[name="meal-type"]').focus();
    }

    suggestRecipeProtein() {
        const text = [
            document.getElementById('recipe-name').value,
            document.getElementById('recipe-ingredients').value,
            document.getElementById('recipe-notes').value,
            document.getElementById('recipe-tags').value
        ].join(' ').toLowerCase();
        const matches = [
            [/\bchicken\b/, 'Chicken'],
            [/\bbeef\b/, 'Beef'],
            [/\bpork\b|bacon|ham\b/, 'Pork'],
            [/\b(fish|salmon|tuna|cod|tilapia)\b/, 'Fish'],
            [/\b(shrimp|prawn|crab|lobster)\b/, 'Seafood'],
            [/\bturkey\b/, 'Turkey'],
            [/\blamb\b/, 'Lamb']
        ];
        const match = matches.find(([pattern]) => pattern.test(text));
        if (match) return match[1];
        if (/\bvegan\b/.test(text)) return 'Vegan';
        if (/\b(tofu|tempeh|lentils?|chickpeas?|beans?|eggs?|cheese)\b/.test(text)) return 'Vegetarian';
        return '';
    }

    getRecipeCategoryLabel(recipe) {
        return this.getRecipeCategories(recipe).join(', ') || 'Other';
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
            const configuredProxyUrl = window.settingsManager.getSettings().recipeProxyUrl;
            const proxyUrl = configuredProxyUrl || (window.location.protocol === 'file:' ? 'http://127.0.0.1:43987/recipe' : '');
            let html;
            let imageBaseUrl = parsedUrl.href;

            if (proxyUrl) {
                const parsedProxyUrl = new URL(proxyUrl);
                const isLocalProxy = !configuredProxyUrl && parsedProxyUrl.href === 'http://127.0.0.1:43987/recipe';
                if ((!isLocalProxy && parsedProxyUrl.protocol !== 'https:') || parsedProxyUrl.username || parsedProxyUrl.password) {
                    throw new Error('The configured recipe proxy URL must use HTTPS and cannot include credentials.');
                }
                const response = await fetch(parsedProxyUrl.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: parsedUrl.href })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `The recipe proxy returned ${response.status}.`);
                }
                if (typeof result.html !== 'string') {
                    throw new Error('The recipe proxy returned no page content.');
                }
                html = result.html;
                const finalUrl = new URL(result.finalUrl || parsedUrl.href);
                if (finalUrl.protocol !== 'https:') {
                    throw new Error('The recipe proxy returned an invalid source URL.');
                }
                imageBaseUrl = finalUrl.href;
            } else {
                const response = await fetch(parsedUrl.href, { credentials: 'omit' });
                if (!response.ok) {
                    throw new Error(`The website returned ${response.status}.`);
                }
                html = await response.text();
            }

            const recipeData = this.extractRecipeData(html);
            if (!recipeData) {
                throw new Error('No supported recipe data was found on that page.');
            }
            const suggestedCategory = this.suggestRecipeCategory(recipeData);
            if (recipeData.imageUrl) {
                const imageUrl = new URL(recipeData.imageUrl, imageBaseUrl);
                recipeData.imageUrl = imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:'
                    ? imageUrl.href
                    : '';
            }

            document.getElementById('recipe-source-url').value = parsedUrl.href;
            document.getElementById('recipe-name').value = recipeData.name;
            this.setRecipeCategories(suggestedCategory === 'Other' ? [] : [suggestedCategory]);
            document.getElementById('recipe-prep-time').value = recipeData.prepTime ?? 0;
            document.getElementById('recipe-cook-time').value = recipeData.cookTime ?? 0;
            document.getElementById('recipe-servings').value = recipeData.servings ?? 4;
            document.getElementById('recipe-ingredients').value = recipeData.ingredients.join('\n');
            document.getElementById('recipe-instructions').value = recipeData.instructions.join('\n');
            document.getElementById('recipe-notes').value = recipeData.description;
            document.getElementById('recipe-tags').value = recipeData.tags.join(', ');
            document.getElementById('recipe-image-url').value = recipeData.imageUrl;

            document.getElementById('recipe-import-preview').hidden = false;
            this.refreshRecipePreview();
            this.updateCreateMealButtonVisibility();
            const suggestedProtein = this.suggestRecipeProtein();
            status.textContent = `Recipe details loaded. Suggested category: ${suggestedCategory}.${suggestedProtein ? ` Suggested protein: ${suggestedProtein}.` : ''} Review and edit before saving.`;
            status.className = 'recipe-import-status success';
        } catch (error) {
            if (/^The (?:recipe )?website returned 402\.$/.test(error.message)) {
                const sourceField = document.getElementById('recipe-source-url');
                const savedLink = !sourceField.value.trim();
                if (savedLink) sourceField.value = parsedUrl.href;
                status.textContent = `The recipe website declined automated access (HTTP 402). ${
                    savedLink ? 'The link was copied to Original recipe link.' : 'Your existing original recipe link was kept.'
                } Open the link in your browser and enter the recipe details manually.`;
            } else {
                const hasProxy = Boolean(window.settingsManager.getSettings().recipeProxyUrl);
                const nextStep = hasProxy
                    ? 'Check that the Worker is deployed and allows this site origin and recipe domain.'
                    : window.location.protocol === 'file:'
                        ? error instanceof TypeError
                            ? 'Start the local recipe proxy using start-local-proxy.bat, then try again.'
                            : 'Check the recipe link and try again.'
                        : 'Some sites block direct browser access (CORS). Configure a recipe proxy in Settings, or enter the details manually.';
                status.textContent = `${error.message} ${nextStep}`;
            }
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

        const category = document.createElement('p');
        category.className = 'recipe-preview-category';
        category.textContent = `Categories: ${this.getCheckedValues('recipe-category').join(', ') || 'Other'}`;
        preview.appendChild(category);

        const suggestedProtein = this.suggestRecipeProtein();
        if (suggestedProtein) {
            const protein = document.createElement('p');
            protein.textContent = `Suggested protein: ${suggestedProtein}`;
            preview.appendChild(protein);
        }

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

    suggestRecipeCategory(recipeData) {
        const text = [
            recipeData.name,
            recipeData.description,
            ...(recipeData.tags || []),
            ...(recipeData.ingredients || [])
        ].join(' ').toLowerCase();
        const categoryTerms = (terms) => new RegExp(`\\b(?:${terms.join('|')})\\b`, 'i').test(text);

        if (categoryTerms(['dessert', 'cake', 'cookie', 'pudding', 'brownie', 'pie', 'ice cream', 'tart', 'pastry', 'sweet'])) {
            return 'Dessert';
        }
        if (categoryTerms(['protein', 'chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'tofu', 'tempeh', 'lentils?', 'chickpeas?', 'beans?', 'eggs?'])) {
            return 'Protein';
        }
        if (categoryTerms(['starch', 'rice', 'potatoes?', 'pasta', 'noodles?', 'bread', 'couscous', 'quinoa', 'oats?', 'barley', 'polenta', 'corn'])) {
            return 'Starch';
        }
        if (categoryTerms(['fruits?', 'apples?', 'bananas?', 'berries', 'strawberries', 'blueberries', 'oranges?', 'pears?', 'peaches?', 'grapes?'])) {
            return 'Fruit';
        }
        if (categoryTerms(['vegetables?', 'zucchini', 'courgette', 'squash', 'broccoli', 'carrots?', 'spinach', 'kale', 'cauliflower', 'cabbage', 'peppers?', 'tomatoes?', 'onions?', 'eggplant', 'aubergine', 'mushrooms?'])) {
            return 'Vegetables';
        }
        return 'Other';
    }

    viewRecipe(recipeId) {
        const recipe = window.recipeManager.getRecipe(recipeId);
        if (!recipe) {
            alert('Recipe not found.');
            return;
        }
        this.showRecipeDetails([recipe]);
    }

    viewRecipesForMeal(mealId) {
        this.showRecipeDetails(window.recipeManager.getRecipesByMeal(mealId));
    }

    showRecipeDetails(recipes) {
        const content = document.getElementById('recipe-view-content');
        content.replaceChildren();
        if (!recipes.length) {
            content.textContent = 'No recipe is linked to this component.';
        }
        recipes.forEach(recipe => {
            const section = document.createElement('section');
            section.className = 'recipe-view-section';
            const image = this.createRecipeImage(recipe, 'recipe-card-image');
            if (image) section.appendChild(image);
            const text = document.createElement('pre');
            text.className = 'recipe-view-text';
            text.textContent = window.recipeManager.exportRecipe(recipe.id);
            section.appendChild(text);
            if (recipe.sourceUrl) {
                try {
                    const sourceUrl = new URL(recipe.sourceUrl);
                    if (sourceUrl.protocol === 'http:' || sourceUrl.protocol === 'https:') {
                        const link = document.createElement('a');
                        link.href = sourceUrl.href;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = 'Open original recipe';
                        section.appendChild(link);
                    }
                } catch (error) {
                    // Ignore invalid source URLs in older imported data.
                }
            }
            content.appendChild(section);
        });
        const modal = document.getElementById('recipe-view-modal');
        modal.classList.add('active');
        modal.querySelector('.recipe-view-close').focus();
    }

    editRecipe(recipeId) {
        const recipe = window.recipeManager.getRecipe(recipeId);
        if (!recipe) return;

        this.currentEditingRecipeId = recipeId;
        document.getElementById('recipe-modal-title').textContent = 'Edit Recipe';
        document.getElementById('recipe-import-preview').hidden = true;
        this.populateRecipeMealOptions(recipe.mealId);

        document.getElementById('recipe-name').value = recipe.name;
        this.setRecipeCategories(this.getRecipeCategories(recipe));
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
        this.updateCreateMealButtonVisibility();
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
            categories: this.getCheckedValues('recipe-category'),
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

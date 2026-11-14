// shopping.js - Shopping list generation and management

class ShoppingListManager {
    constructor(storage, repository) {
        this.storage = storage;
        this.repository = repository;
    }

    generateShoppingList() {
        const currentWeek = this.storage.get('current-week');
        if (!currentWeek || !currentWeek.plan) {
            return [];
        }

        const ingredientMap = {};

        // Collect all ingredients from the week
        for (const day of Object.values(currentWeek.plan)) {
            if (day && typeof day === 'object') {
                ['breakfast', 'lunch', 'dinner'].forEach(type => {
                    if (day[type] && day[type].id) {
                        const meal = day[type];
                        meal.ingredients.forEach(ingredient => {
                            if (!ingredientMap[ingredient]) {
                                ingredientMap[ingredient] = {
                                    name: ingredient,
                                    quantity: 1,
                                    meals: [meal.name]
                                };
                            } else {
                                ingredientMap[ingredient].quantity++;
                                if (!ingredientMap[ingredient].meals.includes(meal.name)) {
                                    ingredientMap[ingredient].meals.push(meal.name);
                                }
                            }
                        });
                    }
                });
            }
        }

        const shoppingList = Object.values(ingredientMap).map((item, index) => ({
            id: 'item-' + index,
            name: item.name,
            quantity: item.quantity,
            unit: 'units',
            purchased: false,
            meals: item.meals
        }));

        this.storage.set('shopping-list', shoppingList);
        return shoppingList;
    }

    getShoppingList() {
        return this.storage.get('shopping-list', []);
    }

    markItemPurchased(itemId) {
        const list = this.getShoppingList();
        const item = list.find(i => i.id === itemId);
        if (item) {
            item.purchased = true;
            this.storage.set('shopping-list', list);
        }
    }

    markItemUnpurchased(itemId) {
        const list = this.getShoppingList();
        const item = list.find(i => i.id === itemId);
        if (item) {
            item.purchased = false;
            this.storage.set('shopping-list', list);
        }
    }

    clearShoppingList() {
        this.storage.set('shopping-list', []);
    }

    exportShoppingList() {
        const list = this.getShoppingList();
        let text = 'SHOPPING LIST\n';
        text += '=' . repeat(40) + '\n\n';

        list.forEach(item => {
            const status = item.purchased ? '✓' : '☐';
            text += `${status} ${item.name} (${item.quantity})\n`;
            if (item.meals.length > 0) {
                text += `  Used in: ${item.meals.join(', ')}\n`;
            }
        });

        return text;
    }

    printShoppingList() {
        const text = this.exportShoppingList();
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<pre>' + text + '</pre>');
        printWindow.document.close();
        printWindow.print();
    }
}

// Initialize global shopping list manager
window.shoppingManager = new ShoppingListManager(window.storage, window.repository);

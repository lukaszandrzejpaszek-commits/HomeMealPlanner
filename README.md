# HomeMealPlanner 🍳

A lightweight, single-page web application for family meal planning with intelligent weekly meal generation, recipe storage, and shopping list management.

## Features

### Core Features
- **Weekly Meal Planning** - Automatically generate optimal meal plans for breakfast, lunch, and dinner
- **Future Week Planning** - Select, generate, and revisit separate plans with week numbers and date ranges
- **Meal Repository** - Store and organize meals with detailed metadata
- **Smart Rule Engine** - 8 customizable planning rules to optimize meal selection:
  - Avoid identical meals on consecutive days
  - Avoid same food group for lunch and dinner
  - Balance cuisines throughout the week
  - Balance proteins throughout the week
  - Prefer meal-prep-friendly meals
  - Avoid meals from recent weeks
  - Reuse ingredients when practical
  - Avoid difficult meals on consecutive days

- **Planning History** - Track approved meal plans over time
- **Shopping List** - Automatically generate from current week's meals
- **Dark Mode** - Built-in theme switching
- **Data Backup/Restore** - Download and restore all data as JSON

### Bonus Features
- **Recipe Storage 📖** - Store detailed recipes with ingredients, instructions, ratings, images, and source links
- **Partial Regeneration** - Regenerate just breakfast, lunch, dinner, or a specific day
- **Custom Rules** - Create your own meal planning rules
- **School Lunch Support** - Choose school lunch separately for each day in the weekly planner
- **Settings** - Customize meal planning parameters
- **Export/Import** - Export meals and recipes as JSON
- **Dinner Components** - Generate dinners from reusable protein, starch, and vegetable options

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Responsive design with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks or dependencies
- **localStorage** - Client-side data persistence

## Project Structure

```
HomeMealPlanner/
├── index.html           # Main HTML page
├── css/
│   └── styles.css       # All styling
├── js/
│   ├── app.js           # Application entry point
│   ├── storage.js       # localStorage wrapper
│   ├── repository.js    # Meal management
│   ├── recipes.js       # Recipe management (BONUS)
│   ├── rules.js         # Rule engine
│   ├── planner.js       # Meal planning algorithm
│   ├── shopping.js      # Shopping list generation
│   ├── history.js       # History management
│   ├── settings.js      # Settings management
│   └── ui.js            # UI and event handling
└── data/                # Data storage (in localStorage)
    ├── meals.json
    ├── recipes.json
    ├── rules.json
    ├── settings.json
    ├── current-week.json
    ├── shopping-list.json
    └── history/
        └── {YEAR}-W{WEEK}.json
```

## Usage

### Getting Started

1. Open `index.html` in a modern web browser
2. Start by adding meals to your repository
3. Adjust planning rules to match your preferences
4. Generate a weekly meal plan
5. Review and approve the plan
6. Generate shopping list
7. Cook and enjoy!

### Adding Meals

1. Go to **Meals** page
2. Click **+ Add Meal**
3. Fill in meal details:
   - Name
   - Type (Breakfast, Lunch, Dinner)
   - Cuisine
   - Protein type
   - Difficulty level
   - Meal prep friendly (yes/no)
   - Ingredients
   - Food groups
   - Tags

### Adding Recipes

1. Go to **Recipes** page
2. Click **+ Add Recipe**
3. Enter a recipe webpage URL and click **Load Recipe** to import Schema.org recipe details, including the image when provided. Review the preview before saving. Import requires the site to permit browser access (CORS).
4. Choose a meal from **Connect to a meal** to associate the recipe with it.
5. If the site blocks browser access (CORS) or has no supported structured recipe data, enter the URL as the original recipe link and fill in the details manually.
6. Fill or review recipe details:
   - Name
   - Difficulty
   - Prep and cook time
   - Servings
   - Ingredients with amounts
   - Step-by-step instructions
   - Notes
   - Tags

### Dinner Component Options

On the **Meals** page, save lists of proteins, starches, and vegetables. Once all three lists have at least one option, generated dinners combine one item from each list. If any list is empty, the planner continues using saved dinner meals instead.

### Generating a Week Plan

1. Go to **Planner** page
2. Select a target week; the week number and date range appear beside the selector
3. Click **🎲 Generate Week**
4. The algorithm will create an optimal plan based on:
   - Your meals
   - Active rules and their strength
   - Recent meal history
   - Ingredient reuse opportunities

### Customizing Rules

1. Go to **Rules** page
2. For each rule:
   - Toggle on/off
   - Adjust strength (0-100):
     - 0 = Off
     - 25 = Low
     - 50 = Medium
     - 75 = Strong
     - 100 = Mandatory

3. Create custom rules (e.g., "Vegetarian Wednesday")

### Managing Plans

- **Regenerate** individual meal types or days
- **Replace** specific meals by clicking on them
- **Choose school lunch per day** with the checkbox in each day's planner card
- **Approve** plan to save to history
- **Copy** previous plans from history

### Shopping List

1. Go to **Shopping List**
2. Automatically generated from current week
3. Check off items as you purchase
4. Print or export to text file

### Settings

Configure:
- Days to cook meals for
- Weeks of history to avoid repeating
- Dark mode preference

### Backup & Restore

1. Go to **Settings**
2. **Backup Data** - downloads JSON file
3. **Restore Data** - upload previously saved JSON

## Meal Planning Algorithm

The planner uses a scoring system for each meal placement:

1. Load all meals and rules
2. For each day and meal time:
   - For each available meal, calculate a score based on:
     - Avoiding consecutive identical meals
     - Balancing food groups
     - Distributing cuisines
     - Spreading proteins
     - Preferring meal prep options
     - Avoiding recent meals
     - Reusing ingredients
     - Avoiding difficult meals consecutively
3. Select highest-scoring meal
4. Save plan to localStorage

## Data Storage

All data is stored in the browser's localStorage:
- No backend required
- No database needed
- Works offline
- Data persists across sessions
- Export/import for backup and sharing

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Tips

1. **Build meal variety** - Add 15-20 meals per type for better variety
2. **Use tags** - Tag meals for easier filtering
3. **Rate recipes** - Mark favorite recipes with 5 stars
4. **Adjust rules gradually** - Start with strong rules, relax if too restrictive
5. **Review before approving** - Edit the plan before approving to history
6. **Backup regularly** - Download backup of your data

## Future Enhancements

- Nutritional information tracking
- Allergy/dietary restriction filters
- Multi-family support
- Cloud sync
- Mobile app
- Recipe ratings and reviews
- Ingredient cost estimation
- Nutrition calculator
- Export to PDF

## License

MIT - Feel free to use and modify for personal use

## Feedback

This is an MVP (Minimum Viable Product). Feedback and suggestions are welcome!

---

Happy meal planning! 🍽️

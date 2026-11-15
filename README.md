# HomeMealPlanner 🍳

A lightweight, single-page web application for family meal planning with intelligent weekly meal generation, recipe storage, and shopping list management.

## Features

### Core Features
- **Weekly Meal Planning** - Automatically generate optimal meal plans for breakfast, lunch, and dinner
- **Future Week Planning** - Select, generate, and revisit separate plans with week numbers and date ranges
- **Planning Start Day** - Choose which day begins each seven-day planning period
- **Meal Components** - Store reusable protein, starch, fruit, and vegetable components with optional recipes and detailed metadata
- **Component Photos** - Show linked recipe photos or choose a separate component photo by URL or Wikimedia Commons search
- **Smart Rule Engine** - customizable planning rules to optimize meal selection:
  - Limit repeated components
  - Avoid same food group for lunch and dinner
  - Balance cuisines throughout the week
  - Balance proteins throughout the week
  - Prefer variety in starches and vegetables
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
- **Find Recipes** - Search the MyPlate.food collection by ingredient, with linked results and estimated difficulty
- **Partial Regeneration** - Regenerate just breakfast, lunch, dinner, or a specific day
- **Custom Rules** - Create your own meal planning rules
- **School Lunch Support** - Choose school lunch separately for each day in the weekly planner
- **Settings** - Customize meal planning parameters
- **Export/Import** - Export component details and recipes as JSON
- **Component Combinations** - Breakfast combines a breakfast component and fruit; lunch and dinner combine protein, starch and vegetables (school lunches are skipped).
- **Multi-Type Components** - Make a component available for any combination of breakfast, lunch, and dinner
- **Recipe-to-Component** - Create a component prefilled from a recipe, with an editable protein suggestion
- **Optional Recipe Proxy** - Use a Cloudflare Worker to fetch recipe pages from domains that block direct browser access

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Responsive design with CSS Grid and Flexbox
- **Vanilla JavaScript** - No frameworks or dependencies
- **localStorage** - Client-side data persistence
- **Cloudflare Workers** - Optional recipe-page fetch proxy; planner and recipe data remain client-side

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
├── worker/
│   ├── recipe-proxy.js  # Optional Cloudflare Worker for recipe-page fetching
│   └── wrangler.toml    # Worker allowlist and deployment configuration
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
2. Add reusable components to your repository
3. Adjust planning rules to match your preferences
4. Generate a weekly meal plan
5. Review and approve the plan
6. Generate shopping list
7. Cook and enjoy!

### Adding Meal Components

1. Go to **Meal Components**.
2. Click **+ Add Component** and select its categories.
3. Fill in component details:
   - Name
   - Meal types (select any combination of Breakfast, Lunch, Dinner)
   - Cuisine
   - Protein type
   - Difficulty level
   - Meal prep friendly (yes/no)
   - Ingredients
   - Food groups
   - Tags

For a photo, enter an image URL or click **Find photos** and choose a Wikimedia Commons result. Search sends the entered search terms (or component name) to Wikimedia Commons and requires internet access; credits and license links are retained. Use images you have permission to display. If no component photo is set, a linked recipe photo is shown. Protein type is optional and appears only for protein components.

To suggest ingredients and tags, enter a component name and click **Find ingredients and tags**. The name is sent to Wikidata. Select the correct match, review the suggestions, and click **Add suggestions**; existing entries are retained. Wikidata ingredient statements may be incomplete or not match your recipe, so check them before use.

### Adding Recipes

1. Go to **Recipes** page
2. Click **+ Add Recipe**
3. Enter a recipe webpage URL and click **Load Recipe** to import Schema.org recipe details, including the image when provided. Review the preview and suggested category/protein before saving.
4. Choose one or more recipe categories: Breakfast, Protein, Starch, Fruit, Vegetables, or Dessert.
5. Select an existing component in **Connect to a meal component**, or click **Create a component from this recipe**, choose meal types and save it. Save the recipe to keep the link.
   Open linked recipes from a component's details or by clicking the component in the planner. The planner shows a linked recipe's photo when available; use the **+** button for a category to add or change that component.
6. If a site blocks direct browser access, use the local proxy or optional Cloudflare Worker described below.
7. Fill or review recipe details:
   - Name
   - Difficulty
   - Prep and cook time
   - Servings
   - Ingredients with amounts
   - Step-by-step instructions
   - Notes
   - Tags

Some websites also decline automated requests from the proxy, even if the page opens in a browser. If this happens, open the original link and enter the details manually. The proxy cannot guarantee access to every website.

### Finding Online Recipes

Open **Find Recipes** and select ingredients from Protein, Starch and Vegetables, or enter other ingredients. Starch and vegetable choices are ingredients rather than saved dish names; enter any others in the additional ingredients field. At least one choice in each selected group and every other ingredient must match. Optionally enter a cuisine keyword, with or without ingredients. MyPlate.food searches the keyword in recipe titles and descriptions, not cuisine labels, so some relevant recipes may be missed and matches are not guaranteed to belong to that cuisine. Search sends those terms to MyPlate.food, an independent service preserving the USDA MyPlate Kitchen collection. Its free API allows 20 requests per minute and 100 recipe-detail requests per day per IP. This searches that collection, not the entire web. Results are limited to the first 100 candidates and up to 10 detailed checks.

Difficulty is an estimate based only on the number of instruction sentences (up to 3: Easy, 4–6: Medium, 7 or more: Hard); it is not a cooking assessment. Time is taken only from a recipe title that mentions minutes and may not include preparation. When a time filter is selected, recipes with no time in the title are excluded. Review the linked recipe before cooking.

Recipe names are sent to Wikimedia Commons to look for freely licensed illustrative photos. The images may not depict the actual recipe, and their source, author and licence are shown. Some results may have no suitable image.

### Meal Component Options

On the **Meal Components** page, add reusable components and assign their categories. A generated breakfast contains a Breakfast component and fruit; lunch and dinner contain protein, starch and vegetables. Assign the Breakfast category and meal type to existing components you want in the breakfast slot. Older saved breakfast components remain visible until the meal is changed; replacing one requires confirmation. The planner displays separate slots with category icons and linked recipe photos. Use each slot's **+** button to add or change that component, even before the other slots are filled. Manual choices can override repetition rules. A component in multiple categories may fill multiple places in the same meal. Choose the meal types for which each component is available. Previously added simple components remain available for all meal types and can be edited. Recipes can be linked to any component. Uncategorized components remain saved but are not used in generation. **Export Component Details** exports detailed components; use **Backup Data** to include older simple entries as well.

To set pairings, edit a protein component and select its suitable starches and vegetables. The lists are independent: any selected starch can be combined with any selected vegetable. Select **No starch** or **No vegetables** if the meal may omit that category. If no other item is selected in that list, the category is always omitted; select other items as well to allow either. Leave a list entirely empty to allow any available component in that category, without omission. These restrictions apply to generated and regenerated lunches and dinners; manual planner choices remain unrestricted. Selected components must also be available for that meal type. If a selected component is deleted or no longer has the right category, it is shown as unavailable when editing the protein and may leave generated slots empty. Existing plans do not change until regenerated.

### Deploying the Optional Recipe Proxy

For the locally opened `index.html`, double-click `start-local-proxy.bat` and leave its window open while importing recipes. Python 3 and the Windows Python launcher are required. The app automatically connects to the helper on `127.0.0.1:43987` when no remote proxy is configured. The helper fetches public HTTPS pages only and does not store recipes. Close the window to stop it.

The planner and its data remain static and client-side. The optional Cloudflare Worker only fetches recipe-page HTML, so the browser does not need to access a recipe site directly.

1. Install or run Wrangler and authenticate with Cloudflare (`npx wrangler login`).
2. From the `worker/` directory, deploy with `npx wrangler deploy`.
3. `worker/wrangler.toml` allows the GitHub Pages origin and `mrishtanna.com` by default. Change `ALLOWED_ORIGINS` to the exact origin serving this app and add any other recipe domains to `ALLOWED_RECIPE_HOSTS`, then deploy again.
4. Copy the Worker URL shown by Wrangler (for example, `https://home-meal-planner-recipe-proxy.<account>.workers.dev`).
5. Open HomeMealPlanner from its HTTPS GitHub Pages URL, go to **Settings**, paste the Worker URL into **Recipe import proxy URL**, and save.

The proxy allows only configured HTTPS recipe domains, follows redirects only within the allowlist, and limits response size and request time. It does not store recipe data. Opening `index.html` from `file://` is not allowed as a proxy origin; use the HTTPS site URL.

### Generating a Week Plan

1. Go to **Planner** page
2. Select the ISO week containing the start date; the seven-day date range appears beside the selector
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
   - Adjust the strength of scoring preferences (0-100):
     - 0 = Off
     - 25 = Low
     - 50 = Medium
     - 75 = Strong
     - 100 = Mandatory

3. Create custom rules (e.g., "Vegetarian Wednesday")

The repeat rule is strict when enabled, so it has an on/off switch rather than a strength slider. Existing repeat-rule settings are replaced by this enabled rule when upgrading or restoring an older backup.

### Managing Plans

- **Cuisine Balance** shows flags for recognized national cuisines and a house for Home; other cuisine labels remain unchanged. Flag images are from [flag-icons](https://github.com/lipis/flag-icons) under the [MIT license](assets/flags/LICENSE).
- **Regenerate** individual meal types or days
- **Clear Plan** removes meals and school-lunch selections for the open week after confirmation. The week becomes a draft; history and other weeks remain unchanged.
- **Add or replace** individual components with their **+** buttons
- Mark a component **Weekend only** to limit automatic generation to Saturday and Sunday. It can still be selected manually on weekdays.
- **Choose school lunch per day** with the checkbox in each day's planner card
- The **Limit repeated components** rule allows a breakfast component on two consecutive mornings, or a protein on two consecutive days in different meal slots (lunch then dinner, or dinner then lunch). Each can appear at most twice in the week, regardless of meal-prep settings.
- Fruit cannot repeat in different meal slots on the same day or on consecutive days, except for consecutive meal prep up to the configured limit. Starch and vegetables can repeat; protein pairings still apply, and the food-group preference may affect scoring. The rule may leave slots empty; manual choices can override it.
- The **Vary starches and vegetables** preference favors sides used less often in the selected week. It does not prohibit repeats; change its strength or switch it off under Rules.
- **Approve** a plan to save it to history. Reapproval replaces history entries for the same date range with the new plan, including existing duplicates; plans with different start dates remain separate. Changing or regenerating an approved plan makes it a draft until approved again.
- **Edit** a history entry to open its original week as a draft. History is unchanged until approval. Opening it may replace the current planner draft for that week.
- **Delete** a history entry after confirmation, or **Copy** it to the selected week. Deleting history does not delete the planner's saved week.

### Shopping List

1. Go to **Shopping List**
2. Automatically generated from current week
3. Check off items as you purchase
4. Print or export to text file

### Settings

Configure:
- Planning start day (Monday by default). For example, Saturday creates a Saturday–Friday period. Changing it opens a separate period and keeps saved plans for the previous start day; switching back restores them.
- Days to cook meals for
- Weeks of history to avoid repeating
- Optional HTTPS recipe import proxy URL
- Dark mode preference

### Backup & Restore

1. Go to **Settings**
2. **Backup Data** - downloads JSON file
3. **Restore Data** - upload previously saved JSON

## Meal Planning Algorithm

The planner uses a scoring system for each meal placement:

1. Load all meals and rules
2. For each day and meal time:
   - Exclude meals that violate the enabled repeat rule.
   - Score the remaining meals based on:
     - Balancing food groups
     - Distributing cuisines
     - Spreading proteins
     - Varying starches and vegetables
     - Preferring meal prep options
     - Avoiding recent meals
     - Reusing ingredients
     - Avoiding difficult meals consecutively
3. Select highest-scoring meal
4. Save plan to localStorage

## Data Storage

All data is stored in the browser's localStorage:
- No backend required for meal planning and data storage
- No database needed
- Works offline
- Data persists across sessions
- Export/import for backup and sharing
- An optional Cloudflare Worker is used only for recipe-page fetching

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

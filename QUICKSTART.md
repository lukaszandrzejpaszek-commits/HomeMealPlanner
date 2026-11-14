# HomeMealPlanner - Quick Start Guide

## 🚀 Getting Started

### Open the App
Simply open `index.html` in your web browser. No installation needed!

```
file:///C:/Users/lpasz/GITHUB/HomeMealPlanner/index.html
```

## 📋 First Time Setup (5 minutes)

### Step 1: Add Meal Components
1. Click **Meal Components** in the navigation.
2. Click **+ Add Component** and assign a category, for example Breakfast for porridge, Protein for chicken, Starch for rice, Fruit for an apple, or Vegetables for broccoli.
3. Choose the meal types for each component and add more options for variety.
4. Link a recipe to a component on the **Recipes** page, if desired.
5. To add a photo, enter an image URL or click **Find photos** and select a Wikimedia Commons result. Searching sends your search terms to Wikimedia Commons. A linked recipe photo is shown if no component photo is set.
6. To suggest ingredients and tags, click **Find ingredients and tags**, select a Wikidata match and review it before adding. The component name is sent to Wikidata; existing entries are kept.

### Step 2: Generate Your First Week Plan
1. Click **Planner** in the navigation
2. Select the ISO week containing the start date; its seven-day date range is shown
3. Click **🎲 Generate Week**
4. Watch the algorithm create an optimal plan!
5. The repeat rule allows a breakfast twice on consecutive mornings, or a protein twice on consecutive days in different meal slots (lunch then dinner, or dinner then lunch). Neither may appear again that week. Other components cannot repeat on the same day or consecutive days, except for configured meal prep. Limited variety can leave slots empty.

### Step 3: Approve the Plan
1. Review the generated meals
2. Click **Approve Plan** to save to history
3. Use **History → Edit** to open an entry as a draft; approving replaces that entry. **Delete** removes an entry after confirmation. Editing an approved plan makes it a draft again.
4. Confirm when asked

### Step 4: Check Shopping List
1. Click **Shopping List** in the navigation
2. See all ingredients auto-generated from your meals
3. Check off items as you shop

## 🎮 Features to Try

### Component Management
- **Edit component**: Click "Edit" on a component
- **Delete component**: Click "Delete" on a component card
- **Search**: Use the search box to find detailed components
- **Filter**: Filter by type or cuisine

### Planning
- **View or replace a component**: Click a planned component to see its recipes, or its **+** button to choose another
- **Regenerate day**: Generate plan > Regenerate individual meals
- **School lunch**: Choose school lunch separately on each day in the planner
- **Future week**: Select a later week to generate and save a separate plan
- **Meal components**: Breakfast combines a Breakfast component and fruit; lunch and dinner combine protein, starch and vegetables. Assign the Breakfast category and meal type to components you want in the breakfast slot. Use the **+** buttons to fill a row manually; manual choices can override repeat rules.
- **Multiple meal types**: Assign a component to any combination of breakfast, lunch, and dinner.
- **Adjust rules**: Go to Rules to toggle rules on/off or adjust the strength of scoring preferences. The repeat rule is strict and has no strength slider.

### Shopping
- **Mark purchased**: Check off items as you shop
- **Print**: Print your shopping list
- **Export**: Export as text file

### Recipes (Bonus!)
- **Add recipe**: Go to Recipes > + Add Recipe
- **Find online recipes**: Open Find Recipes, choose ingredients or a cuisine keyword and search the MyPlate.food collection. Cuisine matches titles and descriptions, not official cuisine labels. Difficulty and title-based times are approximate; recipes without a time in the title are excluded by the time filter. Photos from Wikimedia Commons are illustrative, not necessarily the actual dish.
- **Set protein pairings**: Edit a protein component and choose suitable starches and vegetables, including **No starch** or **No vegetables** when appropriate. An empty list allows any component in that category; manual choices remain unrestricted.
- **Import from a link**: Load recipe details and review ingredients, steps, image, category, and protein suggestion before saving
- **Link a recipe**: Choose a component under **Connect to a meal component**, or click **Create a component from this recipe**. Save the recipe to keep the link.
- **Recipe categories**: Select any combination of Breakfast, Protein, Starch, Fruit, Vegetables, and Dessert
- **Blocked recipe sites**: For the locally opened app, double-click `start-local-proxy.bat` and leave it running. For the HTTPS site, deploy the optional Cloudflare Worker from `worker/` and save its URL in **Settings > Recipe import proxy URL**.
- **Website refuses the proxy**: Open the recipe in your browser and enter its details manually; some sites do not allow automated imports.
- **Fill in**: Name, time, servings, ingredients, instructions
- **Rate**: Use stars to rate your favorite recipes
- **View**: Click "View" to see full recipe

### Rules Customization
1. Go to **Rules** page
2. For each rule:
   - **Toggle** the switch to enable/disable
   - **Drag slider** to adjust strength (0-100)
3. Create your own rules with **+ Add Custom Rule**

Examples:
- Vegetarian Mondays
- No fish on Wednesdays
- Max 2 beef meals per week

### Settings
- Choose the planning start day; Saturday plans run Saturday through Friday. Changing it opens a separate period without deleting existing plans.
- Cook for X days
- History weeks to avoid
- Optional HTTPS recipe import proxy URL
- Choose school lunch separately for each day in the planner
- Dark mode toggle

### Backup & Restore
1. Go to **Settings**
2. Click **Backup Data** to download a backup
3. Click **Restore Data** to upload a backup
4. Keep backups safe!

## 🧪 Test Scenarios

### Scenario 1: Quick Weeknight
1. Add simple, quick meals (Easy difficulty)
2. Set "Prefer meal-prep-friendly" rule to Strong
3. Generate week - should get simple, repeatable meals

### Scenario 2: Variety Week
1. Add diverse meals from different cuisines
2. Set "Balance cuisines" rule to Mandatory
3. Generate week - should see good cuisine mix

### Scenario 3: Meal Prep Focus
1. Add mix of easy and hard meals
2. Add some meal-prep-friendly options
3. Set both "Prefer meal-prep" and "Avoid difficult consecutive" to Strong
4. Generate - should balance easy/hard and prefer prep-friendly

## 📊 Data Structure

### What Gets Stored
All data stored in browser localStorage:
- **Meal Components** - Your reusable component definitions
- **Recipes** - Your stored recipes
- **Current Week** - This week's plan
- **History** - Approved previous plans
- **Shopping List** - Current ingredients
- **Settings** - Your preferences
- **Rules** - Your customized rules

### Where It's Stored
- Browser localStorage (persists across sessions)
- Can export to JSON
- Can restore from JSON backup

## 🎨 UI Tips

### Dark Mode
- Click the moon icon (🌙) at top-left
- Toggles between light and dark theme
- Preference saved automatically

### Responsive Design
- Works on desktop, tablet, and mobile
- Navigation collapses on small screens
- Touch-friendly buttons and spacing

### Keyboard Shortcuts
- Tab through form fields
- Enter to submit forms
- Esc to close modals

## 🔧 Troubleshooting

### Data Not Saving
- Check browser console (F12)
- Make sure localStorage is enabled
- Try different browser
- Check if in private/incognito mode

### Components Not Appearing
- Refresh page
- Check the Meal Components page to verify they're saved and categorized
- Try adding a new component

### Plan Looking Off
- Try regenerating individual meal types
- Check rule settings
- Ensure you have enough component variety

### Performance Issues
- Try clearing browser cache
- Reduce number of meals temporarily
- Close other tabs

## 💡 Pro Tips

1. **Build variety** - Add components in every category for each desired meal type
2. **Use tags** - Tag components to organize (e.g., "Quick", "Family Favorite")
3. **Adjust rules gradually** - Start strong, relax if too restrictive
4. **Review before approving** - Edit meals before approval
5. **Backup regularly** - Download backup weekly
6. **Reuse ingredients** - Buy versatile ingredients
7. **Plan ahead** - Generate next week's plan in advance

## 🚨 Known Limitations (MVP)

- localStorage has ~5-10MB limit (enough for thousands of meals)
- Single browser = single user
- No cloud sync
- No nutritional tracking (yet)
- No allergy filtering (planned)

## 🎯 Next Features (Planned)

- Nutritional information
- Allergy/dietary restrictions
- Multi-family support
- Cloud sync
- Mobile app
- Recipe nutrition calculator
- Cost estimation

## 📞 Need Help?

1. Check README.md for detailed documentation
2. Examine the code in js/ folder (well-commented)
3. Try adjusting rules if plan doesn't look right
4. Use browser developer tools (F12) for debugging

---

**Enjoy meal planning!** 🍽️

Created: 2026-11-14

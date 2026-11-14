# HomeMealPlanner - Quick Start Guide

## 🚀 Getting Started

### Open the App
Simply open `index.html` in your web browser. No installation needed!

```
file:///C:/Users/lpasz/GITHUB/HomeMealPlanner/index.html
```

## 📋 First Time Setup (5 minutes)

### Step 1: Add Some Meals
1. Click **Meals** in the navigation
2. Click **+ Add Meal** button
3. Fill in a few meals:
   - Name: "Spaghetti Carbonara"
   - Type: Dinner
   - Cuisine: Italian
   - Protein: Pork
   - Difficulty: Easy
   - Ingredients: Pasta, Pork, Eggs, Cheese
   - Food Groups: Pasta, Protein, Dairy

4. Add 2-3 more meals (different types and cuisines)

### Step 2: Generate Your First Week Plan
1. Click **Planner** in the navigation
2. Select the week to plan; its week number and date range are shown
3. Click **🎲 Generate Week**
4. Watch the algorithm create an optimal plan!

### Step 3: Approve the Plan
1. Review the generated meals
2. Click **Approve Plan** to save to history
3. Confirm when asked

### Step 4: Check Shopping List
1. Click **Shopping List** in the navigation
2. See all ingredients auto-generated from your meals
3. Check off items as you shop

## 🎮 Features to Try

### Meal Management
- **Edit meal**: Click "Edit" on any meal card
- **Delete meal**: Click "Delete" on any meal card
- **Search**: Use the search box to find meals
- **Filter**: Filter by type or cuisine

### Planning
- **Replace a meal**: Click on any meal in the week view to pick a different one
- **Regenerate day**: Generate plan > Regenerate individual meals
- **School lunch**: Choose school lunch separately on each day in the planner
- **Future week**: Select a later week to generate and save a separate plan
- **Meal components**: On Meals, add proteins, starches, and vegetables in separate columns. Generated breakfasts, lunches, and dinners combine one item from each; school lunches are skipped. Saved complete meals are used when a component category is empty.
- **Adjust rules**: Go to Rules page and toggle rules on/off or change strength

### Shopping
- **Mark purchased**: Check off items as you shop
- **Print**: Print your shopping list
- **Export**: Export as text file

### Recipes (Bonus!)
- **Add recipe**: Go to Recipes > + Add Recipe
- **Import from a link**: Load recipe details and review ingredients, steps, and image before saving; the site must allow browser access (CORS)
- **Connect to a meal**: Choose the saved meal in the recipe form
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
- Cook for X days
- History weeks to avoid
- School lunch days
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
- **Meals** - Your meal definitions
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

### Meals Not Appearing
- Refresh page
- Check Meals page to verify they're saved
- Try adding a new meal

### Plan Looking Off
- Try regenerating individual meal types
- Check rule settings
- Ensure you have enough meal variety

### Performance Issues
- Try clearing browser cache
- Reduce number of meals temporarily
- Close other tabs

## 💡 Pro Tips

1. **Build variety** - Add 15-20 meals per type for better planning
2. **Use tags** - Tag meals to organize (e.g., "Quick", "Family Favorite")
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

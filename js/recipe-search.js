// Online recipe discovery using the MyPlate.food API.
class RecipeDiscovery {
    constructor() {
        this.controller = null;
        this.groups = {
            protein: { category: 'Protein', defaults: ['Chicken', 'Beef', 'Pork', 'Fish', 'Turkey', 'Tofu', 'Beans', 'Eggs'] },
            starch: { category: 'Starch', defaults: ['Rice', 'Pasta', 'Potatoes', 'Bread', 'Noodles'] },
            vegetables: { category: 'Vegetables', defaults: ['Broccoli', 'Carrots', 'Tomatoes', 'Peppers', 'Zucchini', 'Spinach', 'Onion'] }
        };
    }

    init() {
        this.renderOptions();
        document.querySelector('[data-page="recipe-discovery"]').addEventListener('click', () => this.renderOptions());
        document.getElementById('recipe-discovery-form').addEventListener('submit', event => {
            event.preventDefault();
            this.search();
        });
    }

    renderOptions() {
        const components = [...window.repository.getSimpleMealComponents(), ...window.repository.getAllMeals()];
        Object.entries(this.groups).forEach(([key, group]) => {
            const container = document.getElementById(`discovery-${key}`);
            const selected = new Set(Array.from(container.querySelectorAll('input:checked'))
                .map(input => input.value.toLowerCase()));
            const names = new Map();
            const categoryComponents = components.filter(item =>
                window.repository.getMealCategories(item).includes(group.category)
            );
            const savedOptions = key === 'protein'
                ? categoryComponents.map(item => item.protein).filter(value =>
                    typeof value === 'string' && !['vegan', 'vegetarian', 'other', 'n/a'].includes(value.trim().toLowerCase()))
                : categoryComponents.map(item => item.name);
            [...group.defaults, ...savedOptions].forEach(name => {
                if (typeof name === 'string' && name.trim()) names.set(name.trim().toLowerCase(), name.trim());
            });
            container.replaceChildren();
            [...names.values()].sort((a, b) => a.localeCompare(b)).forEach(name => {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = name;
                input.checked = selected.has(name.toLowerCase());
                label.append(input, document.createTextNode(name));
                container.appendChild(label);
            });
        });
    }

    async getJson(url, signal) {
        const response = await fetch(url, { signal, credentials: 'omit' });
        if (!response.ok) {
            throw new Error(response.status === 429
                ? 'The online service rate limit was reached. Please try again later.'
                : `The online service returned HTTP ${response.status}.`);
        }
        return response.json();
    }

    async search() {
        if (this.controller) this.controller.abort();
        const controller = new AbortController();
        this.controller = controller;
        const status = document.getElementById('recipe-discovery-status');
        const results = document.getElementById('recipe-discovery-results');
        results.replaceChildren();
        const groups = Object.keys(this.groups).map(key =>
            Array.from(document.querySelectorAll(`#discovery-${key} input:checked`))
                .map(input => input.value.trim().toLowerCase())
        );
        const other = document.getElementById('discovery-ingredients').value.split(',')
            .map(value => value.trim().toLowerCase()).filter(Boolean);
        const ingredients = [...new Set([...groups.flat(), ...other])];
        if (!ingredients.length || ingredients.length > 20 || ingredients.some(value => value.length > 80 || value.includes(','))) {
            status.textContent = 'Select or enter 1 to 20 ingredients, each no longer than 80 characters.';
            this.controller = null;
            return;
        }
        const maxTime = Number(document.getElementById('discovery-time').value) || null;
        const difficulty = document.getElementById('discovery-difficulty').value;
        status.textContent = 'Searching MyPlate.food...';
        try {
            const params = new URLSearchParams({ ingredients: ingredients.join(','), limit: '100' });
            const data = await this.getJson(`https://myplate.food/api/v1/recipes?${params}`, controller.signal);
            if (!Array.isArray(data.results)) throw new Error('The recipe service returned an unexpected response.');
            const candidates = data.results.filter(item => {
                if (!Array.isArray(item.matched_ingredients) || typeof item.slug !== 'string' ||
                    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || typeof item.name !== 'string') return false;
                const matched = new Set(item.matched_ingredients.map(value => String(value).trim().toLowerCase()));
                const time = this.timeFromTitle(item.name);
                return groups.every(group => !group.length || group.some(value => matched.has(value))) &&
                    other.every(value => matched.has(value)) && (!maxTime || (time !== null && time <= maxTime));
            }).slice(0, 10);
            const matches = [];
            for (const candidate of candidates) {
                if (matches.length === 5) break;
                const detail = await this.getJson(
                    `https://myplate.food/api/v1/recipes/${encodeURIComponent(candidate.slug)}`, controller.signal
                );
                if (typeof detail.directions !== 'string' || !Array.isArray(detail.ingredients)) {
                    throw new Error('The recipe service returned incomplete recipe details.');
                }
                const estimate = this.estimateDifficulty(detail.directions);
                if (!difficulty || estimate?.level === difficulty) matches.push({ candidate, detail, estimate });
            }
            if (controller.signal.aborted) return;
            status.textContent = matches.length
                ? `${matches.length} result(s). Checked up to 10 matching recipes from the first 100; the search is not exhaustive.`
                : 'No matches among the checked recipes. Try fewer filters; only the first 100 candidates are searched.';
            await Promise.all(matches.map(async match => {
                const card = this.createCard(match);
                results.appendChild(card);
                try {
                    const photo = await this.findIllustration(match.candidate.name, controller.signal);
                    if (controller.signal.aborted) return;
                    const photoArea = card.querySelector('.discovery-photo');
                    if (photo) {
                        const image = window.ui.createRecipeImage({ imageUrl: photo.url, name: photo.credit.title }, 'recipe-card-image');
                        image.addEventListener('error', () => { photoArea.textContent = 'Illustrative photo could not be loaded.'; });
                        const label = document.createElement('small');
                        label.textContent = 'Illustrative photo, not necessarily this recipe.';
                        photoArea.replaceChildren();
                        photoArea.append(image, label, window.ui.createPhotoCredit(photo.credit));
                    } else {
                        photoArea.textContent = 'No suitable illustrative photo found.';
                    }
                } catch (error) {
                    if (!controller.signal.aborted && error.name !== 'AbortError') card.querySelector('.discovery-photo').textContent =
                        `Photo search failed: ${error.message}`;
                }
            }));
        } catch (error) {
            if (!controller.signal.aborted && error.name !== 'AbortError') {
                status.textContent = `Recipe search failed: ${error.message}`;
            }
        } finally {
            if (this.controller === controller) this.controller = null;
        }
    }

    timeFromTitle(title) {
        const match = title.match(/\b(\d+)\s*[- ]?\s*(?:minutes?|mins?)\b/i);
        return match ? Number(match[1]) : null;
    }

    estimateDifficulty(directions) {
        const sentences = directions.split(/[.!?]+(?:\s+|$)|\n+/).map(s => s.trim()).filter(Boolean);
        if (!sentences.length) return null;
        return {
            level: sentences.length <= 3 ? 'Easy' : sentences.length <= 6 ? 'Medium' : 'Hard',
            count: sentences.length
        };
    }

    createCard({ candidate, detail, estimate }) {
        const card = document.createElement('article');
        card.className = 'meal-card recipe-discovery-card';
        const photo = document.createElement('div');
        photo.className = 'discovery-photo';
        photo.textContent = 'Looking for an illustrative photo...';
        const heading = document.createElement('h3');
        heading.textContent = candidate.name;
        const time = this.timeFromTitle(candidate.name);
        const information = document.createElement('p');
        information.textContent = `Difficulty: ${estimate ? `${estimate.level} (estimated from ${estimate.count} instruction sentences)` : 'Unknown'}. ` +
            `Time: ${time === null ? 'not provided' : `about ${time} minutes (from title)`}.`;
        const ingredients = document.createElement('p');
        const names = detail.ingredients.map(item => item.text).filter(value => typeof value === 'string' && value.trim());
        ingredients.textContent = `Ingredients: ${names.slice(0, 6).join(', ')}${names.length > 6 ? ` and ${names.length - 6} more` : ''}.`;
        const link = document.createElement('a');
        link.href = `https://myplate.food/recipes/${encodeURIComponent(candidate.slug)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View recipe on MyPlate.food';
        card.append(photo, heading, information, ingredients, link);
        return card;
    }

    async findIllustration(query, signal) {
        const params = new URLSearchParams({
            action: 'query', generator: 'search', gsrsearch: `${query} food filetype:bitmap`,
            gsrnamespace: '6', gsrlimit: '5', prop: 'imageinfo', iiprop: 'url|mime|extmetadata',
            iiurlwidth: '400', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
            format: 'json', formatversion: '2', origin: '*'
        });
        const data = await this.getJson(`https://commons.wikimedia.org/w/api.php?${params}`, signal);
        if (data.error) throw new Error(data.error.info || 'Wikimedia Commons returned an error.');
        const text = value => {
            const template = document.createElement('template');
            template.innerHTML = value || '';
            return template.content.textContent.trim();
        };
        const pages = Array.isArray(data.query?.pages) ? data.query.pages : [];
        for (const page of pages.sort((a, b) => a.index - b.index)) {
            const info = page.imageinfo?.[0];
            const metadata = info?.extmetadata || {};
            const author = text(metadata.Artist?.value);
            const license = text(metadata.LicenseShortName?.value);
            if (!info || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime) ||
                !author || !/^(CC BY(?:-SA)? [\d.]+|CC0(?: 1\.0)?)$/i.test(license)) continue;
            let imageUrl, sourceUrl, licenseUrl;
            try {
                imageUrl = new URL(info.thumburl);
                sourceUrl = new URL(info.descriptionurl);
                licenseUrl = new URL(metadata.LicenseUrl?.value);
            } catch (error) {
                continue;
            }
            if (imageUrl.protocol !== 'https:' || !imageUrl.hostname.endsWith('.wikimedia.org') ||
                sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'commons.wikimedia.org' ||
                licenseUrl.protocol !== 'https:') continue;
            return {
                url: imageUrl.href,
                credit: { title: page.title.replace(/^File:/, ''), author, license,
                    sourceUrl: sourceUrl.href, licenseUrl: licenseUrl.href }
            };
        }
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.recipeDiscovery = new RecipeDiscovery();
    window.recipeDiscovery.init();
});

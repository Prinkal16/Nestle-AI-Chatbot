require('dotenv').config();
const gremlinUtils = require('./gremlinUtils'); // Path relative to populateGraph.js
const gremlin = require('gremlin');
const driver = gremlin.driver;
const auth = gremlin.driver.auth;

// Cosmos DB (Gremlin) Setup
const gremlinUsername = `/dbs/${process.env.COSMOSDB_DATABASE}/colls/${process.env.COSMOSDB_GRAPH}`;
const gremlinPassword = process.env.COSMOSDB_KEY;
const gremlinEndpoint = process.env.COSMOSDB_ENDPOINT;

if (!process.env.COSMOSDB_DATABASE || !process.env.COSMOSDB_GRAPH || !gremlinPassword || !gremlinEndpoint) {
    console.error("Missing Cosmos DB (Gremlin) environment variables. Please check your .env file.");
    process.exit(1);
}

const authenticator = new auth.PlainTextSaslAuthenticator(gremlinUsername, gremlinPassword);

const gremlinClient = new driver.Client(`${gremlinEndpoint}`, {
    authenticator,
    traversalsource: 'g',
    rejectUnauthorized: false,
    mimeType: 'application/vnd.gremlin-v2.0+json'
});

// Initialize the gremlinUtils module with the client instance
gremlinUtils.initializeGremlinClient(gremlinClient);


async function populateGraph() {
    console.log('Attempting to connect to Cosmos DB Gremlin API...');
    try {
        await gremlinClient.open();
        console.log('CONNECTED TO GRAPH FOR POPULATION');
    } catch (err) {
        console.error('ERROR: Failed to connect to Cosmos DB Gremlin API:', err.message);
        console.error('Ensure COSMOSDB_DATABASE, COSMOSDB_GRAPH, COSMOSDB_KEY, and COSMOSDB_ENDPOINT are correct in your .env file.');
        return; // Exit if connection fails
    }

    // --- Vertex Data ---
    const recipeData = [
        {
            name: 'Classic Crispy Squares',
            label: 'recipe',
            properties: {
                description: 'A timeless treat, easy to make with marshmallows and butter.',
                prepTime: '10 minutes',
                cookTime: '5 minutes',
                servings: 12,
                difficulty: 'Easy',
                image_url: 'https://www.madewithnestle.ca/sites/default/files/styles/recipe_detail_desktop/public/2023-09/CrispySquares_1.jpg',
                url: 'https://www.madewithnestle.ca/recipes/classic-crispy-squares'
            },
            ingredients: [{ name: 'Butter' }, { name: 'Marshmallows' }, { name: 'Rice Krispies' }],
            products: [{ name: 'Carnation Evaporated Milk' }],
            categories: [{ name: 'Desserts' }, { name: 'Quick & Easy' }],
            dietaryTags: [{ name: 'Vegetarian' }],
            allergens: [{ name: 'Dairy' }]
        },
        {
            name: 'Creamy Chicken & Mushroom Pasta',
            label: 'recipe',
            properties: {
                description: 'A rich and comforting pasta dish with tender chicken and earthy mushrooms.',
                prepTime: '15 minutes',
                cookTime: '25 minutes',
                servings: 4,
                difficulty: 'Medium',
                image_url: 'https://www.madewithnestle.ca/sites/default/files/styles/recipe_detail_desktop/public/2023-09/CreamyChicken_1.jpg',
                url: 'https://www.madewithnestle.ca/recipes/creamy-chicken-mushroom-pasta'
            },
            ingredients: [{ name: 'Chicken Breast' }, { name: 'Mushrooms' }, { name: 'Pasta' }, { name: 'Garlic' }],
            products: [{ name: 'Carnation Evaporated Milk' }, { name: 'Stouffer\'s Chicken Bistro' }],
            categories: [{ name: 'Main Course' }, { name: 'Quick & Easy' }],
            cuisines: [{ name: 'Italian' }],
            dietaryTags: [],
            allergens: [{ name: 'Dairy' }, { name: 'Gluten' }]
        },
        {
            name: 'Banana Bread',
            label: 'recipe',
            properties: {
                description: 'Classic banana bread, moist and delicious, perfect for any time of day.',
                prepTime: '15 minutes',
                cookTime: '60 minutes',
                servings: 10,
                difficulty: 'Easy',
                image_url: 'https://www.madewithnestle.ca/sites/default/files/styles/recipe_detail_desktop/public/2023-09/BananaBread_1.jpg',
                url: 'https://www.madewithnestle.ca/recipes/banana-bread'
            },
            ingredients: [{ name: 'Bananas' }, { name: 'Flour' }, { name: 'Sugar' }, { name: 'Eggs' }],
            products: [{ name: 'Nestle Good Host Iced Tea Mix' }], // Example product
            categories: [{ name: 'Baked Goods' }, { name: 'Snacks' }],
            dietaryTags: [{ name: 'Vegetarian' }],
            allergens: [{ name: 'Gluten' }, { name: 'Eggs' }]
        },
        {
            name: 'Beef Stroganoff',
            label: 'recipe',
            properties: {
                description: 'A hearty and flavourful beef dish with creamy sauce, traditionally served over noodles.',
                prepTime: '20 minutes',
                cookTime: '40 minutes',
                servings: 6,
                difficulty: 'Medium',
                image_url: 'https://www.madewithnestle.ca/sites/default/files/styles/recipe_detail_desktop/public/2023-09/BeefStroganoff_1.jpg',
                url: 'https://www.madewithnestle.ca/recipes/beef-stroganoff'
            },
            ingredients: [{ name: 'Beef Sirloin' }, { name: 'Onion' }, { name: 'Sour Cream' }, { name: 'Egg Noodles' }],
            products: [{ name: 'Maggi Seasoning' }],
            categories: [{ name: 'Main Course' }],
            cuisines: [{ name: 'Russian' }],
            dietaryTags: [],
            allergens: [{ name: 'Dairy' }, { name: 'Gluten' }]
        }
    ];

    const productData = [
        { name: 'Carnation Evaporated Milk', label: 'nestleProduct', properties: { category: 'Dairy & Milks', brand: 'Carnation' } },
        { name: 'Stouffer\'s Chicken Bistro', label: 'nestleProduct', properties: { category: 'Frozen Meals', brand: 'Stouffer\'s' } },
        { name: 'Nestle Good Host Iced Tea Mix', label: 'nestleProduct', properties: { category: 'Beverages', brand: 'Good Host' } },
        { name: 'Maggi Seasoning', label: 'nestleProduct', properties: { category: 'Condiments', brand: 'Maggi' } },
        { name: 'Nestle Coffee-Mate', label: 'nestleProduct', properties: { category: 'Coffee Creamers', brand: 'Coffee-Mate' } } // Added example for non-recipe related
    ];

    const ingredientData = [
        { name: 'Butter', label: 'ingredient', properties: { type: 'Dairy', is_allergen: true } },
        { name: 'Marshmallows', label: 'ingredient', properties: { type: 'Confectionery', is_allergen: false } },
        { name: 'Rice Krispies', label: 'ingredient', properties: { type: 'Cereal', is_allergen: false } },
        { name: 'Chicken Breast', label: 'ingredient', properties: { type: 'Meat', is_allergen: false } },
        { name: 'Mushrooms', label: 'ingredient', properties: { type: 'Vegetable', is_allergen: false } },
        { name: 'Pasta', label: 'ingredient', properties: { type: 'Grain', is_allergen: true } },
        { name: 'Garlic', label: 'ingredient', properties: { type: 'Vegetable', is_allergen: false } },
        { name: 'Bananas', label: 'ingredient', properties: { type: 'Fruit', is_allergen: false } },
        { name: 'Flour', label: 'ingredient', properties: { type: 'Grain', is_allergen: true } },
        { name: 'Sugar', label: 'ingredient', properties: { type: 'Sweetener', is_allergen: false } },
        { name: 'Eggs', label: 'ingredient', properties: { type: 'Dairy', is_allergen: true } }, // Eggs are usually their own allergen category
        { name: 'Beef Sirloin', label: 'ingredient', properties: { type: 'Meat', is_allergen: false } },
        { name: 'Onion', label: 'ingredient', properties: { type: 'Vegetable', is_allergen: false } },
        { name: 'Sour Cream', label: 'ingredient', properties: { type: 'Dairy', is_allergen: true } },
        { name: 'Egg Noodles', label: 'ingredient', properties: { type: 'Grain', is_allergen: true } }
    ];

    const categoryData = [
        { name: 'Desserts', label: 'recipeCategory' },
        { name: 'Quick & Easy', label: 'recipeCategory' },
        { name: 'Main Course', label: 'recipeCategory' },
        { name: 'Baked Goods', label: 'recipeCategory' },
        { name: 'Snacks', label: 'recipeCategory' }
    ];

    const cuisineData = [
        { name: 'Italian', label: 'cuisineType' },
        { name: 'Russian', label: 'cuisineType' }
    ];

    const dietaryTagData = [
        { name: 'Vegetarian', label: 'dietaryTag' },
        { name: 'Vegan', label: 'dietaryTag' },
        { name: 'Gluten-Free', label: 'dietaryTag' }
    ];

    const allergenData = [
        { name: 'Dairy', label: 'allergen' },
        { name: 'Gluten', label: 'allergen' },
        { name: 'Eggs', label: 'allergen' },
        { name: 'Nuts', label: 'allergen' }
    ];

    // --- Add Vertices ---
    console.log('Adding vertices...');
    const vertices = {}; // Store created vertices by their name for edge creation

    // Helper to add vertices and store them
    async function addAndStoreVertex(data, label) {
        let vertex;
        try {
            vertex = await gremlinUtils.addVertex(label, data.properties ? { name: data.name, ...data.properties } : { name: data.name });
            vertices[data.name] = vertex;
            console.log(`Added ${label}: ${data.name}`);
            return vertex;
        } catch (error) {
            console.error(`ERROR: Failed to add ${label} ${data.name}:`, error.message);
            return null; // Return null on failure
        }
    }

    for (const data of [...recipeData, ...productData, ...ingredientData, ...categoryData, ...cuisineData, ...dietaryTagData, ...allergenData]) {
        await addAndStoreVertex(data, data.label);
    }
    console.log('All vertices added. Now adding edges...');


    // --- Add Edges ---
    for (const recipe of recipeData) {
        const recipeVertex = vertices[recipe.name];
        if (!recipeVertex) {
            console.warn(`WARNING: Recipe vertex for ${recipe.name} not found. Skipping edge creation.`);
            continue;
        }

        // hasIngredient edges
        for (const ingredient of recipe.ingredients) {
            try {
                const ingredientVertex = vertices[ingredient.name];
                if (ingredientVertex) {
                    await gremlinUtils.addEdge(recipeVertex.id, ingredientVertex.id, 'hasIngredient');
                    console.log(`Added edge: ${recipe.name} --hasIngredient--> ${ingredient.name}`);
                } else {
                    console.warn(`WARNING: Ingredient vertex for ${ingredient.name} not found. Edge not created for ${recipe.name}.`);
                }
            } catch (edgeError) {
                console.error(`ERROR: Failed to add hasIngredient edge from ${recipe.name} to ${ingredient.name}:`, edgeError.message);
            }
        }

        // usesProduct edges
        for (const product of recipe.products) {
            try {
                const productVertex = vertices[product.name];
                if (productVertex) {
                    await gremlinUtils.addEdge(recipeVertex.id, productVertex.id, 'usesProduct');
                    console.log(`Added edge: ${recipe.name} --usesProduct--> ${product.name}`);
                } else {
                    console.warn(`WARNING: Product vertex for ${product.name} not found. Edge not created for ${recipe.name}.`);
                }
            } catch (edgeError) {
                console.error(`ERROR: Failed to add usesProduct edge from ${recipe.name} to ${product.name}:`, edgeError.message);
            }
        }

        // belongsToCategory edges
        for (const category of recipe.categories) {
            try {
                const categoryVertex = vertices[category.name];
                if (categoryVertex) {
                    await gremlinUtils.addEdge(recipeVertex.id, categoryVertex.id, 'belongsToCategory');
                    console.log(`Added edge: ${recipe.name} --belongsToCategory--> ${category.name}`);
                } else {
                    console.warn(`WARNING: Category vertex for ${category.name} not found. Edge not created for ${recipe.name}.`);
                }
            } catch (edgeError) {
                console.error(`ERROR: Failed to add belongsToCategory edge from ${recipe.name} to ${category.name}:`, edgeError.message);
            }
        }

        // isCuisine edges
        if (recipe.cuisines) { // Only add if cuisines array exists for recipe
            for (const cuisine of recipe.cuisines) {
                try {
                    const cuisineVertex = vertices[cuisine.name];
                    if (cuisineVertex) {
                        await gremlinUtils.addEdge(recipeVertex.id, cuisineVertex.id, 'isCuisine');
                        console.log(`Added edge: ${recipe.name} --isCuisine--> ${cuisine.name}`);
                    } else {
                        console.warn(`WARNING: Cuisine vertex for ${cuisine.name} not found. Edge not created for ${recipe.name}.`);
                    }
                } catch (edgeError) {
                    console.error(`ERROR: Failed to add isCuisine edge from ${recipe.name} to ${cuisine.name}:`, edgeError.message);
                }
            }
        }

        // hasDietaryTag edges
        if (recipe.dietaryTags) { // Only add if dietaryTags array exists for recipe
            for (const tag of recipe.dietaryTags) {
                try {
                    const tagVertex = vertices[tag.name];
                    if (tagVertex) {
                        await gremlinUtils.addEdge(recipeVertex.id, tagVertex.id, 'hasDietaryTag');
                        console.log(`Added edge: ${recipe.name} --hasDietaryTag--> ${tag.name}`);
                    } else {
                        console.warn(`WARNING: Dietary Tag vertex for ${tag.name} not found. Edge not created for ${recipe.name}.`);
                    }
                } catch (edgeError) {
                    console.error(`ERROR: Failed to add hasDietaryTag edge from ${recipe.name} to ${tag.name}:`, edgeError.message);
                }
            }
        }

        // containsAllergen edges
        if (recipe.allergens) { // Only add if allergens array exists for recipe
            for (const allergen of recipe.allergens) {
                try {
                    const allergenVertex = vertices[allergen.name];
                    if (allergenVertex) {
                        await gremlinUtils.addEdge(recipeVertex.id, allergenVertex.id, 'containsAllergen');
                        console.log(`Added edge: ${recipe.name} --containsAllergen--> ${allergen.name}`);
                    } else {
                        console.warn(`WARNING: Allergen vertex for ${allergen.name} not found. Edge not created for ${recipe.name}.`);
                    }
                } catch (edgeError) {
                    console.error(`ERROR: Failed to add containsAllergen edge from ${recipe.name} to ${allergen.name}:`, edgeError.message);
                }
            }
        }
    }

    console.log('Graph population complete!');
    await gremlinClient.close();
    console.log('Graph client connection CLOSED.');
}

populateGraph();
// backend/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { AzureOpenAI } = require('openai');
const gremlin = require('gremlin');
const driver = gremlin.driver;
const auth = gremlin.driver.auth;

// Import your Gremlin utility functions
const gremlinUtils = require('./gremlinUtils'); // Path relative to index.js
// Import your new Azure Search utility functions
const azureSearch = require('./search'); // Path relative to index.js

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Azure OpenAI Setup
const azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureOpenaiKey = process.env.AZURE_OPENAI_API_KEY;
const azureOpenaiDeploymentName = process.env.AZURE_OPENAI_DEPLOYMENT;
const azureOpenaiApiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01";

if (!azureOpenaiEndpoint || !azureOpenaiKey || !azureOpenaiDeploymentName) {
  console.error("Missing essential Azure OpenAI environment variables. Please check your .env file.");
  process.exit(1);
}

const openaiClientOptions = {
  azureEndpoint: azureOpenaiEndpoint,
  apiKey: azureOpenaiKey,
  deployment: azureOpenaiDeploymentName,
  apiVersion: azureOpenaiApiVersion,
};

const openaiClient = new AzureOpenAI(openaiClientOptions);

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

// --- NEW: Azure Search Setup ---
const azureSearchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const azureSearchKey = process.env.AZURE_SEARCH_KEY; // Use admin key for simplicity in dev, or query key for production
const azureSearchIndexName = process.env.AZURE_SEARCH_INDEX;

if (!azureSearchEndpoint || !azureSearchKey || !azureSearchIndexName) {
  console.warn("Azure Search: Missing environment variables. Azure Search context will not be available.");
  // Do not exit, allow the app to run with only Gremlin if search is not configured
} else {
  azureSearch.initializeAzureSearchClient(azureSearchEndpoint, azureSearchKey, azureSearchIndexName);
}


// Connect to Gremlin server
gremlinClient.open()
  .then(() => console.log('Successfully connected to Cosmos DB Gremlin API'))
  .catch((err) => {
    console.error('Error connecting to Cosmos DB Gremlin API:', err.message);
    console.error('Ensure COSMOS_DB_DATABASE, COSMOS_DB_GRAPH, COSMOSDB_KEY, and COSMOSDB_ENDPOINT are correct in your .env file.');
  });


// --- Azure OpenAI LLM for Entity Extraction (Helper Function for RAG) ---
async function extractEntitiesWithLLM(query) {
    const prompt = `Extract any recipe names, product names, ingredient names, category names, cuisine types, dietary tags, or allergen names from the following query: "${query}". Respond as a JSON object with keys 'recipe', 'product', 'ingredient', 'category', 'cuisine', 'dietary_tag', 'allergen'. Example: {"recipe":["Classic Crispy Squares"], "product":[], "ingredient":[], "category":[], "cuisine":[], "dietary_tag":[], "allergen":[]}. If nothing found for a key, use an empty array.`;
    try {
        const result = await openaiClient.chat.completions.create({
            model: azureOpenaiDeploymentName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, // Low temperature for factual extraction
            max_tokens: 400,
            response_format: { type: "json_object" }, // Explicitly request JSON
        });
        const jsonString = result.choices[0].message.content;
        console.log("Raw LLM extraction response:", jsonString); // Log raw response for debugging
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error extracting entities with LLM:", error.message);
        return { recipe: [], product: [], ingredient: [], category: [], cuisine: [], dietary_tag: [], allergen: [] }; // Fallback
    }
}

// --- Cosmos DB Gremlin API Endpoints for Data Management (Optional, for dynamic adds/edits) ---

// Endpoint to add a Product vertex
app.post('/api/vertices/product', async (req, res) => {
  const { name, category, brand, sku, image_url, url, pk } = req.body; // Expect pk from client if necessary

  if (!name || !category || !pk) { // pk is crucial for partitioned graphs
    return res.status(400).json({ error: 'Name, category, and partition key (pk) are required for a product.' });
  }
  try {
    const newProduct = await gremlinUtils.addVertex('nestleProduct', { name, category, brand, sku, image_url, url, pk });
    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product to graph.' });
  }
});

// Endpoint to add a Recipe vertex
app.post('/api/vertices/recipe', async (req, res) => {
  const { name, description, prepTime, cookTime, servings, difficulty, image_url, url, pk } = req.body;

  if (!name || !pk) {
    return res.status(400).json({ error: 'Name and partition key (pk) are required for a recipe.' });
  }
  try {
    const newRecipe = await gremlinUtils.addVertex('recipe', { name, description, prepTime, cookTime, servings, difficulty, image_url, url, pk });
    res.status(201).json({ message: 'Recipe added successfully', recipe: newRecipe });
  } catch (error) {
    console.error('Error adding recipe:', error);
    res.status(500).json({ error: 'Failed to add recipe to graph.' });
  }
});

// Endpoint to add a 'usesProduct' edge
app.post('/api/edges/usesProduct', async (req, res) => {
  const { recipeId, productId, quantity, unit } = req.body;

  if (!recipeId || !productId) {
    return res.status(400).json({ error: 'Both recipeId and productId are required.' });
  }
  try {
    const newEdge = await gremlinUtils.addEdge(recipeId, productId, 'usesProduct', { quantity, unit });
    res.status(201).json({ message: 'Uses product relationship added successfully', edge: newEdge });
  } catch (error) {
    console.error('Error adding usesProduct edge:', error);
    res.status(500).json({ error: 'Failed to add usesProduct relationship to graph.' });
  }
});

// Helper function to safely get the name property from a vertex object
function getVertexName(vertex) {
    return vertex && vertex.properties && vertex.properties.name &&
           Array.isArray(vertex.properties.name) && vertex.properties.name.length > 0 &&
           vertex.properties.name[0].value !== undefined
           ? String(vertex.properties.name[0].value) // Ensure it's a string
           : null;
}

// Helper function to safely get any specific property from a vertex object
function getVertexProperty(vertex, propertyKey) {
    return vertex && vertex.properties && vertex.properties[propertyKey] &&
           Array.isArray(vertex.properties[propertyKey]) && vertex.properties[propertyKey].length > 0 &&
           vertex.properties[propertyKey][0].value !== undefined
           ? String(vertex.properties[propertyKey][0].value) // Ensure it's a string
           : null;
}

app.get('/', (req, res) => {
  res.send('Nestlé AI Chatbot Backend is running.');
});

// --- Enhanced Sample endpoint for chat with Graph RAG and Azure Search RAG ---
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  console.log("User Message:", message);

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let graphContext = '';
  let azureSearchContext = '';
  let combinedContext = ''; // MOVED DECLARATION HERE to prevent 'not defined' error
  const searchTerms = []; // Collect search terms for better logging

  try {
    // Step 1: Extract entities from the user's query using LLM
    const extractedEntities = await extractEntitiesWithLLM(message);
    console.log("Extracted Entities (from LLM):", extractedEntities);

    // Step 2: Build graph context based on extracted entities and inferred intent
    // Prioritize specific searches based on extracted entities
    if (extractedEntities.recipe && extractedEntities.recipe.length > 0) {
      for (const recipeName of extractedEntities.recipe) {
        searchTerms.push(`Recipe: ${recipeName}`);
        const recipes = await gremlinUtils.findVertices('recipe', 'name', recipeName);
        console.log(`Querying for recipe '${recipeName}'. Found:`, recipes.length, 'recipes');

        if (recipes.length > 0) {
          const recipe = recipes[0];
          const currentRecipeName = getVertexName(recipe);
          if (currentRecipeName) {
            graphContext += `\nRecipe: ${currentRecipeName}. `;
            const description = getVertexProperty(recipe, 'description');
            if (description) graphContext += `Description: ${description}. `;
            const prepTime = getVertexProperty(recipe, 'prepTime');
            if (prepTime) graphContext += `Prep Time: ${prepTime}. `;
            const cookTime = getVertexProperty(recipe, 'cookTime');
            if (cookTime) graphContext += `Cook Time: ${cookTime}. `;
            const servings = getVertexProperty(recipe, 'servings');
            if (servings) graphContext += `Servings: ${servings}. `;
            const difficulty = getVertexProperty(recipe, 'difficulty');
            if (difficulty) graphContext += `Difficulty: ${difficulty}.`;
            graphContext += `\n`;
          } else {
            console.log(`Could not get name for recipe vertex with id: ${recipe.id}`);
          }

          const ingredients = await gremlinUtils.getConnectedVertices(recipe['id'], 'hasIngredient', 'out');
          if (ingredients.length > 0) {
            const ingredientNames = ingredients.map(getVertexName).filter(Boolean);
            if (ingredientNames.length > 0) {
                graphContext += `Required ingredients: ${ingredientNames.join(', ')}.\n`;
            }
          }

          const usedProducts = await gremlinUtils.getConnectedVertices(recipe['id'], 'usesProduct', 'out');
          if (usedProducts.length > 0) {
            const productNames = usedProducts.map(getVertexName).filter(Boolean);
            if (productNames.length > 0) {
                graphContext += `Nestle Products used: ${productNames.join(', ')}.\n`;
            }
          }

          const categories = await gremlinUtils.getConnectedVertices(recipe['id'], 'belongsToCategory', 'out');
          if (categories.length > 0) {
              const categoryNames = categories.map(getVertexName).filter(Boolean);
              if (categoryNames.length > 0) {
                  graphContext += `Categories: ${categoryNames.join(', ')}.\n`;
              }
          }

          const cuisines = await gremlinUtils.getConnectedVertices(recipe['id'], 'isCuisine', 'out');
          if (cuisines.length > 0) {
              const cuisineNames = cuisines.map(getVertexName).filter(Boolean);
              if (cuisineNames.length > 0) {
                  graphContext += `Cuisine: ${cuisineNames.join(', ')}.\n`;
              }
          }

          const dietaryTags = await gremlinUtils.getConnectedVertices(recipe['id'], 'hasDietaryTag', 'out');
          if (dietaryTags.length > 0) {
              const tagNames = dietaryTags.map(getVertexName).filter(Boolean);
              if (tagNames.length > 0) {
                  graphContext += `Dietary Tags: ${tagNames.join(', ')}.\n`;
              }
          }

          const allergens = await gremlinUtils.getConnectedVertices(recipe['id'], 'containsAllergen', 'out');
          if (allergens.length > 0) {
              const allergenNames = allergens.map(getVertexName).filter(Boolean);
              if (allergenNames.length > 0) {
                  graphContext += `Contains Allergens: ${allergenNames.join(', ')}.\n`;
              }
          }
        }
      }
    }

    if (extractedEntities.product && extractedEntities.product.length > 0) {
      for (const productName of extractedEntities.product) {
        searchTerms.push(`Product: ${productName}`);
        const products = await gremlinUtils.findVertices('nestleProduct', 'name', productName);
        if (products.length > 0) {
          const product = products[0];
          const currentProductName = getVertexName(product);
          if (currentProductName) {
            graphContext += `\nNestle Product: ${currentProductName}. `;
            const category = getVertexProperty(product, 'category');
            if (category) graphContext += `Category: ${category}. `;
            const brand = getVertexProperty(product, 'brand');
            if (brand) graphContext += `Brand: ${brand}.`;
            graphContext += `\n`;
          } else {
            console.log(`Could not get name for product vertex with id: ${product.id}`);
          }
          const recipesUsingProduct = await gremlinUtils.getConnectedVertices(product['id'], 'usesProduct', 'in');
          if (recipesUsingProduct.length > 0) {
            const recipeNames = recipesUsingProduct.map(getVertexName).filter(Boolean);
            if (recipeNames.length > 0) {
                graphContext += `Used in recipes: ${recipeNames.join(', ')}.\n`;
            }
          }
        }
      }
    }

    if (extractedEntities.ingredient && extractedEntities.ingredient.length > 0) {
        for (const ingredientName of extractedEntities.ingredient) {
            searchTerms.push(`Ingredient: ${ingredientName}`);
            const ingredients = await gremlinUtils.findVertices('ingredient', 'name', ingredientName);
            if (ingredients.length > 0) {
                const ingredient = ingredients[0];
                const currentIngredientName = getVertexName(ingredient);
                if (currentIngredientName) {
                    graphContext += `\nIngredient: ${currentIngredientName}. `;
                    const type = getVertexProperty(ingredient, 'type');
                    if (type) graphContext += `Type: ${type}. `;
                    const isAllergen = getVertexProperty(ingredient, 'is_allergen');
                    if (isAllergen) graphContext += `Is Allergen: ${isAllergen === 'true' ? 'Yes' : 'No'}.`;
                    graphContext += `\n`;
                } else {
                    console.log(`Could not get name for ingredient vertex with id: ${ingredient.id}`);
                }
                const recipesUsingIngredient = await gremlinUtils.getConnectedVertices(ingredient['id'], 'hasIngredient', 'in');
                if (recipesUsingIngredient.length > 0) {
                    const recipeNames = recipesUsingIngredient.map(getVertexName).filter(Boolean);
                    if (recipeNames.length > 0) {
                        graphContext += `Used in recipes: ${recipeNames.join(', ')}.\n`;
                    }
                }
            }
        }
    }

    if (extractedEntities.category && extractedEntities.category.length > 0) {
        for (const categoryName of extractedEntities.category) {
            searchTerms.push(`Category: ${categoryName}`);
            const categories = await gremlinUtils.findVertices('recipeCategory', 'name', categoryName);
            if (categories.length > 0) {
                const category = categories[0];
                const recipesInCategory = await gremlinUtils.getConnectedVertices(category['id'], 'belongsToCategory', 'in');
                if (recipesInCategory.length > 0) {
                    const recipeNames = recipesInCategory.map(getVertexName).filter(Boolean);
                    if (recipeNames.length > 0) {
                        graphContext += `\nRecipes in '${getVertexName(category)}' category: ${recipeNames.join(', ')}.\n`;
                    }
                }
            }
        }
    }

    if (extractedEntities.dietary_tag && extractedEntities.dietary_tag.length > 0) {
        for (const tagName of extractedEntities.dietary_tag) {
            searchTerms.push(`Dietary Tag: ${tagName}`);
            const tags = await gremlinUtils.findVertices('dietaryTag', 'name', tagName);
            if (tags.length > 0) {
                const tag = tags[0];
                const recipesWithTag = await gremlinUtils.getConnectedVertices(tag['id'], 'hasDietaryTag', 'in');
                if (recipesWithTag.length > 0) {
                    const recipeNames = recipesWithTag.map(getVertexName).filter(Boolean);
                    if (recipeNames.length > 0) {
                        graphContext += `\nRecipes with '${getVertexName(tag)}' dietary tag: ${recipeNames.join(', ')}.\n`;
                    }
                }
            }
        }
    }

    // Fallback if no specific entities found but user asks general questions like "What are your recipes?"
    if (graphContext === '' && message.toLowerCase().includes('recipes')) {
        searchTerms.push("General recipes query");
        const allRecipes = await gremlinUtils.findVertices('recipe'); // Get a few recent/popular recipes
        if (allRecipes.length > 0) {
            graphContext += '\nHere are some recipes: ' + allRecipes.slice(0, 5).map(getVertexName).filter(Boolean).join(', ') + '... For more, please be specific.\n';
        }
    }

    // --- NEW: Step 3: Fetch context from Azure Search ---
    if (azureSearchEndpoint && azureSearchKey && azureSearchIndexName) {
        try {
            console.log("Attempting Azure Search query...");
            const searchResults = await azureSearch.searchDocuments(message);
            if (searchResults.length > 0) {
                azureSearchContext += "\n--- START WEBSITE CONTENT ---\n";
                searchResults.forEach((result, index) => {
                    azureSearchContext += `Document ${index + 1}: Title: ${result.title}\n`;
                    azureSearchContext += `Content: ${result.content.substring(0, 500)}...\n`; // Ensure 'content' exists
                    azureSearchContext += `URL: ${result.url}\n\n`;
                });
                azureSearchContext += "--- END WEBSITE CONTENT ---\n";
            } else {
                console.log("Azure Search returned no results.");
            }
        } catch (searchError) {
            console.error('Error during Azure Search data retrieval for RAG:', searchError.message);
            // Continue without Azure Search context if an error occurs
        }
    } else {
        console.log("Azure Search not configured, skipping search context retrieval.");
    }


    // Combine contexts and limit total length
    if (graphContext) {
        combinedContext += "--- START KNOWLEDGE GRAPH CONTEXT ---\n" + graphContext + "--- END KNOWLEDGE GRAPH CONTEXT ---\n\n";
    }
    if (azureSearchContext) {
        combinedContext += azureSearchContext;
    }

    const maxContextLength = 2500;
    if (combinedContext.length > maxContextLength) {
      combinedContext = combinedContext.substring(0, maxContextLength) + '... (context truncated)\n';
    }

    // Fix: Check if combinedContext is empty after all processing
    if (combinedContext.trim() === '' || combinedContext.trim() === '--- START KNOWLEDGE GRAPH CONTEXT ---\n--- END KNOWLEDGE GRAPH CONTEXT ---') {
        console.log("Combined Context: [EMPTY]");
        combinedContext = ''; // Ensure it's truly empty if no relevant content was found
    } else {
        console.log("Combined Context built:", combinedContext);
    }


  } catch (ragError) {
    console.error('Error during RAG context building (Gremlin or Search):', ragError.message);
    // If a major error occurs, combinedContext might still be empty from its declaration, which is fine.
    // If you wanted to provide a generic fallback message here, you could.
  }

  try {
    const messages = [
      { role: 'system',
        content: `You are a helpful AI assistant for MadeWithNestle.ca. Use the provided context to answer user queries concisely and accurately about recipes, products, ingredients, categories, and dietary information. Include relevant reference links from the site where appropriate. Try to mention Nestlé where ever possible. Respond in markdown format, but do not include any images or image links. If the answer is not in the context, state that you cannot answer based on the provided information. Do not mention "knowledge graph context" or "website content" or "retrieved information".` },
    ];

    if (combinedContext) { // This check ensures we only add context if it's not empty
      messages.push({ role: 'system', content: `Retrieved relevant information:\n${combinedContext}` });
    }

    messages.push({ role: 'user', content: message });

    console.log("Final messages sent to OpenAI:", JSON.stringify(messages, null, 2));

    const completion = await openaiClient.chat.completions.create({
      model: azureOpenaiDeploymentName,
      messages: messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Error in /chat:', error.message);
    if (error.status === 400) {
      res.status(400).json({ error: `Azure OpenAI API Error: ${error.message}. Please verify your AZURE_OPENAI_DEPLOYMENT and AZURE_OPENAI_API_VERSION.` });
    } else {
      res.status(500).json({ error: 'Something went wrong with the AI service. Check server logs for details.' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing Gremlin client connection...');
  gremlinClient.close()
    .then(() => console.log('Gremlin client connection closed.'))
    .catch((err) => console.error('Error closing Gremlin client connection:', err))
    .finally(() => {
      console.log('Server shutting down.');
      process.exit(0);
    });
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { AzureOpenAI } = require('openai');
const gremlin = require('gremlin');
const driver = gremlin.driver;
const auth = gremlin.driver.auth;

const gremlinUtils = require('./gremlinUtils');
const azureSearch = require('./search');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Azure OpenAI Setup
const azureOpenaiClient = new AzureOpenAI({
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
});

// Gremlin Setup
const gremlinClient = new driver.Client(`${process.env.COSMOSDB_ENDPOINT}`, {
  authenticator: new auth.PlainTextSaslAuthenticator(
    `/dbs/${process.env.COSMOSDB_DATABASE}/colls/${process.env.COSMOSDB_GRAPH}`,
    process.env.COSMOSDB_KEY
  ),
  traversalsource: 'g',
  rejectUnauthorized: false,
  mimeType: 'application/vnd.gremlin-v2.0+json',
});
gremlinUtils.initializeGremlinClient(gremlinClient);

// Azure Cognitive Search Setup
if (process.env.AZURE_SEARCH_ENDPOINT && process.env.AZURE_SEARCH_KEY && process.env.AZURE_SEARCH_INDEX) {
  azureSearch.initializeAzureSearchClient(
    process.env.AZURE_SEARCH_ENDPOINT,
    process.env.AZURE_SEARCH_KEY,
    process.env.AZURE_SEARCH_INDEX
  );
}

// Connect to Gremlin
gremlinClient.open()
  .then(() => console.log('Connected to Cosmos DB Gremlin API'))
  .catch(err => console.error('Gremlin connection error:', err));

// --- Helpers ---
function getVertexName(vertex) {
  return vertex?.properties?.name?.[0]?.value || null;
}
function getVertexProperty(vertex, key) {
  return vertex?.properties?.[key]?.[0]?.value || null;
}
async function extractEntitiesWithLLM(query) {
  const prompt = `Extract any recipe names, product names, ingredient names, category names, cuisine types, dietary tags, or allergen names from the following query: "${query}". Respond as a JSON object with keys 'recipe', 'product', 'ingredient', 'category', 'cuisine', 'dietary_tag', 'allergen'.`;
  try {
    const result = await azureOpenaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });
    return JSON.parse(result.choices[0].message.content);
  } catch (err) {
    console.error("LLM extraction error:", err.message);
    return { recipe: [], product: [], ingredient: [], category: [], cuisine: [], dietary_tag: [], allergen: [] };
  }
}

// --- Endpoints ---

app.get('/', (req, res) => res.send('Nestlé AI Chatbot Backend is running.'));

app.post('/chat', async (req, res) => {
   const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required and cannot be empty' });
  }

  // Assuming messages array has objects like: { role: 'user', content: 'some text' }
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  if (!lastUserMessage || !lastUserMessage.content) {
    return res.status(400).json({ error: 'No user message found in messages' });
  }

  const message = lastUserMessage.content;

  let graphContext = '';
  let azureSearchContext = '';
  let combinedContext = '';
  const searchTerms = [];

  try {
    const entities = await extractEntitiesWithLLM(message);
    console.log("Extracted Entities:", entities);

    // RECIPE CONTEXT
    if (entities.recipe?.length) {
      for (const recipeName of entities.recipe) {
        searchTerms.push(`Recipe: ${recipeName}`);
        const recipes = await gremlinUtils.findVertices('recipe', 'name', recipeName);
        if (!recipes.length) continue;
        const r = recipes[0];
        graphContext += `\nRecipe: ${getVertexName(r)}. `;
        ['description', 'prepTime', 'cookTime', 'servings', 'difficulty'].forEach(prop => {
          const val = getVertexProperty(r, prop);
          if (val) graphContext += `${prop}: ${val}. `;
        });

        const relatedTypes = {
          hasIngredient: 'Required ingredients',
          usesProduct: 'Nestle Products used',
          belongsToCategory: 'Categories',
          isCuisine: 'Cuisine',
          hasDietaryTag: 'Dietary Tags',
          containsAllergen: 'Contains Allergens',
        };

        for (const [edge, label] of Object.entries(relatedTypes)) {
          const items = await gremlinUtils.getConnectedVertices(r.id, edge, 'out');
          const names = items.map(getVertexName).filter(Boolean);
          if (names.length) graphContext += `${label}: ${names.join(', ')}. `;
        }
      }
    }

    // PRODUCT CONTEXT
    if (entities.product?.length) {
      for (const productName of entities.product) {
        searchTerms.push(`Product: ${productName}`);
        const products = await gremlinUtils.findVertices('nestleProduct', 'name', productName);
        if (!products.length) continue;
        const p = products[0];
        graphContext += `\nNestlé Product: ${getVertexName(p)}. `;
        ['category', 'brand'].forEach(prop => {
          const val = getVertexProperty(p, prop);
          if (val) graphContext += `${prop}: ${val}. `;
        });

        const usedIn = await gremlinUtils.getConnectedVertices(p.id, 'usesProduct', 'in');
        const recipes = usedIn.map(getVertexName).filter(Boolean);
        if (recipes.length) graphContext += `Used in recipes: ${recipes.join(', ')}. `;
      }
    }

    // INGREDIENT CONTEXT
    if (entities.ingredient?.length) {
      for (const ingredientName of entities.ingredient) {
        searchTerms.push(`Ingredient: ${ingredientName}`);
        const ingredients = await gremlinUtils.findVertices('ingredient', 'name', ingredientName);
        if (!ingredients.length) continue;
        const ing = ingredients[0];
        graphContext += `\nIngredient: ${getVertexName(ing)}. `;
        ['type', 'is_allergen'].forEach(prop => {
          const val = getVertexProperty(ing, prop);
          if (val) graphContext += `${prop}: ${val}. `;
        });

        const usedIn = await gremlinUtils.getConnectedVertices(ing.id, 'hasIngredient', 'in');
        const recipes = usedIn.map(getVertexName).filter(Boolean);
        if (recipes.length) graphContext += `Used in recipes: ${recipes.join(', ')}. `;
      }
    }

    // FALLBACK TO AZURE COGNITIVE SEARCH
    if (!graphContext.trim() && azureSearch.searchDocuments) {
      const searchResults = await azureSearch.searchDocuments(message);
      if (searchResults.length) {
        azureSearchContext = searchResults.map(doc => doc.content).join('\n');
      }
    }

    combinedContext = graphContext + '\n' + azureSearchContext;

    // FINAL LLM RESPONSE
    const finalPrompt = `You are a helpful AI assistant for MadeWithNestle.ca. Use the provided context to answer user queries concisely and accurately about recipes, products, ingredients, categories, and dietary information. Include relevant and only correct reference links from the site where appropriate. Try to mention Nestlé where ever possible. If the answer is not in the context, state that you cannot answer in a polite way. Do not mention "knowledge graph context" or "website content" or "retrieved information". Use the following context to answer the user query:\n\n${combinedContext}\n\nUser: ${message}`;
    const completion = await azureOpenaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    res.json({ response: completion.choices[0].message.content });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));

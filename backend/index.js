require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import AzureOpenAI from 'openai' for the new client structure
const { AzureOpenAI } = require('openai');
// AzureKeyCredential is not directly used for API Key authentication with AzureOpenAI in this context
// const { AzureKeyCredential } = require('@azure/core-auth'); // Can remove this line if not used elsewhere

// Corrected Gremlin imports
const gremlin = require('gremlin'); // Import the entire gremlin library
const driver = gremlin.driver;      // Access driver from the imported gremlin object
const auth = gremlin.driver.auth;    // Access auth from driver

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Azure OpenAI Setup
// Get values from environment variables
const azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureOpenaiKey = process.env.AZURE_OPENAI_API_KEY;
const azureOpenaiDeploymentName = process.env.AZURE_OPENAI_DEPLOYMENT; // This is the deployment name
const azureOpenaiApiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01"; // Ensure this is set in .env

// Ensure all essential environment variables are loaded
if (!azureOpenaiEndpoint || !azureOpenaiKey || !azureOpenaiDeploymentName) {
  console.error("Missing essential Azure OpenAI environment variables. Please check your .env file.");
  process.exit(1); // Exit if critical variables are missing
}

// Instantiate AzureOpenAI client with API key authentication using the options object
const openaiClientOptions = {
  azureEndpoint: azureOpenaiEndpoint,
  apiKey: azureOpenaiKey,
  // The 'deployment' parameter in the options object is typically used for client-level configuration
  // For chat completions, 'model' parameter in the create call will take the deployment name.
  // The documentation samples show 'deployment' in options, but then use 'model' in create call.
  // We'll stick to 'model' in create and remove 'deployment' from options if it causes confusion,
  // or keep it if it's implicitly handled by the client. The 'model' in create is definitive.
  // However, the sample explicitly provides 'deployment' in options, so let's include it for consistency.
  deployment: azureOpenaiDeploymentName, // This is explicitly shown in your sample's options
  apiVersion: azureOpenaiApiVersion,
};

const openaiClient = new AzureOpenAI(openaiClientOptions);

// Cosmos DB (Gremlin) Setup
const gremlinUsername = `/dbs/${process.env.COSMOSDB_DATABASE}/colls/${process.env.COSMOSDB_GRAPH}`;
const gremlinPassword = process.env.COSMOSDB_KEY;
const gremlinEndpoint = process.env.COSMOSDB_ENDPOINT;

// Ensure all environment variables for Gremlin are loaded
if (!process.env.COSMOSDB_DATABASE || !process.env.COSMOSDB_GRAPH || !gremlinPassword || !gremlinEndpoint) {
  console.error("Missing Cosmos DB (Gremlin) environment variables. Please check your .env file.");
  process.exit(1); // Exit if critical variables are missing
}

const authenticator = new auth.PlainTextSaslAuthenticator(gremlinUsername, gremlinPassword);

const gremlinClient = new driver.Client(`${gremlinEndpoint}`, {
  authenticator,
  traversalsource: 'g',
  rejectUnauthorized: false,
  mimeType: 'application/vnd.gremlin-v2.0+json'
});

// Connect to Gremlin server
gremlinClient.open()
  .then(() => console.log('Successfully connected to Cosmos DB Gremlin API'))
  .catch((err) => {
    console.error('Error connecting to Cosmos DB Gremlin API:', err.message);
    console.error('Ensure COSMOS_DB_HOST, COSMOS_DB_NAME, COSMOS_DB_GRAPH, and COSMOS_DB_KEY are correct.');
  });


// Sample endpoint
app.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant. Use the provided context to answer user queries concisely and accurately. If the answer is not in the context, state that you cannot answer based on the provided information.' },
      { role: 'user', content: `${message}` }
    ];

    if (context) {
      messages.splice(1, 0, { role: 'system', content: `Context: ${context}` });
    }

    console.log("\n--- Azure OpenAI API Call Details ---");
    console.log("Endpoint (from .env):", azureOpenaiEndpoint);
    console.log("Deployment Name (from .env, used as 'model'):", azureOpenaiDeploymentName);
    console.log("API Version (from .env):", azureOpenaiApiVersion);
    console.log("Messages being sent:", JSON.stringify(messages, null, 2));
    console.log("--- End API Call Details ---\n");

    // Using the new client's chat completions API
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4.1', // This MUST be your exact Azure Deployment Name (e.g., 'nestle-gpt-35-turb0-instruct')
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    // Accessing the content from the new client's response structure
    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Error in /chat:', error.message);
    // You might want to provide more specific error messages based on the actual error.
    // For a 400 "Unavailable model", the issue is likely with your environment variables.
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
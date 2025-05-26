require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Corrected import: OpenAIClient from @azure/openai
const { OpenAIClient } = require('@azure/openai');
// Import AzureKeyCredential from @azure/core-auth
const { AzureKeyCredential } = require('@azure/core-auth');
const { driver, auth } = require('gremlin');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Azure OpenAI Setup
const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const openaiKey = process.env.AZURE_OPENAI_API_KEY;
const openaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;

// Ensure all environment variables are loaded
if (!openaiEndpoint || !openaiKey || !openaiDeployment) {
  console.error("Missing Azure OpenAI environment variables. Please check your .env file.");
  process.exit(1); // Exit if critical variables are missing
}

// Instantiate OpenAIClient
const openaiClient = new OpenAIClient(openaiEndpoint, new AzureKeyCredential(openaiKey));

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
  // Set to false for development if you are encountering SSL issues
  // For production, ensure proper certificate handling or trusted CAs
  rejectUnauthorized: false,
  mimeType: 'application/vnd.gremlin-v2.0+json'
});

// Connect to Gremlin server
gremlinClient.open()
  .then(() => console.log('Successfully connected to Cosmos DB Gremlin API'))
  .catch((err) => {
    console.error('Error connecting to Cosmos DB Gremlin API:', err.message);
    // Add more detailed error info if available, e.g., err.stack
    console.error('Ensure COSMOS_DB_HOST, COSMOS_DB_NAME, COSMOS_DB_GRAPH, and COSMOS_DB_KEY are correct.');
  });


// Sample endpoint
app.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Construct messages array for chat completions
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant. Use the provided context to answer user queries concisely and accurately. If the answer is not in the context, state that you cannot answer based on the provided information.' },
      { role: 'user', content: `${message}` }
    ];

    // If context is provided, add it to the messages
    if (context) {
      // Placing context after the system message, before the user message
      messages.splice(1, 0, { role: 'system', content: `Context: ${context}` });
    }

    const result = await openaiClient.getChatCompletions(openaiDeployment, messages, {
      temperature: 0.7, // Adjust temperature for creativity (0.0-1.0)
      maxTokens: 800,   // Limit response length
    });

    const reply = result.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Error in /chat:', error.message);
    // Provide more specific error messages if possible
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: `Azure OpenAI API Error: ${error.message}` });
    } else {
      res.status(500).json({ error: 'Something went wrong with the AI service.' });
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

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const gremlin = require('gremlin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

/* ========== Cosmos DB Gremlin Setup ========== */
const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(
  `/dbs/${process.env.COSMOSDB_DATABASE}/colls/${process.env.COSMOSDB_GRAPH}`,
  process.env.COSMOSDB_KEY
);

const client = new gremlin.driver.Client(
  process.env.COSMOSDB_ENDPOINT,
  {
    authenticator,
    traversalsource: 'g',
    rejectUnauthorized: true,
    mimeType: 'application/vnd.gremlin-v2.0+json',
  }
);

const g = client.traversal().withRemote();

/* ========== Azure OpenAI Setup ========== */
const openai = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
);
const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT;

/* ========== ROUTES ========== */

// Root test
app.get('/', (req, res) => {
  res.send('Nestlé AI Chatbot backend is running!');
});

// POST: Add graph node to Cosmos DB
app.post('/api/add-node', async (req, res) => {
  const { id, label, text } = req.body;

  try {
    await g.addV(label)
      .property('id', id)
      .property('text', text)
      .next();

    res.json({ message: 'Node added.' });
  } catch (err) {
    console.error('Error adding node:', err);
    res.status(500).json({ error: 'Error adding node.' });
  }
});

// POST: Handle chat message
app.post('/api/message', async (req, res) => {
  const { message } = req.body;
  console.log('User asked:', message);

  try {
    // Step 1: Gremlin query to get related context
    console.log('Searching for message context:', message);
    const contextResult = await g.V()
      .has('text', gremlin.process.P.within([message]))
      .values('text')
      .toList();

    const context = contextResult.join('\n');

    // Step 2: Call Azure OpenAI with context
    const completion = await openai.getChatCompletions(DEPLOYMENT_NAME, [
      { role: "system", content: "Use the following context to answer user queries." },
      { role: "user", content: `${message}\n\nContext:\n${context}` }
    ]);

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ reply: 'Error processing message. Please try again later.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

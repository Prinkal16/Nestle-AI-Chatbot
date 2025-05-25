const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ Root route for basic GET
app.get('/', (req, res) => {
  res.send('Nestlé AI Chatbot backend is running!!!');
});

// ✅ POST route to handle chat messages with Azure OpenAI
app.post('/api/message', async (req, res) => {
  const { message } = req.body;

  console.log('User asked:', message);

  try {
    const openaiResponse = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-15-preview`,
      {
        messages: [{ role: "user", content: message }],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'api-key': process.env.AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = openaiResponse.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error("Azure OpenAI Error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to get response from Azure OpenAI." });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

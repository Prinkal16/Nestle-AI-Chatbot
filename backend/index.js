const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/message', (req, res) => {
  const { message } = req.body;

  console.log('User asked:', message);

  // TODO: Later replace this with AI or scraped content
  const response = `You said: "${message}". I will connect this to Nestlé content soon!`;

  res.json({ reply: response });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

# 🤖 Nestlé AI Chatbot

An intelligent chatbot designed to assist users with content from madewithnestle.ca, powered by Azure OpenAI, Cosmos DB (GraphRAG), and vector search using Azure Cognitive Search. The project is container-free, deployed on Azure App Services (backend) and Azure Static Web Apps (frontend).
An AI-powered chatbot built to assist users with queries related to Made with Nestlé. The chatbot leverages advanced NLP and graph-based techniques to provide accurate, contextual responses by integrating:

🔍 Web scraping with Playwright (Google Colab)

🤗 Hugging Face embeddings for document indexing

🧠 Azure OpenAI GPT-4.1 for generating responses

🔗 GraphRAG using Cosmos DB Gremlin API

🌐 Deployed on Azure (Frontend & Backend)

---

## 🌐 Live Chatbot (Azure)

🟢 **Frontend (React on Azure Static Web Apps)**:  
👉 Frontend (Chatbot UI): https://nice-sand-0efe8fe0f.6.azurestaticapps.net/

🟢 **Backend (Node.js on Azure App Service)**:  
👉 Backend API URL: https://nestle-ai-chatbot-backend-dncveraeftgqbqbp.canadacentral-01.azurewebsites.net

---

## ✅ Submission Checklist

| Requirement                                | Status             |
|--------------------------------------------|--------------------|
| Code uploaded to GitHub                    | ✅ Done            |
| Azure chatbot accessible for testing       | ✅ Live Link Below |
| README with setup steps                    | ✅ Included        |
| Technologies & frameworks documented       | ✅ Included        |
| Limitations / additional features listed   | ✅ Included        |
| Functional chatbot with Nestlé content     | ✅ Complete        |

---



## 🧠 About the Chatbot

- Handles user queries related to Nestlé recipes and products.
- Fetches and indexes data dynamically from the MadeWithNestle.ca site.
- Uses Hugging Face for generating embeddings.
- Employs Azure Cognitive Search + Cosmos DB Graph (Gremlin) for GraphRAG.
- Returns context and source links for transparency.

---

## 🛠 Technologies & Frameworks Used

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | React, ReactMarkdown, CSS            |
| Backend    | Node.js, Express                     |
| Vector DB  | Azure Cognitive Search               |
| Embedding  | Hugging Face `sentence-transformers` |
| Scraping   | Playwright (in Google Colab)         |
| GraphRAG   | Cosmos DB Gremlin API                |
| GenrateResponse   | Azure OpenAI GPT-4.1                |
| Hosting    | Azure App Service, Azure Static Web Apps |

---

## 🚀 Features
-Scrapes content from the official Nestlé recipe site.
-Embeds data using Hugging Face models.
-Stores vectors in Azure Cognitive Search.
-Integrates Azure OpenAI for responses.
-Injects context from vector search (Search Index) and Cosmos DB (Gremlin Graph) via GraphRAG.
-Provides source citations in bot replies.


## 🏗️ Architecture
User ➝ React Frontend ➝ Node.js Backend ➝ Azure OpenAI
                                          ⬃
        Azure Cognitive Search ◀────── Embed & Index
                                          ⬃
                     Cosmos DB (Gremlin Graph)
                      ⬃
          Web Scraper / Populator Script


## 🛠️ Technologies Used
-Frontend: React.js (deployed on Azure Static Web Apps)
-Backend: Node.js + Express (deployed on Azure App Service)
-AI: Azure OpenAI + Hugging Face Embeddings
-Search: Azure Cognitive Search
-Graph: Cosmos DB (Gremlin API)
-Web Scraping: playwright (Python)

## 🧰 Local Setup

### 1. Clone Repository
git clone https://github.com/Prinkal16/Nestle-AI-Chatbot.git
cd Nestle-AI-Chatbot

### 2. Setup Backend
cd backend
npm install

Create a .env file:
PORT=5000
AZURE_SEARCH_ENDPOINT=your-search-endpoint
AZURE_SEARCH_KEY=your-key
HUGGINGFACE_API_KEY=your-huggingface-token
COSMOS_DB_ENDPOINT=your-cosmos-endpoint
COSMOS_DB_KEY=your-cosmos-key
COSMOS_DB_DATABASE=your-db-name
COSMOS_DB_GRAPH=your-graph-name

Run the backend:
npm start

### 3. Setup Frontend
cd frontend
npm install
npm start
Update API_URL in App.js to point to the local backend if testing locally.


## ☁️ Deployment to Azure
1. Backend (Azure App Service)
-Create an App Service on Azure
-Set environment variables as in .env
-Use GitHub Actions for CI/CD
-Ensure startup command is npm start

2. Frontend (Azure Static Web Apps)
-Push frontend folder to GitHub
-Link to Azure Static Web App
-Set build folder to /frontend
-Azure auto-generates workflow for deployment

## 🕸 Web Scraping via Google Colab (Playwright)
- Used Playwright with Chromium in Google Colab to scrape dynamic content from madewithnestle.ca

-Key Features:
  Scrapes recipes, product info, ingredients, instructions
  Embeds data using Hugging Face models
  Pushes processed data to Azure Cognitive Search

-📁 Notebook file: nestle-scraper.ipynb
Link: https://colab.research.google.com/drive/1NCQbw1MYDPb_h5TlGjYNqhTuT41O2cAg?usp=sharing

## 🔧 Extending the Chatbot

### ➕ Add New GraphRAG Nodes
  -Edit populateGraph.js:
    -Add new recipe/concept nodes
    -Link with related topics using gremlinUtils.js
    -Run script: node populateGraph.js

### 🧽 Improve Web Scraping
  -Update Python script (used Google Colab) to:
    -Extract tables, images, meta info
    -Remove hardcoded links
    -Reprocess and re-upload content to Azure Cognitive Search

## ⚠️ Known Limitations
Initial response time can vary slightly due to Azure cold starts.
Web scraping coverage is limited to what is available at crawl time.
Hugging Face embeddings are generated in batches, may omit some edge cases.
Some deeply nested product details may not be fully indexed.

### 🧠 Switch Embedding Providers
-switched from OpenAI to Hugging Face:

## 📁 Project Structure

Nestle-AI-Chatbot/
├── backend/        #Node.js + Express backend 
│   ├── index.js      #Handles OpenAI requests, graph querying
│   ├── gremlinUtils.js
│   ├── populateGraph.js
│   └── ...
├── frontend/     # React.js chatbot widget
│   ├── App.js    # Chat logic and UI
│   ├── App.css
│   └── ...
├── scraping_and_embedding.ipynb    #Google Colab notebook
├── README.md
└── .github/workflows/        #GitHub Actions for CI/CD


# 🤖 Nestlé AI Chatbot

An AI-powered chatbot built to assist users with queries related to Made with Nestlé. The chatbot leverages advanced NLP and graph-based techniques to provide accurate, contextual responses.

---

## 📚 Table of Contents

- [🧠 About the Chatbot](#-about-the-chatbot)
- [🌐 Live Chatbot (Azure)](#-live-chatbot-azure)
- [✅ Submission Checklist](#-submission-checklist)
- [🛠 Technologies & Frameworks Used](#-technologies--frameworks-used)
- [🧰 Local Setup](#-local-setup)
- [☁️ Deployment to Azure](#️-deployment-to-azure)
- [🕸 Web Scraping via Google Colab (Playwright)](#-web-scraping-via-google-colab-playwright)
- [🌐 GraphRAG with Cosmos DB (Gremlin API)](#-graphrag-with-cosmos-db-gremlin-api)
- [🤖 Azure OpenAI GPT-4.1 for Response Generation](#-azure-openai-gpt-41-for-response-generation)
- [🔍 Azure Cognitive Search (Vector Index)](#-azure-cognitive-search-vector-index)
- [📁 Project Structure](#-project-structure)
- [⚙️ Additional Features](#️-additional-features)
- [⚠️ Known Limitations](#️-known-limitations)
- [🙌 Credits](#-credits)

---

## 🧠 About the Chatbot

- Handles user queries related to Nestlé recipes and products.
- Scrapes content from the official Nestlé recipe site.
- Fetches and indexes data from the MadeWithNestle.ca site.
- Uses Hugging Face for generating embeddings.
- Stores vectors in Azure Cognitive Search.
- Integrates Azure OpenAI for responses.
- Injects context from vector search (Search Index) and Cosmos DB (Gremlin Graph) via GraphRAG.
- Returns context and source links for transparency.

---

## 🌐 Live Chatbot (Azure)

🟢 **Frontend (React on Azure Static Web Apps)**:  
👉 Frontend (Chatbot UI): https://nice-sand-0efe8fe0f.6.azurestaticapps.net/

---

## ✅ Submission Checklist

| Requirement                                | Status             |
|--------------------------------------------|--------------------|
| Code uploaded to GitHub                    | ✅ Done            |
| Azure chatbot accessible for testing       | ✅ Live Link provided above |
| README with setup steps                    | ✅ Included        |
| Technologies & frameworks documented       | ✅ Included        |
| Limitations / additional features listed   | ✅ Included        |
| Functional chatbot with Nestlé content     | ✅ Complete        |

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
| Generate Response   | Azure OpenAI GPT-4.1                |
| Hosting    | Azure App Service, Azure Static Web Apps |

---


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
  - Create an App Service on Azure
  - Set environment variables as in .env
  - Use GitHub Actions for CI/CD
  - Ensure startup command is npm start

2. Frontend (Azure Static Web Apps)
  - Push frontend folder to GitHub
  - Create Static web App
  - Link GitHub repo & select branch
  - Set build folder to /frontend
  - Azure auto-generates workflow for deployment

## 🕸 Web Scraping via Google Colab (Playwright)
- Run nestle-scraper.ipynb in Google Colab
- Scrapes full site using Playwright
- Extracts: text, images, links, tables
- Embeddings: Hugging Face (e.g., all-MiniLM-L6-v2)
- Uploads data to Azure Cognitive Search index
- Colab Link : https://colab.research.google.com/drive/1NCQbw1MYDPb_h5TlGjYNqhTuT41O2cAg?usp=sharing

## 🌐 GraphRAG with Cosmos DB (Gremlin API)
- Create Cosmos DB with Gremlin API
- Add database: <your-GraphDB-name>, graph: <your-NestleGraph-name>, partition key: <your-partition-key>
- Graph population is handled in populateGraph.js (Node.js)
- Queries & traversal via gremlinUtils.js

## 🤖 Azure OpenAI GPT-4.1 for Response Generation
- Create Azure OpenAI resource with GPT-4 deployment
- Install SDK: pip install openai
- Set environment variables to backend .env
- Use OpenAI SDK to call GPT-4.1
- Call GPT with scraped content + graph-related knowledge as context


## 🔍 Azure Cognitive Search (Vector Index)
- Create a Search Service in Azure with Vector Search enabled.
- Define a search index with fields like: id, title, url, content, embedding (set embedding as a vector field).
- Enable vector search settings (e.g., hnsw algorithm, vector dimensions).
- Use the Azure SDK's SearchClient to upload documents with pre-computed embeddings.
- At query time, perform a vector similarity search by passing user query embeddings to the embedding vector field.


---

## 📁 Project Structure

Nestle-AI-Chatbot/
│
├── frontend/                        # React.js chatbot widget
│   └── src/
│       └── App.js                   # Chat logic and UI
│       └── App.css
│
├── backend/                         # Node.js + Express backend
│   └── index.js                     # Handles OpenAI requests, graph querying
│   └── search.js                    # Searches from the Azure Search index
│   └── gremlinUtils.js              # Handles OpenAI requests, graph querying
│   └── populateGraph.js             # Handles OpenAI requests, graph querying      
│      
├── scraping/                        # Google Colab notebook
│   └── nestle-scraper.ipynb
│
├── azure-config/                    # Azure deployment config (optional)
│
├── .github/workflows/               # GitHub Actions for CI/CD
│
└── README.md                        #GitHub Actions for CI/CD
___

---

## ⚙️ Additional Features
- Markdown rendering (ReactMarkdown)
- Source links for transparency
- Context injection from graph database
- Live typing indicators

---

## ⚠️ Known Limitations
- Initial response time can vary slightly due to Azure cold starts.
- Web scraping coverage is limited to what is available at crawl time.
- Hugging Face embeddings are generated in batches, may omit some edge cases.
- Some deeply nested product details may not be fully indexed.

---

## 🙌 Credits
- Hugging Face for embeddings
- Microsoft Azure (OpenAI, App Service, Cognitive Search, Cosmos DB)
- React, Playwright, GitHub Actions


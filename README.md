# 🤖 Nestlé AI Chatbot
An intelligent chatbot designed to assist users with content from madewithnestle.ca, powered by Azure OpenAI, Cosmos DB (GraphRAG), and vector search using Azure Cognitive Search. The project is container-free, deployed on Azure App Services (backend) and Azure Static Web Apps (frontend).

## 🗂️ Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [Local Setup](#local-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Setup Backend](#2-setup-backend)
  - [3. Setup Frontend](#3-setup-frontend)
- [Deployment to Azure](#deployment-to-azure)
  - [1. Deploy Backend (Azure App Service)](#1-deploy-backend-azure-app-service)
  - [2. Deploy Frontend (Azure Static Web Apps)](#2-deploy-frontend-azure-static-web-apps)
- [Extending the Chatbot](#extending-the-chatbot)
  - [➕ Add New GraphRAG Nodes](#-add-new-graphrag-nodes)
  - [🧽 Improve Web Scraping](#-improve-web-scraping)
  - [🧠 Switch Embedding Providers](#-switch-embedding-providers)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Features
-Scrapes content from the official Nestlé recipe site.
-Embeds data using Hugging Face models.
-Stores vectors in Azure Cognitive Search.
-Integrates Azure OpenAI for responses.
-Injects context from Cosmos DB (Gremlin Graph) via GraphRAG.
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
...

### 2. Setup Backend
...

### 3. Setup Frontend
...

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

### 🧠 Switch Embedding Providers
-switched from OpenAI to Hugging Face:

## 📁 Project Structure

Nestle-AI-Chatbot/
├── backend/
│   ├── index.js
│   ├── gremlinUtils.js
│   ├── populateGraph.js
│   └── ...
├── frontend/
│   ├── App.js
│   ├── App.css
│   └── ...
├── scraping_and_embedding.ipynb
├── README.md
└── .github/workflows/

## 🙋 Contributing
...

## 📜 License
...

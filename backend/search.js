// search.js

const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');

let searchClient;
let searchIndexName;

/**
 * Initializes the Azure Search client.
 * Call this once at application startup.
 * @param {string} endpoint - The Azure Search service endpoint (e.g., "https://YOUR_SERVICE_NAME.search.windows.net").
 * @param {string} apiKey - The Azure Search admin key or query key.
 * @param {string} indexName - The name of the Azure Search index to query.
 */
function initializeAzureSearchClient(endpoint, apiKey, indexName) {
    if (!endpoint || !apiKey || !indexName) {
        console.error("Azure Search: Missing endpoint, API key, or index name for initialization.");
        return;
    }
    searchClient = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
    searchIndexName = indexName;
    console.log(`Azure Search client initialized for index: ${indexName}`);
}

/**
 * Performs a search query against the configured Azure Search index.
 * @param {string} queryText - The text to search for.
 * @param {string[]} [searchFields] - Optional array of fields to search within. If not provided, all searchable fields are used.
 * @param {number} [topN=5] - The maximum number of results to return.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of search results.
 */
async function searchDocuments(queryText, searchFields = [], topN = 5) {
    if (!searchClient) {
        console.error("Azure Search client not initialized. Call initializeAzureSearchClient first.");
        return [];
    }
    if (!queryText) {
        console.log("Azure Search: No query text provided. Returning empty results.");
        return [];
    }

    try {
        console.log(`Azure Search: Searching for "${queryText}" in index "${searchIndexName}"...`);
        const searchOptions = {
            queryType: "semantic", // Use semantic search for better relevance if configured
            queryLanguage: "en-us",
            semanticConfiguration: "default", // Ensure you have a semantic configuration named 'default'
            top: topN,
            select: ["title", "url", "content"], // MODIFIED: Using your provided fields
            searchFields: searchFields.length > 0 ? searchFields : undefined,
        };

        const searchResults = await searchClient.search(queryText, searchOptions);

        const results = [];
        for await (const result of searchResults.results) {
            results.push({
                score: result.score,
                title: result.document.title || 'No Title',
                content: result.document.content || 'No content available', // MODIFIED: Only checks 'content' now
                url: result.document.url || '#'
            });
        }
        console.log(`Azure Search: Found ${results.length} results for "${queryText}".`);
        return results;
    } catch (error) {
        console.error(`Azure Search: Error performing search for "${queryText}":`, error.message);
        return [];
    }
}

module.exports = {
    initializeAzureSearchClient,
    searchDocuments
};

// backend/gremlinUtils.js
const gremlin = require('gremlin');
const { stat } = require('fs');
const __ = gremlin.process.statics;

let client;

// Define your partition key name here.
const PARTITION_KEY_NAME = 'recipes'; // <--- VERIFY THIS MATCHES YOUR AZURE PORTAL SETTING

function initializeGremlinClient(gremlinClientInstance) {
    client = gremlinClientInstance;
}

async function addVertex(label, properties) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.addV('${label}')`;

    // Add properties to the query
    for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
            // Escape single quotes in property values
            const escapedValue = String(properties[key]).replace(/'/g, "\\'");
            query += `.property('${key}', '${escapedValue}')`;
        }
    }

    if (!properties[PARTITION_KEY_NAME]) {
        const pkValue = properties.name || label; // Fallback to label if no name
        query += `.property('${PARTITION_KEY_NAME}', '${pkValue.replace(/'/g, "\\'")}')`;
    }

    try {
        const result = await client.submit(query, {});
        // Cosmos DB Gremlin API returns an array for addV, even for a single vertex
        return result.toArray()[0];
    } catch (error) {
        console.error(`Error executing Gremlin query "${query}":`, error.message);
        throw error; // Re-throw to be caught by calling function
    }
}

async function findVertices(label, propertyName, propertyValue) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.V().hasLabel('${label}')`;
    if (propertyName && propertyValue) {
        // Escape single quotes for property value in query
        const escapedValue = String(propertyValue).replace(/'/g, "\\'");
        query += `.has('${propertyName}', '${escapedValue}')`;
    }
    // For partitioned graphs, findVertices should ideally also use the partition key for efficiency,
    // but the Cosmos DB Gremlin API will often handle it if not explicitly in the query.
    // However, it's good practice to filter by partition key if known.

    try {
        const result = await client.submit(query, {});
        return result.toArray();
    } catch (error) {
        console.error(`Error executing Gremlin query "${query}":`, error.message);
        throw error;
    }
}

async function addEdge(fromVertexId, toVertexId, edgeLabel, properties = {}) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.V('${fromVertexId}').addE('${edgeLabel}').to(g.V('${toVertexId}'))`;

    // Add properties to the edge
    for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
            const escapedValue = String(properties[key]).replace(/'/g, "\\'");
            query += `.property('${key}', '${escapedValue}')`;
        }
    }

    try {
        const result = await client.submit(query, {});
        return result.toArray()[0];
    } catch (error) {
        console.error(`Error executing Gremlin query "${query}":`, error.message);
        throw error;
    }
}

async function getConnectedVertices(vertexId, edgeLabel, direction = 'out') {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.V('${vertexId}')`;
    if (direction === 'out') {
        query += `.out('${edgeLabel}')`;
    } else if (direction === 'in') {
        query += `.in('${edgeLabel}')`;
    } else if (direction === 'both') {
        query += `.both('${edgeLabel}')`;
    } else {
        throw new Error("Invalid direction. Must be 'in', 'out', or 'both'.");
    }

    try {
        const result = await client.submit(query, {});
        return result.toArray();
    } catch (error) {
        console.error(`Error executing Gremlin query "${query}":`, error.message);
        throw error;
    }
}


module.exports = {
    initializeGremlinClient,
    addVertex,
    findVertices,
    addEdge,
    getConnectedVertices,
    PARTITION_KEY_NAME // Export this for verification
};
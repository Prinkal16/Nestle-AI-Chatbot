// backend/gremlinUtils.js

const gremlin = require('gremlin');
const { stat } = require('fs');
const __ = gremlin.process.statics;

let client;

// Define your partition key name here.
// IMPORTANT: This MUST match the partition key defined on your Cosmos DB graph container in Azure Portal (e.g., if it's /pk, then 'pk').
const PARTITION_KEY_NAME = 'recipes'; // <--- VERIFY THIS MATCHES YOUR AZURE PORTAL SETTING

function initializeGremlinClient(gremlinClientInstance) {
    client = gremlinClientInstance;
}

async function addVertex(label, properties) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.addV('${label}')`;

    // Ensure partition key is always added
    // For this setup, we'll use the 'name' property as the partition key value
    // You might need to adjust this if your partition key is different
    // For example, if your partition key in Azure is '/pk', and you want to use the 'name' for it
    // properties.pk = properties.name; // This is a common strategy

    // Add properties to the query
    for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
            // Escape single quotes in property values
            const escapedValue = String(properties[key]).replace(/'/g, "\\'");
            query += `.property('${key}', '${escapedValue}')`;
        }
    }

    // Add the partition key property explicitly IF IT'S NOT ALREADY INCLUDED IN `properties`
    // and if your graph *requires* a partition key (which it does based on your error)
    if (!properties[PARTITION_KEY_NAME]) {
        // Here, we're assuming the 'name' property can serve as a suitable partition key value.
        // If your partition key is different (e.g., 'category', 'type'), you'll need to
        // adjust this logic to assign the correct property to PARTITION_KEY_NAME.
        // For simplicity, we'll use the 'name' as the partition key value for all vertices.
        // If 'name' is not always unique or suitable, you might need a dedicated 'pk' property in your data.
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

// ... rest of gremlinUtils.js (findVertices, addEdge, getConnectedVertices) ...
// Make sure to add the partition key property when creating edges as well.
// The addEdge function will need to ensure the partition key is provided for vertices it connects.
// For edges, Cosmos DB uses the partition key of the OUT vertex.

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

    // IMPORTANT: For partitioned graphs, the 'from' vertex ID MUST include its partition key.
    // Cosmos DB Gremlin automatically handles this when adding an edge if the source vertex ID
    // is correctly obtained from a previous query result.
    // However, if constructing ID manually, it needs to be like: {id: "vertexId", partitionKey: "pkValue"}

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
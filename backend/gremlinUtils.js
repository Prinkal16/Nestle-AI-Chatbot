const gremlin = require('gremlin');
const { stat } = require('fs');
const __ = gremlin.process.statics;

let client;

const PARTITION_KEY_NAME = 'recipes'; // <-- Double-check this against your Azure portal

function initializeGremlinClient(gremlinClientInstance) {
    client = gremlinClientInstance;
    console.log("✅ Gremlin client initialized.");
}

async function addVertex(label, properties) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.addV('${label}')`;

    for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
            const escapedValue = String(properties[key]).replace(/'/g, "\\'");
            query += `.property('${key}', '${escapedValue}')`;
        }
    }

    if (!properties[PARTITION_KEY_NAME]) {
        const pkValue = properties.name || label;
        query += `.property('${PARTITION_KEY_NAME}', '${pkValue.replace(/'/g, "\\'")}')`;
    }

    console.log(`📌 Executing Gremlin Add Vertex Query:\n${query}`);

    try {
        const result = await client.submit(query, {});
        return result.toArray()[0];
    } catch (error) {
        console.error(`❌ Error executing Gremlin Add Vertex:`, error.message);
        throw error;
    }
}

async function findVertices(label, propertyName, propertyValue) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.V().hasLabel('${label}')`;
    if (propertyName && propertyValue) {
        const escapedValue = String(propertyValue).replace(/'/g, "\\'");
        query += `.has('${propertyName}', '${escapedValue}')`;
    }

    console.log(`🔍 Executing Gremlin Find Vertices Query:\n${query}`);

    try {
        const result = await client.submit(query, {});
        const output = result.toArray();
        console.log(`✅ Found ${output.length} vertices for label "${label}"`);
        return output;
    } catch (error) {
        console.error(`❌ Error executing Gremlin Find Vertices:`, error.message);
        throw error;
    }
}

async function addEdge(fromVertexId, toVertexId, edgeLabel, properties = {}) {
    if (!client) throw new Error("Gremlin client not initialized.");

    let query = `g.V('${fromVertexId}').addE('${edgeLabel}').to(g.V('${toVertexId}'))`;

    for (const key in properties) {
        if (properties.hasOwnProperty(key)) {
            const escapedValue = String(properties[key]).replace(/'/g, "\\'");
            query += `.property('${key}', '${escapedValue}')`;
        }
    }

    console.log(`🔗 Executing Gremlin Add Edge Query:\n${query}`);

    try {
        const result = await client.submit(query, {});
        return result.toArray()[0];
    } catch (error) {
        console.error(`❌ Error executing Gremlin Add Edge:`, error.message);
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

    console.log(`🌐 Executing Gremlin Get Connected Vertices Query:\n${query}`);

    try {
        const result = await client.submit(query, {});
        const output = result.toArray();
        console.log(`🔗 Found ${output.length} connected vertices via edge "${edgeLabel}"`);
        return output;
    } catch (error) {
        console.error(`❌ Error executing Gremlin Get Connected Vertices:`, error.message);
        throw error;
    }
}

module.exports = {
    initializeGremlinClient,
    addVertex,
    findVertices,
    addEdge,
    getConnectedVertices,
    PARTITION_KEY_NAME
};

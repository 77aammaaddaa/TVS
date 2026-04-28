// ecofine/qdrant.js
// Simple Qdrant client wrapper for semantic storage.
// Requires "@qdrant/client" npm package.

const { QdrantClient } = require('@qdrant/client');

class QdrantWrapper {
    constructor({ host, port = 6333 }) {
        this.client = new QdrantClient({ url: `http://${host}:${port}` });
    }

    async createCollection(name, vectorSize) {
        try {
            await this.client.createCollection({ name, vectors_config: { size: vectorSize, distance: 'Cosine' } });
        } catch (e) {
            console.error('[Qdrant] createCollection error:', e);
        }
    }

    async addVector(collectionName, id, vector, payload = {}) {
        try {
            await this.client.upsert({ collection_name: collectionName, points: [{ id, vector, payload }] });
        } catch (e) {
            console.error('[Qdrant] addVector error:', e);
        }
    }

    async search(collectionName, queryVector, limit = 10) {
        try {
            const res = await this.client.search({ collection_name: collectionName, vector: queryVector, limit });
            return res.result;
        } catch (e) {
            console.error('[Qdrant] search error:', e);
            return [];
        }
    }
}

module.exports = QdrantWrapper;

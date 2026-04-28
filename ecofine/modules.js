// ecofine/modules.js
// Central module loader for EcoFine Pro V14.0
// Initializes Redis, Qdrant, SQLite and exposes them globally.

const RedisClient = require('./redis');
const QdrantWrapper = require('./qdrant');
const SQLiteClient = require('./sqlite');

// Configuration – adjust as needed for your environment
const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
};

const qdrantConfig = {
    host: process.env.QDRANT_HOST || 'localhost',
    port: process.env.QDRANT_PORT ? parseInt(process.env.QDRANT_PORT) : 6333,
};

// SQLite database path – use a file in the project root
const sqlitePath = process.env.SQLITE_DB_PATH || './data/ecofine.db';

// Instantiate clients
const redisClient = new RedisClient(redisOptions);
const qdrantClient = new QdrantWrapper(qdrantConfig);
const sqliteClient = new SQLiteClient(sqlitePath);

// Expose globally for easy access in the app
window.ecofineModules = {
    redis: redisClient,
    qdrant: qdrantClient,
    sqlite: sqliteClient,
};

console.log('[EcoFine] Modules initialized');

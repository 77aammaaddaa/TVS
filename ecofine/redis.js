// ecofine/redis.js
// Simple Redis client wrapper for caching session data and quick lookups.
// Requires "ioredis" npm package.

const Redis = require('ioredis');

class RedisClient {
    constructor(options) {
        this.client = new Redis(options);
        this.client.on('error', err => console.error('[Redis] Error:', err));
    }

    async set(key, value, ttlSeconds = null) {
        try {
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, JSON.stringify(value));
            } else {
                await this.client.set(key, JSON.stringify(value));
            }
        } catch (e) {
            console.error('[Redis] set error:', e);
        }
    }

    async get(key) {
        try {
            const val = await this.client.get(key);
            return val ? JSON.parse(val) : null;
        } catch (e) {
            console.error('[Redis] get error:', e);
            return null;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
        } catch (e) {
            console.error('[Redis] del error:', e);
        }
    }
}

module.exports = RedisClient;

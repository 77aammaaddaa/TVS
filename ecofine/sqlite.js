// ecofine/sqlite.js
// SQLite wrapper using "better-sqlite3" for synchronous operations.
// Requires npm package better-sqlite3.

const Database = require('better-sqlite3');

class SQLiteClient {
    constructor(dbPath) {
        this.db = new Database(dbPath, { verbose: console.log });
    }

    run(sql, params = []) {
        try {
            return this.db.prepare(sql).run(params);
        } catch (e) {
            console.error('[SQLite] run error:', e);
            throw e;
        }
    }

    get(sql, params = []) {
        try {
            return this.db.prepare(sql).get(params);
        } catch (e) {
            console.error('[SQLite] get error:', e);
            throw e;
        }
    }

    all(sql, params = []) {
        try {
            return this.db.prepare(sql).all(params);
        } catch (e) {
            console.error('[SQLite] all error:', e);
            throw e;
        }
    }
}

module.exports = SQLiteClient;

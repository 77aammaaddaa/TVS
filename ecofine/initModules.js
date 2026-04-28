// ecofine/initModules.js
// Initializes EcoFine modules and exposes them globally.

import './modules';

// Expose SQLite client as window.db for legacy code compatibility
window.db = window.ecofineModules.sqlite;

console.log('[EcoFine] Global db initialized');
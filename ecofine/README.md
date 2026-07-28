# EcoFine Project Structure

## Overview
This folder now uses a clearer structure for testing and maintenance while keeping the legacy EcoFine modules working.

## Structure
- src/core: bootstrap and core runtime initialization
- src/services: shared service helpers
- src/ui: UI shell and presentation helpers
- config: application configuration
- public: static assets and future public files
- __tests__: automated tests

## Notes
Legacy scripts such as app.js, auth.js, database.js, and others remain in the root for compatibility.
Newer modules should be placed under src/ and loaded via index.html.

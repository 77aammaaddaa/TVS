# EcoFine Pro - Browser-First Hybrid

## Overview
This repository is being converted to a browser-first hybrid architecture, where the active app runs in the browser without a permanent server-side runtime. The legacy server-side and integration files are isolated in a local archive and excluded from Git tracking.

## Active structure
- src/: React + Vite browser app
- shared/: reusable UI, hooks, and config for the browser shell
- public/: static assets that are safe to expose to the browser
- archive/legacy-server-side/: local-only legacy server scripts, backup logic, external connectors, and old modules that should not be pushed to GitHub

## Security model
- Browser-side encryption is implemented with Web Crypto API for sensitive local data
- Sensitive keys and local-only files should remain outside the repository
- Use environment variables or local secure files for any real credentials

## Local commands
```bash
npm install
npm run dev
npm run build
```

## Archive policy
The files under archive/ are intentionally local-only. They are not meant to be public or deployed. Git is configured to ignore privacy-sensitive and archive folders so they stay off GitHub.

## Notes
This app is designed to be portable and lightweight for static hosting such as Vercel, Netlify, or a local browser-only deployment. Full server-side features should be reintroduced only when a specific runtime requirement exists.


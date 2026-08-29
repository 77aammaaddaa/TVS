# EcoFine Pro

EcoFine Pro is a browser-only project shell. It runs directly in the browser, keeps local data encrypted, and does not require any permanent server-side runtime.

## Active project
- [index.html](index.html) is the public entry point
- Local state is protected with browser-side encryption before saving
- The app is suitable for static deployment without build-time complexity

## Archived local-only content
Legacy server-side, old JavaScript modules, and runtime helpers are stored in the local archive:
- [archive/legacy-server-side](archive/legacy-server-side)

This archive is kept local and private, not intended for GitHub publication.

## Deployment
This project is designed for simple static hosting such as Vercel, Netlify, or a local web server.

## Security note
No sensitive data should be saved in plain text. The browser encrypts local state before writing it.


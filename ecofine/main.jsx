import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx'; // Assuming app.js will be renamed or refactored to app.jsx

// Basic CSS for initial setup
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

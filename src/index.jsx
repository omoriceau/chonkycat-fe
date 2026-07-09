// src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// 🆕 Import and configure AWS Amplify
import { Amplify } from 'aws-amplify';
import amplifyOutputs from '../amplify_outputs.json';
Amplify.configure(amplifyOutputs);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
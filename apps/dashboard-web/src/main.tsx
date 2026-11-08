import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const applicationRoot = ReactDOM.createRoot(rootElement);
  applicationRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

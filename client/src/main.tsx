import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className:
            '!rounded-2xl !border !border-border/60 !bg-card !text-foreground !shadow-material !font-sans',
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import Arena from './pages/Arena';
import './index.css';
import Login from './pages/Login';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/projects" element={<App />} />
        <Route path="/arena" element={<Arena />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
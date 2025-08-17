import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import Arena from './pages/Arena';
import './index.css';
import MindMap from './components/Mindmap';
import { MindmapProvider } from './contexts/MindmapContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MindmapProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/mindmap" element={<MindMap onClose={() => window.history.back()} />} />
        </Routes>
      </BrowserRouter>
    </MindmapProvider>
  </React.StrictMode>
);
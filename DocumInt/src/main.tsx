import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Arena from './pages/Arena';
import './index.css';
import MindMap from './components/Mindmap';
import { MindmapProvider } from './contexts/MindmapContext';
import Projects from './pages/Projects';
import Index from './pages/Index';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MindmapProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/mindmap" element={<MindMap onClose={() => window.history.back()} />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </BrowserRouter>
    </MindmapProvider>
  </React.StrictMode>
);
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InfoPage from './pages/InfoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/info/:pageId" element={<InfoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

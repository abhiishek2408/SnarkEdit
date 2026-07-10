import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InfoPage from './pages/InfoPage';
import ImageReducerPage from './pages/ImageReducerPage';
import ImageEnhancerPage from './pages/ImageEnhancerPage';
import ImageToPdfPage from './pages/ImageToPdfPage';
import DocumentMergerPage from './pages/DocumentMergerPage';

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/reduce-image-size" element={<ImageReducerPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/enhance-image" element={<ImageEnhancerPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/image-to-pdf" element={<ImageToPdfPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/create-pdf-from-image" element={<ImageToPdfPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/merge-documents" element={<DocumentMergerPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/info/:pageId" element={<InfoPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/edit-pdf" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;





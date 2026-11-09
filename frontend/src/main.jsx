import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Dashboard from './dashboard/Dashboard';
import Overlay from './overlay/Overlay';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Dashboard giáo viên */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Overlay cho OBS Browser Source */}
        <Route path="/overlay/:sessionId" element={<Overlay />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

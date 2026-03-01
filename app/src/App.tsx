/**
 * MTT Season Planner 2026 - Main Router
 * Author: Stefano Bonfanti
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TeamCalendarPage from './pages/TeamCalendarPage';
import GuidePage from './pages/GuidePage';
import Auth from './pages/Auth';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="calendario-team" element={<TeamCalendarPage />} />
        <Route path="guida" element={<GuidePage />} />
      </Route>
    </Routes>
  );
};

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './components/UserContext';  // Import UserProvider
import LoginPage from './LoginPage'; 
import RegisterPage from './RegisterPage';
import SessionsPage from './SessionsPage.js';
import GamePage from './GamePage.js';

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/game/:sessionId" element={<GamePage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;

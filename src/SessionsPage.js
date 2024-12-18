import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './components/UserContext';
import io from 'socket.io-client';
import './SessionsPage.css';
const address = 'https://eeth1.pythonanywhere.com'
// const address = 'http://localhost:5000';

const socket = io(address);

function SessionsPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState({ wins: 0, losses: 0, ties: 0 });

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await fetch(address+`/api/users/${user.username}`);
        const data = await response.json();
        setUserStats(data);
      } catch (error) {
        setError('Failed to fetch user stats.');
        console.error('Error fetching user stats:', error);
      }
    };
    fetchUserStats();

    socket.emit('get_sessions');

    socket.on('session_list', (sessionData) => {
      setSessions(sessionData);
    });

    socket.on('error', (errorData) => {
      setError(errorData.error);
    });

    return () => {
      socket.off('session_list');
      socket.off('error');
    };
  }, [user.username]);

  const createSession = () => {
    socket.emit('create_session', { username: user.username });

    socket.on('session_created', (data) => {
      console.log('Session Created:', data);
      navigate(`/game/${data.session_id}`);
    });
  };

  const joinSession = (sessionId) => {
    navigate(`/game/${sessionId}`);
  };

  return (
    <div className="container">
      <header className="user-stats-header">
        <h2>Welcome, {user.username}!</h2>
        <div className="user-stats">
          <span><strong>Wins:</strong> {userStats.wins}</span>
          <span><strong>Losses:</strong> {userStats.losses}</span>
          <span><strong>Ties:</strong> {userStats.ties}</span>
        </div>
      </header>
  
      <h3>Active Game Sessions</h3>
      {error && <p className="error">{error}</p>}
      <ul>
        {sessions.length === 0 ? (
          <li>No available sessions.</li>
        ) : (
          sessions.map((session) => (
            <li key={session.id}>
              <div className="session-header">
                <h4>Session {session.id} | Players: {session.player_x || "Waiting"} vs{" "}
                {session.player_o || "Waiting"}</h4>
                <button onClick={() => joinSession(session.id)}>
                {session.player_x === user.username ? "Rejoin": "Join"}</button>
              </div>
            </li>
          ))
        )}
      </ul>
      <button onClick={createSession}>Create New Session</button>
    </div>
  );
  
}

export default SessionsPage;

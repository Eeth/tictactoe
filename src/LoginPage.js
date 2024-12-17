import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './components/UserContext';
import './LoginPage.css'; // Import the CSS file

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const address = 'http://eeth.pythonanywhere.com'
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(address+'/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser({ username });
        localStorage.setItem('user', JSON.stringify({ username }));
        navigate('/sessions');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while logging in');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="title">Login</h2>
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button type="submit" className="button">Login</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="registerText">
          Don't have an account? <a href="/register" className="link">Register here</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css'; // Import the CSS file

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const address = 'https://eeth.pythonanywhere.com'

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(address+'/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/login'); // Redirect to login after successful registration
      } else {
        setError(data.error || 'Error registering user.');
      }
    } catch (error) {
      setError('Error connecting to the server.');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="title">Register</h2>
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
          <button type="submit" className="button">Register</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="loginText">
          Already have an account? <a href="/login" className="link">Login here</a>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;

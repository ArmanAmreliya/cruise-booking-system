import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="logo-badge">🚢 Cruise Booking System</div>
        <h1>MERN Architecture Setup</h1>
        <p className="subtitle">Software Engineering Assessment Scaffold</p>
      </header>

      <main className="card">
        <h2>Backend Connection Status</h2>

        {loading && <div className="status-badge loading">Checking API connection...</div>}

        {error && (
          <div className="status-badge error">
            <span className="dot error-dot"></span> API Connection Error: {error}
          </div>
        )}

        {health && (
          <div className="health-details">
            <div className="status-badge success">
              <span className="dot success-dot"></span> Backend API Connected
            </div>

            <div className="grid">
              <div className="grid-item">
                <span className="label">Status:</span>
                <span className="value badge-ok">{health.status}</span>
              </div>
              <div className="grid-item">
                <span className="label">Message:</span>
                <span className="value">{health.message}</span>
              </div>
              <div className="grid-item">
                <span className="label">Environment:</span>
                <span className="value">{health.environment}</span>
              </div>
              <div className="grid-item">
                <span className="label">Server Time:</span>
                <span className="value">{new Date(health.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Client: React + Vite | Backend: Node + Express + Mongoose | Testing: Jest</p>
      </footer>
    </div>
  );
}

export default App;

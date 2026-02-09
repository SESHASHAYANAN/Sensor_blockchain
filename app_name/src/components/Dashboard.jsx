import React, { useEffect, useState } from "react";
import "./Dashboard.css";

// Pass user and onLogout props from your main App component
function Dashboard({ user, onLogout }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const patientId = user?.id || "test123";

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3001/health/${patientId}`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patientId]);

  const sortedRecords = [...(records || [])].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const presentCase = sortedRecords[0];
  const pastCases = sortedRecords.slice(1);

  return (
    <div className="dashboard-bg">
      <header className="dashboard-header">
        <div>
          <h1>🌒 Healthcare Blockchain Portal</h1>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </header>

      <section className="profile-card">
        <img src={`https://i.pravatar.cc/100?u=${user?.id || ""}`} alt="Profile" className="profile-img" />
        <div>
          <h3>{user?.email || "User"}</h3>
          <span className="profile-id">{patientId}</span>
        </div>
      </section>

      <section className="section">
        <h2>Present Case</h2>
        {loading ? (
          <div className="dim-text">Loading...</div>
        ) : !presentCase ? (
          <div className="dim-text">No recent data found.</div>
        ) : (
          <div className="case-card">
            <p><span className="label">Heart Rate:</span> {presentCase.heartRate}</p>
            <p><span className="label">SpO<sub>2</sub>:</span> {presentCase.spO2}</p>
            <p><span className="label">Timestamp:</span> {new Date(presentCase.timestamp * 1000).toLocaleString()}</p>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Past Cases</h2>
        {(pastCases || []).length === 0 ? (
          <div className="dim-text">No past records found.</div>
        ) : (
          (pastCases || []).map((rec, idx) => (
            <div className="case-card" key={idx}>
              <p>🕒 {new Date((rec.timestamp || 0) * 1000).toLocaleString()}</p>
              <p>Heart Rate: {rec.heartRate} | SpO<sub>2</sub>: {rec.spO2}</p>
              <hr />
            </div>
          ))
        )}
      </section>

      <section className="section">
        <h2>Services</h2>
        <ul className="services-list">
          <li>Health Data Recording (on Blockchain)</li>
          <li>Decentralized Case Storage</li>
          <li>Secure Access</li>
          <li>Real-time Updates</li>
          <li>Personalized Reports</li>
        </ul>
      </section>

      <section className="section">
        <h2>What is this portal?</h2>
        <p>
          This is a <span className="highlight">healthcare blockchain platform</span> where all your vital case records are securely stored on Ethereum using advanced smart contracts.<br />
          Your data is tamper-proof, visible only to authorized parties, and protected with modern privacy and authentication.<br />
          Enjoy a modern, secure, and user-friendly experience for both present and past healthcare cases.
        </p>
      </section>
    </div>
  );
}

export default Dashboard;

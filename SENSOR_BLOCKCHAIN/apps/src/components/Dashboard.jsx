import React, { useEffect, useState, useCallback } from "react";
import "./Dashboard.css";
import "./LiveVitals.css";
import LiveVitals from "./LiveVitals";
import PatientDetail from "./PatientDetail";
import BlockchainAudit from "./BlockchainAudit";
import { useWebSerial } from "../hooks/useWebSerial";
import { supabase } from "../config/supabase";

function Dashboard({ session, onLogout }) {
  const [data, setData] = useState({ heartRate: 0, spO2: 0, timestamp: 0 });
  const [history, setHistory] = useState([]);
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [showDetail, setShowDetail] = useState(false);

  const user = session?.user;
  const userEmail = user?.email || "Guest";
  const userDisplayName = user?.user_metadata?.full_name || userEmail.split('@')[0];
  const userRole = user?.user_metadata?.role || "user";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) onLogout();
  };

  // Simulated Signal Strength (1-4 bars)
  const [signalStrength, setSignalStrength] = useState(4);
  const [lifiStatus, setLifiStatus] = useState({ connected: false, lastSignal: 0 });

  // Patient Details State (Synchronized with Supabase)
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientDetails, setPatientDetails] = useState({
    name: "Loading...",
    id: "test123",
    age: "--",
    gender: "Male"
  });

  // 1. Fetch Patient Profile from Supabase
  useEffect(() => {
    const fetchPatientData = async () => {
      // Fetch the most recently updated patient record
      const { data: patients, error } = await supabase
        .from('patients')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (patients && patients.length > 0 && !error) {
        setPatientDetails(patients[0]);
      } else {
        // Fallback to default if no records exist
        setPatientDetails({ name: "John Doe", id: "test123", age: "65", gender: "Male" });
      }
    };
    fetchPatientData();
  }, []);

  // 2. Save Patient Profile to Supabase
  const handleToggleEdit = async () => {
    if (isEditingPatient) {
      // We are transitioning from EDIT -> SAVE
      const { error } = await supabase
        .from('patients')
        .upsert({
          id: patientDetails.id,
          name: patientDetails.name,
          age: patientDetails.age,
          gender: patientDetails.gender,
          updated_at: new Date()
        });

      if (error) {
        console.error("Supabase Save Error:", error.message);
        alert("Failed to save patient to database.");
      } else {
        console.log("Patient profile synced to Supabase.");
      }
    }
    setIsEditingPatient(!isEditingPatient);
  };

  // Sync patient ID changes to the simulation (via backend)
  useEffect(() => {
    if (patientDetails.id) {
      fetch("http://localhost:3001/simulation/active-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patientDetails.id })
      }).catch(err => console.error("Failed to sync simulation patient:", err));
    }
  }, [patientDetails.id]);


  // Handle incoming data from Web Serial
  const handleSerialData = useCallback((newData) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const dataWithTimestamp = { ...newData, timestamp };

    setData(dataWithTimestamp);
    setHistory(prev => {
      const updated = [...prev, dataWithTimestamp];
      return updated.slice(-60); // Keep last 60
    });
    setSignalStrength(4);

    // Sync to backend (blockchain)
    fetch("http://localhost:3001/record-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientDetails.id,
        ...newData
      })
    }).catch(err => console.error("Blockchain sync failed:", err));
  }, [patientDetails.id]);

  const { isConnected: isHardwareConnected, connect: connectHardware, disconnect: disconnectHardware, error: serialError } = useWebSerial(handleSerialData);

  // Poll Backend (Remote Monitoring / Simulation Mode)
  useEffect(() => {
    // Only poll if NOT connected to hardware directly (to avoid state conflicts)
    if (isHardwareConnected) return;

    const updateVitals = async () => {
      try {
        // Parallel fetch for data and status
        const [dataRes, statusRes, auditRes] = await Promise.all([
          fetch(`http://localhost:3001/health/${patientDetails.id}`),
          fetch(`http://localhost:3001/system-status`),
          fetch(`http://localhost:3001/audit-logs`)
        ]);

        const json = await dataRes.json();
        const statusJson = await statusRes.json();
        const auditJson = await auditRes.json();

        setLifiStatus({
          connected: statusJson.lifiConnected,
          lastSignal: statusJson.lastSignal
        });

        setBlockchainLogs(auditJson);

        if (Array.isArray(json) && json.length > 0) {
          // Sort by timestamp descending
          const sorted = [...json].sort((a, b) => b.timestamp - a.timestamp);
          const latest = sorted[0];

          setData(latest);
          // Keep last 60 points for graph
          setHistory(sorted.slice(0, 60).reverse());

          // Randomize signal strength for effect
          setSignalStrength(Math.floor(Math.random() * 2) + 3); // 3 or 4 bars
        }
      } catch (err) {
        console.error("Signal Lost", err);
        setSignalStrength(0);
      }
    };

    const interval = setInterval(updateVitals, 3000); // 3s polling
    updateVitals();
    return () => clearInterval(interval);
  }, [isHardwareConnected, patientDetails.id]);

  return (
    <div className="dashboard-container">
      {/* 1. Header */}
      <nav className="top-nav">
        <div className="nav-brand">LumeHeart</div>
        <div className="nav-right">
          <button
            className={`hardware-toggle ${isHardwareConnected ? 'connected' : ''}`}
            onClick={isHardwareConnected ? disconnectHardware : connectHardware}
          >
            {isHardwareConnected ? '🔌 Hardware Connected' : '🔌 Connect Li-Fi Hardware'}
          </button>

          <div className={`system-status ${(lifiStatus.connected || isHardwareConnected) ? 'lifi-active' : ''}`}>
            <div className="status-dot"></div>
            {isHardwareConnected ? 'Direct Hardware Link' : lifiStatus.connected ? 'Li-Fi Receiver Active' : 'Simulation Mode'}
          </div>

          <div className="user-profile">
            <div className="user-info-stack" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>
                {userDisplayName}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {userRole}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} style={{ padding: '5px 15px', fontSize: '0.8rem' }}>Exit</button>
        </div>
      </nav>

      {/* 2. Main Dashboard Grid */}
      <main className="main-grid">
        {serialError && (
          <div className="error-banner">
            ⚠️ {serialError}
          </div>
        )}

        {showDetail ? (
          <PatientDetail
            patientDetails={patientDetails}
            currentData={data}
            blockchainLogs={blockchainLogs}
            onBack={() => setShowDetail(false)}
          />
        ) : (
          <>
            {/* LiveVitals Component Integration */}
            <div style={{ gridColumn: '1 / -1' }}>
              <LiveVitals
                data={data}
                history={history}
                patientDetails={patientDetails}
                setPatientDetails={setPatientDetails}
                isEditingPatient={isEditingPatient}
                setIsEditingPatient={handleToggleEdit}
              />
            </div>


            {/* 3. Settings / Bottom Panel */}
            <div className="glass-card settings-panel">
              <div className="control-group">
                <div className="metric-label" style={{ marginRight: '15px' }}>Device Settings</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Configured for Patient: {patientDetails.id} | Mode: {isHardwareConnected ? 'Local Hardware' : 'Blockchain Stream'}
                </div>
                <button
                  className="back-btn"
                  style={{ marginLeft: '10px', fontSize: '0.75rem' }}
                  onClick={() => setShowDetail(true)}
                >
                  View Clinical Details →
                </button>
              </div>

              <div className="control-group">
                <div className="signal-meter">
                  <span className="signal-label">Signal Strength</span>
                  <div className="signal-bars">
                    {[1, 2, 3, 4].map(bar => (
                      <div
                        key={bar}
                        className={`bar ${signalStrength >= bar ? 'active' : ''}`}
                        style={{ height: bar * 4 + 'px', opacity: signalStrength >= bar ? 1 : 0.3 }}
                      ></div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748B' }}>
                  Last Updated:<br />
                  {data.timestamp ? new Date(data.timestamp * 1000).toLocaleTimeString() : 'Searching...'}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;

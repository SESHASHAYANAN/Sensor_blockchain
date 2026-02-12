import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import BlockchainAudit from './BlockchainAudit';

const PatientDetail = ({ patientDetails, currentData, blockchainLogs, onBack }) => {
    const [fhirData, setFhirData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch full FHIR resources from the compliant backend
        const fetchFhir = async () => {
            try {
                const res = await fetch(`http://localhost:3001/health/${patientDetails.id}`);
                const json = await res.json();
                if (json && json.length > 0) {
                    setFhirData(json[json.length - 1]); // Show latest record as FHIR bundle
                }
            } catch (err) {
                console.error("Failed to fetch FHIR records", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFhir();
    }, [patientDetails.id]);

    return (
        <div className="patient-detail-view glass-card">
            <div className="detail-header">
                <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
                <div className="patient-header-info">
                    <h2>Clinical Intelligence: {patientDetails.name}</h2>
                    <span className="patient-sub-id">ID: {patientDetails.id} | Age: {patientDetails.age} | {patientDetails.gender}</span>
                </div>
            </div>

            <div className="detail-grid">
                {/* 1. Real-time Telemetry Status */}
                <div className="analytics-card">
                    <div className="metric-label">Signal Status (NRZ-L)</div>
                    <div className="signal-specs">
                        <div className="spec-item">
                            <span>Modulation:</span>
                            <span>OOK (On-Off Keying)</span>
                        </div>
                        <div className="spec-item">
                            <span>Baud Rate:</span>
                            <span>115,200 bps</span>
                        </div>
                        <div className="spec-item">
                            <span>Clock Recovery:</span>
                            <span className="text-green">LOCKED</span>
                        </div>
                    </div>
                </div>

                {/* 2. Target Vitals (GOLD Staged) */}
                <div className="analytics-card">
                    <div className="metric-label">Clinical Targets</div>
                    <div className="target-list">
                        <div className="target-item">
                            <span>SpO2 Ceiling:</span>
                            <span>92% (COPD Guardrail)</span>
                        </div>
                        <div className="target-item">
                            <span>Alarm Threshold:</span>
                            <span>&lt; 88%</span>
                        </div>
                    </div>
                </div>

                {/* 3. Blockchain Audit Trail (Moved here) */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <BlockchainAudit logs={blockchainLogs} />
                </div>
            </div>
        </div>
    );
};

export default PatientDetail;

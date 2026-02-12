import React, { useEffect, useState, useRef } from 'react';
import './LiveVitals.css';
import NRZSignalVisualizer from './NRZSignalVisualizer';
import { nrzDecoder } from '../utils/nrzDecoder';

/**
 * High-Performance Canvas Waveform Component
 * Renders a 60FPS sweeping physiological waveform (PPG simulation)
 */
const CanvasWaveform = ({ history, datakey, color, min, max, isExacerbation, isCOPDMode }) => {
    const canvasRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (canvasRef.current) {
                const { width, height } = canvasRef.current.parentElement.getBoundingClientRect();
                setDimensions({ width, height });
                canvasRef.current.width = width * window.devicePixelRatio;
                canvasRef.current.height = height * window.devicePixelRatio;
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (!canvasRef.current || history.length < 2) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        const dpr = window.devicePixelRatio;

        ctx.clearRect(0, 0, width, height);

        // --- COPD Guardrail Background ---
        if (datakey === 'spO2' && isCOPDMode) {
            const lowY = height - (((88 - min) / (max - min)) * height);
            const highY = height - (((92 - min) / (max - min)) * height);
            ctx.fillStyle = 'rgba(255, 215, 64, 0.15)'; // #FFD740 ErroMed Amber
            ctx.fillRect(0, highY, width, lowY - highY);

            ctx.fillStyle = 'rgba(255, 215, 64, 0.5)';
            ctx.font = `${8 * dpr}px Inter`;
            ctx.fillText('COPD TARGET (88-92%)', 5, highY + (10 * dpr));
        }

        ctx.strokeStyle = isExacerbation ? '#FF5252' : color;
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        history.forEach((d, i) => {
            const x = (i / (history.length - 1)) * width;
            let val = d[datakey];
            if (val === undefined || val === null) val = min;

            // Normalize Y
            const normalizedY = ((val - min) / (max - min)) * height;
            const y = height - (normalizedY || 0);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Add glow effect for "Live" feel
        ctx.shadowBlur = 10 * dpr;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();

    }, [history, datakey, color, min, max, isExacerbation, dimensions, isCOPDMode]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '60px', borderRadius: '4px' }}
        />
    );
};

const LiveVitals = ({
    data,
    history,
    patientDetails,
    setPatientDetails,
    isEditingPatient,
    setIsEditingPatient
}) => {
    const [pulseSpeed, setPulseSpeed] = useState('1s');
    const [isCOPDMode, setIsCOPDMode] = useState(false);
    const [goldStage, setGoldStage] = useState(2);
    const [signalBits, setSignalBits] = useState([]);
    const [metrics, setMetrics] = useState({ sqi: 0, snr: 0 });
    const [lastSync, setLastSync] = useState(Date.now());
    const [showTechnical, setShowTechnical] = useState(false);

    const [fhirCounter, setFhirCounter] = useState(0);



    // Clamped and Validated Vitals
    const rawSpO2 = data?.spO2 || 0;
    const heartRate = data?.heartRate || 0;

    // Physiological clamping: SpO2 cannot exceed 100%
    const clampedSpO2 = Math.min(rawSpO2, 100);

    // Clinical Logic - GOLD Staged Thresholds
    const spo2LowThreshold = isCOPDMode ? (goldStage >= 3 ? 88 : 90) : 90;
    const spo2HighThreshold = isCOPDMode ? 92 : 100;

    const isHypoxia = clampedSpO2 > 0 && clampedSpO2 < spo2LowThreshold;
    const isHyperoxia = isCOPDMode && clampedSpO2 > spo2HighThreshold;
    const isBradycardia = heartRate > 0 && heartRate < 60;
    const isTachycardia = heartRate > 100;

    // Alarm Priority (IEC 60601-1-8)
    const isHighPriority = (isHypoxia && heartRate > 110) || clampedSpO2 < 85;
    const isMediumPriority = isHypoxia || isHyperoxia || isBradycardia || isTachycardia;
    const isTechnicalAlert = (Date.now() - lastSync) > 5000;

    useEffect(() => {
        if (data?.timestamp) {
            setLastSync(Date.now());
            // Re-encode real NRZ bits for the technical view
            const realBits = nrzDecoder.generatePacketBitstream(heartRate, clampedSpO2);
            const m = nrzDecoder.calculateMetrics(realBits);
            setSignalBits(realBits);
            setMetrics(m);

            // Increment FHIR counter to simulate successful transmissions
            setFhirCounter(prev => prev + 1);
        } else {
            // No active signal detected
            setSignalBits([]);
            setMetrics({ sqi: 0, snr: 0 });
        }
    }, [data?.timestamp, heartRate, clampedSpO2]);

    useEffect(() => {
        if (heartRate > 0) {
            const speed = (60 / heartRate).toFixed(2);
            setPulseSpeed(`${speed}s`);
        }
    }, [heartRate]);

    return (
        <div className={`vitals-dashboard ${isHighPriority ? 'critical-active' : ''}`}>
            <div className="status-header">
                <div className="patient-info">
                    <span className="patient-id">ID: {patientDetails.id}</span>
                    <span className={`sync-status ${isTechnicalAlert ? 'alert' : ''}`}>
                        {isTechnicalAlert ? '⚠ SIGNAL UNSTABLE' : '● SIGNAL LOCKED'}
                        <span className="snr-small"> (SNR: {metrics.snr} dB)</span>
                    </span>
                </div>

                <div className="header-controls">
                    <button
                        className={`tech-toggle ${showTechnical ? 'active' : ''}`}
                        onClick={() => setShowTechnical(!showTechnical)}
                    >
                        {showTechnical ? 'Clinical View' : 'Technical View'}
                    </button>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={isCOPDMode} onChange={() => setIsCOPDMode(!isCOPDMode)} />
                        <span className="slider"></span>
                        <span className="label-text">COPD Guardrails</span>
                    </label>
                    {isCOPDMode && (
                        <select className="gold-selector" value={goldStage} onChange={(e) => setGoldStage(Number(e.target.value))}>
                            <option value={1}>GOLD 1</option>
                            <option value={2}>GOLD 2</option>
                            <option value={3}>GOLD 3</option>
                            <option value={4}>GOLD 4</option>
                        </select>
                    )}
                </div>
            </div>

            <div className="vitals-grid">
                {/* Heart Rate - HERO TILE */}
                <div className={`bento-tile tile-hero ${isHighPriority ? 'critical' : isMediumPriority && (isBradycardia || isTachycardia) ? 'warning' : ''}`}>
                    <div className="tile-header">
                        <span className="tile-label">HEART RATE</span>
                        <span className="sqi-indicator">SQI: {metrics.sqi}%</span>
                    </div>
                    <div className="tile-main">
                        <span className="heart-icon lub-dub" style={{ animationDuration: pulseSpeed }}>♥</span>
                        <span className="main-value">{heartRate || '--'}</span>
                        <span className="main-unit">BPM</span>
                    </div>
                    <div className="waveform-container">
                        <CanvasWaveform history={history} datakey="heartRate" color="#FF5252" min={50} max={130} isExacerbation={isHighPriority} />
                    </div>
                </div>

                {/* SpO2 - HERO TILE */}
                <div className={`bento-tile tile-hero ${isHighPriority ? 'critical' : isMediumPriority && (isHypoxia || isHyperoxia) ? 'warning' : ''}`}>
                    <div className="tile-header">
                        <span className="tile-label">OXYGEN SATURATION (SpO2)</span>
                        <div className="threshold-indicator">
                            Target: {isCOPDMode ? '88-92%' : '94-100%'}
                        </div>
                    </div>
                    <div className="tile-main">
                        <span className="spo2-icon breathing">O₂</span>
                        <span className="main-value">{clampedSpO2 || '--'}</span>
                        <span className="main-unit">%</span>
                    </div>
                    <div className="waveform-container">
                        <CanvasWaveform
                            history={history}
                            datakey="spO2"
                            color="#34D399"
                            min={80}
                            max={100}
                            isExacerbation={isHighPriority}
                            isCOPDMode={isCOPDMode}
                        />
                    </div>
                    {isHyperoxia && <div className="critical-text blink">⚠ HYPEROXIA RISK (COPD)</div>}
                    {isHypoxia && <div className="critical-text blink">⚠ HYPOXIA DETECTED</div>}
                </div>

                {/* Patient Details - Editable Tile */}
                <div className="bento-tile tile-patient-details">
                    <div className="tile-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div className="tile-label">PATIENT DETAILS</div>
                        <button
                            onClick={() => setIsEditingPatient(!isEditingPatient)}
                            style={{
                                background: 'transparent', border: '1px solid var(--clinical-blue)',
                                color: 'var(--clinical-blue)', borderRadius: '4px', cursor: 'pointer',
                                padding: '2px 8px', fontSize: '0.75rem'
                            }}
                        >
                            {isEditingPatient ? 'SAVE' : 'EDIT'}
                        </button>
                    </div>

                    {isEditingPatient ? (
                        <div className="patient-meta-edit" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                className="patient-input"
                                value={patientDetails.name}
                                onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                                placeholder="Name"
                            />
                            <input
                                className="patient-input"
                                value={patientDetails.id}
                                onChange={(e) => setPatientDetails({ ...patientDetails, id: e.target.value })}
                                placeholder="ID"
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    className="patient-input"
                                    value={patientDetails.age}
                                    onChange={(e) => setPatientDetails({ ...patientDetails, age: e.target.value })}
                                    placeholder="Age"
                                    style={{ width: '50%' }}
                                />
                                <select
                                    className="patient-input"
                                    value={patientDetails.gender}
                                    onChange={(e) => setPatientDetails({ ...patientDetails, gender: e.target.value })}
                                    style={{ width: '50%' }}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="patient-meta">
                            <div className="meta-row"><span className="meta-label">Name</span> <span className="meta-val">{patientDetails.name}</span></div>
                            <div className="meta-row"><span className="meta-label">ID</span> <span className="meta-val">{patientDetails.id}</span></div>
                            <div className="meta-row"><span className="meta-label">Age</span> <span className="meta-val">{patientDetails.age}</span></div>
                            <div className="meta-row"><span className="meta-label">Gender</span> <span className="meta-val">{patientDetails.gender}</span></div>
                        </div>
                    )}
                </div>

                {/* Link Integrity */}
                <div className={`bento-tile tile-link ${isTechnicalAlert ? 'technical' : ''}`}>
                    <div className="tile-label">LINK INTEGRITY</div>
                    <div className="link-info">
                        <div className="link-row">Latency: {((Date.now() - lastSync) / 10).toFixed(0)}ms</div>
                        <div className="link-row">Protocol: NRZ-OOK</div>
                        <div className="link-row fhir-status">FHIR R4: {fhirCounter} sent</div>
                    </div>
                </div>

                {/* Clinical Status */}
                <div className={`bento-tile tile-status ${isHighPriority ? 'critical' : isMediumPriority ? 'warning' : 'stable'}`}>
                    <div className="tile-label">CLINICAL STATUS</div>
                    <div className="status-display">
                        {isHighPriority && <span className="warning-icon-small">⚠</span>}
                        <span className="status-text">
                            {isHighPriority ? 'CRITICAL' :
                                isMediumPriority ? 'UNSTABLE' : 'STABLE'}
                        </span>
                    </div>
                </div>

                {/* NRZ Signal Waveform — large panel */}
                <div className="nrz-decode-panel">
                    <div className="nrz-decode-header">
                        <span className="nrz-decode-title">Real-Time NRZ Decoding</span>
                        <span className="nrz-decode-badge">LIVE</span>
                    </div>
                    <NRZSignalVisualizer bits={signalBits} snr={metrics.snr} height={200} color="#22D3EE" />
                    <div className="nrz-decoded-readout">
                        <div className="decoded-field">
                            <span className="decoded-label">Protocol</span>
                            <span className="decoded-value protocol-val">NRZ-OOK @ 115.2kbps</span>
                        </div>
                        <div className="decoded-field">
                            <span className="decoded-label">Signal Quality</span>
                            <span className="decoded-value">{metrics.sqi}%</span>
                        </div>
                        <div className="decoded-field">
                            <span className="decoded-label">SNR</span>
                            <span className="decoded-value">{metrics.snr} dB</span>
                        </div>
                    </div>
                    {showTechnical && (
                        <div className="nrz-extra-detail">
                            <span className="extra-field">Bits: {signalBits.length}</span>
                            <span className="extra-field">Preamble: 4× 0x55</span>
                            <span className="extra-field">Sync: 0xAA</span>
                            <span className="extra-field">Payload: "{heartRate},{clampedSpO2}\n"</span>
                            <span className="extra-field">End: 0xFF</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveVitals;

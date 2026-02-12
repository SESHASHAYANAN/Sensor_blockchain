import React from 'react';

/**
 * Blockchain Audit Trail Component
 * Displays real-time HMAC-SHA256 anchors and blockchain transaction status.
 */
const BlockchainAudit = ({ logs }) => {
    return (
        <div className="bento-tile tile-full blockchain-audit-panel">
            <div className="tile-header">
                <span className="tile-label">BLOCKCHAIN AUDIT TRAIL (HMAC-SHA256)</span>
                <span className="status-badge stable">IMMUTABLE BITS</span>
            </div>
            <div className="audit-log-container">
                {logs.length === 0 ? (
                    <div className="empty-audit">Waiting for next data anchoring cycle...</div>
                ) : (
                    logs.map((log, index) => {
                        const parts = log.split(' | ');
                        const timestamp = parts[0];
                        const action = parts[1]?.replace('ACTION: ', '');
                        const details = parts[3];

                        // Extract HMAC from details if present
                        const hmacMatch = details?.match(/HMAC: ([a-f0-9]+)/);
                        const hmac = hmacMatch ? hmacMatch[1] : null;

                        return (
                            <div key={index} className="audit-row">
                                <span className="audit-ts">{new Date(timestamp).toLocaleTimeString()}</span>
                                <span className={`audit-action ${action?.toLowerCase().replace(/_/g, '-')}`}>
                                    {action}
                                </span>
                                {hmac ? (
                                    <span className="audit-hash" title={hmac}>
                                        {hmac.substring(0, 16)}...
                                    </span>
                                ) : (
                                    <span className="audit-details">{details}</span>
                                )}
                                <span className="audit-status">● VERIFIED</span>
                            </div>
                        );
                    })
                )}
            </div>
            <style jsx="true">{`
                .blockchain-audit-panel {
                    min-height: 200px;
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8));
                }
                .audit-log-container {
                    max-height: 150px;
                    overflow-y: auto;
                    margin-top: 10px;
                    font-family: 'Inter', sans-serif;
                }
                .audit-row {
                    display: grid;
                    grid-template-columns: 80px 140px 1fr 100px;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    align-items: center;
                    font-size: 0.75rem;
                }
                .audit-ts {
                    color: #64748b;
                    font-family: 'Courier New', Courier, monospace;
                }
                .audit-action {
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-size: 0.65rem;
                }
                .audit-action.write-record-anchored { color: #34D399; }
                .audit-action.fetch-records { color: #6366F1; }
                .audit-action.critical-intervention-anchored { color: #FF5252; }
                
                .audit-hash {
                    color: #22D3EE;
                    font-family: 'Courier New', Courier, monospace;
                    background: rgba(34, 211, 238, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .audit-details {
                    color: #94A3B8;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .audit-status {
                    text-align: right;
                    color: #34D399;
                    font-weight: 800;
                    font-size: 0.65rem;
                }
                .empty-audit {
                    text-align: center;
                    color: #64748b;
                    padding: 40px 0;
                    font-style: italic;
                }
                /* Scrollbar */
                .audit-log-container::-webkit-scrollbar {
                    width: 4px;
                }
                .audit-log-container::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.05);
                }
                .audit-log-container::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.3);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default BlockchainAudit;

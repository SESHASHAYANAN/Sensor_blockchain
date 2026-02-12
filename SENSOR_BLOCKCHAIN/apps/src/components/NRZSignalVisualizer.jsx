import React, { useRef, useEffect } from 'react';

/**
 * NRZ Signal Visualizer
 * Renders a real-time square wave representation of the digital bitstream.
 */
const NRZSignalVisualizer = ({ bits, snr = '21.4', color = '#3b82f6', height = 40 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            ctx.clearRect(0, 0, rect.width, height);

            if (!bits || bits.length === 0) return;

            const step = rect.width / (bits.length - 1);
            const midY = height / 2;
            const amp = height * 0.4;

            // 1. Draw Clock Recovery (Strobe Lines)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            for (let i = 0; i < bits.length; i++) {
                const x = i * step;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash

            // 2. Draw NRZ Waveform
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'miter'; // Sharper corners for digital signal

            let prevX = 0;
            let prevY = bits[0] === 1 ? midY - amp : midY + amp;

            ctx.moveTo(prevX, prevY);

            for (let i = 1; i < bits.length; i++) {
                const x = i * step;
                const y = bits[i] === 1 ? midY - amp : midY + amp;

                // Square wave transition (Step function)
                ctx.lineTo(x, prevY);
                ctx.lineTo(x, y);

                prevX = x;
                prevY = y;
            }

            // Glow effect
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset for next elements

            // 3. Draw SNR Overlay
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 8px Courier New';
            ctx.fillText(`SNR: ${snr} dB`, 5, 10);
        };

        draw();
    }, [bits, color, height, snr]);

    return (
        <div className="nrz-visualizer-container" style={{ marginTop: '15px' }}>
            <div className="visualizer-header" style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                NRZ Signal Stream (L-Level)
            </div>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: `${height}px`, background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}
            />
        </div>
    );
};

export default NRZSignalVisualizer;

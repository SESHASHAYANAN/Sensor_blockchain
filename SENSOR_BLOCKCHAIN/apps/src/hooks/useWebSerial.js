import { useState, useCallback, useRef } from 'react';
import { nrzDecoder } from '../utils/nrzDecoder';

/**
 * Custom hook to manage Web Serial API connection and data reading.
 * Integrates NRZ OOK Demodulation for clinical-grade hardware.
 */
export const useWebSerial = (onDataReceived) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const portRef = useRef(null);
    const readerRef = useRef(null);
    const keepReadingRef = useRef(true);

    const disconnect = useCallback(async () => {
        keepReadingRef.current = false;

        if (readerRef.current) {
            try {
                await readerRef.current.cancel();
            } catch (err) {
                console.error("Error canceling reader:", err);
            }
        }

        if (portRef.current) {
            try {
                await portRef.current.close();
            } catch (err) {
                console.error("Error closing port:", err);
            }
        }

        portRef.current = null;
        readerRef.current = null;
        setIsConnected(false);
    }, []);

    const connect = useCallback(async () => {
        setError(null);
        try {
            if (!("serial" in navigator)) {
                throw new Error("Web Serial API not supported in this browser.");
            }

            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });
            portRef.current = port;
            setIsConnected(true);
            keepReadingRef.current = true;

            const decoder = new TextDecoderStream();
            const inputDone = port.readable.pipeTo(decoder.writable);
            const inputStream = decoder.readable;
            const reader = inputStream.getReader();
            readerRef.current = reader;

            // Read loop
            (async () => {
                try {
                    let buffer = '';
                    while (keepReadingRef.current) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        if (value) {
                            buffer += value;
                            const lines = buffer.split('\n');
                            buffer = lines.pop(); // Keep partial line in buffer

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;

                                // Parse "hr,spo2"
                                const parts = trimmed.split(',');
                                if (parts.length === 2) {
                                    const hr = parseInt(parts[0]);
                                    const spo2 = parseInt(parts[1]);
                                    if (!isNaN(hr) && !isNaN(spo2)) {
                                        onDataReceived({ heartRate: hr, spO2: spo2 });
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Serial read error:", err);
                    setError("Serial connection lost.");
                    disconnect();
                } finally {
                    reader.releaseLock();
                }
            })();

        } catch (err) {
            console.error("Serial connection error:", err);
            setError(err.message || "Failed to connect to serial port.");
            setIsConnected(false);
        }
    }, [onDataReceived, disconnect]);

    return { isConnected, error, connect, disconnect };
};

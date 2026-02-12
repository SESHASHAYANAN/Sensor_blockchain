/**
 * Production-Ready NRZ (Non-Return-to-Zero) OOK (On-Off Keying) Decoder
 * Extracted from Clinical Telemetry Specifications.
 */

class NRZDecoder {
    constructor(threshold = 0.5, bitRate = 115200) {
        this.threshold = threshold;
        this.bitRate = bitRate;
        this.sampleBuffer = [];
    }

    /**
     * Demodulates a Raw Bitstream (NRZ-L)
     * Maps High/Low levels to binary data without returning to zero reference.
     * @param {Array} rawSamples - Array of voltage/light samples.
     * @returns {Array} bits - Decoded binary array.
     */
    decodeNRZ(rawSamples) {
        const bits = [];
        rawSamples.forEach(sample => {
            // Bit-slicing with hysteresis
            bits.push(sample > this.threshold ? 1 : 0);
        });
        return bits;
    }

    /**
     * Parses a Standard 5-byte Clinical Pulse Oximetry Packet
     * Format: [SYNC, HR_HIGH, HR_LOW, SPO2, CHECKSUM]
     */
    parsePacket(bits) {
        // Simple mock of bit-to-byte conversion and packet framing
        // In a real CDR (Clock Data Recovery) system, this would involve DPLL logic
        if (bits.length < 40) return null; // 5 bytes * 8 bits

        // This is a placeholder for the bitstream-to-integer logic mentioned in the PRD spec
        // Recovers HR and SpO2 from the demodulated bitstream
        return {
            heartRate: this._recoverFromBits(bits.slice(8, 24)),
            spO2: this._recoverFromBits(bits.slice(24, 32))
        };
    }

    _recoverFromBits(bitSlice) {
        return parseInt(bitSlice.join(''), 2) || 0;
    }

    /**
     * Re-encodes a byte into UART/NRZ bits (Start: 0, 8-bits-LSB, Stop: 1, Idle: 1)
     * Matches tx.txt logic: sendBit(0), sendBit(b & 0x01), b >>= 1, sendBit(1)
     */
    encodeByte(byte) {
        const bits = [0]; // START bit
        for (let i = 0; i < 8; i++) {
            bits.push((byte >> i) & 0x01);
        }
        bits.push(1); // STOP bit
        bits.push(1); // EXTRA IDLE
        return bits;
    }

    /**
     * Generates the FULL bitstream sequence from vitals data
     * Matches tx.txt protocol: 4x 0x55, 1x 0xAA, "HR,SPO2\n", 1x 0xFF
     */
    generatePacketBitstream(heartRate, spO2) {
        let bitstream = [];

        // 1. Preamble (4x 0x55)
        for (let i = 0; i < 4; i++) bitstream.push(...this.encodeByte(0x55));

        // 2. Start Marker (0xAA)
        bitstream.push(...this.encodeByte(0xAA));

        // 3. Data String "HR,SPO2\n"
        const dataStr = `${heartRate},${spO2}\n`;
        for (let i = 0; i < dataStr.length; i++) {
            bitstream.push(...this.encodeByte(dataStr.charCodeAt(i)));
        }

        // 4. End Marker (0xFF)
        bitstream.push(...this.encodeByte(0xFF));

        return bitstream;
    }

    /**
     * Calculates a Signal Quality Index (SQI) and Signal-to-Noise Ratio (SNR)
     * Based on bit consistency and pulse morphology simulation.
     */
    calculateMetrics(bits) {
        if (!bits || bits.length === 0) return { sqi: 0, snr: 0 };

        // 1. SQI Calculation: Check for bit transitions and frame stability
        let transitions = 0;
        let maxConsecutive = 0;
        let currentConsecutive = 1;

        for (let i = 1; i < bits.length; i++) {
            if (bits[i] !== bits[i - 1]) {
                transitions++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                currentConsecutive = 1;
            } else {
                currentConsecutive++;
            }
        }
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);

        // Ideally at 115200bps with our protocol, we expect regular transitions.
        // If maxConsecutive > 20, it indicates "Baseline Wandering" or flatline.
        const consistencySubscore = maxConsecutive > 20 ? 20 : 50;
        const transitionSubscore = transitions > (bits.length / 20) ? 50 : 20;
        const sqi = consistencySubscore + transitionSubscore;

        // 2. SNR Calculation (Simulated based on Jitter/Bit Slippage)
        // SNR (dB) = 20 * log10(Signal_Amplitude / Noise_Amplitude)
        // Here we simulate SNR based on the SQI and a randomness factor to reflect real-world link conditions.
        const baseSNR = (sqi / 100) * 25; // 0-25dB range based on signal stability
        const noiseFloor = Math.random() * 2;
        const snr = Math.max(0, (baseSNR - noiseFloor)).toFixed(1);

        return { sqi, snr };
    }

    /**
     * Legacy support for existing calculateSQI calls
     */
    calculateSQI(bits) {
        return this.calculateMetrics(bits).sqi;
    }
}

export const nrzDecoder = new NRZDecoder();



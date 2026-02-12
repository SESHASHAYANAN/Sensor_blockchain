const fs = require('fs');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3');

const web3 = new Web3('http://localhost:8545');

const contractPath = path.resolve(__dirname, '../contracts', 'HealthData.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'HealthData.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contractFile = output.contracts['HealthData.sol']['HealthData'];
const bytecode = contractFile.evm.bytecode.object;
const abi = contractFile.abi;

console.log('Contract Compiled!');

// --- Signal Processing Simulation ---

// Simulates ARM Cortex M4 Filtering & Peak Detection
function simulateSignalProcessing(currentHR, currentSpO2) {
    // 1. Generate Raw PPG Signal (AC + DC components + Noise)
    // DC component: varies slowly with respiration/motion
    const dcComponent = 1000 + Math.sin(Date.now() / 5000) * 50;
    // AC component: varies with heart beat
    const acComponent = 200 * Math.sin((Date.now() / 60000) * currentHR * 2 * Math.PI);
    // Noise: Ambient Light / Motion Artifacts
    const noise = (Math.random() - 0.5) * 20;

    const rawSignal = dcComponent + acComponent + noise;

    // 2. Calculate SNR and jitter for simulation
    const snr = Math.abs(acComponent / (noise + 1)); // Signal-to-Noise Ratio
    const jitter = (1 / snr) * 5; // Higher SNR -> Lower Jitter

    // Adjusted HR based on processing quality
    const processedHR = Math.round(currentHR + (Math.random() - 0.5) * jitter);

    // 5. SpO2 Calculation (Ratio of Ratios)
    // R = (AC_red/DC_red) / (AC_ir/DC_ir)
    // SpO2 = 110 - 25 * R
    // Inverse calculation for simulation: R = (110 - TargetSpO2) / 25
    const targetR = (110 - currentSpO2) / 25;
    const measureR = targetR + (Math.random() - 0.5) * 0.05; // Measurement error
    const calculatedSpO2 = Math.min(100, Math.round(110 - 25 * measureR));

    return {
        heartRate: processedHR,
        spO2: calculatedSpO2,
        snr: snr.toFixed(2)
    };
}

(async () => {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];

    console.log('Deploying from:', deployer);

    const contract = new web3.eth.Contract(abi);

    const deployedContract = await contract
        .deploy({ data: bytecode })
        .send({ from: deployer, gas: 1500000, gasPrice: '30000000000' });

    console.log('Contract Address:', deployedContract.options.address);
    fs.writeFileSync(path.resolve(__dirname, '../contract_address.txt'), deployedContract.options.address);
    fs.writeFileSync(path.resolve(__dirname, '../contract_abi.json'), JSON.stringify(abi, null, 2));

    console.log('Simulating Advanced Signal Processing via IoT Gateway...');

    // Base values that drift slowly
    let baseHR = 75;
    let baseSpO2 = 98;

    let patientId = 'test123';

    // Poll for active patient updates from the UI
    setInterval(async () => {
        try {
            const res = await fetch("http://localhost:3001/simulation/active-patient");
            const json = await res.json();
            if (json.patientId && json.patientId !== patientId) {
                console.log(`[GATEWAY] Switched to Patient: ${json.patientId}`);
                patientId = json.patientId;
            }
        } catch (e) {
            // Ignore polling errors
        }
    }, 5000);

    setInterval(async () => {

        // Simulate patient physiology drift
        baseHR += (Math.random() - 0.5) * 2; // Slowly wander
        if (baseHR < 60) baseHR = 65;
        if (baseHR > 100) baseHR = 95;

        // Occasional anomaly (Hypoxia event)
        if (Math.random() < 0.05) {
            baseSpO2 = 85 + Math.random() * 4; // Drop to 85-89
            console.log(`[PHYSIOLOGY] HYPOXIA EVENT STARTED`);
        } else {
            // Recovery
            if (baseSpO2 < 95) baseSpO2 += 2;
            if (baseSpO2 > 100) baseSpO2 = 100;
        }

        // Apply Simulate Signal Processing (Gateway Layer)
        const processedData = simulateSignalProcessing(baseHR, baseSpO2);

        console.log(`[GATEWAY] Processing: RawSNR=${processedData.snr}dB -> Output: HR=${processedData.heartRate} bpm, SpO2=${processedData.spO2}%`);

        try {
            // Using the Backend/Gateway API instead of direct blockchain write
            // This ensures HMAC-SHA256 anchoring and clinical audit logging
            const response = await fetch("http://localhost:3001/record-vitals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId,
                    heartRate: processedData.heartRate,
                    spO2: processedData.spO2
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            console.log(`[GATEWAY] Anchored to Blockchain via Gateway`);
        } catch (e) {
            console.error("[GATEWAY] Gateway Anchor Error:", e.message);
        }

    }, 3000); // 3 seconds matching the polling interval

})();

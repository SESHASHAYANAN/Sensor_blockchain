const express = require('express');
const cors = require('cors');
const SerialPort = require('serialport');
const ReadlineParser = require('@serialport/parser-readline');
const Web3 = require('web3');

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = require('path');

// --- HIPAA/GDPR Audit Logger ---
const auditLogPath = path.resolve(__dirname, 'audit.log');
const logAccess = (action, patientId, details = '') => {
  const logEntry = `${new Date().toISOString()} | ACTION: ${action} | PATIENT: ${patientId} | ${details}\n`;
  fs.appendFileSync(auditLogPath, logEntry);
};

// Connect to your Geth node or local blockchain
const web3 = new Web3('http://localhost:8545');

let contract;
let contractAddress;

// Function to load contract
function loadContract() {
  try {
    const addressPath = path.resolve(__dirname, '../contract_address.txt');
    const abiPath = path.resolve(__dirname, '../contract_abi.json');

    if (fs.existsSync(addressPath) && fs.existsSync(abiPath)) {
      const newAddress = fs.readFileSync(addressPath, 'utf8').trim();

      // Only reload if the address has changed
      if (newAddress !== contractAddress) {
        contractAddress = newAddress;
        const contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        contract = new web3.eth.Contract(contractABI, contractAddress);
        console.log('New Contract detected and loaded at:', contractAddress);
      }
    } else {
      if (!contract) console.log('Waiting for deployment... (run simulate.js)');
    }
  } catch (error) {
    console.error('Error loading contract:', error);
  }
}

// Initial load
loadContract();

// --- API endpoint for fetching health data ---

app.get('/health/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    logAccess('FETCH_RECORDS', patientId, `IP: ${req.ip}`);

    // Always ensure we have the latest contract reference
    loadContract();

    if (!contract) {
      return res.status(503).json({ error: 'Contract not deployed' });
    }

    const records = await contract.methods.getHealthData(patientId).call();

    const formattedRecords = records.map(r => {
      const hr = Number(r.heartRate);
      const spo2 = Number(r.spO2);
      const timestamp = new Date(Number(r.timestamp) * 1000).toISOString();

      return {
        patientId: r.patientId,
        heartRate: hr,
        spO2: spo2,
        timestamp: Number(r.timestamp),

        // --- Production-Ready FHIR Resource (Standardized LOINC) ---
        resourceType: "Bundle",
        type: "collection",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: `hr-${r.timestamp}`,
              status: "final", // PRD Status
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: {
                coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }]
              },
              subject: { reference: `Patient/${patientId}` },
              valueQuantity: { value: hr, unit: "beats/minute", system: "http://unitsofmeasure.org", code: "{beats}/min" },
              effectiveDateTime: timestamp
            }
          },
          {
            resource: {
              resourceType: "Observation",
              id: `spo2-${r.timestamp}`,
              status: "final", // PRD Status
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: {
                coding: [{ system: "http://loinc.org", code: "59408-5", display: "Oxygen saturation in Arterial blood by Pulse oximetry" }]
              },
              subject: { reference: `Patient/${patientId}` },
              valueQuantity: { value: spo2, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
              effectiveDateTime: timestamp
            }
          }
        ]
      };
    });
    res.json(formattedRecords);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Fetch error', details: error.toString() });
  }
});

let lastLiFiPing = 0;

// --- API endpoint for receiving health data from Python App ---
app.post('/record-vitals', async (req, res) => {
  const { patientId, heartRate, spO2 } = req.body;

  if (!patientId || !heartRate || !spO2) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Update Li-Fi heartbeat
  lastLiFiPing = Date.now();

  try {
    await uploadToBlockchain(patientId, heartRate, spO2);
    res.status(200).json({ message: 'Data recorded successfully' });
  } catch (error) {
    console.error('Error recording vitals:', error);
    res.status(500).json({ error: 'Failed to record vitals' });
  }
});

// --- Simulation Control Endpoint ---
let simulationPatientId = 'test123';
app.get('/simulation/active-patient', (req, res) => {
  res.json({ patientId: simulationPatientId });
});
app.post('/simulation/active-patient', (req, res) => {
  if (req.body.patientId) {
    simulationPatientId = req.body.patientId;
    console.log(`[SIMULATION] Active Patient changed to: ${simulationPatientId}`);
    res.json({ message: 'Patient ID updated' });
  } else {
    res.status(400).json({ error: 'Missing patientId' });
  }
});

// --- System Status Endpoint ---
app.get('/system-status', (req, res) => {
  const isLiFiConnected = (Date.now() - lastLiFiPing) < 5000;
  res.json({
    lifiConnected: isLiFiConnected,
    lastSignal: lastLiFiPing,
    blockchain: !!contract
  });
});

// --- Audit Logs Endpoint ---
app.get('/audit-logs', (req, res) => {
  try {
    if (fs.existsSync(auditLogPath)) {
      const logs = fs.readFileSync(auditLogPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .reverse()
        .slice(0, 50); // Last 50 entries
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read audit logs' });
  }
});

const crypto = require('crypto');
const SHARED_SECRET = 'clinical-trust-anchor-2026';

async function uploadToBlockchain(patientId, heartRate, spO2) {
  // Always ensure we have the latest contract reference
  loadContract();

  if (!contract) {
    throw new Error("Contract not loaded");
  }

  try {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    const timestamp = Math.floor(Date.now() / 1000);

    // --- HMAC-SHA256 Data Anchoring ---
    const payload = JSON.stringify({ patientId, heartRate, spO2, timestamp });
    const hmac = crypto.createHmac('sha256', SHARED_SECRET).update(payload).digest('hex');

    // Clinical Logic for Forensic Alerts
    const isCritical = spO2 < 85 || (heartRate > 120 || heartRate < 45);

    console.log(`[BLOCKCHAIN WRITE] Patient: ${patientId}, HR: ${heartRate}, SpO2: ${spO2}`);
    console.log(`[BLOCKCHAIN AUDIT] HMAC-SHA256: ${hmac}`);

    // Always log the anchoring for the audit trail
    logAccess('WRITE_RECORD_ANCHORED', patientId, `HMAC: ${hmac} | HR: ${heartRate}, SpO2: ${spO2}`);

    if (isCritical) {
      console.log(`[CRITICAL ALERT ANCHORED] Emergency HMAC logged for forensic audit.`);
      logAccess('CRITICAL_INTERVENTION_ANCHORED', patientId, `HMAC: ${hmac}`);
    }

    await contract.methods.addHealthData(
      patientId,
      heartRate,
      spO2,
      timestamp
    ).send({ from: deployer, gas: 200000 });

  } catch (error) {
    console.error('Blockchain Upload error:', error);
    throw error;
  }
}

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));


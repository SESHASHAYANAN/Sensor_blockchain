const express = require('express');
const cors = require('cors');
const SerialPort = require('serialport');
const ReadlineParser = require('@serialport/parser-readline');
const Web3 = require('web3');

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

// Connect to your Geth node or local blockchain
const web3 = new Web3('http://localhost:8545');

// --- Paste your ABI below ---
const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "patientId", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "heartRate", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "spO2", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "HealthDataAdded",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_patientId", "type": "string" },
      { "internalType": "uint256", "name": "_heartRate", "type": "uint256" },
      { "internalType": "uint256", "name": "_spO2", "type": "uint256" },
      { "internalType": "uint256", "name": "_timestamp", "type": "uint256" }
    ],
    "name": "addHealthData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "authorizeUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "authorizedUsers",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_patientId", "type": "string" }
    ],
    "name": "getHealthData",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "patientId", "type": "string" },
          { "internalType": "uint256", "name": "heartRate", "type": "uint256" },
          { "internalType": "uint256", "name": "spO2", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "internalType": "struct HealthData.HealthRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// --- Paste your deployed contract address below ---
const contractAddress = '0xd9145CCE52D386f254917e481eB44e9943F39138';

const contract = new web3.eth.Contract(contractABI, contractAddress);

// --- Serial port setup (optional, remove if not needed) ---
/*
const serialPort = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 }); // Adjust as needed
const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

parser.on('data', async (data) => {
  try {
    const sensorData = JSON.parse(data); // Should include {patientId, heartRate, spO2}
    if (validateSensorData(sensorData)) {
      await uploadToBlockchain(sensorData);
    }
  } catch (error) {
    console.error('Sensor error:', error);
  }
});

function validateSensorData(data) {
  return data && data.heartRate && data.spO2 && data.patientId;
}
*/

async function uploadToBlockchain(data) {
  try {
    const accounts = await web3.eth.getAccounts();
    const gasEstimate = await contract.methods
      .addHealthData(data.patientId, data.heartRate, data.spO2, Math.floor(Date.now() / 1000))
      .estimateGas({ from: accounts[0] });

    await contract.methods
      .addHealthData(data.patientId, data.heartRate, data.spO2, Math.floor(Date.now() / 1000))
      .send({ from: accounts[0], gas: gasEstimate });

    console.log('Data uploaded to blockchain!');
  } catch (error) {
    console.error('Upload error:', error);
  }
}

// --- API endpoint for fetching health data ---

app.get('/health/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const records = await contract.methods.getHealthData(patientId).call();
    // records is an array; each record has patientId, heartRate, spO2, timestamp
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Fetch error', details: error.toString() });
  }
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

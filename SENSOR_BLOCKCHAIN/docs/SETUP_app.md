# NPI Project Setup Guide

This project consists of a React frontend, an Express backend, a Blockchain simulation script, and Smart Contracts.

## Prerequisites
- Node.js & npm installed
- Ganache (or a local Ethereum node) running on `http://localhost:8545`

## Installation
Navigate to `app_name` and install dependencies:
```bash
cd app_name
npm install
```

## Running the Application
You need to run these components in separate terminal windows:

### 1. Start Local Blockchain
Ensure your local blockchain (e.g., Ganache) is running on port **8545**.

### 2. Start the Backend Server
This server acts as the API between the frontend and the blockchain.
```bash
# In app_name/
node backend/server.js
```
*Server runs on http://localhost:3001*

### 3. Run the Simulation (Data Generator)
This script deploys the Smart Contract and starts simulating patient data (Heart Rate, SpO2) pushing to the blockchain.
```bash
# In app_name/
node scripts/simulate.js
```
*You should see logs indicating "Contract Compiled", "Deploying", and then data processing events.*

### 4. Start the Frontend
Launch the React application.
```bash
# In app_name/
npm start
```
*Frontend runs on http://localhost:3000*

## Architecture Notes
- **Smart Contract**: `contracts/HealthData.sol` (Stores vitals on-chain)
- **Simulation**: `scripts/simulate.js` (Simulates IoT device & ARM Cortex processing)
- **Backend**: `backend/server.js` (Reads from Blockchain, formats as FHIR resources)
- **Frontend**: `src/components/LiveVitals.jsx` (Displays real-time data & alerts)

# Li-Fi Hardware Receiver Setup

This guide explains how to run the system with real hardware (Li-Fi Receiver) instead of the simulation script.

## 1. Hardware Firmware
- Flash the `rx.txt` code to your Arduino/ESP32 Receiver.
- Connect the Li-Fi Receiver sensor to Pin 13 (or as defined in code).
- Ensure the device is connected via USB to this computer.

## 2. Deploy Smart Contract
Since we are not running `simulate.js` (which auto-deploys), you must deploy the contract manually once.
```bash
cd app_name
node scripts/deploy.js
```
*This will generate `contract_address.txt` needed by the backend.*

## 3. Run Backend Server
Start the backend to listen for data from the Python app.
```bash
cd app_name
node backend/server.js
```

## 4. Run Frontend Dashboard
Start the React UI.
```bash
cd app_name
npm start
```

## 5. Connect Hardware (Option A: Direct Browser Link - RECOMMENDED)
1. Open the Web Dashboard (`http://localhost:3000`).
2. Click the **🔌 Connect Li-Fi Hardware** button in the header.
3. Select your Arduino COM port in the browser popup.
4. Data will flow directly into the dashboard and sync to the blockchain.

## 6. Run Python Li-Fi Receiver (Option B: Bridge Mode)
*Use this if your browser does not support Web Serial.*
Install dependencies (first time only):
```bash
cd lifi_receiver_app
pip install -r requirements.txt
```

Run the app:
```bash
python main.py
```

### Usage:
1. In the Python App, select the COM port of your Arduino.
2. Click **Connect**.
3. Data received via Li-Fi will show on the Python App AND be sent to the Blockchain.
4. The Web Dashboard (`http://localhost:3000`) will update in real-time.


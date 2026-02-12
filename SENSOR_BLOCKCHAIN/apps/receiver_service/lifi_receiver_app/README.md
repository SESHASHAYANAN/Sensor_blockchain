# Li-Fi Receiver Desktop App

This application connects to an ESP32 Li-Fi Receiver via USB Serial and displays real-time Heart Rate and SpO2 data.

## Requirements

1.  Python 3.x
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Application

1.  Connect your ESP32 Li-Fi Receiver via USB.
2.  Run the application:
    ```bash
    python main.py
    ```
3.  Select the correct COM port from the sidebar.
4.  Click "Connect".

## Expected Data Format

The application expects 115200 baud serial data in the following CSV format (one line per reading):
```
HR,SpO2
```
Example:
```
75,98
80,99
```

## Troubleshooting

-   **No Ports Found**: Ensure drivers for your ESP32 (CP210x or CH340) are installed.
-   **Connection Failed**: Check if another application (like Arduino Serial Monitor) is using the port.

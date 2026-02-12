import customtkinter as ctk
import serial
import serial.tools.list_ports
import threading
import time
import requests # Added for backend integration

# Configure customtkinter Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class SerialReader:
    def __init__(self, port, baudrate=115200, callback=None, error_callback=None):
        self.port = port
        self.baudrate = baudrate
        self.callback = callback
        self.error_callback = error_callback
        self.serial_connection = None
        self.running = False
        self.thread = None

    def start(self):
        if self.running:
            return
        try:
            self.serial_connection = serial.Serial(self.port, self.baudrate, timeout=1)
            self.running = True
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            return True
        except serial.SerialException as e:
            if self.error_callback:
                self.error_callback(f"Connection Failed: {e}")
            return False

    def stop(self):
        self.running = False
        if self.serial_connection:
            try:
                self.serial_connection.close()
            except Exception:
                pass
            self.serial_connection = None

    def _read_loop(self):
        while self.running and self.serial_connection and self.serial_connection.is_open:
            try:
                line = self.serial_connection.readline().decode('utf-8').strip()
                if line:
                    # Expected format: "HR,SpO2" e.g., "75,98"
                    parts = line.split(',')
                    if len(parts) == 2:
                        try:
                            hr = int(parts[0])
                            spo2 = int(parts[1])
                            if self.callback:
                                self.callback(hr, spo2)
                        except ValueError:
                            pass # Ignore malformed numbers
            except serial.SerialException as e:
                if self.error_callback:
                    self.error_callback(f"Serial Error: {e}")
                self.stop()
                break
            except Exception as e:
                # Catch-all for unexpected errors during read
                pass

class LiFiApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Antigravity Li-Fi Receiver")
        self.geometry("900x600")

        # Serial Manager
        self.serial_reader = None
        self.is_connected = False
        self.patient_id = "test123" # Default patient ID

        # Grid Layout Configuration
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self._create_sidebar()
        self._create_main_area()
        
        # Refresh ports on start
        self.refresh_ports()

    def _create_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Li-Fi Dashboard", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        # Port Selection
        self.port_label = ctk.CTkLabel(self.sidebar_frame, text="Select COM Port:", anchor="w")
        self.port_label.grid(row=1, column=0, padx=20, pady=(10, 0))
        
        self.port_option_menu = ctk.CTkOptionMenu(self.sidebar_frame, dynamic_resizing=False,
                                                  values=["Scanning..."])
        self.port_option_menu.grid(row=2, column=0, padx=20, pady=(10, 10))

        # Connect Button
        self.connect_btn = ctk.CTkButton(self.sidebar_frame, text="Connect", command=self.toggle_connection)
        self.connect_btn.grid(row=3, column=0, padx=20, pady=(10, 20))

        # Refresh Ports Button (small helpful addition)
        self.refresh_btn = ctk.CTkButton(self.sidebar_frame, text="Refresh Ports", 
                                         fg_color="transparent", border_width=2, text_color=("gray10", "#DCE4EE"),
                                         command=self.refresh_ports)
        self.refresh_btn.grid(row=4, column=0, padx=20, pady=(10, 20), sticky="s")


    def _create_main_area(self):
        self.main_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        self.main_frame.grid_columnconfigure((0, 1), weight=1)
        self.main_frame.grid_rowconfigure(0, weight=0) # Status row
        self.main_frame.grid_rowconfigure(1, weight=1) # Data row

        # --- Status Indicator Area ---
        self.status_frame = ctk.CTkFrame(self.main_frame, height=50, corner_radius=10)
        self.status_frame.grid(row=0, column=0, columnspan=2, sticky="ew", padx=10, pady=(0, 20))
        
        # Indicator Dot (using a rounded button as a non-interactive indicator)
        self.status_indicator = ctk.CTkButton(self.status_frame, text="", width=20, height=20, 
                                              corner_radius=10, fg_color="red", state="disabled")
        self.status_indicator.pack(side="left", padx=(20, 10), pady=10)
        
        self.status_label = ctk.CTkLabel(self.status_frame, text="Disconnected", font=ctk.CTkFont(size=16))
        self.status_label.pack(side="left", pady=10)

        # --- Data Displays ---
        
        # Heart Rate Card
        self.hr_frame = ctk.CTkFrame(self.main_frame, corner_radius=15)
        self.hr_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)
        
        self.hr_title = ctk.CTkLabel(self.hr_frame, text="HEART RATE", font=ctk.CTkFont(size=18, weight="bold"))
        self.hr_title.pack(pady=(30, 10))
        
        self.hr_value = ctk.CTkLabel(self.hr_frame, text="--", font=ctk.CTkFont(family="Arial", size=80, weight="bold"), text_color="#FF4C4C") # Red
        self.hr_value.pack(pady=10)
        
        self.hr_unit = ctk.CTkLabel(self.hr_frame, text="BPM", font=ctk.CTkFont(size=20))
        self.hr_unit.pack(pady=(0, 30))

        # SpO2 Card
        self.spo2_frame = ctk.CTkFrame(self.main_frame, corner_radius=15)
        self.spo2_frame.grid(row=1, column=1, sticky="nsew", padx=10, pady=10)
        
        self.spo2_title = ctk.CTkLabel(self.spo2_frame, text="OXYGEN SATURATION", font=ctk.CTkFont(size=18, weight="bold"))
        self.spo2_title.pack(pady=(30, 10))
        
        self.spo2_value = ctk.CTkLabel(self.spo2_frame, text="--", font=ctk.CTkFont(family="Arial", size=80, weight="bold"), text_color="#3B8ED0") # Blue
        self.spo2_value.pack(pady=10)
        
        self.spo2_unit = ctk.CTkLabel(self.spo2_frame, text="%", font=ctk.CTkFont(size=20))
        self.spo2_unit.pack(pady=(0, 30))

    def refresh_ports(self):
        ports = serial.tools.list_ports.comports()
        port_list = [port.device for port in ports]
        if not port_list:
            port_list = ["No Ports Found"]
            self.connect_btn.configure(state="disabled")
        else:
            self.connect_btn.configure(state="normal")
        
        self.port_option_menu.configure(values=port_list)
        self.port_option_menu.set(port_list[0])

    def toggle_connection(self):
        if self.is_connected:
            self.disconnect()
        else:
            self.connect()

    def connect(self):
        port = self.port_option_menu.get()
        if port == "No Ports Found":
            return
        
        self.update_status("Connecting...", "orange")
        self.serial_reader = SerialReader(port, callback=self.update_data, error_callback=self.handle_error)
        success = self.serial_reader.start()
        
        if success:
            self.is_connected = True
            self.connect_btn.configure(text="Disconnect", fg_color="#C0392B", hover_color="#E74C3C") # Reddish for stop
            self.update_status("Connected - Receiving Data", "green")
            self.port_option_menu.configure(state="disabled")
        else:
            self.update_status("Connection Failed", "red")
            self.serial_reader = None

    def disconnect(self):
        if self.serial_reader:
            self.serial_reader.stop()
            self.serial_reader = None
        
        self.is_connected = False
        self.connect_btn.configure(text="Connect", fg_color=["#3B8ED0", "#1F6AA5"], hover_color=["#36719F", "#144870"]) # Default Blue
        self.port_option_menu.configure(state="normal")
        self.update_status("Disconnected", "red")
        
        # Reset display
        self.hr_value.configure(text="--")
        self.spo2_value.configure(text="--")

    def handle_error(self, message):
        # Schedule GUI update on main thread
        self.after(0, lambda: self._show_error(message))

    def _show_error(self, message):
        self.update_status(f"Error: {message}", "red")
        if self.is_connected:
            self.disconnect()

    def update_status(self, text, color_code):
        color_map = {
            "red": "#C0392B",
            "green": "#2ECC71",
            "orange": "#F39C12"
        }
        self.status_label.configure(text=text)
        self.status_indicator.configure(fg_color=color_map.get(color_code, "gray"))

    def update_data(self, hr, spo2):
        # 1. Update GUI (Main Thread)
        self.after(0, lambda: self._update_labels(hr, spo2))
        
        # 2. Upload to Backend (Separate Thread to avoid UI freeze)
        threading.Thread(target=self.send_to_backend, args=(hr, spo2), daemon=True).start()

    def send_to_backend(self, hr, spo2):
        api_url = "http://localhost:3001/record-vitals"
        payload = {
            "patientId": self.patient_id,
            "heartRate": hr,
            "spO2": spo2
        }
        try:
            response = requests.post(api_url, json=payload, timeout=2)
            if response.status_code == 200:
                print(f"[API] Success: HR={hr}, SpO2={spo2}")
            else:
                print(f"[API] Error {response.status_code}: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"[API] Connection Failed: {e}")

    def _update_labels(self, hr, spo2):
        self.hr_value.configure(text=str(hr))
        self.spo2_value.configure(text=str(spo2))

if __name__ == "__main__":
    app = LiFiApp()
    app.mainloop()

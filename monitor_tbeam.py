#!/usr/bin/env python3
"""
Simple T-Beam monitor to see raw data
"""

import serial
import time

# T-Beam device path
DEVICE_PATH = "/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_F4:12:FA:9D:C4:DC-if00"
BAUD_RATE = 9600

try:
    # Open connection
    ser = serial.Serial(DEVICE_PATH, BAUD_RATE, timeout=1)
    print(f"Connected to T-Beam at {BAUD_RATE} baud")
    
    # Send reset
    ser.setDTR(False)
    time.sleep(0.1)
    ser.setDTR(True)
    print("Reset sent, monitoring for data...")
    print("-" * 50)
    
    # Monitor for data
    while True:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if line:
                print(f"[{time.strftime('%H:%M:%S')}] {line}")
        time.sleep(0.1)
        
except KeyboardInterrupt:
    print("\nStopping monitor...")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()
        print("Connection closed") 
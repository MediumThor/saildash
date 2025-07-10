#!/bin/bash

# Proteus Startup Script
# This script starts the Proteus services on boot

# Wait for network to be ready
sleep 30

# Change to the saildash directory
cd /home/pi5/saildash

# Start the services using the control script
./proteus-control.sh start

# Log the startup
echo "$(date): Proteus services started on boot" >> /home/pi5/saildash/boot.log 
#!/bin/bash

# Define the web server name (example: apache2 or nginx)
SERVER="apache2"  # Change to nginx if using nginx server
LOG_FILE="/var/log/server_health_check.log"

# Check if the server is running
if ! systemctl is-active --quiet $SERVER; then
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $SERVER is not running. Restarting..." >> $LOG_FILE
    # Restart the server
    systemctl restart $SERVER
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $SERVER has been restarted." >> $LOG_FILE
else
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $SERVER is running." >> $LOG_FILE
fi

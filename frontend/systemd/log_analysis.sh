#!/bin/bash

# Path to the web server log file
LOG_FILE="/var/log/apache2/access.log"  # Change to your log file path if using nginx or a different server

# Check if the log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "Log file not found: $LOG_FILE"
    exit 1
fi

# Using awk to count requests per IP address and sort to display top 3 IPs
echo "Top 3 IP addresses with the most requests:"
awk '{print $1}' $LOG_FILE | sort | uniq -c | sort -nr | head -n 3


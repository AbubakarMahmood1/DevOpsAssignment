#!/bin/bash

# Set project paths
USER="abubakar@Regalia"  # Replace with your Linux username
APP_DIR="/home/$USER/todolist"
SERVICE_FILE="/etc/systemd/system/todolist.service"


echo "Creating systemd service for todolist..."

sudo bash -c "cat > $SERVICE_FILE" <<EOL
[Unit]
Description=todolist Backend Service
After=network.target

[Service]
ExecStart=/usr/bin/node $APP_DIR/backend/server.js
WorkingDirectory=$APP_DIR/backend
Restart=always
User=$USER
Group=$USER
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target
EOL

echo "Enabling and starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable todolist
sudo systemctl start todolist

# 2. Kernel Tuning: Increase net.core.somaxconn
echo "Tuning kernel parameters..."
sudo bash -c "echo 'net.core.somaxconn=1024' >> /etc/sysctl.conf"
sudo sysctl -p

# 3. Firewall Setup: Allow only HTTP and HTTPS
echo "Configuring firewall rules..."
sudo ufw enable -y
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Check status
echo "Firewall rules applied:"
sudo ufw status

# Verify systemd service
echo "Service status:"
sudo systemctl status todolist --no-pager

MinecraftManager/Server/bin> scp * user@<server>:~/minecraftManager
sudo systemctl restart nodeMinecraftServer.service

/etc/systemd/system/nodeMinecraftServer.service
[Unit]
Description=NodeJS Minecraft Manager

[Service]
WorkingDirectory=<Path to project root>
Restart=on-failure
RestartSec=20 5
ExecStart=/usr/local/bin/node <Path to project root>/Server.js

[Install]
WantedBy=default.target

/etc/systemd/system/minecraftslot$.service
[Unit]
Description=Start Minecraft Slot1

[Service]
WorkingDirectory=/home/minecraft-server
User=minecraft
Group=minecraft
Type=forking
Restart=on-failure
RestartSec=20 5
ExecStart=/usr/bin/screen -h 1024 -dmS minecraftslot# /home/minecraft-server/start_minecraft.sh slot#

ExecStop=/usr/bin/screen -p 0 -S minecraftslot1 -X eval 'stuff \"stop\"\015'
ExecStop=/bin/bash -c "while ps -p $MAINPID > /dev/null; do /bin/sleep 1; done"

[Install]
WantedBy=default.target


MinecraftManager/web/build> scp -r * user@<server>:~/minecraftLiveMap/webroot
# THIS APPLICATION IS CURRENTLY IN DEVELOPMENT AND WILL NOT RUN UNTIL VERSION 1

Install RPI OS
- This program has been built and tested on Raspberry Pi OS Lite (32-bit) (Bullseye)

Update Raspberry pi
`sudo apt update`

Enable the camera
1. `sudo raspi-config`
2. 3 Interface Options
3. Select "Legacy Camera"
4. Select "Yes" to enable legacy camera
5. Select "Finish" and reboot

Install GIT
1. `sudo apt install git`
2. `git --version` (to ensure git is properly installed)

Install NodeJS
1. `curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -`
2. `sudo apt install nodejs`
3. `node --version` (to ensure nodejs is properly installed)

Install FFmpeg
`sudo apt install -y ffmpeg`

Download And Setup the program
1. `cd ~`
2. `git clone https://github.com/the-aria-project/aria-cam.git`
3. `cd aria-cam`
4. `npm i`
5. `npm start`
6. Make sure the camera is working, on your network, go to http://{hostname_or_ip}:3000/live (where hostname_or_ip is your raspberry pi's hostname or ip address)


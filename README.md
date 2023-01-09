curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs
cd ~/.
curl https://github.com/bcarr610/aria-cam/archive/refs/heads/master.zip -L -o aria-cam.zip
unzip aria-cam.zip
cd aria-cam
npm i

Find your node installation path (Usually /usr/bin/node)
Open Crontab config
sudo crontab -e

Add a new crontab rule

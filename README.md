How to install on Raspberry PI

Install Node JS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs

Download Aria-Cam
cd ~/.
curl https://github.com/bcarr610/aria-cam/archive/refs/heads/master.zip -L -o aria-cam.zip
unzip aria-cam.zip
cd aria-cam
npm i

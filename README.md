# Hoophouse manager

This is a project for ES1050 at Western University. For proper use, you'll need a backend server and a raspberry pi with a compatible temperature sensor and camera.

## Server setup instructions

These instructions cover only the setup of the backend server. Client instructions are detailed elsewhere. **These instructions are for Ubuntu 20.04**

> It is recommended to set this project up in a container (using something like LXD) if applicable.

1. Connect to your server over ssh, and run all commands as root.
2. Run each of the lines below:
   ```shell 
   apt update
   apt install -y git curl
   curl -fsSL https://deb.nodesource.com/setup_17.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Upload the repository under `/root/hoophouse-manager`, or clone with git:
   ```
   cd /root
   sudo apt-get install -y git
   git clone https://github.com/kurmachu/hoop-manager.git
   ```
4. Set up the server service and dependancies:
   ```
   cd hoop-manager/server
   npm install
   cp ./hoophouse-server.service /lib/systemd/system
   systemctl enable hoophouse-server.service
   ```
5. Reboot the server. You can probaby do this by running `init 6`

## Client setup instructions

The client is a simple single-page web app, to set it up it is recommended you install a web server on the same sever you host the backend. [DigitalOcean has a great guide on setting up NGINX](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-20-04)

After setting up, edit the first line of `god.js` to point to your server and port. Then, upload the files and check that you can navigate to them.

## Pi setup instructions

It is recommended you use Windows with [Windows terminal](https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701).

1. Install and run the [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Connect the SD card to the computer
3. Select `CHOOSE OS` > `Raspberry Pi OS (other)` > `Raspberry Pi OS Lite (Legacy)`
4. Select your drive from the select storage menu
5. Flash
6. When done, open the `boot` device in explorer. If you don't see it, eject and reconnect the SD card.
7. Add an empty file called `ssh` to `boot`. Make sure you can see file extensions, as you need a file named `ssh` and not `ssh.txt`
8. Create a file called `wpa_supplicant.conf` and fill in the following values, replacing `YOUR WIFI` and `YOUR WIFI PASSWORD` with a network you would like to use. _If you are not in Canada, change your `country=` to the correct country code. This is for legal reasons._
   ```
   country=CA
   ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
   update_config=1
   
   network={
   ssid="YOUR WIFI"
   scan_ssid=1
   psk="YOUR WIFI PASSWORD"
   key_mgmt=WPA-PSK
   }
   ```
   _The above code works best with wifi networks that do not contain spaces._
9. Eject the usb, and insert it into the Pi
10. Power on the Pi
11. Open Windows Terminal, or your terminal application of choise.
12. Find the ip of the Pi, if you are on windows you can use [Angry IP Scanner](https://angryip.org/)
13. Connect to your Pi over ssh, by running `ssh pi@`**[The IP of your Pi]**
14. Follow the connection steps. The default password is `raspberry`
15. Run the following commands to set up the client:
    ```bash
    sudo apt update
    sudo apt install -y git curl
    curl -fsSL https://deb.nodesource.com/setup_17.x | sudo -E bash -
    sudo apt-get install -y nodejs
    git clone https://github.com/kurmachu/hoop-manager.git
    cd hoop-manager/client
    sudo cp ./hoophouse-client.service /lib/systemd/system
    npm install
    ```
16. Create the default config file by running `npm run client`, then pressing `Ctrl+C` to quit the program once it fails to connect to the server
17. Edit `config.json` in your favorite text editor (vi, nano, pi doesn't come with vim so install it if you would like)
18. Set the websocket url to point to your correct server and, if you changed it, port.
19. Save and quit whatever editor you are using
20. Run `sudo raspi-config`
21. Navigate to `interface options`, select `camera`, select `yes`, select `ok`
22. Press escape to exit
23. Run `sudo systemctl enable hoophouse-client.service` to enable the client software to run as a service
24. Run `passwd`, and follow the steps to set a new password for the Pi. **This is important**, as the default password is well known and could lead to your Pi being used for nefarious purposes by others.
25. If the Pi is in place, run `init 6` to reboot. If you would like to shut down, and boot the next time power is attatched, run `init 0`

The Pi will now be set up to communicate with your server.

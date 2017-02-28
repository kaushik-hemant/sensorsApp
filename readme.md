Description:

- Nodejs application which serves the sendor data to chango database using APIs 
- Holds the data during network unavialablity till available and then sends to server

- TESTED with Raspberry pi 3

Pre-requisites:

1. nodejs, npm, python & pm2 should be installed on device(pi)


TODD:

1. clone the code from https://github.com/kaushik-hemant/sensorsApp
2. run init.sh from the cloned folder
3. start all app one by one as:
    pm2 start gpsApp.js
    pm2 start tiltApp.js
    pm2 start tempHumidityApp.js
    pm2 start vibrationApp.js
    pm2 start gpsAppStarterApp.js
4. set pm2 on startup by running : pm2 startup
5. save or freeze the process with bootup by running: 'pm2 save'(initially for new machine) and 'pm2 update' on          already saved machine.
6. done with the setup, can check the logs by 'pm2 logs' for all app or pm2 logs 'app_id'(can get the specific app id by pm2 list).  

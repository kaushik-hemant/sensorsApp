Description:

- Nodejs application which serves the sendor data to chango database using APIs 
- Holds the data during network unavialablity till available and then sends to server

- TESTED with Raspberry pi 3

Pre-requisites:

1. nodejs, npm, python & pm2 should be installed on device(pi).
2. apps inside uses aggregatorApi.js code's APICofig.json for aggregator Id and aggregator type


TODO:

- After logging in to PI; go into the root by sudo su

1. clone this Repository on pi
2. run init.sh from the cloned folder(if error in init.sh: copy supportfolder contents in node_modules)
3. start all app one by one as:
    pm2 start gpsApp.js
    pm2 start tiltApp.js / pm2 start angular.js (one sensor to be used among tilt / angular motion: start the connected sensor app only)
    pm2 start tempHumidityApp.js
    pm2 start vibrationApp.js
    pm2 start gpsAppStarterApp.js
4. set pm2 on startup by running : pm2 startup
5. save or freeze the process with bootup by running: 'pm2 save'(initially for new machine) and 'pm2 update' on          already saved machine.
6. done with the setup, can check the logs by 'pm2 logs' for all app or pm2 logs 'app_id'(can get the specific app id by pm2 list).  


Configuration Settings Details:

- TempHumidityAppServerPort: port on which temparature/humidity app will run on device
- tempSensorDeviceNode : currently not in use
- configDirectory: current solution config file location
- dynamicConfiguration: on starting apps can set this to true/false if want to settings to be changed dynamically
- MainConfigPath: file location having AggregatorId and AggregatorType created during registration
- EachRequestTimeinMS: currently not in use
- tempratureFilesPath: folder in which data files for sensors: temparature and humidity resists in
- TempPythonScriptDir: data getting script location for temp sensor
- TempSensorTypeValue: sensor pin type
- TempSensorPin: pin in which output for temp sensors
- TempAndHumidityCreateInterval: create interval in milliseconds in which data generated for temparature/humidity
- TempAndHumiditySendingInterval: sending job interval in milliseconds for temparature/humidity
- TempHumidityDataSendingApiEndpoint: Chango API endpoint for sending data for temparature/humidity
- TiltAppServerPort: tilt application port running on device
- TiltDataFilePath: folder in which tilt data files resists in
- TiltScriptDir: currently not in use
- TiltSensorTypeValue: currently not in use
- TiltSensorPin: pin in which output of tilt sensor connected to device
- TiltCreateInterval: currently not in use
- TiltSendingInterval: tilt data sending interval in milliseconds
- TiltDataSendingApiEndpoint: chango api endpoint for sending tilt data 
- VibrationAppServerPort: port on which vibration application running on device
- VibrationDataFilePath: folder in which data files for vibration data resists in 
- VibrationScriptDir: currently not in use
- VibrationSensorTypeValue: currently not in use
- VibrationSensorPin: pin on which output for vibration sensor connected to device
- VibrationCreateInterval: currently not in use
- VibrationSendingInterval: sending interval for vibration data files in milliseconds
- VibrationDataSendingApiEndpoint: api endpoint for sending vibration data
- gpsDataFilePath: folder in which gps data files resists in 
- gpsParserFileLocation: module location by which gps data parsed to latitide and longitude
- gpsRecieverNode: usb node on which usb dongle connected to device
- gpsBaudRate: baud rate for getting gps data
- gpsDataCreateIntervalInSeconds: create interval for gps data in seconds
- gpsDataSendingInterval: sending interval for gps data in milliseconds
- GpsDataSendingEndpoint: api endpoint for sending gps data
- gpsServerPort: device port on which gps app running on
- gpsStarterAppPort: device port on which restarter app running on device after bootup
- gpsStarterInterval: time after bootup to re-start all sensors app for proper working
- gpsStarterStartScriptLocation: script location for starting sensors
- gpsStarterStopScriptLocation: script location for stopping location(currently not in use) may be used in case of      onprem Aggregator
- ApiHostName: api host url without http:// or https://
- HttpsAPIRequest: true/false for ssl based api host
- ApiHostPort: 80/443 based on api port
- VehicleAggregatorTypeId: Master table Id to be checked for getting the vehicle type aggregator
- angularFilesPath: angular sensor data files directory
- AngularAppServerPort: port on which angular process is running on
- AngularCreateInterval: create interval in milliseconds for angular data job
- AngularSendingInterval: sending interval in milliseconds for angular data job
- AngularDataSendingApiEndpoint: api endpoint to add angular sensor data to chango database
- AngularPythonScriptDir: angular data retrieval python script
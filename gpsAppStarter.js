var app = require('express')(),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    Promise = require('es6-promise').Promise,
    processPort = getSetting("gpsStarterAppPort"),
    fs = require('fs'),
    exec = require('child_process').exec,
    child, alreadyStarted = false,
    alreadyStopped = true;

console.log('gps sensor app starter running @ ' + processPort + ' on ', new Date())

app.listen(processPort, function () {
    setTimeout(function () {
        processInitiator();
    }, getSetting("gpsStarterInterval"));
})

function processInitiator() {
    console.log('function called for execution @ ', new Date())
    if (!isNUllOrEmpty(getRootSetting("AgreegatorId")) && !isNUllOrEmpty(getRootSetting("AgreegatorType")) &&
        getRootSetting("AgreegatorType").toUpperCase() == 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
        if (!alreadyStarted)
            startProcessForSensors();
    } else {
        if (!alreadyStopped)
            stopProcessForSensors();
    }
}

function isNUllOrEmpty(value) {
    var isNullOrEmpty = true;
    if (value) {
        if (typeof (value) == 'string') {
            if (value.length > 0)
                isNullOrEmpty = false;
        }
    }
    return isNullOrEmpty;
}

function startProcessForSensors() {
    child = exec('sh ' + __dirname + getSetting("gpsStarterStartScriptLocation"),
        function (error, stdout, stderr) {
            console.log('Current time: ', new Date())
            console.log('gps app start event: after defined interval, stdout: ' + stdout)
            console.log('gps app start event: after defined interval, stderr: ' + stderr)
            alreadyStarted = true;
            alreadyStopped = false;
            if (error !== null) {
                console.log('Current time: ', new Date())
                console.log('gps app start event after defined interval, error: ' + error)
            }
        }
    )
}

function stopProcessForSensors() {
    child = exec('sh ' + __dirname + getSetting("gpsStarterStopScriptLocation"),
        function (error, stdout, stderr) {
            console.log('Current time: ', new Date())
            console.log('gps app stop event: after defined interval, stdout: ' + stdout)
            console.log('gps app stop event: after defined interval, stderr: ' + stderr)
            alreadyStarted = false;
            alreadyStopped = true;
            if (error !== null) {
                console.log('Current time: ', new Date())
                console.log('gps app stop event after defined interval, error: ' + error)
            }
        }
    )
}

function getSetting(key) {
    if (config.dynamicConfiguration)
        config = JSON.parse(fs.readFileSync(configPath));
    return config[key];
}

function getRootSetting(key) {
    return require(getSetting("MainConfigPath"))[key];
}
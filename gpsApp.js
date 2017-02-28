var app = require('express')(),
    Promise = require('es6-promise').Promise,
    SerialPort = require('serialport'),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    fs = require('fs'),
    processPort = getSetting("gpsServerPort"),
    file = getSetting("gpsRecieverNode"),
    GPS = require(__dirname + getSetting("gpsParserFileLocation")),
    gps = new GPS,
    lastGeneratedTime,
    lastGeneratedFileSensorD = getLastGeneratedFileName(__dirname + getSetting("gpsDataFilePath"));

app.listen(processPort, function () {
    console.log('gps server running @ ' + processPort, new Date())
        //gps sensor data sender job
    setInterval(function () {
        sendDataForSensorD();
    }, getSetting("gpsDataSendingInterval"))
});

/**
 * Registering port node for gps
 */
var port = new SerialPort.SerialPort(file, {
    baudrate: getSetting("gpsBaudRate"),
    parser: SerialPort.parsers.readline('\r\n')
});

/**
 * On data event
 */
port.on('data', function (data) {
    gps.update(data);
});

/**
 * data creator function 
 */
gps.on('GGA', function (data) {
    if (!getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType").toUpperCase() !== 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B')
        console.log('Agreegator Id, type found', getRootSetting("AgreegatorId"), getRootSetting("AgreegatorType"));
    else {
        console.log('data recieved', data.lat, data.lon, new Date().toString());
        if (getRootSetting("AgreegatorId") !== null && data && data.lat && data.lon) {
            console.log('generating sensor D data', new Date())
            var fileName = fileNameIncrementor(lastGeneratedFileSensorD) + '.sdt',
                folder = getSetting("gpsDataFilePath"),
                dir = __dirname + folder + '/' + fileName;
            if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
                var obj = {
                    Latitude: data.lat,
                    Longitude: data.lon,
                    GeneratedOn: new Date().toUTCString()
                };
                if (obj.Latitude && obj.Longitude) {
                    if (lastGeneratedTime.setSeconds(lastGeneratedTime.getSeconds() + getSetting("gpsDataCreateIntervalInSeconds")) <= new Date()) {
                        var fd = fs.openSync(dir, 'w');
                        fs.writeFileSync(dir, JSON.stringify(obj));
                        lastGeneratedTime = new Date();
                    }
                } else {
                    console.log('no data found for Gps.', new Date())
                }
            } else console.log('Aggregator Id and type not found or not of type Vehicle.', new Date())
        }
    }
});

//data sender function
function sendDataForSensorD() {
    console.log('sending data for sensor D', new Date())
    var directory = __dirname + getSetting("gpsDataFilePath");
    fs.readdir(directory, function (err, items) {
        if (err) console.log('some error occured in listing temp files directory ' + directory, new Date())
        else if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorD(directory + '/' + items.sort(nameSorter)[0]);
        } else console.log('No file found! will try again..', new Date())
    });
}

//process file for sending data
function processFileForSensorD(file) {
    console.log('processing file for Sensor D with file: ' + file, new Date())
    var data = fs.readFileSync(file, 'utf8');
    try {
        var res = JSON.parse(data);
        if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
            if (res.Latitude && res.Longitude) {
                performRequest(getSetting("GpsDataSendingEndpoint"), 'POST', {
                    AgreegatorId: getRootSetting("AgreegatorId"),
                    Latitude: res.Latitude,
                    Longitude: res.Longitude,
                    SentDate: res.GeneratedOn
                }, function (response) {
                    try {
                        var result = JSON.parse(response);
                        if (result.status === 200) {
                            console.log('Sensor D File: ' + file + ' processed successfully, deleting now..', new Date());
                            deleteFileByLocation(file);
                        } else console.log('Gps sending Api Response: ' + response.status + ' for file: ' + file, new Date())
                    } catch (error) {
                        console.log('some error occured in parsing, will try again..', new Date())
                    }
                })
            } else console.log('No Gps data found in file: ' + file, new Date())
        } else console.log('Aggregator ID or Type not available or not of type vehicle for sending data', new Date())
    } catch (error) {
        console.log('some error occured in sending data will try after again...', new Date());
    }
}

/**
 * Http/Https Api function to perform data sending
 */
function performRequest(endpoint, method, data, success) {
    var querystring = require('querystring');
    var sender = getSetting("HttpsAPIRequest") ? require('https') : require('http');
    var headers = {};
    var dataString = JSON.stringify(data);
    endpoint += '?' + querystring.stringify(data);
    var options = {
        hostname: getSetting("ApiHostName"),
        path: endpoint,
        port: getSetting("ApiHostPort"),
        method: method,
        agent: false
    };
    var req = sender.request(options, function (res) {
        res.on('data', function (d) {
            var resString = '' + d;
            success(resString);
        });
    });

    req.on('error', function (e) {
        var customMessage = {
            status: 500,
            error: 'Some error in api request'
        };
        success(JSON.parse(customMessage));
    });
    req.end();
}

/**
 * Returns the current app setting by key in string
 */
function getSetting(key) {
    if (config.dynamicConfiguration)
        config = JSON.parse(fs.readFileSync(configPath));
    return config[key];
}

/**
 * Returns the settings from main configuration file by key in string
 */
function getRootSetting(key) {
    return require(getSetting("MainConfigPath"))[key];
}

/**
 * Simple file name incrementor
 */
function fileNameIncrementor(pre) {
    lastGeneratedFileSensorA = ++pre;
    if (!fileToBeSentSensorA)
        fileToBeSentSensorA = lastGeneratedFileSensorA;
    return lastGeneratedFileSensorA;
}

/**
 * deletes file by location
 */
function deleteFileByLocation(loc) {
    try {
        fs.unlinkSync(loc);
        console.log('successfully deleted ' + loc, new Date());
    } catch (error) {
        console.log('some error occured in deleting file ' + loc, new Date());
    }

}

/**
 * Returns the file by max integer in filename/last generated file
 */
function getLastGeneratedFileName(dir) {
    fs.readdir(dir, function (err, items) {
        if (!err && items && items.length !== 0) {
            lastGeneratedFileSensorD = items.sort(nameSorter).reverse()[0].split('.')[0];
        } else {
            lastGeneratedFileSensorD = 0;
        }
    });

}

/**
 * Sorting function used to sort files in numeric order
 */
function nameSorter(a, b) {
    var ax = [],
        bx = [];
    a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        ax.push([$1 || Infinity, $2 || ""])
    });
    b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
        bx.push([$1 || Infinity, $2 || ""])
    });
    while (ax.length && bx.length) {
        var an = ax.shift();
        var bn = bx.shift();
        var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if (nn) return nn;
    }
    return ax.length - bx.length;
}
var express = require('express'),
    app = express(),
    fs = require('fs'),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    Gpio = require('onoff').Gpio,
    tiltSensor = new Gpio(getSetting("TiltSensorPin"), 'in', 'both'),
    lastGeneratedFileSensorB = getLastGeneratedFileName(__dirname + getSetting("TiltDataFilePath"));

app.listen(getSetting("TiltAppServerPort"), function () {
    //tilt sensor data sender job
    setInterval(function () {
        sendDataForSensorB();
    }, getSetting("TiltSendingInterval"));
})

//creator job event
tiltSensor.watch(function (err, value) {
    if (err) exit();
    console.log('found sensor B data', new Date())
    var fileName = fileNameIncrementor(lastGeneratedFileSensorB) + '.sdt',
        folder = getSetting("TiltDataFilePath"),
        dir = __dirname + folder + '/' + fileName;
    if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === getSetting("VehicleAggregatorTypeId").toUpperCase()) {
        var data = generateTiltByData(value);
        if (data && data.Tilt) {
            var fd = fs.openSync(dir, 'w');
            fs.writeFileSync(dir, JSON.stringify(data));
        } else {
            console.log('no data found for tilt.', new Date())
        }
    } else console.log('Aggregator Id and type not found or not of type Vehicle.')
});

//sensor: tilt data sender function
function sendDataForSensorB() {
    console.log('sending data for sensor B', new Date())
    var directory = __dirname + getSetting("TiltDataFilePath");
    fs.readdir(directory, function (err, items) {
        if (err) console.log('some error occured in listing temp files directory ' + directory, new Date())
        else if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorB(directory + '/' + items.sort(nameSorter)[0]);
        } else console.log('No file found! will try again..', new Date())
    });
}
//sensor: tilt data process function
function processFileForSensorB(file) {
    console.log('processing file for Sensor B with file: ' + file, new Date())
    var data = fs.readFileSync(file, 'utf8');
    try {
        var res = JSON.parse(data);
        if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === getSetting("VehicleAggregatorTypeId").toUpperCase()) {
            if (res.Tilt) {
                performRequest(getSetting("TiltDataSendingApiEndpoint"), 'POST', {
                    AgreegatorId: getRootSetting("AgreegatorId"),
                    Tilt: res.Tilt,
                    SentDate: res.GeneratedOn
                }, function (response) {
                    try {
                        var result = JSON.parse(response);
                        if (result.status === 200) {
                            console.log('Sensor B File: ' + file + ' processed successfully,deleting now..', new Date());
                            deleteFileByLocation(file);
                        } else console.log('Tilt Api Response: ' + response.status + ' for file: ' + file)
                    } catch (error) {
                        console.log('some error occured in parsing, will try again..', new Date())
                        console.log(error)
                    }
                })
            } else {
                console.log('No Tilt data found in file: ' + file+' , deleting now', new Date())
                deleteFileByLocation(file);
            }
        } else console.log('Aggregator ID or Type not available or not of type vehicle for sending data', new Date())
    } catch (error) {
        console.log('some error occured in sending data will try after again...', new Date());
        console.log(error)
    }
}

/**
 * Gets the current tilt - returns Json object for same
 */
function generateTiltByData(data) {
    var cmd = '';
    var obj = {
        Tilt: ''
    };
    if (data) {
        obj.Tilt = data;
        obj.GeneratedOn = new Date().toISOString();
        console.log(obj)
    }
    return obj;
}

/**
 * unexport PIO on error and terminate process
 */
function exit() {
    console.log('some error occured in registering tilt on' + getSetting("TiltSensorPin") + ' GPIO', new Date())
    tiltSensor.unexport();
    process.exit();
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
            lastGeneratedFileSensorB = items.sort(nameSorter).reverse()[0].split('.')[0];
        } else {
            lastGeneratedFileSensorB = 0;
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
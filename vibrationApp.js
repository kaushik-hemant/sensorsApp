var express = require('express'),
    app = express(),
    fs = require('fs'),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    Gpio = require('onoff').Gpio,
    vibrationSensor = new Gpio(getSetting("VibrationSensorPin"), 'in', 'both'),
    lastGeneratedFileSensorC = getLastGeneratedFileName(__dirname + getSetting("VibrationDataFilePath"));

app.listen(getSetting("VibrationAppServerPort"), function () {
    //vibration sensor data sender job
    setInterval(function () {
        sendDataForSensorC();
    }, getSetting("VibrationSendingInterval"));
})

//creator job event
vibrationSensor.watch(function (err, value) {
    if (err) exit();
    console.log('found sensor C data', new Date())
    var fileName = fileNameIncrementor(lastGeneratedFileSensorC) + '.sdt',
        folder = getSetting("VibrationDataFilePath"),
        dir = __dirname + folder + '/' + fileName;
    if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
        var data = generateVibrationByData(value);
        if (data.Vibration===0) {
            var fd = fs.openSync(dir, 'w');
            fs.writeFileSync(dir, JSON.stringify(data));
        } else {
            console.log('no data found for Vibration.', new Date())
        }
    } else console.log('Aggregator Id and type not found or not of type Vehicle.')
});

//sensor: vibration data sender function
function sendDataForSensorC() {
    console.log('sending data for sensor C', new Date())
    var directory = __dirname + getSetting("VibrationDataFilePath");
    fs.readdir(directory, function (err, items) {
        if (err) console.log('some error occured in listing temp files directory ' + directory, new Date())
        else if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorC(directory + '/' + items.sort(nameSorter)[0]);
        } else console.log('No file found! will try again..', new Date())
    });
}
//sensor: vibration data process function
function processFileForSensorC(file) {
    console.log('processing file for Sensor C with file: ' + file, new Date())
    var data = fs.readFileSync(file, 'utf8');
    try {
        var res = JSON.parse(data);
        if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
            if (res.Vibration===0) {
                performRequest(getSetting("VibrationDataSendingApiEndpoint"), 'POST', {
                    AgreegatorId: getRootSetting("AgreegatorId"),
                    Vibration: res.Vibration,
                    SentDate: res.GeneratedOn
                }, function (response) {
                    try {
                        var result = JSON.parse(response);
                        if (result.status === 200) {
                            console.log('Sensor A File: ' + file + ' processed successfully,deleting now..', new Date());
                            deleteFileByLocation(file);
                        } else console.log('Vibration Api Response: ' + response.status + ' for file: ' + file)
                    } catch (error) {
                        console.log('some error occured in parsing, will try again..', new Date())
                        console.log(error)
                    }
                })
            } else {
                console.log('No Vibration data found in file: ' + file + ' , deleting now', new Date())
                deleteFileByLocation(file);
            }
        } else console.log('Aggregator ID or Type not available or not of type vehicle for sending data', new Date())
    } catch (error) {
        console.log('some error occured in sending data will try after again...', new Date());
        console.log(error)
    }
}

function generateVibrationByData(data) {
    var cmd = '';
    var obj = {
        Vibration: ''
    };
    if (data===0) {
        obj.Vibration = data;
        obj.GeneratedOn = new Date().toISOString();
        console.log(obj)
    }
    return obj;
}


/**
 * unexport PIO on error and terminate process
 */
function exit() {
    console.log('some error occured in registering vibration on' + getSetting("TiltSensorPin") + ' GPIO', new Date())
    vibrationSensor.unexport();
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
            lastGeneratedFileSensorC = items.sort(nameSorter).reverse()[0].split('.')[0];
        } else {
            lastGeneratedFileSensorC = 0;
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
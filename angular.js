var express = require('express'),
    app = express(),
    fs = require('fs'),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    lastGeneratedFileSensorE = getLastGeneratedFileName(__dirname + getSetting("angularFilesPath")),
    fileToBeSentSensorE, exec = require('child_process').exec,
    child, execSync = require('sync-exec');

app.listen(getSetting("AngularAppServerPort"), function () {
    console.log('angular app running @ ' + getSetting("AngularAppServerPort"), new Date());
    //angular sensor data creator job
    setInterval(function () {
        createDataForSensorE();
    }, getSetting("AngularCreateInterval"));
    //angular sensor data sender job
    setInterval(function () {
        sendDataForSensorE();
    }, getSetting("AngularSendingInterval"));
});


//sensor: angular data creator function
function createDataForSensorE() {
    console.log('generating sensor E data', new Date())
    var fileName = fileNameIncrementor(lastGeneratedFileSensorE) + '.sdt',
        folder = getSetting("angularFilesPath"),
        dir = __dirname + folder + '/' + fileName;
    if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === getSetting("VehicleAggregatorTypeId").toUpperCase()) {
        var angle = getCurrentAngularData();
        if (angle.X && angle.Y && angle.Z) {
            var fd = fs.openSync(dir, 'w');
            fs.writeFileSync(dir, JSON.stringify(angle));
        } else {
            console.log('no data found for angular motion.', new Date())
        }
    } else console.log('Aggregator Id and type not found or not of type Vehicle.', new Date())
}
//sensor: angular data sender function
function sendDataForSensorE() {
    console.log('sending data for sensor E', new Date())
    var directory = __dirname + getSetting("angularFilesPath");
    fs.readdir(directory, function (err, items) {
        if (err) console.log('some error occured in listing angular data files directory ' + directory, new Date())
        else if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorE(directory + '/' + items.sort(nameSorter)[0]);
        } else console.log('No file found! will try again..', new Date())
    });
}
//sensor: angular data process function
function processFileForSensorE(file) {
    console.log('processing file for Sensor E with file: ' + file, new Date())
    var data = fs.readFileSync(file, 'utf8');
    try {
        var res = JSON.parse(data);
        if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === getSetting("VehicleAggregatorTypeId").toUpperCase()) {
            if (res.X && res.Y && res.Z) {
                performRequest(getSetting("AngularDataSendingApiEndpoint"), 'POST', {
                    AgreegatorId: getRootSetting("AgreegatorId"),
                    X: res.X,
                    Y: res.Y,
                    Z: res.Z,
                    SentDate: res.GeneratedOn
                }, function (response) {
                    try {
                        var result = JSON.parse(response);
                        if (result.status === 200) {
                            console.log('Sensor A File: ' + file + ' processed successfully, deleting now..', new Date());
                            deleteFileByLocation(file);
                        } else console.log('Angular Api Response: ' + response.status + ' for file: ' + file, new Date())
                    } catch (error) {
                        console.log('some error occured in parsing, will try again..', new Date())
                    }
                })
            } else {
                console.log('No Angular data found in file: ' + file + ' , deleting now', new Date())
                deleteFileByLocation(file);
            }
        } else console.log('Aggregator ID or Type not available or not of type vehicle for sending data', new Date())
    } catch (error) {
        console.log('some error occured in sending data will try after again...', new Date());
    }
}

/**
 * Gets the current angular data in X, Y and Z axis- returns Json object for same
 */
function getCurrentAngularData() {
    //TODO: as per python script
    var cmd = 'python ' + __dirname + getSetting("AngularPythonScriptDir") + ' ' + getSetting("TempSensorTypeValue") + ' ' + getSetting("TempSensorPin");
    var obj = {
        x: '',
        Y: '',
        Z: ''
    };
    var output = execSync(cmd);
    if (output && output.stdout) {
        obj.X = output.stdout.split('*')[0].split('=')[1];
        obj.Y = output.stdout.split('*')[1].split('=')[1].split('%')[0];
        obj.Z = output.stdout.split('*')[1].split('=')[1].split('%')[0];
        obj.GeneratedOn = new Date().toUTCString();
        console.log(obj)
    }
    return obj;
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
    lastGeneratedFileSensorE = ++pre;
    if (!fileToBeSentSensorE)
        fileToBeSentSensorE = lastGeneratedFileSensorE;
    return lastGeneratedFileSensorE;
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
            lastGeneratedFileSensorE = items.sort(nameSorter).reverse()[0].split('.')[0];
        } else {
            lastGeneratedFileSensorE = 0;
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
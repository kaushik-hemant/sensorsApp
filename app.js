var express = require('express'),
    app = express(),
    fs = require('fs'),
    configPath = __dirname + '/config.json',
    config = require(configPath),
    lastGeneratedFileSensorA = getLastGeneratedFileName(__dirname + getSetting("tempratureFilesPath")),
    fileToBeSentSensorA, exec = require('child_process').exec,
    child, execSync = require('sync-exec');

app.listen(getSetting("applicationProcessPort"), function () {
    console.log('sensor app running @ ' + getSetting("applicationProcessPort"), new Date());
    //TempHumidity sensor data creator job
    setInterval(function () {
        createDataForSensorA();
    }, getSetting("TempAndHumidityCreateInterval"));
    //TempHumidity sensor data sender job
    setInterval(function () {
        sendDataForSensorA();
    }, getSetting("TempAndHumiditySendingInterval"));
});

//sensor TempHumidity data sender function
function sendDataForSensorA() {
    var directory = __dirname + getSetting("tempratureFilesPath");
    fs.readdir(directory, function (err, items) {
        if (err) console.log('some error occured in listing directory ' + directory, new Date())
        else if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorA(directory + '/' + items.sort(nameSorter)[0]);
        } else console.log('No file found! will try again..', new Date())
    });
}

//sensor TempHumidity data creator function
function createDataForSensorA() {
    var fileName = fileNameIncrementor(lastGeneratedFileSensorA) + '.sdt',
        folder = getSetting("tempratureFilesPath"),
        dir = __dirname + folder + '/' + fileName;
    if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
        var temp = getCurrentTempAndHumidity();
        if (temp.Humidity && temp.Temprature) {
            var fd = fs.openSync(dir, 'w');
            fs.writeFileSync(dir, JSON.stringify(temp));
        } else {
            console.log('no data found for Temprature and Humidity.', new Date())
        }
    } else console.log('Aggregator Id and type not found or not of type Vehicle.')
}
//sensor TempHumidity data creator function
function processFileForSensorA(file) {
    var data = fs.readFileSync(file, 'utf8');
    try {
        var res = JSON.parse(data);
        if (getRootSetting("AgreegatorId") && getRootSetting("AgreegatorType") && getRootSetting("AgreegatorType").toUpperCase() === 'D3498E79-8B6B-40F1-B96D-93AA132B2C5B') {
            performRequest(getSetting("TempHumidityDataSendingApiEndpoint"), 'POST', {
                AgreegatorId: getRootSetting("AgreegatorId"),
                Humidity: res.Humidity,
                Temperature: res.Temprature,
                SentDate: res.GeneratedOn
            }, function (response) {
                try {
                    var result = JSON.parse(response);
                    if (result.status === 200)
                        deleteFileByLocation(file);
                    else console.log('Api Response: ' + response.status + 'for file: ' + file)
                } catch (error) {
                    console.log('some error occured in parsing, will try again..', new Date())
                }
            })
        } else console.log('Aggregator ID or Type not available or not of type vehicle for sending data')
    } catch (error) {
        console.log('some error occured in sending data will try after again...', new Date());
    }
}

/**
 * main app helpers
 */

/**
 * Gets the current temp and humidity- returns Json object for same
 */
function getCurrentTempAndHumidity() {
    var cmd = 'python ' + __dirname + getSetting("TempPythonScriptDir") + ' ' + getSetting("TempSensorTypeValue") + ' ' + getSetting("TempSensorPin");
    var obj = {
        Temprature: '',
        Humidity: ''
    };
    var output = execSync(cmd);
    if (output && output.stdout) {
        obj.Temprature = output.stdout.split('*')[0].split('=')[1];
        obj.Humidity = output.stdout.split('*')[1].split('=')[1].split('%')[0];
        obj.GeneratedOn = new Date().toISOString();
        console.log(obj)
    }
    return obj;
}

/**
 * Http/Https Api function to perform data sending
 */
function performRequest(endpoint, method, data, success) {
    var querystring = require('querystring');
    var sender = getRootSetting("HttpsAPIRequest") ? require('https') : require('http');
    var headers = {};
    var dataString = JSON.stringify(data);
    endpoint += '?' + querystring.stringify(data);
    var options = {
        hostname: getRootSetting("ApiHostName"),
        path: endpoint,
        port: getRootSetting("ApiHostPort"),
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
 * common functions
 */

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
            lastGeneratedFileSensorA = items.sort(nameSorter).reverse()[0].split('.')[0]
        } else {
            lastGeneratedFileSensorA = 0;
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

/**
 * others for testing
 */
function dummyRequest(success) {
    try {
        var endpoint = '/posts/1',
            method = 'GET',
            data = {
                value: 'test',
                sentDate: new Date().toISOString()
            };
        var querystring = require('querystring');
        var sender = true ? require('https') : require('http');
        var headers = {};
        var dataString = JSON.stringify(data);
        endpoint += '?' + querystring.stringify(data);
        var options = {
            hostname: 'jsonplaceholder.typicode.com',
            path: endpoint,
            port: 443,
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
            success(JSON.stringify(customMessage));
        });
        req.end();
    } catch (error) {
        console.log('some error occurred in sending data request...', new Date())
    }
}
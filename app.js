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

    //sensor A data creator job
    setInterval(function () {
        createDataForSensorA();
    }, 1000);

    //sensor A data sender job
    setInterval(function () {
        //sendDataForSensorA();
    }, 2000);
});

//sensor A data sender function
function sendDataForSensorA() {
    var directory = __dirname + getSetting("tempratureFilesPath");
    fs.readdir(directory, function (err, items) {
        if (err)
            console.log('some error occured in listing directory ' + directory, new Date())
        if (!err && items.sort(nameSorter)[0]) {
            processFileForSensorA(directory + '/' + items.sort(nameSorter)[0]);
        }
    });
}

//sensor A data creator function
function createDataForSensorA() {
    var fileName = fileNameIncrementor(lastGeneratedFileSensorA) + '.sdt',
        folder = getSetting("tempratureFilesPath"),
        dir = __dirname + folder + '/' + fileName;
    // var fd = fs.openSync(dir, 'w');
    var temp = getCurrentTemp();
    console.log(temp);
    // var data = {
    //     Temprature: '40C',
    //     GeneratedDate: new Date().toISOString()
    // }
    // fs.writeFileSync(dir, JSON.stringify(data));
}

function processFileForSensorA(file) {
    var data = fs.readFileSync(file, 'utf8');
    try {
        dummyRequest(function (res) {
            try {
                if (JSON.parse(res) && JSON.parse(res).id === 1) {
                    deleteFileByLocation(file);
                } else {
                    console.log('no successfull request with file ' + file + ' ...will try again..', new Date())
                }
            } catch (error) {}
        })
    } catch (error) {
        console.log('some error occured in sending data will try after sometime...', new Date());
    }
}

/**
 * app helpers
 */
function getCurrentTemp() {
    var cmd = 'python ' + __dirname + getSetting("TempPythonScriptDir") + ' ' + getSetting("TempSensorTypeValue") + ' ' + getSetting("TempSensorPin");
    var output = execSync(cmd);
    return output;
}

function getCurrentHumidity() {
    return new Date().toString();
}

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
function getSetting(key) {
    if (config.dynamicConfiguration)
        config = JSON.parse(fs.readFileSync(configPath));
    return config[key];
}

function getRootSetting(key) {
    return require(getSetting("MainConfigPath"))[key];
}

function fileNameIncrementor(pre) {
    lastGeneratedFileSensorA = ++pre;
    if (!fileToBeSentSensorA)
        fileToBeSentSensorA = lastGeneratedFileSensorA;
    return lastGeneratedFileSensorA;
}

function deleteFileByLocation(loc) {
    try {
        fs.unlinkSync(loc);
        console.log('successfully deleted ' + loc, new Date());
    } catch (error) {
        console.log('some error occured in deleting file ' + loc, new Date());
    }

}

function getLastGeneratedFileName(dir) {
    fs.readdir(dir, function (err, items) {
        if (!err && items && items.length !== 0) {
            lastGeneratedFileSensorA = items.sort(nameSorter).reverse()[0].split('.')[0]
        } else {
            lastGeneratedFileSensorA = 0;
        }
    });

}

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
 * testing
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
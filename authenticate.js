var bodyParser = require('body-parser');
var md5 = require('md5');
var mysql = require('mysql');
var escapeSQL = require('sqlstring');
var config = require('./config.js');
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';

// Khởi tạo kết nối tới MySQL
var client = mysql.createConnection({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_pass,
    database: config.mysql_data
});
client.connect(function(err) {
    if (err) {
        console.error('CONNECT FAILED', err.code);
    } else {
        console.error('Connected to MySql');
    }
});
client.on('error', function(err) {
    if (err.fatal) {
        startConnection();
    }
});
// Kết thúc phần khởi tạo kết nối

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, password);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function isDecrypt(str) {
    try {
        var decipher = crypto.createDecipher(algorithm, password);
        var dec = decipher.update(str, 'hex', 'utf8');
        dec += decipher.final('utf8');
    } catch (e) {
        return false;
    }
    return true;
}

module.exports = class Authenticate {
    createAccessToken(key, time, callback) {
        var create_time = new Date().getTime();
        var expire_time = create_time + (time * 1000);
        var users_key = key;
        var object = { key: key, create_time: create_time, expire_time: expire_time };
        var access_token = encrypt(JSON.stringify(object));
        var sqlCheck = "SELECT * FROM `tokens` WHERE `users_key`='" + users_key + "'";
        client.query(sqlCheck, function(e, d, f) {
            if (e) {
                console.log(e);
                callback(null);
            } else {
                if (d.length > 0) {
                    var sql = "UPDATE `tokens` SET `create_time`=" + create_time + ", `expire_time`=" + expire_time + ", `access_token`='" + access_token + "' WHERE `users_key`='" + users_key + "'";
                    console.log(sql);
                    client.query(sql, function(error, data, fields) {
                        if (error) {
                            console.log(error);
                            callback(null);
                        } else {
                            console.log("Update successfuly access_token for key: " + key);
                            callback(access_token);
                        }
                    });
                } else {
                    var sql = "INSERT INTO `tokens` SET `create_time`=" + create_time + ", `expire_time`=" + expire_time + ", `access_token`='" + access_token + "', `users_key`='" + users_key + "'";
                    console.log(sql);
                    client.query(sql, function(error, data, fields) {
                        if (error) {
                            console.log(error);
                            callback(null);
                        } else {
                            console.log("Created successfuly access_token for key: " + key);
                            callback(access_token);
                        }
                    });
                }
            }
        });
    }
    authenticateWithToken(key, access_token, callback) {
        if (isDecrypt(access_token) && typeof access_token == "string" && access_token && access_token.length > 0 && isJsonString(isDecrypt(access_token))) {
            var user = JSON.parse(decrypt(access_token));
            var currentTime = new Date().getTime() / 1000;
            if (user.expire_time && user.expire_time > currentTime) {
                if (user.key && user.key == key) {
                    var sql = "SELECT * FROM `tokens` WHERE `access_token`='" + access_token + "' AND `users_key`='" + key + "'";
                    client.query(sql, function(error, data, fields) {
                        if (error) {
                            console.log(error);
                            callback(false);
                        } else {
                            if (data.length > 0) {
                                callback(true);
                            } else {
                                callback(false);
                            }
                        }
                    });
                } else {
                    callback(false);
                }
            } else {
                callback(false);
                client.query("DELETE FROM `tokens` WHERE `access_token`='" + access_token + "' AND `users_key`='" + key + "'");
            }
        } else {
            callback(false);
        }
    }
}
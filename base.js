var bodyParser = require('body-parser');
var md5 = require('md5');
var mysql = require('mysql');
var escapeSQL = require('sqlstring');
var config = require('./config.js');
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'd6F3Efeq';
// Gửi email
var nodemailer = require('nodemailer');
var urlParser = bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 });
var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: config.emailAdmin,
        pass: config.passAdmin
    }
});
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
        console.error('CONNECTED TO MYSQL');
    }
});

client.on('error', function(err) {
    if (err.fatal) {
        startConnection();
    }
});

client.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", function (error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
});

client.query("SET CHARACTER SET utf8mb4", function (error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET CHARACTER SET utf8mb4");
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
        decrypt(str);
    } catch (e) {
        return false;
    }
    return true;
}

function randomString(len) {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}

module.exports = class Authenticate {
    client() {
        return client;
    }
    transporter() {
        return transporter;
    }
    urlParser() {
        return urlParser;
    }
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    updateWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback(false);
            } else {
                callback(true);
            }
        });
    }
    insertWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback(false);
            } else {
                callback(true);
            }
        });
    }
    getDataWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data[0]);
                } else {
                    callback();
                }
            }
        });
    }
    getObjectWithSQL(sql, callback) {
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data);
                } else {
                    callback();
                }
            }
        });
    }
    createAccessToken(key, time, callback) {
        var create_time = new Date().getTime();
        var expire_time = create_time + (time * 1000);
        var users_key = key;
        var object = { key: key, create_time: create_time, expire_time: expire_time };
        var access_token = randomString(5) + encrypt(JSON.stringify(object)) + randomString(5);
        var sql = "INSERT INTO `tokens` SET `create_time`=" + create_time + ", `expire_time`=" + expire_time + ", `access_token`='" + access_token + "', `users_key`='" + users_key + "'";
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
    authenticateWithToken(key, token, callback) {
        if (typeof access_token == "string" && access_token && access_token.length > 0) {
            console.log("ACCESS_TOKEN: 1.1");
            var access_token = token.substring(5, token.length - 5);
            if (isDecrypt(access_token) && isJsonString(isDecrypt(access_token))) {
                try {
                    var user = JSON.parse(decrypt(access_token));
                    var currentTime = new Date().getTime() / 1000;
                    if (user.expire_time && user.expire_time > currentTime) {
                        if (user.key && user.key == key) {
                            var sql = "SELECT * FROM `tokens` WHERE `access_token`='" + token + "' AND `users_key`='" + key + "'";
                            client.query(sql, function(error, data, fields) {
                                if (error) {
                                    console.log(error);
                                    callback(false);
                                } else {
                                    if (data.length > 0) {
                                        callback(true);
                                    } else {
                                        callback(false);
                                        console.log("ACCESS_TOKEN: 1.1");
                                    }
                                }
                            });
                        } else {
                            callback(false);
                            console.log("ACCESS_TOKEN: 1.2");
                        }
                    } else {
                        callback(false);
                        console.log("ACCESS_TOKEN: 1.3");
                        client.query("DELETE FROM `tokens` WHERE `access_token`='" + access_token + "' AND `users_key`='" + key + "'");
                    }
                } catch (e) {
                    console.log("ACCESS_TOKEN: 1.4");
                    callback(false);
                }
            } else {
                console.log("ACCESS_TOKEN: 1.5");
                callback(false);
            }
        } else {
            console.log("ACCESS_TOKEN: 2.0");
            callback(false);
        }
    }

    getFriendByKey(key, callback) {
        var sqlSelect = "SELECT `key`, `email`, `username`, `nickname`, `created_at`, `avatar`, `cover`, `sex`, `birthday`, `last_active`, `latitude`, `longitude`, `status`, `facebook_point`, `country`, `city`, `img_width`, `img_height`, `is_active`";
        var sqlWhere = " FROM `users` WHERE `key`='" + key + "'";
        client.query(sqlSelect + sqlWhere, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data[0]);
                } else {
                    callback();
                }
            }
        });
    }
    baseSelectFriendSQL() {
        return "`key`, `email`, `username`, `nickname`, `created_at`, `avatar`, `cover`, `sex`, `birthday`, `last_active`, `latitude`, `longitude`, `status`, `facebook_point`, `country`, `city`, `img_width`, `img_height`, `is_active`";
    }
    getFriendBySQL(sqlWhere, callback) {
        var sqlSelect = "SELECT `key`, `email`, `username`, `nickname`, `created_at`, `avatar`, `cover`, `sex`, `birthday`, `last_active`, `latitude`, `longitude`, `status`, `facebook_point`, `country`, `city`, `img_width`, `img_height`, `is_active` FROM `users` ";
        client.query(sqlSelect + sqlWhere, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data[0]);
                } else {
                    callback();
                }
            }
        });
    }
    getMeByKey(key, callback) {
        var sqlSelect = "SELECT * FROM `users`";
        var sqlWhere = " WHERE `key`='" + key + "'";
        client.query(sqlSelect + sqlWhere, function(error, data, fields) {
            if (error) {
                console.log(error);
                callback();
            } else {
                if (data.length > 0) {
                    callback(data[0]);
                } else {
                    callback();
                }
            }
        });
    }
    isFollowing(key, friend_key, callback) {
        client.query("SELECT * FROM `contacts` WHERE `users_key`='" + key + "' AND `friend_key`='" + friend_key + "' AND `is_following`=1", function(e, d, f) {
            if (e) {
                console.log(e);
                callback(0);
            } else {
                if (d.length > 0) {
                    callback(1);
                } else {
                    callback(0);
                }
            }
        });
    }
    getRelationship(users_key, friend_key, ketqua) {
        var userSQL = "SELECT * FROM `blocks` WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "'";
        client.query(userSQL, function(eBlock, dBlock, fBlock) {
            if (eBlock) {
                console.log(eBlock);
                ketqua(5);
            } else {
                if (dBlock.length > 0) {
                    ketqua(0);
                } else {
                    var userSQL = "SELECT * FROM `blocks` WHERE `friend_key`='" + users_key + "' AND `users_key`='" + friend_key + "'";
                    client.query(userSQL, function(eBlock, dBlock, fBlock) {
                        if (eBlock) {
                            console.log(eBlock);
                            ketqua(5);
                        } else {
                            if (dBlock.length > 0) {
                                ketqua(1);
                            } else {
                                var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + users_key + "' AND `users_key`='" + friend_key + "'";
                                client.query(userSQL, function(error, data, fields) {
                                    if (error) {
                                        console.log(error);
                                        ketqua(5);
                                    } else {
                                        if (data.length > 0) {
                                            ketqua(2);
                                        } else {
                                            //---
                                            var userSQL2 = "SELECT * FROM `requests` WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "'";
                                            client.query(userSQL2, function(error1, data1, fields1) {
                                                if (error1) {
                                                    console.log(error1);
                                                    ketqua(5);
                                                } else {
                                                    if (data1.length > 0) {
                                                        ketqua(3);
                                                    } else {
                                                        //---
                                                        var userSQL2 = "SELECT * FROM `contacts` WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "'";
                                                        client.query(userSQL2, function(error2, data2, fields2) {
                                                            if (error2) {
                                                                console.log(error2);
                                                                ketqua(5);
                                                            } else {
                                                                if (data2.length > 0) {
                                                                    ketqua(4);
                                                                } else {
                                                                    ketqua(5);
                                                                }
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    }
}
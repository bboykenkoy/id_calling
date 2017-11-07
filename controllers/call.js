var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config.js');
var bodyParser = require('body-parser');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');
var _ = require('lodash');
var atob = require('atob');
var btoa = require('btoa');
var async = require('async');
//-- APNS
var apn = require('apn');
var apnService = new apn.Provider({
    cert: "certificates/cert.pem",
    key: "certificates/key.pem",
});
//-- FCM
var FCM = require('fcm-push');
var serverKey = config.android;
var collapse_key = 'com.android.abc';
var fcm = new FCM(serverKey);
var fetchUrl = require("fetch").fetchUrl;
var cheerio = require("cheerio");
var imgur = require('imgur');
imgur.setClientId('7cb30e33649106f');
imgur.setAPIUrl('https://api.imgur.com/3/');
// parse application/x-www-form-urlencoded
router.use(bodyParser.json({ limit: "50mb" }));
var urlParser = bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 });

/// ----- MAIL
var nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
        user: config.emailAdmin,
        pass: config.passAdmin
    }
});
var avatarApp = "http://i.imgur.com/rt1NU2t.png";

/*********--------------------------*********
 **********------- MYSQL CONNECT ----*********
 **********--------------------------*********/
var client;

function startConnection() {
    console.error('CONNECTING');
    client = mysql.createConnection({
        host: config.mysql_host,
        user: config.mysql_user,
        password: config.mysql_pass,
        database: config.mysql_data
    });
    client.connect(function(err) {
        if (err) {
            console.error('CONNECT FAILED USERS', err.code);
            startConnection();
        } else {
            console.error('CONNECTED USERS');
        }
    });
    client.on('error', function(err) {
        if (err.fatal)
            startConnection();
    });
}
startConnection();
client.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci", function(error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
});
client.query("SET CHARACTER SET utf8mb4", function(error, results, fields) {
    if (error) {
        console.log(error);
    } else {
        console.log("SET CHARACTER SET utf8mb4");
    }
});
/*********--------------------------*********
 **********------- FUNCTION ------*********
 **********--------------------------*********/

/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
var Base = require('../base.js');
var BASE = new Base();
var client = BASE.client();
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/


/*Call event*/

// Call from match random


module.exports = class CallManager {

    socketEventMatchCall(user,callback){

            

            if (user.type == 'leave') {
                // let msg = {message:"user not found",result: 0, type: "result"};
              //  socket.emit('calling', msg);
               let msg =  {key:user.key, message:"user leave", result: 0, type: "result"};
                client.query("DELETE FROM `calling` WHERE `users_key`='" + user.key + "'");
                console.log(msg);
                callback(msg,true);
            }

            else if (user && user.type == 'connect') {

                console.log("request from calling " + user.key);

                var sqlCheckExit = "SELECT * FROM `calling` WHERE `users_key`='" + user.key + "'";
                client.query(sqlCheckExit, function(e, d, f) {
                    if (e) {
                        console.log(e);
                    } else {
                        var query;
                        if (d.length > 0) {
                            query = "UPDATE `calling` SET `is_calling`=0 WHERE `users_key`='" + user.key + "'";
                           
                        } else {
                            query = "INSERT INTO `calling` SET `users_key`='" + user.key + "'";
                        }

                         client.query(query,function(err,d,f){
                            
                                 var sqlUser = "SELECT * FROM `users` WHERE `key`='" + user.key + "'";
                              client.query(sqlUser, function(err, dt, fl) {
                                         if (err) {
                                            console.log(err);
                                            let msg =  {key:user.key, message:"user not found", result: 0, type: "result"};
                                            callback(msg,false);
                                        } else {
                                        
                                             if (dt.length > 0) {
                                                  var sqlDataArray = "SELECT * FROM `users` WHERE `key` IN (SELECT `users_key` FROM `calling` WHERE `is_calling`=0 AND `users_key`!='" + user.key + "') ORDER BY RAND() LIMIT 1";
                                                 client.query(sqlDataArray, function(error, data, fields) {
                                                        if (error) {
                                                            console.log(error);
                                                             let msg =  {key:user.key, message:"user not found", result: 0, type: "result"};
                                                             callback(msg,false);
                                                        } else {
                                                            if (data.length > 0) {

                                                                var sqlUpdate = "UPDATE `calling` SET `status` = '1' WHERE `users_key` = '"+user.key+"'";
                                                                client.query(sqlUpdate,function(err,result,field){
                                                                    
                                                                       let msg =  { key: user.key, friend_key: data[0].key, result: 1, type: "result"};
                                                
                                                                        console.log(msg);

                                                                        callback(msg,false);
                                                                });
                                                           
                                                                // socket.broadcast.emit('K_Signal_Call', {message:"user not found",result: 0, type: "result"});
                                                            } else {
                                                                let msg =  {key:user.key, message:"user not found", result: 0, type: "result"};
                                                                callback(msg,false); 
                                                            }
                                                        }
                                            });
                        }else{
                            
                            let msg = {message:"user not found",result: 0, type: "result"};
                            //socket.emit('calling', msg);
                            console.log(msg);
                            callback(msg,false);
                            // socket.broadcast.emit('K_Signal_Call', {message:"user not found",result: 0, type: "result"});
                            
                        }
                    }
                });
                         });
                        console.log("Update is_calling " + user.key);
                    }
                });
     
            } else {
                let msg = {message:"user not found",result: 0, type: "result"};
                //socket.emit('calling', msg);
                callback(msg,false);
                client.query("DELETE FROM `calling` WHERE `users_key`='" + user.key + "'");
                console.log(msg);
            }

    }


    /*Call signle with friend*/




    /*utils*/
    fillPointDate() {
        var sql = "INSERT INTO `facebook_point`(facebook_id, users_key) SELECT `facebook_id`,`key` FROM `users` WHERE `key` NOT IN (SELECT `users_key` FROM `facebook_point`)";
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
            } else {
                console.log("Fill Point Data Successfully");
            }
        });
    }




    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getInformationUser(users_key, result) {
        var sql = "SELECT * FROM `users` WHERE `key`='" + users_key + "'";
        client.query(sql, function(error, data, fields) {
            if (error) {
                console.log(error);
            } else {
                if (data.length > 0) {
                    result(data[0]);
                }
            }
        });
    }

    isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    isBase64(str) {
        try {
            return btoa(atob(str)) == str;
        } catch (err) {
            return false;
        }
    }

    echoResponse(status, data, message, error) {
        return JSON.stringify({
            status: status,
            data: data,
            message: message,
            error: error
        });
    }

    echo5Response(status, data, other, message, error) {
        return JSON.stringify({
            status: status,
            data: data,
            other: other,
            message: message,
            error: error
        });
    }
}

// process.env.NODE_ENV = 'production';
//process.setMaxListeners(0);
var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var md5 = require('md5');
var escapeSQL = require('sqlstring');
var config = require('./config.js');
app.io = io;
//access-token
var jwt = require('jsonwebtoken');
//---
var events = require('events');
var eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(0);

var firebase = require('firebase');

var bodyParser = require('body-parser');
var mysql = require('mysql');
var moment = require('moment-timezone');
var connections = [];
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
var avatarApp = "http://i.imgur.com/rt1NU2t.png";

var async = require('async');
var _ = require('lodash');
var moment = require('moment-timezone');


app.use(bodyParser.json({ limit: "50mb" }));
var urlParser = bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 });





var configFirebase = {
    apiKey: "AIzaSyAmYRokQALuWuM53U3O2n2d58N3vdml8uc",
    authDomain: "thinkdiff-71ab0.appspot.com",
    databaseURL: "https://thinkdiff-71ab0.firebaseio.com",
    storageBucket: "thinkdiff-71ab0.appspot.com",
    messagingSenderId: "837773260215"
};

firebase.initializeApp(configFirebase);

server.listen(config.app_port, config.app_ip, function() {
    console.log("Server running @ http://" + config.app_ip + ":" + config.app_port);
});
server.timeout = 60000;

// --- CREATED VARIABLE ---
// ------------------------
// ------------------------
var users = [];
var index = 0;
var incomings = [];
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
            console.error('CONNECT FAILED MESSAGE', err.code);
            startConnection();
        } else {
            console.error('CONNECTED MESSAGE');
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
io.on('connection', function(socket) { // Incoming connections from clients
    var peer;
    socket.on('online', function(user) {
        if (findUserByUID(user.key) == null) {
            var usr = { id: user.key, key: user.key, socketid: socket.id };
            users.push(usr);
            socket.emit('register succeed', { id: user.key, key: user.key });
            socket.broadcast.emit('new user', { id: user.key, key: user.key });
            peer = usr;
            console.log("User online : " + user.key + "Key:" + user.key);
        }
        // console.log("------------------------- LIST USERS ---------------------------------");
        // console.log(users);
        // console.log("----------------------------------------------------------------------");
        // 
        if (user.key !== null && typeof user === 'object') {
            var sqlCheckVisible = "SELECT `is_visible` FROM `users_settings` WHERE `users_key`='" + user.key + "'";
            client.query(sqlCheckVisible, function(eCheck, dCheck, fCheck) {
                if (eCheck) {
                    console.log(eCheck);
                } else {
                    if (dCheck.length > 0) {
                        if (dCheck[0].is_visible == 1) {
                            var currentTimeFill = new Date().getTime();
                            var queryFill = "UPDATE `users` SET `status`='offline',`last_active`='" + currentTimeFill + "' WHERE `status`!='offline' AND `socket_id`='null' OR `socket_id` IS NULL";
                            client.query(queryFill, function(error, results, fields) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    // console.log("Fill last_active is updated");
                                }
                            });
                            var query = "UPDATE `users` SET `status`='online', `socket_id`='" + socket.id + "' WHERE `key`='" + user.key + "'";
                            client.query(query, function(error, results, fields) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log(user.key + " vừa online is_visible:" + dCheck[0].is_visible);
                                }
                            });
                        } else {
                            var currentTime = new Date().getTime();
                            var query = "UPDATE `users` SET `status`='offline',`socket_id`='null',`last_active`='" + currentTime + "' WHERE `key`='" + user.key + "'";
                            client.query(query, function(error, results, fields) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    // console.log("last_active is updated");
                                    console.log(user.key + " offline is_visible:" + dCheck[0].is_visible);
                                }
                            });
                        }
                    }
                }
            });
        }
    });
    socket.broadcast.emit('calling',{"K_Signal_Call":"No"});
    socket.broadcast.emit('calling',{K_Signal_Call:"No"});
    socket.on('calling', function(user) {

         console.log("request from calling " + user.key);

         socket.broadcast.emit('calling',{K_Signal_Call:"No"});


        // if (user && user.type == 'connect') {
        //     var sqlCheckExit = "SELECT * FROM `calling` WHERE `users_key`='" + user.key + "'";
        //     client.query(sqlCheckExit, function(e, d, f) {
        //         if (e) {
        //             console.log(e);
        //         } else {
        //             if (d.length > 0) {
        //                 client.query("UPDATE `calling` SET `is_calling`=0 WHERE `users_key`='" + user.key + "'");
        //                 console.log("Update is_calling " + user.key);
        //             } else {
        //                 client.query("INSERT INTO `calling` SET `users_key`='" + user.key + "'");
        //                 console.log("Insert calling " + user.key);
        //             }
        //         }
        //     });
        //     // 
        //     var sqlUser = "SELECT * FROM `users` WHERE `key`='" + user.key + "'";
        //     client.query(sqlUser, function(err, dt, fl) {
        //         if (err) {
        //             console.log(err);
        //         } else {
        //             if (dt.length > 0) {
        //                 var sqlDataArray = "SELECT * FROM `users` WHERE `key` IN (SELECT `users_key` FROM `calling` WHERE `is_calling`=0 AND `users_key`!='" + user.key + "') ORDER BY RAND() LIMIT 1";
        //                 client.query(sqlDataArray, function(error, data, fields) {
        //                     if (error) {
        //                         console.log(error);
        //                     } else {
        //                         if (data.length > 0) {
        //                               let msg =  { key: user.key, friend_key: data[0].key, result: 1, type: "result"};
        //                             socket.broadcast.emit('calling', msg);
        //                             console.log(msg);
        //                             // socket.broadcast.emit('K_Signal_Call', {message:"user not found",result: 0, type: "result"});
        //                         } else {

        //                             let msg =  { message:"user not found", result: 0, type: "result"};
        //                             socket.broadcast.emit('calling', msg);
        //                             // socket.broadcast.emit('K_Signal_Call', {message:"user not found",result: 0, type: "result"});
        //                             console.log(msg);
        //                         }
        //                     }
        //                 });
        //             }else{
                        
        //                 let msg = {message:"user not found",result: 0, type: "result"};
        //                 socket.broadcast.emit('calling', msg);
        //                 console.log(msg);
        //                 // socket.broadcast.emit('K_Signal_Call', {message:"user not found",result: 0, type: "result"});
                        
        //             }
        //         }
        //     });
        // } else {
        //     let msg = {message:"user not found",result: 0, type: "result"};
        //     socket.broadcast.emit('calling', msg);
        //     client.query("DELETE FROM `calling` WHERE `users_key`='" + user.key + "'");
        //     console.log(msg);
        // }
    });

    // Roi vao disconnect
    socket.on('disconnect', function(data) {
        var index = users.indexOf(peer);
        if (index != -1) {
            var usr = users[index];
            users.splice(index, 1);
            socket.broadcast.emit('user leave', { id: usr.id, key: usr.key });
            var deleteSQL = "DELETE FROM `channels` WHERE `idChannel`='" + usr.key + "'";
            client.query(deleteSQL, function(eDelete, dDelete, fDelete) {});
        }
        // END CALL VIDEO
        var checkquery = "SELECT * FROM `users` WHERE `socket_id`='" + socket.id + "'";
        client.query(checkquery, function(errorrr, resultsss, fieldsss) {
            if (errorrr) {
                console.log(errorrr);
            } else {
                if (resultsss.length > 0) {
                    //-- CHANGE STATUS TYPING
                    /*var ref = firebase.database().ref("ChatApp/Chat/Typing");
                    ref.orderByChild(resultsss[0]['key']+'/sender_id').equalTo(resultsss[0]['key']).on("child_added", function(snapshot) {
                          snapshot.ref.child(resultsss[0]['key']).update({status:"0"});
                    });
                    console.log('typing status is updated: '+resultsss[0]['key']);*/
                    //-- END CHANGE
                    var currentTime = new Date().getTime();
                    var query = "UPDATE `users` SET `status`='offline',`last_active`='" + currentTime + "' WHERE `socket_id`='" + socket.id + "'";
                    client.query(query, function(error, results, fields) {
                        if (error) {
                            console.log(error);
                        } else {
                            var sq = "UPDATE `users` SET `socket_id`='null' WHERE `status`='offline'";
                            client.query(sq, function(err, ress, fie) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    socket.emit('reload', resultsss[0].key);
                                    console.log("last_active is updated");
                                }
                            });
                        }
                    });
                }
            }
        });
        connections.splice(connections.indexOf(socket), 1);
        console.log("Disconnected: %s sockets connected", connections.length);
    });

    // Roi vao disconnect
    socket.on('signout', function(msg) {
        if (isEmpty(msg)) {
            return;
        }
        console.log("user signout: " + JSON.stringify(msg));
        if (isEmpty(msg.key)) {
            console.log("User signout with key null");
        } else {
            var checkquery = "SELECT * FROM `users` WHERE `key`='" + msg.key + "'";
            client.query(checkquery, function(errorrr, resultsss, fieldsss) {
                if (errorrr) {
                    console.log(errorrr);
                } else {
                    if (resultsss.length > 0) {
                        var currentTime = new Date().getTime();
                        var query = "UPDATE `users` SET `status`='offline',`last_active`='" + currentTime + "' WHERE `key`='" + msg.key + "'";
                        client.query(query, function(error, results, fields) {
                            if (error) {
                                console.log(error);
                            } else {
                                var sq = "UPDATE `users` SET `socket_id`='null' WHERE `status`='offline'";
                                client.query(sq, function(err, ress, fie) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        socket.emit('reload', resultsss[0].key);
                                        console.log("last_active is updated");
                                    }
                                });
                            }
                        });
                    }
                }
            });

            var index = findUserByUID(msg.key);
            if (index != -1) {
                var usr = users[index];
                users.splice(index, 1);
                socket.broadcast.emit('user leave', { id: msg.key, key: msg.key });
                var deleteSQL = "DELETE FROM `channels` WHERE `idChannel`='" + msg.key + "'";
                client.query(deleteSQL, function(eDelete, dDelete, fDelete) {});
            }

            connections.splice(connections.indexOf(socket), 1);
            console.log("Disconnected: %s sockets connected", connections.length);
        }
    });

    socket.on('chat message', function(msg) {
         
         //console.log("------------------------- MESSAGES -----------------------------------");
        //console.log(msg);
        //console.log("----------------------------------------------------------------------");
        if (msg.subtype == 'close') {
            //remove channel 
            var deleteSQL = "DELETE FROM `channels` WHERE `idChannel`='" + msg.to + "'";
            client.query(deleteSQL, function(eDelete, dDelete, fDelete) {
                if (eDelete) {
                    console.log("Fails Delete channel call" + msg.to);
                } else {
                    console.log("Delete channel call" + msg.to);
                }
            });
        }

        if (msg.subtype == 'candidate') {
            var contentJson = JSON.stringify(msg.content);
            var objectValue = JSON.parse(contentJson);
            // console.log("value sdp --------------------- --------- " + objectValue['candidate'] + "\n\n data " + msg);
            console.log(JSON.stringify(msg));
            //save current channel
            var queryChannel = "SELECT * FROM `channels` WHERE `toKey` = '" + msg.to + "' AND `fromKey`='" + msg.from + "' AND `candidate` != '" + contentJson + "'";
            client.query(queryChannel, function(err, dataChannel, FNN) {
                if (err) {
                    console.log(err);
                } else {
                    //channel is exist , response to client busy
                    if (dataChannel.length == 0) {
                        //create channel call here
                        var queryInsertChannel = "INSERT INTO `channels` SET `idChannel`='" + msg.to + "', `fromKey`='" + msg.from + "', `toKey` = '" + msg.to + "', `senderAvatar`='" + msg.senderAvatar + "',`senderName`='" + msg.senderName + "', `receiverAvatar`='" + msg.receiverAvatar + "',`receiverName`='" + msg.receiverName + "',`candidate`='" + contentJson + "',`conversationId`='" + msg.conversationId + "',`type`='" + msg.type + "'";
                        // console.log(queryInsertChannel);
                        client.query(queryInsertChannel, function(err, data, FNN) {
                            if (err) {
                                console.log("Insert New Channel call FAILED");
                            } else {
                                console.log("Insert New Channel call success");
                            }
                        });

                    }
                }
            });

        }

        var currentTime = new Date().getTime();
        if (msg.subtype == 'offer') {
            var contentJson = JSON.stringify(msg.content);
            var objectValue = JSON.parse(contentJson);
            // console.log("value sdp --------------------- --------- " + objectValue['sdp'] + "\n\n data " + contentJson);

            console.log(JSON.stringify(msg));
            //save current channel
            var queryChannel = "SELECT * FROM `channels` WHERE `toKey` = '" + msg.to + "' AND `fromKey`='" + msg.from + "' AND `offer` != '" + contentJson + "'";
            client.query(queryChannel, function(err, dataChannel, FNN) {
                if (err) {
                    console.log(err);
                } else {
                    //channel is exist , response to client busy
                    if (dataChannel.length == 0) {
                        //create channel call here
                        var queryInsertChannel = "INSERT INTO `channels` SET `idChannel`='" + msg.to + "', `fromKey`='" + msg.from + "', `toKey` = '" + msg.to + "', `senderAvatar`='" + msg.senderAvatar + "',`senderName`='" + msg.senderName + "', `receiverAvatar`='" + msg.receiverAvatar + "',`receiverName`='" + msg.receiverName + "',`offer`='" + contentJson + "',`conversationId`='" + msg.conversationId + "',`type`='" + msg.type + "',`subType`='" + msg.subtype + "'";
                        // console.log(queryInsertChannel);
                        client.query(queryInsertChannel, function(err, data, FNN) {
                            if (err) {
                                console.log("Insert New Channel call FAILED");
                            } else {
                                console.log("Insert New Channel call success");
                            }
                        });
                    }
                }
            });

            // sendNotification(msg.from, msg.to, "is calling", "calling", "Thành đẹp trai");
            var senderSQL = "SELECT `nickname` FROM `users` WHERE `key`='" + msg.from + "'";
            client.query(senderSQL, function(loiNguoiGui, dataNguoiGui, FNG) {
                if (loiNguoiGui) {
                    console.log(loiNguoiGui);
                } else {
                    var receiverSQL = "SELECT `device_token`,`device_type` FROM `users` WHERE `key`='" + msg.to + "'";
                    client.query(receiverSQL, function(loiNguoiNhan, dataNguoiNhan, FNN) {
                        if (loiNguoiNhan) {
                            console.log(loiNguoiNhan);
                        } else {
                            if (dataNguoiNhan[0].device_type == 'ios') {
                                var note = new apn.Notification();
                                note.alert = dataNguoiGui[0].nickname + " calling";
                                note.sound = 'dong.aiff';
                                note.topic = config.ios;
                                note.badge = 999;
                                note.payload = {
                                    "object": msg,
                                    "content": dataNguoiGui[0].nickname + " calling",
                                    "type": "calling"
                                };
                                apnService.send(note, dataNguoiNhan[0].device_token).then(result => {
                                    console.log("Calling: ", result.sent.length);
                                    console.log(JSON.stringify(result));
                                });
                            } else {
                                var mes = {
                                    to: dataNguoiNhan[0].device_token,
                                    collapse_key: collapse_key,
                                    data: {
                                        content: dataNguoiGui[0].nickname + " calling",
                                        type: "calling",
                                        title: 'IUDI',
                                        body: msg
                                    }
                                };
                                //callback style
                                fcm.send(mes, function(err, response) {
                                    if (err) {
                                        console.log("Something has gone wrong!");
                                    } else {
                                        console.log("Successfully sent with response: ", response);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }

        if (msg.to == 'all') {
            socket.broadcast.emit('chat message', msg);
        } else {
            var target = findUserByUID(msg.to);
            // console.log("Socket id cloud: ---------------------:  " + target.socketid);
            //emit for android
            socket.broadcast.emit('chat message', msg);
            console.log("Calling --------------- to user:" + msg.to + "Socket id : ");

            //emit for ios
            if (target) {
                // Send notifications
                // socket.broadcast.to(target.socketid).emit('chat message', msg);
                socket.broadcast.to(target.socketid).emit('K_Signal_Call', msg);

                console.log("User call online ------------------------- : He9Y3AA7xtVQahaKGuon5HYSAqy1 to user:" + msg.to + "Socket id: " + target.socketid);

                //socket_to.emit("chat message", msg);
            } else {

                socket.broadcast.emit("K_Signal_Call", msg);
                console.log("User call not online ------------------------- : He9Y3AA7xtVQahaKGuon5HYSAqy1 to user:" + msg.to);


            }
        }
    });
    //end socket
});



app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static(__dirname + '/ask'));

app.get('/listUsers', function(req, res) {
    res.end(JSON.stringify(users, censor));
});
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

/*********--------GET Version----------*********/
app.get('/type=version', urlParser, function(req, res) {
    var sql = "SELECT * FROM `versions` ORDER BY `id` DESC LIMIT 1";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            return res.send(echoResponse(200, data, 'success', false));
        }
    });
});


/*********--------------------------*********
 **********------ ECHO RESPONSE -----*********
 **********--------------------------*********/
function echoResponse(status, data, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        message: message,
        error: error
    });
}

function numberBadge(key, count) {
    var userSQL = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0'";
    client.query(userSQL, function(qError, qData, qFiels) {
        if (qError) {
            console.log(qError);
            count(0);
        } else {
            if (qData.length > 0) {
                var conversationUnread = [];
                async.forEachOf(qData, function(data, i, call) {
                    var sqlSelect = "SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + key + "' AND members.is_deleted='0' AND `key` IN (SELECT `conversations_key` FROM `message_status` WHERE `conversations_key`='" + qData[i].key + "' AND `users_key`='" + key + "' AND `is_read`='0')";
                    client.query(sqlSelect, function(e, d, f) {
                        if (e) {
                            console.log(e);
                            return res.sendStatus(300);
                        } else {
                            if (d.length > 0) {
                                conversationUnread.push(qData[i]);
                            }
                            if (i === qData.length - 1) {
                                var userSQL = "SELECT * FROM `notification_feed` INNER JOIN `notification_refresh` ON `notification_feed`.`users_key` = '" + key + "' AND `notification_feed`.`users_key` = notification_refresh.users_key AND `notification_feed`.`time` > `notification_refresh`.`time`";
                                client.query(userSQL, function(error, data, fields) {
                                    if (error) {
                                        console.log(error);
                                        return res.sendStatus(300);
                                    } else {
                                        if (data.length > 0) {
                                            count(conversationUnread.length + data.length);
                                        } else {
                                            count(conversationUnread.length);
                                        }
                                    }
                                });
                            }
                        }
                    });
                });
            } else {
                count(0);
            }
        }
    });
}

function findIndexByUID(uid) {
    var i;
    for (i = 0; i < users.length; i++) {
        if (users[i].id == uid) break;
    }
    if (i == users.length) return -1;
    return i;
}

function findUserByUID(uid) {
    var index = findIndexByUID(uid);
    if (index == -1) {
        return null;
    }
    return users[index];
}

function censor(key, value) {
    if (key == 'socketid') {
        return undefined;
    }
    return value;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function isEmpty(val) {
    return (val === undefined || val == null || val.length <= 0) ? true : false;
}

/*********--------------------------*********
 **********------- CONTROLLERS ------*********
 **********--------------------------*********/
app.use(require('./controllers'));
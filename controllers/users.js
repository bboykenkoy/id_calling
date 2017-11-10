var express = require('express');
var router = express.Router();
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
var md5 = require('md5');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');
var firebase = require('firebase');
var bodyParser = require('body-parser');
var moment = require('moment-timezone');
var async = require('async');
var _ = require('lodash');
var avatarApp = "http://i.imgur.com/rt1NU2t.png";
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
var config = require('../config.js');
var Base = require('../base.js');
var BASE = new Base();
var client = BASE.client();
var transporter = BASE.transporter();
var urlParser = BASE.urlParser();
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------------------------*/

/*********--------SIGNIN----------*********/
router.post('/signin', urlParser, function(req, res) {
    if (!req.body.key) {
        return res.sendStatus(400);
    }
    var key = req.body.key;
    var updated;
    BASE.getMeByKey(key, function(data) {
        if (data) {
            if (req.body.access_token) {
                var access_token = req.body.access_token;
                delete req.body.key;
                BASE.authenticateWithToken(key, access_token, function(logged) {
                    if (logged) {
                        BASE.updateWithSQL(escapeSQL.format("UPDATE `users` SET ? WHERE `key`= ?", [req.body, key]), function(updated) {
                            if (updated) {
                                BASE.getDataWithSQL("SELECT * FROM `other_information` WHERE `users_key`='" + key + "'", function(other_information) {
                                    BASE.getDataWithSQL("SELECT `on_secret_message`,`on_receive_email`,`is_visible`,`show_facebook`,`show_device`,`show_inputinfo`,`unknown_message`,`sound_message`,`vibrate_message`,`preview_message`,`seen_message`,`find_nearby`,`find_couples` FROM `users_settings` WHERE `users_key`='" + key + "'", function(settings) {
                                        BASE.getDataWithSQL("SELECT `point` FROM `facebook_point` WHERE `users_key`='" + key + "'", function(point) {
                                            BASE.getMeByKey(key, function(me) {
                                                if (me) {
                                                    me.access_token = access_token;
                                                    if (other_information && other_information.annual_income && other_information.academic_level) {
                                                        updated = 1;
                                                        me.phone_number = other_information.phone_number;
                                                    } else if (other_information && other_information.phone_number) {
                                                        updated = 0;
                                                        me.phone_number = other_information.phone_number;
                                                    } else {
                                                        updated = 0;
                                                        me.phone_number = 0;
                                                    }
                                                    if (point) {
                                                        me.point = point.point;
                                                    } else {
                                                        me.point = 0;
                                                    }
                                                    return res.send(JSON.stringify({
                                                        status: 200,
                                                        data: me,
                                                        users_settings: settings,
                                                        updated: updated,
                                                        message: "success",
                                                        error: false
                                                    }));
                                                }
                                            });
                                        });
                                    });
                                });
                            } else {
                                return res.send(echoResponse(301, 'Login failed', 'success', true));
                            }
                        });
                    } else {
                        return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
                    }
                });
            } else {
                BASE.createAccessToken(req.body.key, 604800, function(access_token) {
                    req.body.access_token = access_token;
                    delete req.body.key;
                    BASE.updateWithSQL(escapeSQL.format("UPDATE `users` SET ? WHERE `key`= ?", [req.body, key]), function(updated) {
                        if (updated) {
                            BASE.getDataWithSQL("SELECT * FROM `other_information` WHERE `users_key`='" + key + "'", function(other_information) {
                                BASE.getDataWithSQL("SELECT `on_secret_message`,`on_receive_email`,`is_visible`,`show_facebook`,`show_device`,`show_inputinfo`,`unknown_message`,`sound_message`,`vibrate_message`,`preview_message`,`seen_message`,`find_nearby`,`find_couples` FROM `users_settings` WHERE `users_key`='" + key + "'", function(settings) {
                                    BASE.getDataWithSQL("SELECT `point` FROM `facebook_point` WHERE `users_key`='" + key + "'", function(point) {
                                        BASE.getMeByKey(key, function(me) {
                                            if (me) {
                                                me.access_token = access_token;
                                                if (other_information && other_information.annual_income && other_information.academic_level) {
                                                    updated = 1;
                                                    me.phone_number = other_information.phone_number;
                                                } else if (other_information && other_information.phone_number) {
                                                    updated = 0;
                                                    me.phone_number = other_information.phone_number;
                                                } else {
                                                    updated = 0;
                                                    me.phone_number = 0;
                                                }
                                                if (point) {
                                                    me.point = point.point;
                                                } else {
                                                    me.point = 0;
                                                }
                                                return res.send(JSON.stringify({
                                                    status: 200,
                                                    data: me,
                                                    users_settings: settings,
                                                    updated: updated,
                                                    message: "success",
                                                    error: false
                                                }));
                                            }
                                        });
                                    });
                                });
                            });
                        } else {
                            return res.send(echoResponse(301, 'Login failed', 'success', true));
                        }
                    });
                });
            }
        } else {
            return res.send(echoResponse(404, 'Incorrect key or key does not exist', 'success', true));
        }
    });
});


/*********--------SIGNUP----------*********/
router.post('/signup', urlParser, function(req, res) {
    if (!req.body.key) {
        return res.sendStatus(400);
    }
    var key = req.body.key;
    BASE.getMeByKey(key, function(me) {
        if (me) {
            return res.send(echoResponse(404, 'This user already exists', 'success', true));
        } else {
            var currentTime = new Date().getTime();
            delete req.body.created_at;
            req.body.created_at = currentTime;
            BASE.insertWithSQL(escapeSQL.format("INSERT INTO `users` SET ?", req.body), function(insert) {
                if (insert) {
                    if (req.body.email) {
                        var email = req.body.email;
                        if (email.indexOf("@") > -1) {
                            var username = email.substring(0, email.indexOf("@"));
                            BASE.getDataWithSQL("SELECT `username` FROM `users` WHERE `username`='" + username + "'", function(data) {
                                if (data) {
                                    currentTime = BASE.getRandomInt(1, 9) + "0" + currentTime;
                                    client.query("UPDATE `users` SET `username`='" + currentTime + "' WHERE `email`='" + req.body.email + "'");
                                } else {
                                    client.query("UPDATE `users` SET `username`='" + username + "' WHERE `email`='" + req.body.email + "'");
                                }
                            });
                        } else {
                            currentTime = BASE.getRandomInt(1, 9) + "0" + currentTime;
                            client.query("UPDATE `users` SET `username`='" + currentTime + "' WHERE `email`='" + req.body.email + "'");
                        }
                    } else {
                        currentTime = BASE.getRandomInt(1, 9) + "0" + currentTime;
                        client.query("UPDATE `users` SET `username`='" + currentTime + "' WHERE `email`='" + req.body.email + "'");
                    }
                    fillPointDate();
                    client.query("INSERT INTO `users_settings`(`users_key`) VALUES('" + req.body.key + "')");
                    console.log("Vừa đăng ký thành công với email " + req.body.email);
                    return res.send(echoResponse(200, 'Registered successfully.', 'success', false));
                } else {
                    return res.send(echoResponse(301, 'Signup failed.', 'success', false));
                }
            });
        }
    });
});



/*********--------Following----------*********/
router.get('/:key/type=newest', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `users` WHERE `key` NOT IN (SELECT `friend_key` FROM `blocks` WHERE `users_key`='" + key + "') AND `key` NOT IN (SELECT `users_key` FROM `blocks` WHERE `friend_key`='" + key + "')";
            var pp = " ORDER BY `created_at` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            if ((parseInt(page, 10) * parseInt(per_page, 10)) <= 100) {
                BASE.getObjectWithSQL(sql + pp, function(data) {
                    if (data) {
                        return res.send(echoResponse(200, data, 'success', false));
                    } else {
                        return res.send(echoResponse(404, "Nobody.", 'success', true));
                    }
                });
            } else {
                return res.send(echoResponse(404, "Nobody.", 'success', true));
            }
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Following----------*********/
router.post('/follow', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var friend_key = req.body.friend_key || req.query.friend_key || req.params.friend_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "UPDATE `contacts` SET `is_following`=1 WHERE `users_key`='" + key + "' AND `friend_key`='" + friend_key + "'";
            BASE.updateWithSQL(sql, function(response) {
                if (response) {
                    return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                } else {
                    return res.send(echoResponse(404, 'Failed update', 'success', false));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


router.post('/unfollow', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var friend_key = req.body.friend_key || req.query.friend_key || req.params.friend_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "UPDATE `contacts` SET `is_following`=0 WHERE `users_key`='" + key + "' AND `friend_key`='" + friend_key + "'";
            BASE.updateWithSQL(sql, function(response) {
                if (response) {
                    return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                } else {
                    return res.send(echoResponse(404, 'Failed update', 'success', false));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------set point----------*********/
router.post('/point', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "UPDATE `facebook_point` SET `point`='" + req.body.point + "' WHERE `users_key`='" + key + "'";
            BASE.updateWithSQL(sql, function(response) {
                if (response) {
                    return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                } else {
                    return res.send(echoResponse(404, 'Failed update', 'success', false));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});

/*********--------GET IMGUR----------*********/
router.get('/:key/type=imgur', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `imgur_account`";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, "Not found", 'success', false));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});

/*********--------Settings----------*********/
router.post('/settings', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users_settings` WHERE `users_key`='" + key + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    delete req.body.access_token;
                    delete req.body.key;
                    var dataSQL = escapeSQL.format("UPDATE `users_settings` SET ? WHERE `users_key`= ?", [req.body, key]);
                    BASE.updateWithSQL(dataSQL, function(updateSuccess) {
                        if (updateSuccess) {
                            if (req.body.is_visible && req.body.is_visible == 1) {
                                console.log("Update is_visible cho key: " + key + " từ 1->0");
                                client.query("UPDATE `users` SET `status` = 'online' WHERE `key`='" + key + "'");
                            } else if (req.body.is_visible && req.body.is_visible == 0) {
                                console.log("Update is_visible cho key: " + key + " từ 0->1");
                                client.query("UPDATE `users` SET `status` = 'offline' WHERE `key`='" + key + "'");
                            }
                            return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Update failed.', 'success', true));
                        }
                    });
                } else {
                    return res.send(echoResponse(404, 'Server dont have this user settings', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.post('/report', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlReport = "SELECT * FROM `reports_users` WHERE `users_key`='" + req.body.users_key + "' AND `friend_key`='" + req.body.friend_key + "'";
            BASE.getObjectWithSQL(sqlReport, function(reported) {
                if (reported) {
                    return res.send(echoResponse(200, 'You reported this user.', 'success', false));
                } else {
                    delete req.body.access_token;
                    var sql = escapeSQL.format("INSERT INTO `reports_users` SET ?", req.body);
                    BASE.insertWithSQL(sql, function(result) {
                        if (result) {
                            getInformationUser(req.body.users_key, function(result) {
                                getInformationUser(req.body.friend_key, function(resultReport) {
                                    sendReport(req.body.users_key, req.body.friend_key);
                                    notificationReport(req.body.users_key, req.body.friend_key);
                                    var tinnhanReport = {
                                        to: '<' + resultReport.email + '>,<' + result.email + '>,<chithanh.ptit@gmail.com>',
                                        subject: '[IUDIU00' + d.insertId + '] complaint has been created!',
                                        html: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width"><!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><title></title><!--[if !mso]><!-- --><link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css"><!--<![endif]--><style type="text/css" id="media-query">body {margin: 0;padding: 0; }table, tr, td {vertical-align: top;border-collapse: collapse; }.ie-browser table, .mso-container table {table-layout: fixed; }* {line-height: inherit; }a[x-apple-data-detectors=true] {color: inherit !important;text-decoration: none !important; }[owa] .img-container div, [owa] .img-container button {display: block !important; }[owa] .fullwidth button {width: 100% !important; }[owa] .block-grid .col {display: table-cell;float: none !important;vertical-align: top; }.ie-browser .num12, .ie-browser .block-grid, [owa] .num12, [owa] .block-grid {width: 575px !important; }.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%; }.ie-browser .mixed-two-up .num4, [owa] .mixed-two-up .num4 {width: 188px !important; }.ie-browser .mixed-two-up .num8, [owa] .mixed-two-up .num8 {width: 376px !important; }.ie-browser .block-grid.two-up .col, [owa] .block-grid.two-up .col {width: 287px !important; }.ie-browser .block-grid.three-up .col, [owa] .block-grid.three-up .col {width: 191px !important; }.ie-browser .block-grid.four-up .col, [owa] .block-grid.four-up .col {width: 143px !important; }.ie-browser .block-grid.five-up .col, [owa] .block-grid.five-up .col {width: 115px !important; }.ie-browser .block-grid.six-up .col, [owa] .block-grid.six-up .col {width: 95px !important; }.ie-browser .block-grid.seven-up .col, [owa] .block-grid.seven-up .col {width: 82px !important; }.ie-browser .block-grid.eight-up .col, [owa] .block-grid.eight-up .col {width: 71px !important; }.ie-browser .block-grid.nine-up .col, [owa] .block-grid.nine-up .col {width: 63px !important; }.ie-browser .block-grid.ten-up .col, [owa] .block-grid.ten-up .col {width: 57px !important; }.ie-browser .block-grid.eleven-up .col, [owa] .block-grid.eleven-up .col {width: 52px !important; }.ie-browser .block-grid.twelve-up .col, [owa] .block-grid.twelve-up .col {width: 47px !important; }@media only screen and (min-width: 595px) {.block-grid {width: 575px !important; }.block-grid .col {display: table-cell;Float: none !important;vertical-align: top; }.block-grid .col.num12 {width: 575px !important; }.block-grid.mixed-two-up .col.num4 {width: 188px !important; }.block-grid.mixed-two-up .col.num8 {width: 376px !important; }.block-grid.two-up .col {width: 287px !important; }.block-grid.three-up .col {width: 191px !important; }.block-grid.four-up .col {width: 143px !important; }.block-grid.five-up .col {width: 115px !important; }.block-grid.six-up .col {width: 95px !important; }.block-grid.seven-up .col {width: 82px !important; }.block-grid.eight-up .col {width: 71px !important; }.block-grid.nine-up .col {width: 63px !important; }.block-grid.ten-up .col {width: 57px !important; }.block-grid.eleven-up .col {width: 52px !important; }.block-grid.twelve-up .col {width: 47px !important; } }@media (max-width: 595px) {.block-grid, .col {min-width: 320px !important;max-width: 100% !important; }.block-grid {width: calc(100% - 40px) !important; }.col {width: 100% !important; }.col > div {margin: 0 auto; }img.fullwidth {max-width: 100% !important; } }</style>      </head><body class="clean-body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: transparent"><!--[if IE]><div class="ie-browser"><![endif]--><!--[if mso]><div class="mso-container"><![endif]--><div class="nl-container" style="min-width: 320px;Margin: 0 auto;background-color: transparent"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: transparent;"><![endif]--><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="color:#555555;line-height:120%;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;">    <div style="font-size:12px;line-height:14px;color:#555555;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;text-align:left;"><br></div>  </div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:0px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi/logo.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;line-height:120%;color:#0D0D0D; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"> <div style="font-size:12px;line-height:14px;color:#0D0D0D;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 14px;line-height: 17px;text-align: center"><span style="font-size: 28px; line-height: 33px;"><strong><span style="line-height: 33px; font-size: 28px;">Dear Sir or Madam,</span></strong></span></p></div>  </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&#160;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&#160;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;line-height:150%;color:#555555; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"> <div style="font-size:12px;line-height:18px;color:#555555;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center">' +
                                            'Please include <b>IUDIU00' + d.insertId + '</b> in the subject line of any future correspondence on this matter and <b>Reply to all</b> within 7 days, if after 7 days we do not receive any response from you, your post or account will be locked. Thank you!' +
                                            '<br>Your account has been reported with content:</p><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 21px;"><strong><em>"' +
                                            req.body.message + '"</em></strong></span></p></div> </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&#160;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&#160;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;line-height:150%;color:#0D0D0D; padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"> <div style="font-size:12px;line-height:18px;color:#0D0D0D;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center"></p></div>    </div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ACBE7E;" class="block-grid mixed-two-up"><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#ACBE7E;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="192" style=" width:192px; padding-right: 10px; padding-left: 10px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="383" style=" width:383px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num8" style="Float: left;min-width: 320px;max-width: 376px;width: 383px;width: calc(6600% - 38894px);background-color: #ACBE7E;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:15px; padding-bottom:15px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="color:#555555;line-height:120%;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"> <div style="font-size:12px;line-height:14px;color:#555555;font-family:"Montserrat", "Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px; padding: 0 10px 0 10px;"><span style="color: rgb(255, 255, 255); font-size: 12px; line-height: 14px;"><em></em></span></p></div>    </div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #525252;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#525252;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #525252;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:15px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:"Helvetica Neue", Helvetica, Arial, sans-serif; padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;">    <div style="font-size:12px;line-height:14px;font-family:inherit;color:#FFFFFF;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="color: rgb(153, 204, 0); font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Tel :</span><span style="color: rgb(255, 255, 255); font-size: 14px; line-height: 16px;"> +84 9 86 86 86 72</span></span></p></div>   </div><!--[if mso]></td></tr></table><![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:"Helvetica Neue", Helvetica, Arial, sans-serif; padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;">   <div style="font-size:12px;line-height:14px;color:#FFFFFF;font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Smart Connect Software</span> @&#160;2017</span></p></div>  </div><!--[if mso]></td></tr></table><![endif]--><div align="center" style="padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"><div style="display: table; max-width:57;"><!--[if (mso)|(IE)]><table width="57" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse; padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"  align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:57px;"><tr><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]--><table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;Margin-right: 0"><tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top"><a href="https://www.facebook.com/Smartsfw/" title="Facebook" target="_blank"><img src="http://smartconnectsoftware.com/mail_iudi//facebook@2x.png" alt="Facebook" title="Facebook" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important"></a><div style="line-height:5px;font-size:1px">&#160;</div></td></tr></tbody></table><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//rounder-dwn.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><div style="padding-right: 15px; padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><!--[if (mso)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 15px;padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><table width="100%" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><div align="center"><div style="border-top: 0px solid transparent; width:100%; line-height:0px; height:0px; font-size:0px;">&#160;</div></div><!--[if (mso)]></td></tr></table></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>   <!--[if (mso)|(IE)]></td></tr></table><![endif]--></div><!--[if (mso)|(IE)]></div><![endif]--></body></html>'
                                    };
                                    transporter.sendMail(tinnhanReport, (error, info) => {
                                        if (error) {
                                            console.log(error.message);
                                        } else {
                                            console.log('Server responded with "%s"', info.response);
                                            transporter.close();
                                        }
                                    });
                                });
                            });
                            return res.send(echoResponse(200, 'You reported successfully.', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Report error.', 'success', false));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------get information channel call----------*********/
router.get('/:idChannel/type=channel_information&access_token=:access_token', urlParser, function(req, res) {
    var sql = "SELECT * FROM `channels` WHERE `idChannel` = '" + req.params.idChannel + "'";
    BASE.getObjectWithSQL(sql, function(data) {
        if (data) {
            return res.send(echoResponse(200, data, 'success', false));
        } else {
            return res.send(echoResponse(404, "Channel not exists", 'success', false));
        }
    });
});


///--- Active email address
router.post('/change_email', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlMailCheck = "SELECT * FROM `users` WHERE `email`='" + req.body.email + "'";
            BASE.getObjectWithSQL(sqlMailCheck, function(isExists) {
                if (isExists) {
                    return res.send(echoResponse(201, 'This email has been exists', 'success', false));
                } else {
                    delete req.body.access_token;
                    var selectLike = "SELECT * FROM `active_mail` WHERE `users_key`='" + key + "' AND `email`='" + req.body.email + "'";
                    var number = BASE.getRandomInt(100000, 999999);
                    BASE.getObjectWithSQL(selectLike, function(isActive) {
                        if (isActive) {
                            var sql = "UPDATE `active_mail` SET `number`='" + number + "' WHERE `users_key`='" + key + "' AND `email`='" + req.body.email + "'";
                            BASE.updateWithSQL(sql, function(success) {
                                if (success) {
                                    getInformationUser(req.body.users_key, function(result) {
                                        var tinnhan = {
                                            to: '<' + req.body.email + '>',
                                            subject: '[IUDI] Email Authentication Code',
                                            html: '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width"><!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><title></title><!--[if !mso]><!-- --><link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css"><!--<![endif]--><style type="text/css" id="media-query">body {margin: 0;padding: 0; }table, tr, td {vertical-align: top;border-collapse: collapse; }.ie-browser table, .mso-container table {table-layout: fixed; }* {line-height: inherit; }a[x-apple-data-detectors=true] {color: inherit !important;text-decoration: none !important; }[owa] .img-container div, [owa] .img-container button {display: block !important; }[owa] .fullwidth button {width: 100% !important; }[owa] .block-grid .col {display: table-cell;float: none !important;vertical-align: top; }.ie-browser .num12, .ie-browser .block-grid, [owa] .num12, [owa] .block-grid {width: 575px !important; }.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%; }.ie-browser .mixed-two-up .num4, [owa] .mixed-two-up .num4 {width: 188px !important; }.ie-browser .mixed-two-up .num8, [owa] .mixed-two-up .num8 {width: 376px !important; }.ie-browser .block-grid.two-up .col, [owa] .block-grid.two-up .col {width: 287px !important; }.ie-browser .block-grid.three-up .col, [owa] .block-grid.three-up .col {width: 191px !important; }.ie-browser .block-grid.four-up .col, [owa] .block-grid.four-up .col {width: 143px !important; }.ie-browser .block-grid.five-up .col, [owa] .block-grid.five-up .col {width: 115px !important; }.ie-browser .block-grid.six-up .col, [owa] .block-grid.six-up .col {width: 95px !important; }.ie-browser .block-grid.seven-up .col, [owa] .block-grid.seven-up .col {width: 82px !important; }.ie-browser .block-grid.eight-up .col, [owa] .block-grid.eight-up .col {width: 71px !important; }.ie-browser .block-grid.nine-up .col, [owa] .block-grid.nine-up .col {width: 63px !important; }.ie-browser .block-grid.ten-up .col, [owa] .block-grid.ten-up .col {width: 57px !important; }.ie-browser .block-grid.eleven-up .col, [owa] .block-grid.eleven-up .col {width: 52px !important; }.ie-browser .block-grid.twelve-up .col, [owa] .block-grid.twelve-up .col {width: 47px !important; }@media only screen and (min-width: 595px) {.block-grid {width: 575px !important; }.block-grid .col {display: table-cell;Float: none !important;vertical-align: top; }.block-grid .col.num12 {width: 575px !important; }.block-grid.mixed-two-up .col.num4 {width: 188px !important; }.block-grid.mixed-two-up .col.num8 {width: 376px !important; }.block-grid.two-up .col {width: 287px !important; }.block-grid.three-up .col {width: 191px !important; }.block-grid.four-up .col {width: 143px !important; }.block-grid.five-up .col {width: 115px !important; }.block-grid.six-up .col {width: 95px !important; }.block-grid.seven-up .col {width: 82px !important; }.block-grid.eight-up .col {width: 71px !important; }.block-grid.nine-up .col {width: 63px !important; }.block-grid.ten-up .col {width: 57px !important; }.block-grid.eleven-up .col {width: 52px !important; }.block-grid.twelve-up .col {width: 47px !important; } }@media (max-width: 595px) {.block-grid, .col {min-width: 320px !important;max-width: 100% !important; }.block-grid {width: calc(100% - 40px) !important; }.col {width: 100% !important; }.col > div {margin: 0 auto; }img.fullwidth {max-width: 100% !important; } }</style>        </head><body class="clean-body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: transparent"><!--[if IE]><div class="ie-browser"><![endif]--><!--[if mso]><div class="mso-container"><![endif]--><div class="nl-container" style="min-width: 320px;Margin: 0 auto;background-color: transparent"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: transparent;"><![endif]--><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="color:#555555;line-height:120%;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">   <div style="font-size:12px;line-height:14px;color:#555555;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><br></div>   </div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:0px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi/logo.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;line-height:120%;color:#0d0d0d;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">    <div style="font-size:12px;line-height:14px;color:#0D0D0D;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 14px;line-height: 17px;text-align: center"><span style="font-size: 28px; line-height: 33px;"><strong><span style="line-height: 33px; font-size: 28px;">' +
                                                'Hello ' + result.nickname + ',</span></strong></span></p></div>   </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&nbsp;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&nbsp;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;line-height:150%;color:#555555;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">    <div style="font-size:12px;line-height:18px;color:#555555;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center">' +
                                                'Email Authentication Code:' + '</p><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 65px;"><strong style="background: #525252;font-size: 20px;    color: #ffffff;    padding: 10px 15px;    border-radius: 5px;"><em>' +
                                                number + '</em></strong></span></p></div>    </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&nbsp;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&nbsp;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ACBE7E;" class="block-grid mixed-two-up"><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#ACBE7E;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="192" style=" width:192px; padding-right: 10px; padding-left: 10px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="383" style=" width:383px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #525252;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#525252;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #525252;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:15px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;="" padding-right:="" 5px;="" padding-left:="" padding-top:="" 25px;="" padding-bottom:="" 5px;"=""> <div style="font-size:12px;line-height:14px;font-family:inherit;color:#FFFFFF;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="color: rgb(153, 204, 0); font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Tel :</span><span style="color: rgb(255, 255, 255); font-size: 14px; line-height: 16px;"> +84 9 86 86 86 72</span></span></p></div>   </div><!--[if mso]></td></tr></table><![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;="" padding-right:="" 5px;="" padding-left:="" padding-top:="" padding-bottom:="" 5px;"="">   <div style="font-size:12px;line-height:14px;color:#FFFFFF;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Smart Connect Software</span> @&nbsp;2017</span></p></div>  </div><!--[if mso]></td></tr></table><![endif]--><div align="center" style="padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"><div style="display: table; max-width:57;"><!--[if (mso)|(IE)]><table width="57" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse; padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"  align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:57px;"><tr><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]--><table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;Margin-right: 0"><tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top"><a href="https://www.facebook.com/Smartsfw/" title="Facebook" target="_blank"><img src="http://smartconnectsoftware.com/mail_iudi//facebook@2x.png" alt="Facebook" title="Facebook" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important"></a><div style="line-height:5px;font-size:1px">&nbsp;</div></td></tr></tbody></table><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//rounder-dwn.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><div style="padding-right: 15px; padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><!--[if (mso)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 15px;padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><table width="100%" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><div align="center"><div style="border-top: 0px solid transparent; width:100%; line-height:0px; height:0px; font-size:0px;">&nbsp;</div></div><!--[if (mso)]></td></tr></table></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>   <!--[if (mso)|(IE)]></td></tr></table><![endif]--></div><!--[if (mso)|(IE)]></div><![endif]--></body></html>'
                                        };
                                        transporter.sendMail(tinnhan, (error, info) => {
                                            if (error) {
                                                console.log(error.message);
                                            } else {
                                                console.log('Server responded with "%s"', info.response);
                                                transporter.close();
                                            }
                                        });
                                    });
                                    return res.send(echoResponse(200, 'Send active code successfully.', 'success', false));
                                } else {
                                    return res.send(echoResponse(404, 'Failed send active code.', 'success', false));
                                }
                            });
                        } else {
                            var sql = "INSERT INTO `active_mail` SET `number`='" + number + "', `users_key`='" + key + "', `email`='" + req.body.email + "'";
                            BASE.insertWithSQL(sql, function(success) {
                                if (success) {
                                    getInformationUser(req.body.users_key, function(result) {
                                        var tinnhan = {
                                            to: '<' + req.body.email + '>',
                                            subject: '[IUDI] Email Authentication Code',
                                            html: '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width"><!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><title></title><!--[if !mso]><!-- --><link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css"><!--<![endif]--><style type="text/css" id="media-query">body {margin: 0;padding: 0; }table, tr, td {vertical-align: top;border-collapse: collapse; }.ie-browser table, .mso-container table {table-layout: fixed; }* {line-height: inherit; }a[x-apple-data-detectors=true] {color: inherit !important;text-decoration: none !important; }[owa] .img-container div, [owa] .img-container button {display: block !important; }[owa] .fullwidth button {width: 100% !important; }[owa] .block-grid .col {display: table-cell;float: none !important;vertical-align: top; }.ie-browser .num12, .ie-browser .block-grid, [owa] .num12, [owa] .block-grid {width: 575px !important; }.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%; }.ie-browser .mixed-two-up .num4, [owa] .mixed-two-up .num4 {width: 188px !important; }.ie-browser .mixed-two-up .num8, [owa] .mixed-two-up .num8 {width: 376px !important; }.ie-browser .block-grid.two-up .col, [owa] .block-grid.two-up .col {width: 287px !important; }.ie-browser .block-grid.three-up .col, [owa] .block-grid.three-up .col {width: 191px !important; }.ie-browser .block-grid.four-up .col, [owa] .block-grid.four-up .col {width: 143px !important; }.ie-browser .block-grid.five-up .col, [owa] .block-grid.five-up .col {width: 115px !important; }.ie-browser .block-grid.six-up .col, [owa] .block-grid.six-up .col {width: 95px !important; }.ie-browser .block-grid.seven-up .col, [owa] .block-grid.seven-up .col {width: 82px !important; }.ie-browser .block-grid.eight-up .col, [owa] .block-grid.eight-up .col {width: 71px !important; }.ie-browser .block-grid.nine-up .col, [owa] .block-grid.nine-up .col {width: 63px !important; }.ie-browser .block-grid.ten-up .col, [owa] .block-grid.ten-up .col {width: 57px !important; }.ie-browser .block-grid.eleven-up .col, [owa] .block-grid.eleven-up .col {width: 52px !important; }.ie-browser .block-grid.twelve-up .col, [owa] .block-grid.twelve-up .col {width: 47px !important; }@media only screen and (min-width: 595px) {.block-grid {width: 575px !important; }.block-grid .col {display: table-cell;Float: none !important;vertical-align: top; }.block-grid .col.num12 {width: 575px !important; }.block-grid.mixed-two-up .col.num4 {width: 188px !important; }.block-grid.mixed-two-up .col.num8 {width: 376px !important; }.block-grid.two-up .col {width: 287px !important; }.block-grid.three-up .col {width: 191px !important; }.block-grid.four-up .col {width: 143px !important; }.block-grid.five-up .col {width: 115px !important; }.block-grid.six-up .col {width: 95px !important; }.block-grid.seven-up .col {width: 82px !important; }.block-grid.eight-up .col {width: 71px !important; }.block-grid.nine-up .col {width: 63px !important; }.block-grid.ten-up .col {width: 57px !important; }.block-grid.eleven-up .col {width: 52px !important; }.block-grid.twelve-up .col {width: 47px !important; } }@media (max-width: 595px) {.block-grid, .col {min-width: 320px !important;max-width: 100% !important; }.block-grid {width: calc(100% - 40px) !important; }.col {width: 100% !important; }.col > div {margin: 0 auto; }img.fullwidth {max-width: 100% !important; } }</style>        </head><body class="clean-body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: transparent"><!--[if IE]><div class="ie-browser"><![endif]--><!--[if mso]><div class="mso-container"><![endif]--><div class="nl-container" style="min-width: 320px;Margin: 0 auto;background-color: transparent"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: transparent;"><![endif]--><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="color:#555555;line-height:120%;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">   <div style="font-size:12px;line-height:14px;color:#555555;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><br></div>   </div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:0px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi/logo.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;line-height:120%;color:#0d0d0d;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">    <div style="font-size:12px;line-height:14px;color:#0D0D0D;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 14px;line-height: 17px;text-align: center"><span style="font-size: 28px; line-height: 33px;"><strong><span style="line-height: 33px; font-size: 28px;">' +
                                                'Hello ' + result.nickname + ',</span></strong></span></p></div>   </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&nbsp;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&nbsp;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;line-height:150%;color:#555555;="" padding-right:="" 10px;="" padding-left:="" padding-top:="" padding-bottom:="" 10px;"="">    <div style="font-size:12px;line-height:18px;color:#555555;font-family:" montserrat",="" "trebuchet="" ms",="" "lucida="" grande",="" sans="" unicode",="" sans",="" tahoma,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center">' +
                                                'Email Authentication Code:' + '</p><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 65px;"><strong style="background: #525252;font-size: 20px;    color: #ffffff;    padding: 10px 15px;    border-radius: 5px;"><em>' +
                                                number + '</em></strong></span></p></div>    </div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&nbsp;</div>  <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&nbsp;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #ACBE7E;" class="block-grid mixed-two-up"><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#ACBE7E;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="192" style=" width:192px; padding-right: 10px; padding-left: 10px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><!--[if (mso)|(IE)]></td><td align="center" width="383" style=" width:383px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:15px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #525252;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#525252;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #525252;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:15px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;="" padding-right:="" 5px;="" padding-left:="" padding-top:="" 25px;="" padding-bottom:="" 5px;"=""> <div style="font-size:12px;line-height:14px;font-family:inherit;color:#FFFFFF;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="color: rgb(153, 204, 0); font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Tel :</span><span style="color: rgb(255, 255, 255); font-size: 14px; line-height: 16px;"> +84 9 86 86 86 72</span></span></p></div>   </div><!--[if mso]></td></tr></table><![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;="" padding-right:="" 5px;="" padding-left:="" padding-top:="" padding-bottom:="" 5px;"="">   <div style="font-size:12px;line-height:14px;color:#FFFFFF;font-family:" helvetica="" neue",="" helvetica,="" arial,="" sans-serif;text-align:left;"=""><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Smart Connect Software</span> @&nbsp;2017</span></p></div>  </div><!--[if mso]></td></tr></table><![endif]--><div align="center" style="padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"><div style="display: table; max-width:57;"><!--[if (mso)|(IE)]><table width="57" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse; padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"  align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:57px;"><tr><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]--><table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;Margin-right: 0"><tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top"><a href="https://www.facebook.com/Smartsfw/" title="Facebook" target="_blank"><img src="http://smartconnectsoftware.com/mail_iudi//facebook@2x.png" alt="Facebook" title="Facebook" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important"></a><div style="line-height:5px;font-size:1px">&nbsp;</div></td></tr></tbody></table><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>    <div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;  padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//rounder-dwn.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><div style="padding-right: 15px; padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><!--[if (mso)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 15px;padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><table width="100%" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><div align="center"><div style="border-top: 0px solid transparent; width:100%; line-height:0px; height:0px; font-size:0px;">&nbsp;</div></div><!--[if (mso)]></td></tr></table></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div>   <!--[if (mso)|(IE)]></td></tr></table><![endif]--></div><!--[if (mso)|(IE)]></div><![endif]--></body></html>'
                                        };
                                        transporter.sendMail(tinnhan, (error, info) => {
                                            if (error) {
                                                console.log(error.message);
                                            } else {
                                                console.log('Server responded with "%s"', info.response);
                                                transporter.close();
                                            }
                                        });
                                    });
                                    return res.send(echoResponse(200, 'Send active code successfully.', 'success', false));
                                } else {
                                    return res.send(echoResponse(404, 'Failed send active code.', 'success', false));
                                }
                            });
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


router.post('/auth_email', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlActive = "SELECT * FROM `active_mail` WHERE `users_key`='" + key + "' AND `email`='" + req.body.email + "' AND `number`='" + req.body.number + "'";
            BASE.getObjectWithSQL(sqlActive, function(isActive) {
                if (isActive) {
                    var updateSQL = "UPDATE `users` SET `email`='" + req.body.email + "' WHERE `key`='" + key + "'";
                    BASE.updateWithSQL(updateSQL, function(success) {
                        if (success) {
                            client.query("DELETE FROM `active_mail` WHERE `users_key`='" + key + "'");
                            return res.send(echoResponse(200, 'Updated email successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Authenticate failed ! Please check your email address and code', 'success', true));
                        }
                    });
                } else {
                    return res.send(echoResponse(404, 'Authenticate failed ! Please check your email address and code', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Other information----------*********/
router.post('/other_information', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `other_information` WHERE `users_key`='" + key + "'";
            var email = req.body.email;
            if (req.body.email) {
                client.query("UPDATE `users` SET `email`='" + email + "' WHERE `key`='" + key + "'");
            }
            delete req.body.email;
            delete req.body.key;
            delete req.body.access_token;
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    var sqlUpdate = escapeSQL.format("UPDATE `other_information` SET ? WHERE `users_key`= ?", [req.body, key]);
                    BASE.updateWithSQL(sqlUpdate, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Updated failed.', 'success', false));
                        }
                    });
                } else {
                    var sqlInsert = escapeSQL.format("INSERT INTO `other_information` SET ? WHERE `users_key`= ?", [req.body, key]);
                    BASE.insertWithSQL(sqlInsert, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Updated failed.', 'success', false));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------UPDATE Email----------*********/
router.post('/email', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `email`='" + req.body.email + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(300, 'This email exists.', 'success', false));
                } else {
                    var dataSQL = "UPDATE `users` SET `email`='" + req.body.email + "' WHERE `key`='" + key + "'";
                    BASE.updateWithSQL(dataSQL, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated email successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Update failed.', 'success', false));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------UPDATE username----------*********/
router.post('/username', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `username`='" + req.body.username + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(404, 'This username exists.', 'success', false));
                } else {
                    var dataSQL = "UPDATE `users` SET `username`='" + req.body.username + "' WHERE `key`='" + key + "'";
                    BASE.updateWithSQL(dataSQL, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated username successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Update failed', 'success', false));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********-------- Signout----------*********/
router.post('/signout', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `email`='" + req.body.email + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(404, 'This email exists.', 'success', false));
                } else {
                    var dataSQL = "UPDATE `users` SET `email`='" + req.body.email + "' WHERE `key`='" + req.body.key + "'";
                    BASE.updateWithSQL(dataSQL, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated email successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Update failed', 'success', false));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------UPDATE Email----------*********/
router.post('/phone', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `other_information` WHERE `phone_number`='" + req.body.phone_number + "' AND `calling_code`='" + req.body.calling_code + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(404, 'This phone number exists.', 'success', false));
                } else {
                    var check = "SELECT * FROM `other_information` WHERE `users_key`='" + req.body.key + "'";
                    BASE.getObjectWithSQL(check, function(data) {
                        if (data) {
                            var dataSQL = "UPDATE `other_information` SET `phone_number`='" + req.body.phone_number + "', `calling_code`='" + req.body.calling_code + "' WHERE `users_key`='" + key + "'";
                            BASE.updateWithSQL(dataSQL, function(update) {
                                if (update) {
                                    return res.send(echoResponse(200, 'Updated phone number successfully', 'success', false));
                                } else {
                                    return res.send(echoResponse(404, 'Update failed', 'success', false));
                                }
                            });
                        } else {
                            var dataSQL = "INSERT INTO `other_information`(`phone_number`,`calling_code`,`users_key`) VALUES ('" + req.body.phone_number + "','" + req.body.calling_code + "','" + key + "')";
                            BASE.insertWithSQL(dataSQL, function(insert) {
                                if (insert) {
                                    return res.send(echoResponse(200, 'Updated phone number successfully', 'success', false));
                                } else {
                                    return res.send(echoResponse(404, 'Update failed', 'success', false));
                                }
                            });
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------UPDATE INFORMATION----------*********/
router.post('/update', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `key`='" + key + "'";
            BASE.getObjectWithSQL(data, function(data) {
                if (data) {
                    delete req.body.access_token;
                    delete req.body.key;
                    if (req.body.ip_address && req.body.latitude && req.body.longitude && req.body.device_name && req.body.device_token) {
                        var locationSQL = "SELECT * FROM `devices` WHERE `users_key`='" + req.body.key + "' AND `device_name`=" + escapeSQL.escape(req.body.device_name) + " AND `device_type`='" + req.body.device_type + "'";
                        var currentTime = new Date().getTime();
                        BASE.getObjectWithSQL(locationSQL, function(object) {
                            if (object) {
                                client.query("UPDATE `devices` SET `time`='" + currentTime + "', `device_token`='" + req.body.device_token + "', `ip_address`='" + req.body.ip_address + "', `latitude`='" + req.body.latitude + "', `longitude`='" + req.body.longitude + "', `location`=" + escapeSQL.escape(req.body.city + ' / ' + req.body.country_code) + " WHERE `users_key`='" + req.body.key + "'");
                            } else {
                                client.query("INSERT INTO `devices` SET `users_key`='" + req.body.key + "', `device_token`='" + req.body.device_token + "', `device_name`=" + escapeSQL.escape(req.body.device_name) + ", `device_type`='" + req.body.device_type + "', `time`='" + currentTime + "', `ip_address`='" + req.body.ip_address + "', `latitude`='" + req.body.latitude + "', `longitude`='" + req.body.longitude + "', `location`=" + escapeSQL.escape(req.body.city + ' / ' + req.body.country_code) + "");
                            }
                        });
                    }
                    var sql = escapeSQL.format("UPDATE `users` SET ? WHERE `key`= ?", [req.body, key]);
                    BASE.updateWithSQL(sql, function(result) {
                        if (result) {
                            return res.send(echoResponse(200, 'Updated successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Update failed', 'success', false));
                        }
                    });
                } else {
                    return res.send(echoResponse(300, 'This account not exists', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




/*********--------GET 1 USER----------*********/
router.get('/:key/type=info&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `key`='" + key + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    var sqlPoint = "SELECT `point` FROM `facebook_point` WHERE `users_key`='" + key + "'";
                    BASE.getDataWithSQL(sqlPoint, function(point) {
                        if (point) {
                            data[0].point = point.point;
                        } else {
                            data[0].point = 0;
                        }
                        BASE.getObjectWithSQL("SELECT * FROM `other_information` WHERE `users_key`='" + key + "'", function(other_information) {
                            var sqlSettings = "SELECT `on_secret_message`,`on_receive_email`,`is_visible`,`show_facebook`,`show_device`,`show_inputinfo`,`unknown_message`,`sound_message`,`vibrate_message`,`preview_message`,`seen_message`,`find_nearby`,`find_couples` FROM `users_settings` WHERE `users_key`='" + key + "'";
                            if (other_information) {
                                BASE.getObjectWithSQL(sqlSettings, function(settings) {
                                    if (settings.length > 0) {
                                        return res.send(JSON.stringify({
                                            status: 200,
                                            data: data,
                                            users_settings: settings,
                                            other: other_information,
                                            message: "success",
                                            error: false
                                        }));
                                    } else {
                                        return res.send(JSON.stringify({
                                            status: 200,
                                            data: data,
                                            message: "success",
                                            error: false
                                        }));
                                    }
                                });
                            } else {
                                BASE.getObjectWithSQL(sqlSettings, function(settings) {
                                    if (settings.length > 0) {
                                        return res.send(JSON.stringify({
                                            status: 200,
                                            data: data,
                                            users_settings: settings,
                                            message: "success",
                                            error: false
                                        }));
                                    } else {
                                        return res.send(JSON.stringify({
                                            status: 200,
                                            data: data,
                                            message: "success",
                                            error: false
                                        }));
                                    }
                                });
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, 'This user does not exist', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


router.get('/:key/type=friendinfo', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var friend_key = req.body.friend_key || req.query.friend_key || req.params.friend_key;
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `users` WHERE `key`='" + friend_key + "'";
            BASE.getFriendByKey(friend_key, function(data) {
                if (data) {
                    var sqlPoint = "SELECT `point` FROM `facebook_point` WHERE `users_key`='" + friend_key + "'";
                    BASE.getDataWithSQL(sqlPoint, function(point) {
                        if (point) {
                            data.point = point.point;
                        } else {
                            data.point = 0;
                        }
                        BASE.getRelationship(key, friend_key, function(ketqua) {
                            if (ketqua) {
                                BASE.isFollowing(key, friend_key, function(isFollowing) {
                                    data.mutual_friend = contact2.length;
                                    data.relation_ship = ketqua;
                                    data.is_following = isFollowing;
                                    var array = [];
                                    array.push(data);
                                    BASE.getObjectWithSQL("SELECT * FROM `other_information` WHERE `users_key`='" + friend_key + "'", function(other_information) {
                                        var sqlSettings = "SELECT `on_secret_message`,`on_receive_email`,`is_visible`,`show_facebook`,`show_device`,`show_inputinfo`,`unknown_message`,`sound_message`,`vibrate_message`,`preview_message`,`seen_message`,`find_nearby`,`find_couples` FROM `users_settings` WHERE `users_key`='" + friend_key + "'";
                                        if (other_information) {
                                            BASE.getObjectWithSQL(sqlSettings, function(settings) {
                                                if (settings.length > 0) {
                                                    return res.send(JSON.stringify({
                                                        status: 200,
                                                        data: array,
                                                        users_settings: settings,
                                                        other: other_information,
                                                        message: "success",
                                                        error: false
                                                    }));
                                                } else {
                                                    return res.send(JSON.stringify({
                                                        status: 200,
                                                        data: array,
                                                        message: "success",
                                                        error: false
                                                    }));
                                                }
                                            });
                                        } else {
                                            BASE.getObjectWithSQL(sqlSettings, function(settings) {
                                                if (settings.length > 0) {
                                                    return res.send(JSON.stringify({
                                                        status: 200,
                                                        data: array,
                                                        users_settings: settings,
                                                        message: "success",
                                                        error: false
                                                    }));
                                                } else {
                                                    return res.send(JSON.stringify({
                                                        status: 200,
                                                        data: array,
                                                        message: "success",
                                                        error: false
                                                    }));
                                                }
                                            });
                                        }
                                    });
                                })
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, 'This user does not exist', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET ALL Conversation----------*********/
router.get('/:key/type=conversations', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            if (page) {
                userSQL = "SELECT * FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + req.params.key + "' ORDER BY `last_action_time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            } else {
                userSQL = "SELECT * FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + req.params.key + "' ORDER BY `last_action_time` DESC";
            }
            var userSQL;
            var arrayConversations = [];
            BASE.getObjectWithSQL(userSQL, function(conversations) {
                if (conversations) {
                    async.forEachOf(conversations, function(element, i, callback) {
                        var sql = "WHERE `key` IN (SELECT `users_key` FROM `members` WHERE `conversations_key`='" + element.key + "')";
                        BASE.getFriendBySQL(sql, function(user) {
                            if (user) {
                                getStatusLastMessage(element.key, function(status) {
                                    getLastMessage(element.key, function(last_message) {
                                        var dict = element;
                                        dict.members = user;
                                        dict.status = status;
                                        dict.lastmessage = last_message;
                                        arrayConversations.push(dict);
                                        if (i === conversations.length - 1) {
                                            return res.send(echoResponse(200, arrayConversations, 'success', false));
                                        }
                                    });
                                });
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Sync Conversation----------*********/
router.get('/:key/type=sync', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var currentTime = new Date().getTime();
            var userSQL = "SELECT * FROM `messages` WHERE `time_server` IS NOT NULL AND (" + parseInt(currentTime, 10) + "-CAST(`time_server` AS UNSIGNED))/86400000 <= 10 AND `conversations_key` IN (SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + req.params.key + "' ORDER BY `last_action_time` DESC)";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});

/*********--------Udelete avatar----------*********/
router.post('/deleteAvatar', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var currentTime = new Date().getTime();
            var userSQL = "SELECT * FROM `users` WHERE `key`='" + key + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    var urlImage = "https://i.imgur.com/2NNcVO7.jpg";
                    var dataSQL = "UPDATE `users` SET `avatar`='" + urlImage + "' WHERE `key`='" + key + "'";
                    BASE.updateWithSQL(dataSQL, function(status) {
                        if (status) {
                            return res.send(JSON.stringify({
                                status: 200,
                                avatar: urlImage,
                                message: "Delete avatar success",
                                error: false
                            }));
                        } else {
                            return res.send(echoResponse(404, 'Delete Failed.', 'success', true));
                        }
                    });
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Sync Conversation unread----------*********/
router.get('/:key/type=syncunread', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `messages` WHERE `key` IN (SELECT `messages_key` FROM `message_status` WHERE `status`=0 AND `users_key`='" + req.params.key + "' AND `conversations_key` IN (SELECT `key` FROM conversations INNER JOIN members ON members.conversations_key = conversations.key AND members.users_key = '" + req.params.key + "')) ORDER BY `time` DESC";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------Devices----------*********/
router.get('/:key/type=devices', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `devices` WHERE `users_key`='" + req.params.key + "' ORDER BY `time` DESC";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Facebook Data----------*********/
router.get('/:key/type=facebook', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `facebook_informations` WHERE `users_key`='" + req.params.key + "'";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET ALL FRIEND----------*********/
router.get('/:key/type=friend&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "')";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', false));
                } else {
                    return res.send(echoResponse(404, '404 Not Found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET NEARBY FRIEND----------*********/
router.get('/:key/type=findnearby', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var page = req.body.page || req.query.page || req.params.page;
            var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
            var latitude = req.body.latitude || req.query.latitude || req.params.latitude;
            var longitude = req.body.longitude || req.query.longitude || req.params.longitude;
            var gender = req.body.gender || req.query.gender || req.params.gender;
            var distance = req.body.distance || req.query.distance || req.params.distance;
            var min_age = req.body.min_age || req.query.min_age || req.params.min_age;
            var max_age = req.body.max_age || req.query.max_age || req.params.max_age;

            var userSQL1 = "SELECT " + BASE.baseSelectFriendSQL() + ",ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) AS distance FROM users JOIN ";
            var userSQL2 = "(SELECT " + parseFloat(latitude) + " AS your_latitude, " + parseFloat(longitude) + " AS your_longitude ) AS p ON 1=1 WHERE";
            var userSQL3 = "`sex`='" + gender + "' AND ";
            var userSQL4 = "`key` IN (SELECT `users_key` FROM `users_settings` WHERE `find_nearby`=1)";
            var userSQL5 = "AND `key` NOT IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + key + "')";
            var userSQL6 = "AND `key` NOT IN (SELECT `friend_key` FROM `requests` WHERE `users_key`='" + key + "' OR `friend_key`='" + key + "')";
            var userSQL10 = "AND `key` NOT IN (SELECT `friend_key` FROM `blocks` WHERE `users_key`='" + key + "') AND `key` NOT IN (SELECT `users_key` FROM `blocks` WHERE `friend_key`='" + key + "')";
            var userSQL7 = "AND `key`!='" + key + "'";
            var userSQL9 = " AND ROUND(111.045* DEGREES(ACOS(COS(RADIANS(your_latitude)) * COS(RADIANS(latitude)) * COS(RADIANS(your_longitude) - RADIANS(longitude)) + SIN(RADIANS(your_latitude)) * SIN(RADIANS(latitude)))),2) <= " + parseInt(distance, 10) + " ORDER BY distance";
            var pp = " LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";

            var finalSQL;
            var array = [];
            if (gender == 0) {
                finalSQL = userSQL1 + userSQL2 + userSQL4 + userSQL5 + userSQL6 + userSQL10 + userSQL7 + userSQL9 + pp;
            } else {
                finalSQL = userSQL1 + userSQL2 + userSQL3 + userSQL4 + userSQL5 + userSQL10 + userSQL6 + userSQL7 + userSQL9 + pp;
            }
            BASE.getObjectWithSQL(finalSQL, function(data) {
                if (data) {
                    async.forEachOf(data, function(element, i, callback) {
                        delete data[i].your_latitude;
                        delete data[i].your_longitude;
                        var date = new Date(data[i].birthday);
                        var today = new Date();
                        var age = today.getFullYear() - date.getFullYear();
                        if (age >= min_age && age <= max_age) {
                            data[i].age = age;
                            array.push(data[i]);
                        }
                        if (i === data.length - 1) {
                            if (array.length > 0) {
                                return res.send(echoResponse(200, array, 'success', false));
                            } else {
                                return res.send(echoResponse(404, "No have any user", 'success', true));
                            }
                        }
                    });
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET NEARBY ONLINE----------*********/
router.get('/:key/type=findonline', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sex = req.body.gender || req.query.gender || req.params.gender;
            var page = req.body.page || req.query.page || req.params.page;
            var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
            var min_age = req.body.min_age || req.query.min_age || req.params.min_age;
            var max_age = req.body.max_age || req.query.max_age || req.params.max_age;

            var userSQL1 = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE ";
            var userSQL4 = "`key` IN (SELECT `users_key` FROM `users_settings` WHERE `find_nearby`=1)";
            var userSQL5 = "AND `key` NOT IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "')";
            var userSQL6 = "AND `key` NOT IN (SELECT `friend_key` FROM `requests` WHERE `users_key`='" + req.params.key + "' OR `friend_key`='" + req.params.key + "')";
            var userSQL9 = "AND `key` NOT IN (SELECT `friend_key` FROM `blocks` WHERE `users_key`='" + req.params.key + "' OR `friend_key`='" + req.params.key + "')";
            var userSQL7 = "AND `key`!='" + req.params.key + "' AND `status`='online'";
            var userSQL8 = "AND `sex`='" + sex + "'";
            var pp = " LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            var finalSQL;
            var array = [];
            if (sex == 0) {
                finalSQL = userSQL1 + userSQL4 + userSQL5 + userSQL6 + userSQL9 + userSQL7 + pp;
            } else {
                finalSQL = userSQL1 + userSQL4 + userSQL5 + userSQL6 + userSQL9 + userSQL7 + userSQL8 + pp;
            }
            BASE.getObjectWithSQL(finalSQL, function(data) {
                if (data) {
                    async.forEachOf(data, function(element, i, callback) {
                        var date = new Date(data[i].birthday);
                        var today = new Date();
                        var age = today.getFullYear() - date.getFullYear();
                        if (age >= min_age && age <= max_age) {
                            data[i].age = age;
                            array.push(data[i]);
                        }
                        if (i === data.length - 1) {
                            if (array.length > 0) {
                                return res.send(echoResponse(200, array, 'success', false));
                            } else {
                                return res.send(echoResponse(404, "No have any user", 'success', true));
                            }
                        }
                    });
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET ALL REQUEST FRIEND----------*********/
router.get('/:key/type=friendrequest&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `requests` WHERE `users_key`='" + req.params.key + "')";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    async.forEachOf(data, function(ele, i, call) {
                        var sql = "SELECT `id`,`message` FROM `requests` WHERE `friend_key`='" + data[i].key + "' AND `users_key`='" + req.params.key + "'";
                        BASE.getDataWithSQL(sql, function(dataMessage) {
                            if (dataMessage) {
                                data[i].message = dataMessage.message;
                                data[i].id_request = dataMessage.id;
                                if (i === data.length - 1) {
                                    var data2 = _.sortBy(data, 'id_request');
                                    data2.reverse();
                                    return res.send(echoResponse(200, data2, "success", false));
                                }
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET SUGGEST FRIEND----------*********/
router.get('/:key/type=friendsuggest', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "')) AND `key`!='" + req.params.key + "' AND `key` NOT IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "')";
            var notin = "AND `key` NOT IN (SELECT `friend_key` FROM `requests` WHERE `users_key`='" + req.params.key + "')";
            var notin1 = "AND `key` NOT IN (SELECT `users_key` FROM `requests` WHERE `friend_key`='" + req.params.key + "')";
            var block1 = "AND `key` NOT IN (SELECT `users_key` FROM `blocks` WHERE `friend_key`='" + req.params.key + "')";
            var block2 = "AND `key` NOT IN (SELECT `friend_key` FROM `blocks` WHERE `users_key`='" + req.params.key + "')";
            var notinUnsuggest = "AND `key` NOT IN (SELECT `friend_key` FROM `unsuggest` WHERE `users_key`='" + req.params.key + "')";
            var fullSQL = userSQL + notin + notin1 + block1 + block2 + notinUnsuggest;
            var dataUser = [];
            BASE.getObjectWithSQL(fullSQL, function(data) {
                if (data) {
                    async.forEachOf(data, function(element, i, callback) {
                        var sql = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + data[i].key + "' AND `friend_key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "'))";
                        BASE.getObjectWithSQL(sql, function(contact) {
                            if (contact) {
                                data[i].mutual_friend = contact.length;
                                dataUser.push(data[i]);
                            } else {
                                data[i].mutual_friend = 0;
                            }
                            if (i === data.length - 1) {
                                return res.send(echoResponse(200, dataUser, "success", false));
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------Unsuggest----------*********/
router.post('/unsuggest', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `unsuggest` WHERE `users_key`='" + req.body.users_key + "' AND `friend_key`='" + req.body.friend_key + "'";
            BASE.getObjectWithSQL(userSQL, function(user) {
                if (user) {
                    return res.send(echoResponse(200, 'Unsuggest this user successfully', 'success', true));
                } else {
                    var sqlinsert = "INSERT INTO `unsuggest` SET `users_key`='" + req.body.users_key + "',`friend_key`='" + req.body.friend_key + "'";
                    BASE.insertWithSQL(sqlinsert, function(success) {
                        if (success) {
                            return res.send(echoResponse(200, 'Unsuggest this user successfully', 'success', true));
                        } else {
                            return res.send(echoResponse(200, 'Unsuggest error', 'success', true));
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------GET SUGGEST FRIEND----------*********/
router.get('/:key/type=mutual_friend', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var friend_key = req.body.friend_key || req.query.friend_key || req.params.friend_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + friend_key + "' AND `friend_key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + key + "'))";
            BASE.getObjectWithSQL(sql, function(data) {
                if (data) {
                    async.forEachOf(data, function(element, i, callback) {
                        var sql2 = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + contact[i].key + "' AND `friend_key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "'))";
                        BASE.getObjectWithSQL(sql2, function(contact) {
                            data[i].mutual_friend = contact.length;
                            if (i === data.length - 1) {
                                return res.send(echoResponse(200, data, "success", false));
                            }
                        });
                    });
                } else {
                    return res.send(echoResponse(404, "404 not found", "success", true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET ALL BLOCK FRIEND----------*********/
router.get('/:key/type=friendblock&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    console.log(access_token);
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `blocks` WHERE `users_key`='" + req.params.key + "')";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, "success", false));
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




/*********--------CHECK Exits conversation 1-1----------*********/
router.get('/:key/exists=:friend_key', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var condition1 = req.params.key + '-' + req.params.friend_key;
            var condition2 = req.params.friend_key + '-' + req.params.key;
            var userSQL = "SELECT * FROM `conversations` WHERE `key`='" + condition1 + "' OR `key`='" + condition2 + "'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, 'success', true));
                } else {
                    return res.send(echoResponse(404, 'Conversation not found.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------GET FRIEND ONLINE----------*********/
router.get('/:key/type=friendonline&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "') AND `status`='online'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, "success", false));
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------GET FRIEND OFFLINE----------*********/
router.get('/:key/type=friendoffline&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT " + BASE.baseSelectFriendSQL() + " FROM `users` WHERE `key` IN (SELECT `friend_key` FROM `contacts` WHERE `users_key`='" + req.params.key + "') AND `status`='offline'";
            BASE.getObjectWithSQL(userSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(200, data, "success", false));
                } else {
                    return res.send(echoResponse(404, 'Nobody.', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------REQUEST----------*********/
router.post('/request', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var isFriendSQL = "SELECT * FROM `contacts` WHERE `friend_key`='" + key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + key + "'";
            BASE.getObjectWithSQL(isFriendSQL, function(data) {
                if (data) {
                    return res.send(echoResponse(404, 'This user was your friends.', 'success', true));
                } else {
                    var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + key + "' AND `users_key`='" + req.body.friend_key + "'";
                    BASE.getObjectWithSQL(userSQL, function(data) {
                        if (data) {
                            return res.send(echoResponse(404, 'You requested.', 'success', true));
                        } else {
                            var insertSQL = "INSERT INTO `requests`(`friend_key`,`message`,`users_key`)";
                            var dataSQL = "VALUES('" + req.body.users_key + "','" + req.body.message + "','" + req.body.friend_key + "')";
                            client.query(insertSQL + dataSQL, function(eInsert, dInsert, fInsert) {
                                if (eInsert) {
                                    console.log(eInsert);
                                    return res.sendStatus(300);
                                } else {
                                    console.log(req.body.users_key + " gửi lời mời kết bạn tới " + req.body.friend_key);
                                    return res.send(echoResponse(200, 'Requested successfully', 'success', false));
                                }
                            });
                            var currentUser = "SELECT `nickname`,`avatar` FROM `users` WHERE `key`='" + req.body.users_key + "'";
                            client.query(currentUser, function(eCurrent, dCurrent, fCurren) {
                                if (eCurrent) {
                                    console.log(eCurrent);
                                } else {
                                    // Insert Notification
                                    var currentTime = new Date().getTime();
                                    insertNotificationNoImage(res, req.body.users_key, dCurrent[0].nickname, dCurrent[0].avatar, "request", currentTime, req.body.friend_key, 0);
                                    sendNotification(req.body.users_key, req.body.friend_key, "send friend request", "request", null);
                                    //-----
                                }
                            });
                        }
                    });
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



router.post('/removerequest', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        client.query("DELETE FROM `requests` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.key + "'");
                        return res.send(echoResponse(200, 'You requested.', 'success', true));
                    } else {
                        return res.send(echoResponse(404, 'No request.', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET notification----------*********/
router.get('/:key/notifications', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var page = req.body.page || req.query.page || req.params.page;
            var per_page = req.body.per_page || req.query.per_page || req.params.per_page;
            var userSQL = "SELECT * FROM `notification_feed` WHERE `users_key`='" + key + "' ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        updateRefreshNotifications(req.params.key);
                        return res.send(echoResponse(200, data, 'success', false));
                    } else {
                        return res.send(echoResponse(404, 'No have notification.', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




/*********--------GET Mối quan hệ giữa 2 người----------*********/
router.get('/:key/friend=:friend_key&access_token=:access_token', function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `blocks` WHERE `friend_key`='" + req.params.friend_key + "' AND `users_key`='" + req.params.key + "'";
            client.query(userSQL, function(eBlock, dBlock, fBlock) {
                if (eBlock) {
                    console.log(eBlock);
                    return res.sendStatus(300);
                } else {
                    if (dBlock.length > 0) {
                        return res.send(echo5Response(200, 'You blocked friend', 0, 'success', false));
                    } else {
                        var userSQL = "SELECT * FROM `blocks` WHERE `friend_key`='" + req.params.key + "' AND `users_key`='" + req.params.friend_key + "'";
                        client.query(userSQL, function(eBlock, dBlock, fBlock) {
                            if (eBlock) {
                                console.log(eBlock);
                                return res.sendStatus(300);
                            } else {
                                if (dBlock.length > 0) {
                                    return res.send(echo5Response(200, 'Friend blocked you', 1, 'success', false));
                                } else {
                                    var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + req.params.key + "' AND `users_key`='" + req.params.friend_key + "'";
                                    client.query(userSQL, function(error, data, fields) {
                                        if (error) {
                                            console.log(error);
                                            return res.sendStatus(300);
                                        } else {
                                            if (data.length > 0) {
                                                return res.send(echo5Response(200, 'You requested', 2, 'success', false));
                                            } else {
                                                //---
                                                var userSQL2 = "SELECT * FROM `requests` WHERE `friend_key`='" + req.params.friend_key + "' AND `users_key`='" + req.params.key + "'";
                                                client.query(userSQL2, function(error1, data1, fields1) {
                                                    if (error1) {
                                                        console.log(error1);
                                                        return res.sendStatus(300);
                                                    } else {
                                                        if (data1.length > 0) {
                                                            return res.send(echo5Response(200, data1[0].message, 3, 'success', false));
                                                        } else {
                                                            //---
                                                            var userSQL2 = "SELECT * FROM `contacts` WHERE `friend_key`='" + req.params.friend_key + "' AND `users_key`='" + req.params.key + "'";
                                                            client.query(userSQL2, function(error2, data2, fields2) {
                                                                if (error2) {
                                                                    console.log(error2);
                                                                    return res.sendStatus(300);
                                                                } else {
                                                                    if (data2.length > 0) {
                                                                        return res.send(echo5Response(200, 'Friends', 4, 'success', false));
                                                                    } else {
                                                                        return res.send(echo5Response(200, 'No relationship.', 5, 'success', false));
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
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------UNREQUEST----------*********/
router.post('/unrequest', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        removeNotification(res, req.body.friend_key, req.body.users_key, "request");
                        var deleteSQL = "DELETE FROM `requests` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "'";
                        client.query(deleteSQL, function(eDelete, dDelete, fDelete) {
                            if (eDelete) {
                                console.log(eDelete);
                                return res.sendStatus(300);
                            } else {
                                return res.send(echoResponse(200, 'Unrequest successfully', 'success', false));
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This request not exists.', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------UNFRIEND----------*********/
router.post('/unfriend', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var currentUser = "SELECT `nickname`,`avatar` FROM `users` WHERE `key`='" + req.body.users_key + "'";
            client.query(currentUser, function(eCurrent, dCurrent, fCurren) {
                if (eCurrent) {
                    console.log(eCurrent);
                } else {
                    if (dCurrent.length > 0) {
                        // Insert Notification
                        var currentTime = new Date().getTime();
                        insertNotificationNoImage(res, req.body.users_key, dCurrent[0].nickname, dCurrent[0].avatar, "unfriend", currentTime, req.body.friend_key, 0);
                        sendNotification(req.body.users_key, req.body.friend_key, "has unfriend with you", "unfriend", null);

                        client.query("SELECT `id` FROM `posts` WHERE `users_key`='" + req.body.friend_key + "' OR `users_key`='" + req.body.users_key + "'", function(e, d, f) {
                            if (e) {
                                console.log(e);
                            } else {
                                if (d.length > 0) {
                                    async.forEachOf(d, function(dt, i, call) {
                                        var deleteRelate = "DELETE FROM `notification_relate` WHERE `posts_id`='" + d[i].id + "' AND `users_key`='" + req.body.users_key + "' OR `users_key`='" + req.body.friend_key + "'";
                                        client.query(deleteRelate);
                                    });
                                }
                            }
                        });
                        //-----
                        var userSQL = "DELETE FROM `contacts` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
                        client.query(userSQL, function(error, data, fields) {
                            if (error) {
                                console.log(error);
                                return res.sendStatus(300);
                            } else {
                                return res.send(echoResponse(200, 'Unfriend successfully', 'success', false));
                            }
                        });
                    } else {
                        return res.send(echoResponse(404, 'This users_key not exits', 'success', false));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------BLOCK----------*********/
router.post('/block', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var removeNotifi = "DELETE FROM `notification_feed` WHERE `users_key`='" + req.body.users_key + "' AND `friend_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "'";
            client.query(removeNotifi);
            var deleteSQL = "DELETE FROM `requests` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(deleteSQL);
            var userSQL = "DELETE FROM `contacts` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(userSQL);

            var coupleLike = "DELETE FROM `couple_like` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(coupleLike);
            var coupleUnLike = "DELETE FROM `couple_unlike` WHERE `friend_key`='" + req.body.users_key + "' AND `users_key`='" + req.body.friend_key + "' OR `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(coupleUnLike);

            deleteTag(req.body.users_key, req.body.friend_key);

            client.query("SELECT `id` FROM `posts` WHERE `users_key`='" + req.body.friend_key + "' OR `users_key`='" + req.body.users_key + "'", function(e, d, f) {
                if (e) {
                    console.log(e);
                } else {
                    if (d.length > 0) {
                        async.forEachOf(d, function(dt, i, call) {
                            var deleteRelate = "DELETE FROM `notification_relate` WHERE `posts_id`='" + d[i].id + "' AND `users_key`='" + req.body.users_key + "' OR `users_key`='" + req.body.friend_key + "'";
                            client.query(deleteRelate);
                        });
                    }
                }
            });

            var insertSQL = "INSERT INTO `blocks`(`friend_key`,`users_key`) VALUES('" + req.body.friend_key + "','" + req.body.users_key + "')";
            client.query(insertSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    return res.send(echoResponse(200, 'Blocked successfully', 'success', false));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




/*********--------UNBLOCK----------*********/
router.post('/unblock', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var insertSQL = "SELECT * FROM `blocks` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(insertSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        var userSQL = "DELETE FROM `blocks` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
                        client.query(userSQL);
                        return res.send(echoResponse(200, 'Unblock successfully', 'success', false));
                    } else {
                        return res.send(echoResponse(404, 'You not block this friend', 'success', false));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



/*********--------ACCEPT----------*********/
router.post('/accept', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `requests` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        var insertSQL = "INSERT INTO `contacts` (`id`, `friend_key`, `relationship`, `created_time`, `users_key`) VALUES (NULL, '" + req.body.friend_key + "', '" + req.body.relationship + "', '" + req.body.created_time + "', '" + req.body.users_key + "');";
                        client.query(insertSQL, function(eInsert, dInsert, fInsert) {
                            if (eInsert) {
                                console.log(eInsert);
                                return res.sendStatus(300);
                            } else {
                                var relationship = 0;
                                if (req.body.relationship) {
                                    relationship = req.body.relationship;
                                }
                                var insertSQLfriend = "INSERT INTO `contacts` (`id`, `friend_key`, `relationship`, `created_time`, `users_key`) VALUES (NULL, '" + req.body.users_key + "', '" + relationship + "', '" + req.body.created_time + "', '" + req.body.friend_key + "');";
                                client.query(insertSQLfriend);
                                console.log(req.body.users_key + " đã chấp nhận lời mời kết bạn của " + req.body.friend_key);
                                var deleteSQL = "DELETE FROM `requests` WHERE `friend_key`='" + req.body.friend_key + "' AND `users_key`='" + req.body.users_key + "'";
                                client.query(deleteSQL);
                                return res.send(echoResponse(200, 'Accepted successfully', 'success', false));
                            }
                        });
                        var currentUser = "SELECT `nickname`,`avatar` FROM `users` WHERE `key`='" + req.body.users_key + "'";
                        client.query(currentUser, function(eCurrent, dCurrent, fCurren) {
                            if (eCurrent) {
                                console.log(eCurrent);
                            } else {
                                // Insert Notification
                                var currentTime = new Date().getTime();
                                insertNotificationNoImage(res, req.body.users_key, dCurrent[0].nickname, dCurrent[0].avatar, "accept", currentTime, req.body.friend_key, 0);
                                sendNotification(req.body.users_key, req.body.friend_key, "accepted your friend request", "accept", null);
                                //-----
                            }
                        });

                    } else {
                        return res.send(echoResponse(404, 'This request not exists.', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/// SET BADGE
// router.post('/badge', urlParser, function (req, res) {
//     var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
//     if (token) {
//         jwt.verify(token, config.secret, function (err, decoded) {
//             if (err) {
//                 return res.json({success: false, message: 'Failed to authenticate token.'});
//             } else {
//                 var selectsql = "SELECT * FROM `notification_count` WHERE `users_key`='"+req.body.key+"'";
//                 client.query(selectsql, function(error, data, fields){
//                     if (error) {
//                         console.log(error);
//                         return res.sendStatus(300);
//                     } else {
//                         if (data.length > 0) {
//                             var updatesql;
//                             var type = req.body.type;
//                             if (type == 'chat') {
//                                 updatesql = "UPDATE `notification_count` SET `chat`='"+req.body.number+"'";
//                             } else {
//                                 updatesql = "UPDATE `notification_count` SET `activity`='"+req.body.number+"'";
//                             }
//                             client.query(updatesql);
//                             return res.send(echoResponse(200, 'Updated successfully', 'success', false));
//                         } else {
//                             return res.send(echoResponse(404, 'This user count not exists.', 'success', true));
//                         }
//                     }
//                 });
//             }
//         });
//     }
// });
/// INSERT SEEN NOTIFICATIONS
router.post('/seen_profile', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var users_key = req.body.users_key;
            var friend_key = req.body.friend_key;
            sendNotification(users_key, friend_key, "has seen your profile", "profile", null);
            seenProfile(res, users_key, friend_key);
            return res.send(echoResponse(200, 'Send seen notification successfully', 'success', false));
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});

router.post('/facebook_data', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sql = "SELECT * FROM `users` WHERE `key`='" + key + "'";
            delete req.body.key;
            delete req.body.access_token;
            req.body.users_key = key;
            BASE.getObjectWithSQL(sql, function(user) {
                if (user) {
                    var sql2 = escapeSQL.format("INSERT INTO `facebook_informations` SET ?", req.body);
                    BASE.insertWithSQL(sql2, function(status) {
                        if (status) {
                            return res.send(echoResponse(200, 'Insert successfully', 'success', false));
                        } else {
                            return res.send(echoResponse(404, 'Insert Failed.', 'success', true));
                        }
                    });
                } else {
                    return res.send(echoResponse(404, 'User not exists', 'success', true));
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});

/*********--------------------------*********
 **********------ ECHO RESPONSE -----*********
 **********--------------------------*********/
/*********--------Facebook Database----------*********/
router.post('/facebook_point', urlParser, function(req, res) {
    var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    if (token) {
        jwt.verify(token, config.secretAdmin, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                var selectsql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + req.body.facebook_id + "'";
                client.query(selectsql, function(e, d, f) {
                    if (e) {
                        console.log(e);
                        return res.sendStatus(300);
                    } else {
                        if (d.length > 0) {
                            var sqlInsert = "INSERT INTO `facebook_point`(`facebook_id`,`point`,`users_key`)";
                            var value = " VALUES('" + req.body.facebook_id + "','" + req.body.point + "','" + d[0].key + "')";
                            client.query(sqlInsert + value, function(eI, dI, fI) {
                                if (eI) {
                                    console.log(eI);
                                    return res.sendStatus(300);
                                } else {
                                    return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                }
                            });
                        } else {
                            return res.send(echoResponse(404, 'User not exists', 'success', true));
                        }
                    }
                });
            }
        });
    }
});


/*********--------Facebook Database----------*********/
router.post('/facebook', urlParser, function(req, res) {
    var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    if (token) {
        jwt.verify(token, config.secretAdmin, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                var json;
                var bodydata = unescape(req.body.data);
                if (isJsonString(bodydata)) {
                    var arrayJson = bodydata;
                    json = JSON.parse(arrayJson);
                    // Work
                    if (json.data_work) {
                        var data = json.data_work;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'work');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // Education
                    if (json.data_education) {
                        var data = json.data_education;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'education');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // Contact
                    if (json.data_contact) {
                        var data = json.data_contact;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'contact');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // Info
                    if (json.data_info) {
                        var data = json.data_info;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'info');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // Living
                    if (json.data_living) {
                        var data = json.data_living;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'living');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // Relationship
                    if (json.data_relationship) {
                        var data = json.data_relationship;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'relationship');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_family
                    if (json.data_family) {
                        var data = json.data_family;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'family');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_year
                    if (json.data_year) {
                        var data = json.data_year;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'year');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_about
                    if (json.data_about) {
                        var data = json.data_about;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'about');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_checkin
                    if (json.data_checkin) {
                        var data = json.data_checkin;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'checkin');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_sports
                    if (json.data_sports) {
                        var data = json.data_sports;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'sports');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_music
                    if (json.data_music) {
                        var data = json.data_music;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'music');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_movie
                    if (json.data_movie) {
                        var data = json.data_movie;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'movie');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_tv
                    if (json.data_tv) {
                        var data = json.data_tv;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'tv');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_book
                    if (json.data_book) {
                        var data = json.data_book;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'book');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_game
                    if (json.data_game) {
                        var data = json.data_game;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'game');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_like
                    if (json.data_like) {
                        var data = json.data_like;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'like');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_event
                    if (json.data_event) {
                        var data = json.data_event;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'event');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_diem
                    if (json.data_diem) {
                        var data = json.data_diem;
                        console.log(data);
                        var sqlPoint = "SELECT * FROM `users` WHERE `facebook_id`='" + json.facebook + "'";
                        client.query(sqlPoint, function(ePoint, dataPoint, fieldsPoint) {
                            if (ePoint) {
                                console.log(ePoint);
                                return res.sendStatus(300);
                            } else {
                                if (dataPoint.length > 0) {
                                    var point = data;
                                    var sqlUpdate = "UPDATE `users` SET `facebook_point`=" + point + " WHERE `facebook_id`='" + json.facebook + "'";
                                    client.query(sqlUpdate);
                                    console.log("UPDATED POINT");
                                }
                            }
                        });
                    }
                    // data_group
                    if (json.data_group) {
                        var data = json.data_group;
                        async.forEachOf(data, function(currentData, n, callback) {
                            insertFacebookData(res, json.facebook, data[n], 'group');
                            if (n === data.length - 1) {
                                return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                            }
                        });
                    }
                    // data_image
                    if (json.data_image) {
                        var data = json.data_image;
                        console.log(JSON.stringify(data));
                        if (data.length == 0) {
                            return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                        }
                        if (data.length == 1) {
                            var usersql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + json.facebook + "'";
                            client.query(usersql, function(e, d, f) {
                                if (e) {
                                    console.log(e);
                                    return res.sendStatus(300);
                                } else {
                                    if (d.length > 0) {
                                        var currentTime = new Date().getTime();
                                        var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                        var sqlData = "VALUES ('Facebook Photo','" + currentTime + "','" + currentTime + "','0','photo','1','" + d[0].key + "')";
                                        client.query(sqlInsert + sqlData, function(eInsert, dataInsert, fields) {
                                            if (eInsert) {
                                                console.log(eInsert);
                                                return res.sendStatus(300);
                                            } else {
                                                async.forEachOf(data, function(currentData, n, callback) {
                                                    var insertMember = "INSERT INTO `store_images`(`img_url`,`img_width`,`img_height`,`users_key`,`posts_id`)";
                                                    var dataMember = "VALUES ('" + data[n] + "','500','500','" + d[0].key + "','" + dataInsert.insertId + "')";
                                                    client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                        if (eMember) {
                                                            console.log(eMember);
                                                            return res.sendStatus(300);
                                                        } else {
                                                            console.log("INSERT ALBUMS SUCCESS");
                                                        }
                                                    });

                                                    if (n === data.length - 1) {
                                                        return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        }
                        if (data.length > 1 && data.length != 0) {
                            var usersql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + json.facebook + "'";
                            client.query(usersql, function(e, d, f) {
                                if (e) {
                                    console.log(e);
                                } else {
                                    if (d.length > 0) {
                                        var currentTime = new Date().getTime();
                                        var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                        var sqlData = "VALUES ('Facebook Albums','" + currentTime + "','" + currentTime + "','0','albums','1','" + d[0].key + "')";
                                        client.query(sqlInsert + sqlData, function(eInsert, dataInsert, fields) {
                                            if (eInsert) {
                                                console.log(eInsert);
                                                return res.sendStatus(300);
                                            } else {
                                                async.forEachOf(data, function(currentData, n, callback) {
                                                    var insertMember = "INSERT INTO `store_images`(`img_url`,`img_width`,`img_height`,`users_key`,`posts_id`)";
                                                    var dataMember = "VALUES ('" + data[n] + "','500','500','" + d[0].key + "','" + dataInsert.insertId + "')";
                                                    client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                        if (eMember) {
                                                            console.log(eMember);
                                                            return res.sendStatus(300);
                                                        } else {
                                                            console.log("INSERT ALBUMS SUCCESS");
                                                        }
                                                    });
                                                    if (n === data.length - 1) {
                                                        return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        } else {

                        }

                    }

                    // data_timeline
                    if (json.data_timeline) {
                        var data = json.data_timeline;
                        console.log(JSON.stringify(data));
                        var usersql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + json.facebook + "'";
                        client.query(usersql, function(e, d, f) {
                            if (e) {
                                console.log(e);
                                return res.sendStatus(300);
                            } else {
                                if (d.length > 0) {
                                    async.forEachOf(data, function(ele, i, call) {
                                        var dataImage = ele.images;
                                        if (dataImage.length == 0) {
                                            var currentTime = parseInt(ele.time, 10) * 1000;
                                            var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                            var caption;
                                            if (ele.content == 0) {
                                                caption = ele.title;
                                            } else {
                                                caption = ele.title + ' ' + ele.content;
                                            }
                                            var sqlData = "VALUES (" + escapeSQL.escape(caption) + ",'" + currentTime + "','" + currentTime + "','0','text','1','" + d[0].key + "')";
                                            client.query(sqlInsert + sqlData, function(eInsert, dataInsert, fields) {
                                                if (eInsert) {
                                                    console.log(eInsert);
                                                    if (i === data.length - 1) {
                                                        return res.sendStatus(300);
                                                    }
                                                } else {
                                                    if (i === data.length - 1) {
                                                        return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                    }
                                                }
                                            });
                                        } else if (dataImage.length == 1) {
                                            ///-------
                                            var currentTime = parseInt(ele.time, 10) * 1000;
                                            var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                            var caption;
                                            if (ele.content == 0) {
                                                caption = ele.title;
                                            } else {
                                                caption = ele.title + ' ' + ele.content;
                                            }
                                            var sqlData = "VALUES (" + escapeSQL.escape(caption) + ",'" + currentTime + "','" + currentTime + "','0','photo','1','" + d[0].key + "')";
                                            client.query(sqlInsert + sqlData, function(eInsert, dataInsert, fields) {
                                                if (eInsert) {
                                                    console.log(eInsert);
                                                    if (i === data.length - 1) {
                                                        return res.sendStatus(300);
                                                    }
                                                } else {
                                                    async.forEachOf(dataImage, function(currentData, n, callback) {
                                                        var insertMember = "INSERT INTO `store_images`(`img_url`,`img_width`,`img_height`,`users_key`,`posts_id`)";
                                                        var dataMember = "VALUES ('" + dataImage[n] + "','500','500','" + d[0].key + "','" + dataInsert.insertId + "')";
                                                        client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                            if (eMember) {
                                                                console.log(eMember);
                                                                if (i === data.length - 1) {
                                                                    return res.sendStatus(300);
                                                                }
                                                            } else {
                                                                console.log("INSERT ALBUMS SUCCESS");
                                                                if (i === data.length - 1) {
                                                                    return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                                }
                                                            }
                                                        });
                                                    });
                                                }
                                            });
                                            //--------
                                        } else {
                                            //--------
                                            if (ele.content == 0) {
                                                caption = ele.title;
                                            } else {
                                                caption = ele.title + ' ' + ele.content;
                                            }
                                            var currentTime = parseInt(ele.time, 10) * 1000;
                                            var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                            var sqlData = "VALUES (" + escapeSQL.escape(caption) + ",'" + currentTime + "','" + currentTime + "','0','albums','1','" + d[0].key + "')";
                                            client.query(sqlInsert + sqlData, function(eInsert, dataInsert, fields) {
                                                if (eInsert) {
                                                    console.log(eInsert);
                                                    if (i === data.length - 1) {
                                                        return res.sendStatus(300);
                                                    }
                                                } else {
                                                    async.forEachOf(dataImage, function(currentData, n, callback) {
                                                        var insertMember = "INSERT INTO `store_images`(`img_url`,`img_width`,`img_height`,`users_key`,`posts_id`)";
                                                        var dataMember = "VALUES ('" + dataImage[n] + "','500','500','" + d[0].key + "','" + dataInsert.insertId + "')";
                                                        client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                            if (eMember) {
                                                                console.log(eMember);
                                                                if (i === data.length - 1) {
                                                                    return res.sendStatus(300);
                                                                }
                                                            } else {
                                                                console.log("INSERT ALBUMS SUCCESS");
                                                            }
                                                        });
                                                        if (i === data.length - 1) {
                                                            return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                        }
                                                    });
                                                }
                                            });
                                            //---------
                                        }
                                    });

                                }
                            }
                        });
                    }
                    if (json.data_listfriend) {
                        var data = json.data_listfriend;
                        var usersql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + json.facebook + "'";
                        client.query(usersql, function(e, d, f) {
                            if (e) {
                                console.log(e);
                            } else {
                                if (d.length > 0) {
                                    async.forEachOf(data, function(ele, n, callback) {
                                        var sqlInsert = "INSERT INTO `facebook_friends`(`nickname`,`facebook_id`,`url_facebook`,`users_key`)";
                                        var sqlData = "VALUES (" + escapeSQL.escape(ele.name) + ",'" + ele.id + "','" + ele.linkFB + "','" + d[0].key + "')";
                                        client.query(sqlInsert + sqlData, function(eMember, rMember, fMember) {
                                            if (eMember) {
                                                console.log(eMember);
                                                return res.sendStatus(300);
                                            } else {
                                                console.log("INSERT SUCCESS");
                                            }
                                        });
                                        if (n === data.length - 1) {
                                            return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                        }
                                    });
                                }
                            }
                        });

                    }
                } else {
                    console.log("ERROR JSON");
                    return res.send(echoResponse(404, 'JSON ERROR', 'success', false));
                }

            }
        });
    } else {
        return res.send(echoResponse(403, 'Authenticate: No token provided.', 'success', true));
    }
});


function isEmpty(val) {
    return (val === undefined || val == null || val.length <= 0) ? true : false;
}

/*********--------Facebook Database client----------*********/
router.post('/facebook_client', urlParser, function(req, res) {
    var bodydata = unescape(req.body.data);
    var stringJson = JSON.stringify(req.body.data, null, 2); //.replace(/\, "");
    var json;
    if (isJsonString(bodydata)) {
        json = JSON.parse(bodydata);
    } else {
        var stringJson = JSON.stringify(req.body.data, null, 2);
        json = JSON.parse(stringJson);
    }

    // console.log("<-------->:" + JSON.stringify(json));
    if (isEmpty(json['data_timeline'])) {
        console.log("No data time line 1111 -------------------------------- : " + json['data_timeline']);
        return res.send(echoResponse(300, 'No data time line', 'err', true));
    } else {
        var stringJson1 = JSON.stringify(json['data_timeline'], null, 2)
        if (isJsonString(stringJson1) == false) {
            return res.send(echoResponse(300, 'No data time line 22222', 'err', true));
        }

        var data = JSON.parse(stringJson1);
        //console.log("data timeline -------- - - - -  "+data);
        var usersql = "SELECT `key` FROM `users` WHERE `facebook_id`='" + json.facebook + "' AND `is_sync_feed_facebook` = '0'";
        client.query(usersql, function(e, d, f) {
            if (e) {
                console.log(e);
                return res.sendStatus(300);
            } else {
                if (d.length > 0) {
                    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
                    var key = d[0].key;
                    if (key.length == 0) {
                        return res.sendStatus(300);
                    }
                    // BASE.authenticateWithToken(key, access_token, function(logged) {
                    //     if (logged) {
                            // console.log(data);
                            async.forEachOf(data, function(ele, i, call) {
                                var stringJson = JSON.stringify(ele, null, 2);
                                var feed = JSON.parse(stringJson);
                                var dataImage;
                                if (feed['images']) {
                                    dataImage = feed['images'];
                                }
                                //console.log("data image -------- - - - -  "+stringJson);
                                if (isEmpty(dataImage) == true) {
                                    var currentTime = parseFloat(feed['time'], 10) * 1000;
                                    var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                    var caption;

                                    if (isEmpty(feed['title'])) {
                                        caption = "Facebook";
                                    } else {
                                        caption = feed['title'];
                                    }
                                    var object = {"caption":caption,
                                                "posted_time":currentTime,
                                                "edited_time":currentTime,
                                                "permission":feed['permission'],
                                                "type":"text",
                                                "is_active":"1",
                                                "users_key":d[0].key
                                    }
                                    console.log(caption);
                                    var sqlInsert222 = escapeSQL.format("INSERT INTO `posts` SET ?", object);
                                    client.query(sqlInsert222, function(eInsert, dataInsert, fields) {
                                        if (eInsert) {
                                            console.log(eInsert);
                                            if (i === data.length - 1) {
                                                return res.sendStatus(300);
                                            }
                                        } else {
                                            if (i === data.length - 1) {
                                                var queryInsertChannel = "UPDATE `users` SET `is_sync_feed_facebook`='1' WHERE `facebook_id`='" + json.facebook + "'";
                                                console.log(queryInsertChannel);
                                                client.query(queryInsertChannel, function(err, data, FNN) {
                                                    return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                });
                                            }
                                        }
                                    });
                                } else {
                                    ///-------
                                    var currentTime = parseFloat(feed['time'], 10) * 1000;
                                    var sqlInsert = "INSERT INTO `posts`(`caption`,`posted_time`,`edited_time`,`permission`,`type`,`is_active`,`users_key`)";
                                    var caption;
                                    if (isEmpty(feed['title'])) {
                                        caption = "Facebook Photo";
                                    } else {
                                        caption = feed['title'];
                                    }
                                    var object = {"caption":caption,
                                                "posted_time":currentTime,
                                                "edited_time":currentTime,
                                                "permission":feed['permission'],
                                                "type":"photo",
                                                "is_active":"1",
                                                "users_key":d[0].key
                                    }
                                    console.log(caption);
                                    var sqlInsert222 = escapeSQL.format("INSERT INTO `posts` SET ?", object);
                                    client.query(sqlInsert222, function(eInsert, dataInsert, fields) {
                                        if (eInsert) {
                                            console.log(eInsert);
                                            if (i === data.length - 1) {
                                                return res.sendStatus(300);
                                            }
                                        } else {
                                            var insertMember = "INSERT INTO `store_images`(`img_url`,`img_width`,`img_height`,`users_key`,`posts_id`)";
                                            var dataMember = "VALUES ('" + dataImage + "','500','500','" + d[0].key + "','" + dataInsert.insertId + "')";
                                            client.query(insertMember + dataMember, function(eMember, rMember, fMember) {
                                                if (eMember) {
                                                    console.log(eMember);
                                                    if (i === data.length - 1) {
                                                        return res.sendStatus(300);
                                                    }
                                                } else {
                                                    console.log("INSERT ALBUMS SUCCESS");
                                                    if (i === data.length - 1) {
                                                        var queryInsertChannel = "UPDATE `users` SET `is_sync_feed_facebook`='1' WHERE `facebook_id`='" + json.facebook + "'";
                                                        console.log(queryInsertChannel);
                                                        client.query(queryInsertChannel, function(err, data, FNN) {
                                                            return res.send(echoResponse(200, 'SUCCESS', 'success', false));
                                                        });

                                                    }
                                                }
                                            });
                                        }
                                    });
                                    //--------
                                }
                            });
                        // } else {
                        //     return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
                        // }
                    // });
                } else {
                    return res.send(echoResponse(300, 'User had been sync facebook', 'success', true));
                }
            }
        });
    }
});




// /*********--------BOT----------*********/
// router.get('/:key/type=bot', urlParser, function(req, res) {
//     var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
//     if (token) {
//         jwt.verify(token, config.secret, function(err, decoded) {
//             if (err) {
//                 return res.json({ success: false, message: 'Failed to authenticate token.' });
//             } else {
//                 var key = req.body.key || req.query.key || req.params.key;
//                 var sql = "SELECT `key`,`email`,`username`,`nickname`,`created_at`,`avatar`,`cover`,`sex`,`birthday`,`last_active`,`status`,`facebook_point`,`img_width`,`img_height`,`is_bot`";
//                 var data = " FROM `users` WHERE `key`='" + key + "'";
//                 client.query(sql+data, function(error, data, fields) {
//                     if (error) {
//                         console.log(error);
//                         return res.sendStatus(300);
//                     } else {
//                         if (data.length > 0) {
//                             var sqlBot;
//                             if (data[0].sex == 1) {
//                                 sqlBot = sql+" FROM `users` WHERE `is_bot`=1 AND `sex`=2 ORDER BY RAND() LIMIT 1";
//                             } else {
//                                 sqlBot = sql+" FROM `users` WHERE `is_bot`=1 AND `sex`=1 ORDER BY RAND() LIMIT 1";
//                             }
//                             client.query(sqlBot, function(e, d, f) {
//                                 if (e) {
//                                     console.log(e);
//                                     return res.sendStatus(300);
//                                 } else {
//                                     if (d.length > 0) {
//                                         return res.send(echoResponse(200, d[0], 'success', true));
//                                     } else {
//                                         return res.send(echoResponse(404, 'This bot not exists', 'success', true));
//                                     }
//                                 }
//                             });
//                         } else {
//                             return res.send(echoResponse(404, 'This user not exists', 'success', true));
//                         }
//                     }
//                 });
//             }
//         });
//     } else {
//         return res.send(echoResponse(403, 'Authenticate: No token provided.', 'success', true));
//     }
// });




function insertFacebookData(res, facebook_id, name, type) {
    var insertSQL = "SELECT * FROM `facebook_informations` WHERE `users_key` IN (SELECT `key` FROM `users` WHERE `facebook_id`='" + facebook_id + "')";
    client.query(insertSQL, function(error, data, fields) {
        if (error) {
            console.log(error);
        } else {
            var selectUser = "SELECT `key` FROM `users` WHERE `facebook_id`='" + facebook_id + "'";
            client.query(selectUser, function(e, d, f) {
                if (e) {
                    console.log(e);
                } else {
                    if (d.length > 0) {
                        var sql = "INSERT INTO `facebook_informations`(`name`,`type`,`users_key`) VALUES(" + escapeSQL.escape(name) + ",'" + type + "','" + d[0].key + "')";
                        client.query(sql, function(errorUpdate, dataUpdate, fieldUpdate) {
                            if (errorUpdate) {
                                console.log(errorUpdate);
                            } else {
                                console.log("OK");
                            }
                        });
                    } else {
                        console.log("No correct users");
                    }
                }
            });
        }
    });
}

function insertFacebookImage(res, facebook_id, url) {
    var insertSQL = "SELECT * FROM `facebook_albums` WHERE `users_key` IN (SELECT `key` FROM `users` WHERE `facebook_id`='" + facebook_id + "')";
    client.query(insertSQL, function(error, data, fields) {
        if (error) {
            console.log(error);
        } else {
            if (data.length > 0) {
                var sql = "UPDATE `facebook_albums` SET `url`='" + url + "' WHERE `users_key` IN (SELECT `key` FROM `users` WHERE `facebook_id`='" + facebook_id + "')";
                client.query(sql, function(errorUpdate, dataUpdate, fieldUpdate) {
                    if (errorUpdate) {
                        console.log(errorUpdate);
                    } else {
                        console.log("OK");
                    }
                });
            } else {
                var selectUser = "SELECT `key` FROM `users` WHERE `facebook_id`='" + facebook_id + "'";
                client.query(selectUser, function(e, d, f) {
                    if (e) {
                        console.log(e);
                    } else {
                        if (d.length > 0) {
                            var sql = "INSERT INTO `facebook_albums`(`url`,`users_key`) VALUES('" + url + "','" + d[0].key + "')";
                            client.query(sql, function(errorUpdate, dataUpdate, fieldUpdate) {
                                if (errorUpdate) {
                                    console.log(errorUpdate);
                                } else {
                                    console.log("OK");
                                }
                            });

                        } else {
                            console.log("No correct user");
                        }
                    }
                });
            }
        }
    });
}

function seenProfile(res, users_key, friend_key) {
    var time = moment(new Date().getTime()).tz('Asia/Ho_Chi_Minh').valueOf();
    var sql = "SELECT `nickname`,`avatar` FROM `users` WHERE `key`='" + users_key + "'";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            var select = "SELECT * FROM `notification_feed` WHERE `friend_key`='" + users_key + "' AND `users_key`='" + friend_key + "' AND `posts_id`='0' AND `type`='profile'";
            client.query(select, function(eSelect, dSelect, fSelect) {
                if (eSelect) {
                    console.log(eSelect);
                    return res.sendStatus(300);
                } else {
                    if (dSelect.length > 0) {
                        //async.forEachOf(dSelect, function (data, i, callback) {
                        var update = "UPDATE `notification_feed` SET `nickname`='" + data[0].nickname + "',`avatar`='" + data[0].avatar + "', `time`='" + time + "', `is_seen`='0' WHERE `friend_key`='" + users_key + "' AND `users_key`='" + friend_key + "' AND `posts_id`='0' AND `type`='profile'";
                        client.query(update, function(e, d, r) {
                            if (e) {
                                console.log(e);
                                return res.sendStatus(300);
                            } else {
                                console.log("UPDATE Notification With Profile");
                            }
                        });
                        // });
                    } else {
                        var insert = "INSERT INTO `notification_feed`(`friend_key`,`nickname`,`avatar`,`type`, `time`, `users_key`, `posts_id`)";
                        var value = "VALUES('" + users_key + "','" + data[0].nickname + "','" + data[0].avatar + "','profile','" + time + "','" + friend_key + "','0')";
                        client.query(insert + value, function(e, d, r) {
                            if (e) {
                                console.log(e);
                                return res.sendStatus(300);
                            } else {
                                console.log("INSERT Notification With Profile");
                            }
                        });
                    }
                }
            });
        }
    });
}

function insertNotificationNoImage(res, friend_key, nickname, avatar, type, time, users_key, posts_id) {
    var select = "SELECT * FROM `notification_feed` WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "' AND `posts_id`='" + posts_id + "' AND `type`='" + type + "'";
    client.query(select, function(eSelect, dSelect, fSelect) {
        if (eSelect) {
            console.log(eSelect);
            return res.sendStatus(300);
        } else {
            if (dSelect.length > 0) {
                async.forEachOf(dSelect, function(data, i, callback) {
                    var update = "UPDATE `notification_feed` SET `nickname`='" + nickname + "',`avatar`='" + avatar + "', `time`='" + time + "', `is_seen`='0' WHERE `friend_key`='" + friend_key + "' AND `users_key`='" + users_key + "' AND `posts_id`='" + posts_id + "' AND `type`='" + type + "'";
                    client.query(update, function(e, d, r) {
                        if (e) {
                            console.log(e);
                            return res.sendStatus(300);
                        } else {
                            console.log("UPDATE Notification With Type: " + type);
                        }
                    });
                });
            } else {
                var insert = "INSERT INTO `notification_feed`(`created_by`,`friend_key`,`nickname`,`avatar`,`type`, `time`, `users_key`, `posts_id`)";
                var value = "VALUES('" + friend_key + "','" + friend_key + "','" + nickname + "','" + avatar + "','" + type + "','" + time + "','" + users_key + "','" + posts_id + "')";
                client.query(insert + value, function(e, d, r) {
                    if (e) {
                        console.log(e);
                        return res.sendStatus(300);
                    } else {
                        console.log("INSERT Notification With Type: " + type);
                    }
                });
            }
        }
    });
}

function fillPointDate() {
    var sql = "INSERT INTO `facebook_point`(facebook_id, users_key) SELECT `facebook_id`,`key` FROM `users` WHERE `key` NOT IN (SELECT `users_key` FROM `facebook_point`)";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
        } else {
            console.log("Fill Point Data Successfully");
        }
    });
}

function removeNotification(res, users_key, friend_key, type) {
    var sql = "SELECT * FROM `notification_feed` WHERE `users_key`='" + users_key + "' AND `friend_key`='" + friend_key + "' AND `type`='" + type + "'";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
            return res.sendStatus(300);
        } else {
            if (data.length > 0) {
                var sqlRemove = "DELETE FROM `notification_feed` WHERE `users_key`='" + users_key + "' AND `friend_key`='" + friend_key + "' AND `type`='" + type + "'";
                client.query(sqlRemove);
            }
        }
    });
}

function isFollowing(key, friend_key, callback) {
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

function moiquanhe(users_key, friend_key, ketqua) {
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
            //-------------
        }
    });
}

function sendNotification(sender_key, receiver_key, noidung, kieu, posts_id) {
    var senderSQL = "SELECT `nickname` FROM `users` WHERE `key`='" + sender_key + "'";
    client.query(senderSQL, function(loiNguoiGui, dataNguoiGui, FNG) {
        if (loiNguoiGui) {
            console.log(loiNguoiGui);
        } else {
            numberBadge(receiver_key, function(count) {
                var receiverSQL = "SELECT `device_token`,`device_type` FROM `users` WHERE `key`='" + receiver_key + "'";
                client.query(receiverSQL, function(loiNguoiNhan, dataNguoiNhan, FNN) {
                    if (loiNguoiNhan) {
                        console.log(loiNguoiNhan);
                    } else {
                        if (dataNguoiNhan[0].device_type == 'ios') {
                            //--------APNS
                            var note = new apn.Notification();
                            note.alert = dataNguoiGui[0].nickname + " " + noidung;
                            note.sound = 'default';
                            note.topic = "config.ios";
                            note.badge = count;
                            if (posts_id) {
                                note.payload = {
                                    "posts_id": posts_id,
                                    "content": dataNguoiGui[0].nickname + " " + noidung,
                                    "type": kieu
                                };
                            } else {
                                note.payload = {
                                    "sender_id": sender_key,
                                    "content": dataNguoiGui[0].nickname + " " + noidung,
                                    "type": kieu
                                };
                            }

                            apnService.send(note, dataNguoiNhan[0].device_token).then(result => {
                                console.log("sent:", result.sent.length);
                                console.log("failed:", result.failed.length);
                                console.log(result.failed);
                            });
                        } else {
                            var message;
                            if (posts_id) {
                                message = {
                                    to: dataNguoiNhan[0].device_token,
                                    collapse_key: collapse_key,
                                    data: {
                                        posts_id: posts_id,
                                        content: dataNguoiGui[0].nickname + " " + noidung,
                                        type: kieu,
                                        title: 'IUDI',
                                        body: dataNguoiGui[0].nickname + " " + noidung
                                    }
                                };
                            } else {
                                message = {
                                    to: dataNguoiNhan[0].device_token,
                                    collapse_key: collapse_key,
                                    data: {
                                        sender_id: sender_key,
                                        content: dataNguoiGui[0].nickname + " " + noidung,
                                        type: kieu,
                                        title: 'IUDI',
                                        body: dataNguoiGui[0].nickname + " " + noidung
                                    }
                                };
                            }

                            //callback style
                            fcm.send(message, function(err, response) {
                                if (err) {
                                    console.log("Something has gone wrong!");
                                } else {
                                    console.log("Successfully sent with response: ", response);
                                }
                            });
                        }
                    }
                });
            });
        }
    });
}

function notificationReport(users_key, friend_key) {
    var currentTime = new Date().getTime();
    var select = "SELECT * FROM `notification_feed` WHERE `users_key`='" + users_key + "' AND `type`='report' AND `friend_key`='" + friend_key + "'";
    client.query(select, function(eSelect, dSelect, fSelect) {
        if (eSelect) {
            console.log(eSelect);
        } else {
            if (dSelect.length > 0) {
                async.forEachOf(dSelect, function(data, i, callback) {
                    var update = "UPDATE `notification_feed` SET `time`='" + currentTime + "', `is_seen`='0' WHERE `users_key`='" + users_key + "' AND `type`='report'";
                    client.query(update, function(e, d, r) {
                        if (e) {
                            console.log(e);
                        } else {
                            console.log("OK Warning");
                        }
                    });
                });
            } else {
                var insert = "INSERT INTO `notification_feed`(`nickname`,`avatar`,`type`, `time`, `users_key`, `friend_key`)";
                var value = "VALUES('IUDI','" + avatarApp + "','report','" + currentTime + "','" + users_key + "','" + friend_key + "')";
                client.query(insert + value, function(e, d, r) {
                    if (e) {
                        console.log(e);
                    } else {
                        console.log("OK Warning");
                    }
                });
            }
        }
    });
}

function sendReport(receiver_key, friend_key) {
    var notify = ", your account has been reported. Please check email to justify your post. Thank you!";
    numberBadge(receiver_key, function(count) {
        var receiverSQL = "SELECT `device_token`,`device_type`,`nickname` FROM `users` WHERE `key`='" + receiver_key + "'";
        client.query(receiverSQL, function(loiNguoiNhan, dataNguoiNhan, FNN) {
            if (loiNguoiNhan) {
                console.log(loiNguoiNhan);
            } else {
                var nameArray = dataNguoiNhan[0].nickname.split(' ');
                var name = nameArray[nameArray.length - 1];
                if (dataNguoiNhan[0].device_type == 'ios') {
                    //--------APNS
                    var note = new apn.Notification();
                    note.alert = 'Hello ' + name + notify;
                    note.sound = 'bingbong.aiff';
                    note.topic = "config.ios";
                    note.badge = count;
                    note.payload = {
                        "friend_key": friend_key,
                        "content": 'Hello ' + name + notify,
                        "type": "warning"
                    };

                    apnService.send(note, dataNguoiNhan[0].device_token).then(result => {
                        console.log("Send report user successfully");
                        console.log("sent:", result.sent.length);
                        console.log("failed:", result.failed.length);
                        console.log(result.failed);
                    });
                } else {
                    var message;
                    message = {
                        to: dataNguoiNhan[0].device_token,
                        collapse_key: collapse_key,
                        data: {
                            friend_key: friend_key,
                            content: 'Hello ' + name + notify,
                            type: "warning"
                        }
                    };
                    //callback style
                    fcm.send(message, function(err, response) {
                        if (err) {
                            console.log("Something has gone wrong!");
                        } else {
                            console.log("Successfully sent with response: ", response);
                        }
                    });
                }
            }
        });
    });
}

function getLastMessage(conversations_key, status) {
    var getLastMessage = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' AND `key` IS NOT NULL ORDER BY `time_server` DESC LIMIT 1";
    client.query(getLastMessage, function(eMessage, dMessage, FM) {
        if (eMessage) {
            console.log(eMessage);
            status(null);
        } else {
            var message_key;
            if (dMessage.length > 0) {
                status(dMessage[0]);
            } else {
                status(null);
            }
        }
    });
}

function getStatusLastMessage(conversations_key, status) {
    var getLastMessage = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' AND `key` IS NOT NULL ORDER BY `time_server` DESC LIMIT 1";
    client.query(getLastMessage, function(eMessage, dMessage, FM) {
        if (eMessage) {
            console.log(eMessage);
            status([]);
        } else {
            var message_key;
            if (dMessage.length > 0) {
                message_key = dMessage[0].key;
            } else {
                message_key = "nil";
            }
            var statusMessage = "SELECT `status`,`users_key` FROM `message_status` WHERE `messages_key`='" + message_key + "'";
            client.query(statusMessage, function(eStatus, dStatus, FS) {
                if (eStatus) {
                    console.log(eStatus);
                    status([]);
                } else {
                    status(dStatus);
                }
            });
        }
    });
}

function updateRefreshNotifications(users_key) {
    var sql = "SELECT * FROM `notification_refresh` WHERE `users_key`='" + users_key + "'";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
        } else {
            if (data.length > 0) {
                var currentTime = new Date().getTime();
                var sqlUpdate = "UPDATE `notification_refresh` SET `time`='" + currentTime + "' WHERE `users_key`='" + users_key + "'";
                client.query(sqlUpdate);
            } else {
                var currentTime = new Date().getTime();
                var sqlUpdate = "INSERT INTO `notification_refresh` SET `time`='" + currentTime + "',`users_key`='" + users_key + "'";
                client.query(sqlUpdate);
            }
        }
    });
}

function deleteTag(users_key, friend_key) {
    var sql = "SELECT * FROM `posts` WHERE `users_key`='" + users_key + "'";
    client.query(sql, function(error, data, fields) {
        if (error) {
            console.log(error);
        } else {
            async.forEachOf(data, function(element, i, callback) {
                var userSQL = "DELETE FROM `tags` WHERE `posts_id`='" + data[i].id + "' AND `users_key`='" + friend_key + "'";
                client.query(userSQL);
                var userSQL1 = "DELETE FROM `permissions` WHERE `posts_id`='" + data[i].id + "' AND `users_key`='" + friend_key + "'";
                client.query(userSQL1);
                var userSQL2 = "DELETE FROM `notification_relate` WHERE `posts_id`='" + data[i].id + "' AND `users_key`='" + friend_key + "'";
                client.query(userSQL2);
            });
        }
    });
}
/// COUNT BADGE
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


function getInformationUser(users_key, result) {
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

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function isBase64(str) {
    try {
        return btoa(atob(str)) == str;
    } catch (err) {
        return false;
    }
}

function echoResponse(status, data, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        message: message,
        error: error
    });
}

function echo5Response(status, data, other, message, error) {
    return JSON.stringify({
        status: status,
        data: data,
        other: other,
        message: message,
        error: error
    });
}

module.exports = router;
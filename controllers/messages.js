var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config.js');
var bodyParser = require('body-parser');
var escapeSQL = require('sqlstring');
var jwt = require('jsonwebtoken');
var moment = require('moment-timezone');
var schedule = require('node-schedule');


// parse application/x-www-form-urlencoded
var urlParser = bodyParser.urlencoded({ extended: false });
// parse application/json
router.use(bodyParser.json());

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

var async = require('async');
/*********--------------------------*********
 **********------- MYSQL CONNECT ----*********
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


/*********--------------------------*********
 **********------- FUNCTION ------*********
 **********--------------------------*********/
var j = schedule.scheduleJob('00 00 00 */1 * *', function() {
    var sqlUser = "SELECT `conversations_key`,`users_key` FROM `message_status` WHERE `status`=0 OR `status`=1 GROUP BY `users_key`";
    client.query(sqlUser, function(e, d, f) {
        if (e) {
            console.log(e);
        } else {
            if (d.length > 0) {
                console.log(d.length);
                async.forEachOf(d, function(element, i, callback) {
                    client.query("SELECT * FROM `conversations` WHERE `key`='" + element.conversations_key + "'", function(error, data, fields) {
                        if (error) {
                            console.log(error);
                        } else {
                            if (data.length > 0) {
                                client.query("SELECT `nickname`,`email` FROM `users` WHERE `key`='" + element.users_key + "' AND `email` IS NOT NULL AND `key` IN (SELECT `users_key` FROM `users_settings` WHERE `on_receive_email`=1)", function(eUser, dUser, fUser) {
                                    if (eUser) {
                                        console.log(eUser);
                                    } else {
                                        console.log(dUser[0].email + " - " + data[0].last_name_update + " - " + data[0].last_message);
                                        client.query("SELECT `avatar` FROM `users` WHERE `key`='" + data[0].last_key_update + "'", function(eUser2, dUser2, fUser2) {
                                            if (eUser2) {
                                                console.log(eUser2);
                                            } else {
                                                var tinnhanReport = {
                                                    to: '<' + dUser[0].email + '>',
                                                    subject: dUser[0].nickname + ', you have unread messages!',
                                                    html: '<!DOCTYPE html><html><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><title></title><!--[if !mso]><!-- --><link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet" type="text/css"><!--<![endif]--><style type="text/css" id="media-query">body {margin: 0;padding: 0;}table,tr,td {vertical-align: top;border-collapse: collapse;}.ie-browser table,.mso-container table {table-layout: fixed;}* {line-height: inherit;}a[x-apple-data-detectors=true] {color: inherit !important;text-decoration: none !important;}[owa] .img-container div,[owa] .img-container button {display: block !important;}[owa] .fullwidth button {width: 100% !important;}[owa] .block-grid .col {display: table-cell;float: none !important;vertical-align: top;}.ie-browser .num12,.ie-browser .block-grid,[owa] .num12,[owa] .block-grid {width: 575px !important;}.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div {line-height: 100%;}.ie-browser .mixed-two-up .num4,[owa] .mixed-two-up .num4 {width: 188px !important;}.ie-browser .mixed-two-up .num8,[owa] .mixed-two-up .num8 {width: 376px !important;}.ie-browser .block-grid.two-up .col,[owa] .block-grid.two-up .col {width: 287px !important;}.ie-browser .block-grid.three-up .col,[owa] .block-grid.three-up .col {width: 191px !important;}.ie-browser .block-grid.four-up .col,[owa] .block-grid.four-up .col {width: 143px !important;}.ie-browser .block-grid.five-up .col,[owa] .block-grid.five-up .col {width: 115px !important;}.ie-browser .block-grid.six-up .col,[owa] .block-grid.six-up .col {width: 95px !important;}.ie-browser .block-grid.seven-up .col,[owa] .block-grid.seven-up .col {width: 82px !important;}.ie-browser .block-grid.eight-up .col,[owa] .block-grid.eight-up .col {width: 71px !important;}.ie-browser .block-grid.nine-up .col,[owa] .block-grid.nine-up .col {width: 63px !important;}.ie-browser .block-grid.ten-up .col,[owa] .block-grid.ten-up .col {width: 57px !important;}.ie-browser .block-grid.eleven-up .col,[owa] .block-grid.eleven-up .col {width: 52px !important;}.ie-browser .block-grid.twelve-up .col,[owa] .block-grid.twelve-up .col {width: 47px !important;}@media only screen and (min-width: 595px) {.block-grid {width: 575px !important;}.block-grid .col {display: table-cell;Float: none !important;vertical-align: top;}.block-grid .col.num12 {width: 575px !important;}.block-grid.mixed-two-up .col.num4 {width: 188px !important;}.block-grid.mixed-two-up .col.num8 {width: 376px !important;}.block-grid.two-up .col {width: 287px !important;}.block-grid.three-up .col {width: 191px !important;}.block-grid.four-up .col {width: 143px !important;}.block-grid.five-up .col {width: 115px !important;}.block-grid.six-up .col {width: 95px !important;}.block-grid.seven-up .col {width: 82px !important;}.block-grid.eight-up .col {width: 71px !important;}.block-grid.nine-up .col {width: 63px !important;}.block-grid.ten-up .col {width: 57px !important;}.block-grid.eleven-up .col {width: 52px !important;}.block-grid.twelve-up .col {width: 47px !important;}}@media (max-width: 595px) {.block-grid,.col {min-width: 320px !important;max-width: 100% !important;}.block-grid {width: calc(100% - 40px) !important;}.col {width: 100% !important;}.col>div {margin: 0 auto;}img.fullwidth {max-width: 100% !important;}}</style></head><body class="clean-body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: transparent"><!--[if IE]><div class="ie-browser"><![endif]--><!--[if mso]><div class="mso-container"><![endif]--><div class="nl-container" style="min-width: 320px;Margin: 0 auto;background-color: transparent"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: transparent;"><![endif]--><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="color:#555555;line-height:120%;font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><div style="font-size:12px;line-height:14px;color:#555555;font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;text-align:left;"><br></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:0px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:5px; padding-bottom:0px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi/logo.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #FFFFFF;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#FFFFFF;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #FFFFFF;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;line-height:120%;color:#0D0D0D; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><div style="font-size:12px;line-height:14px;color:#0D0D0D;font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 14px;line-height: 17px;text-align: center"><span style="font-size: 28px; line-height: 33px;"><strong><span style="line-height: 33px; font-size: 28px;">Dear Sir or Madam ,</span></strong></span></p></div></div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&#160;</div> <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&#160;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><![endif]--><div style="font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;line-height:150%;color:#555555; padding-right: 10px; padding-left: 10px; padding-top: 10px; padding-bottom: 10px;"><div style="font-size:12px;line-height:18px;color:#555555;font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;text-align:left;"><p style="margin: 0;font-size: 14px;line-height: 21px;text-align: center">  <img src="' +
                                                        dUser2[0].avatar + '" width="80px" height="80px" style="border-radius: 50%; border: 4px solid rgba(218, 217, 217, 0.72);">  <h1 style="text-align: center;">' +
                                                        data[0].last_name_update + '<font color="#929292"> has sent you a message</font></h1> <br><center><span style="font-size: 18px;">"' +
                                                        data[0].last_message + '"</span></center><br><br>    <center><a target="_blank" href="http://chat.iudi.me" style="text-decoration: none;"><span style="font-weight:bold;vertical-align:middle;font-size:14px;line-height:14px; background: #a8bf6d; color: white; padding: 10px 18px; border-radius: 4px;">OPEN IUDI</span></a></center></em></strong></span></p></div></div><!--[if mso]></td></tr></table><![endif]--><div align="center" class="img-container center" style="padding-right: 0px;padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><div style="line-height:10px;font-size:1px">&#160;</div> <img class="center" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//divider.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 316px" width="316"><div style="line-height:10px;font-size:1px">&#160;</div><!--[if mso]></td></tr></table><![endif]--></div><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;line-height:150%;color:#0D0D0D; padding-right: 10px; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;"><div style="font-size:12px;line-height:18px;color:#0D0D0D;font-family:" Montserrat ", "Trebuchet MS ", "Lucida Grande ", "Lucida Sans Unicode ", "Lucida Sans ", Tahoma, sans-serif;text-align:left;"></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #525252;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:#525252;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:15px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: #525252;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:15px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"><!--<![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" Helvetica Neue ", Helvetica, Arial, sans-serif; padding-right: 5px; padding-left: 5px; padding-top: 25px; padding-bottom: 5px;"><div style="font-size:12px;line-height:14px;font-family:inherit;color:#FFFFFF;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="color: rgb(153, 204, 0); font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Tel :</span><span style="color: rgb(255, 255, 255); font-size: 14px; line-height: 16px;"> +84 9 86 86 86 72</span></span></p></div></div><!--[if mso]></td></tr></table><![endif]--><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;"><![endif]--><div style="color:#FFFFFF;line-height:120%;font-family:" Helvetica Neue ", Helvetica, Arial, sans-serif; padding-right: 5px; padding-left: 5px; padding-top: 5px; padding-bottom: 5px;"><div style="font-size:12px;line-height:14px;color:#FFFFFF;font-family:" Helvetica Neue ", Helvetica, Arial, sans-serif;text-align:left;"><p style="margin: 0;font-size: 12px;line-height: 14px;text-align: center"><span style="font-size: 14px; line-height: 16px;"><span style="color: rgb(168, 191, 111); font-size: 14px; line-height: 16px;">Smart Connect Software</span> @&#160;2017</span></p></div></div><!--[if mso]></td></tr></table><![endif]--><div align="center" style="padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"><div style="display: table; max-width:57;"><!--[if (mso)|(IE)]><table width="57" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse; padding-right: 0px; padding-left: 0px; padding-bottom: 0px;"align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:57px;"><tr><td width="32" style="width:32px; padding-right: 5px;" valign="top"><![endif]--><table align="left" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;Margin-right: 0"><tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top"><a href="https://www.facebook.com/Smartsfw/" title="Facebook" target="_blank"><img src="http://smartconnectsoftware.com/mail_iudi//facebook@2x.png" alt="Facebook" title="Facebook" width="32" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: none;height: auto;float: none;max-width: 32px !important"></a><div style="line-height:5px;font-size:1px">&#160;</div></td></tr></tbody></table><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div><div style="background-color:transparent;"><div style="Margin: 0 auto;min-width: 320px;max-width: 575px;width: 575px;width: calc(26500% - 157100px);overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;" class="block-grid "><div style="border-collapse: collapse;display: table;width: 100%;"><!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width: 575px;"><tr class="layout-full-width" style="background-color:transparent;"><![endif]--><!--[if (mso)|(IE)]><td align="center" width="575" style=" width:575px; padding-right: 0px; padding-left: 0px; padding-top:0px; padding-bottom:5px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><![endif]--><div class="col num12" style="min-width: 320px;max-width: 575px;width: 575px;width: calc(25500% - 146050px);background-color: transparent;"><div style="background-color: transparent; width: 100% !important;"><!--[if (!mso)&(!IE)]><!--><div style="border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent; padding-top:0px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;"> <!--<![endif]--><div align="center" class="img-container center fullwidth" style="padding-right: 0px;padding-left: 0px;"><!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px;" align="center"><![endif]--><img class="center fullwidth" align="center" border="0" src="http://smartconnectsoftware.com/mail_iudi//rounder-dwn.png" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: block !important;border: 0;height: auto;float: none;width: 100%;max-width: 575px" width="575"><!--[if mso]></td></tr></table><![endif]--></div><div style="padding-right: 15px; padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><!--[if (mso)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 15px;padding-left: 15px; padding-top: 15px; padding-bottom: 15px;"><table width="100%" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><div align="center"><div style="border-top: 0px solid transparent; width:100%; line-height:0px; height:0px; font-size:0px;">&#160;</div></div><!--[if (mso)]></td></tr></table></td></tr></table><![endif]--></div><!--[if (!mso)&(!IE)]><!--></div><!--<![endif]--></div></div><!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]--></div></div></div></div><!--[if (mso)|(IE)]></div><![endif]--></body></html>'
                                                };
                                                transporter.sendMail(tinnhanReport, (error, info) => {
                                                    if (error) {
                                                        console.log(error.message);
                                                    } else {
                                                        console.log('Server responded with "%s"', info.response);
                                                        transporter.close();
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
    });
});
console.log(j.nextInvocation());

router.post('/new', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var userSQL = "SELECT * FROM `messages` WHERE `key`='" + req.body.key + "'";
            client.query(userSQL, function(error, data, fields) {
                if (error) {
                    console.log(error);
                    return res.sendStatus(300);
                } else {
                    if (data.length > 0) {
                        return res.send(echoResponse(404, 'This message already exists', 'success', true));
                    } else {
                        var dataMessage = req.body;
                        var currentTime = new Date().getTime();
                        var contentMessage = decodeURIComponent(req.body.content);
                        delete req.body.access_token;
                        req.body.time_server = currentTime;
                        var insertSQL = escapeSQL.format("INSERT INTO `messages` SET ?", req.body);
                        client.query(insertSQL, function(eInsert, dInsert, fInsert) {
                            if (eInsert) {
                                console.log(eInsert);
                                return res.sendStatus(300);
                            } else {
                                console.log("Vừa thêm message thành công với key " + req.body.key);
                                var membersSelect = "SELECT * FROM `members` WHERE `conversations_key`='" + req.body.conversations_key + "'";
                                client.query(membersSelect, function(e, d, f) {
                                    if (e) {
                                        console.log(e);
                                        return res.sendStatus(300);
                                    } else {
                                        if (d.length > 0) {
                                            var insertStatus = "INSERT INTO `message_status`(`is_read`,`conversations_key`,`messages_key`,`users_key`)"
                                            for (var i = 0; i < d.length; i++) {
                                                if (d[i].users_key === req.body.sender_id) {
                                                    var dataInsertStatus = "VALUES ('1', '" + req.body.conversations_key + "', '" + req.body.key + "', '" + req.body.sender_id + "')";
                                                    client.query(insertStatus + dataInsertStatus);
                                                } else {
                                                    var dataInsertStatus = "VALUES ('0', '" + req.body.conversations_key + "', '" + req.body.key + "', '" + d[i].users_key + "')";
                                                    client.query(insertStatus + dataInsertStatus);
                                                    // Emit message
                                                    req.app.io.emit(d[i].users_key, req.body);
                                                    // end emit
                                                }
                                            }

                                        }
                                    }
                                });

                                var selectUserSend = "SELECT `nickname` FROM `users` WHERE `key`='" + req.body.sender_id + "'";
                                client.query(selectUserSend, function(eSend, dSend, fSend) {
                                    if (eSend) {
                                        console.log(eSend);
                                        return res.sendStatus(300);
                                    } else {
                                        if (dSend.length > 0) {
                                            var tokenDevice = "SELECT `key`,`nickname`,`device_token`,`device_type` FROM `users` WHERE `key` IN (SELECT `users_key` FROM `members` WHERE `conversations_key`='" + req.body.conversations_key + "') AND `key`!='" + req.body.sender_id + "'";
                                            client.query(tokenDevice, function(eToken, dataToken, fieldToken) {
                                                if (eToken) {
                                                    console.log(eToken);
                                                    return res.sendStatus(300);
                                                } else {
                                                    async.forEachOf(dataToken, function(dataLimit, iLimit, callLimit) {
                                                        sendNotification(req.body.type, req.body.conversations_key, req.body.sender_id, dataToken[iLimit].key, contentMessage, "message", null);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                });
                                return res.send(echoResponse(200, 'Insert message successfully.', 'success', false));
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




router.post('/update', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlMember = "SELECT * FROM `message_status` WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.key + "'";
            client.query(sqlMember, function(er, rs, fl) {
                if (er) {
                    console.log(er);
                } else {
                    if (rs.length > 0) {
                        var sqlUpdateMember = "UPDATE `message_status` SET `is_read`='1' WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.key + "'";
                        client.query(sqlUpdateMember);
                        console.log("Cập nhật thành công message_status");
                        return res.send(echoResponse(200, 'Update message status successfully.', 'success', false));
                    } else {
                        return res.send(echoResponse(404, 'This user does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


router.post('/status', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlMember = "SELECT * FROM `message_status` WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.key + "'";
            client.query(sqlMember, function(er, rs, fl) {
                if (er) {
                    console.log(er);
                } else {
                    if (rs.length > 0) {
                        var sqlUpdateMember = "UPDATE `message_status` SET `status`='" + req.body.status + "' WHERE `users_key`='" + req.body.users_key + "' AND `conversations_key`='" + req.body.key + "' AND `status`!=2";
                        client.query(sqlUpdateMember);
                        console.log("Cập nhật thành công message_status");
                        return res.send(echoResponse(200, 'Update message status successfully.', 'success', false));
                    } else {
                        return res.send(echoResponse(404, 'This user or conversation does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});



router.post('/delete', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    var friend_key = req.body.friend_key || req.query.friend_key || req.params.friend_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlMember = "SELECT * FROM `messages` WHERE `key`='" + req.body.key + "'";
            client.query(sqlMember, function(er, rs, fl) {
                if (er) {
                    console.log(er);
                } else {
                    if (rs.length > 0) {
                        var currentTime = new Date().getTime();
                        var oldTime = rs[0].time_server;
                        var subtractTime = (parseInt(currentTime, 10) - parseInt(oldTime, 10)) / 60 / 1000;
                        if (subtractTime <= 2) {
                            var sqlDelete = "DELETE FROM `messages` WHERE `key`='" + req.body.key + "'";
                            client.query(sqlDelete, function(eDelete, dDelete, fDelete) {
                                if (eDelete) {
                                    console.log(eDelete);
                                    res.send(echoResponse(300, 'error', JSON.stringify(eSelect), true));
                                } else {
                                    console.log("Vừa xóa messages với key = " + req.body.key);
                                    var sqlDeleteMember = "SELECT * FROM `message_status` WHERE `messages_key`='" + req.body.key + "'";
                                    client.query(sqlDeleteMember);
                                    return res.send(echoResponse(200, 'Delete message successfully.', 'success', false));
                                }
                            });
                        } else {
                            return res.send(echoResponse(404, 'Delete unsuccessfully. Because exceeded 2 minutes.', 'success', false));
                        }
                    } else {
                        return res.send(echoResponse(404, 'This messages does not exists', 'success', true));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET 1 MESSAGE ----------*********/
router.get('/:key/type=content', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.key || req.query.key || req.params.key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var sqlselect = "SELECT * FROM `messages` WHERE `key`='" + key + "'";
            client.query(sqlselect, function(eSelect, rSelect, fSelect) {
                if (eSelect) {
                    res.send(echoResponse(300, 'error', JSON.stringify(eSelect), true));
                } else {
                    if (rSelect.length > 0) {
                        client.query("SELECT `users_key`,`status` FROM `message_status` WHERE `messages_key`='" + key + "'", function(eQuery, dQuery, FQ) {
                            if (eQuery) {
                                console.log(eQuery);
                                return res.sendStatus(300);
                            } else {
                                rSelect[0].message_status = dQuery;
                                return res.send(echoResponse(200, rSelect[0], 'success', false));
                            }
                        });
                    } else {
                        res.send(echoResponse(404, '404 not found', 'success', false));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});


/*********--------GET MESSAGE UNREAD----------*********/
router.get('/unread', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var type = req.body.type || req.query.type || req.params.type || req.headers['type'];
            var conversations_key = req.body.conversations_key || req.query.conversations_key || req.params.conversations_key || req.headers['conversations_key'];
            var users_key = req.body.users_key || req.query.users_key || req.params.users_key || req.headers['users_key'];

            var sqlselect = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' AND `key` IN (SELECT `messages_key` FROM `message_status` WHERE `users_key`='" + users_key + "' AND `conversations_key`='" + conversations_key + "' AND `status`=0)";
            client.query(sqlselect, function(eSelect, rSelect, fSelect) {
                if (eSelect) {
                    res.send(echoResponse(300, 'error', JSON.stringify(eSelect), true));
                } else {
                    if (rSelect.length > 0) {
                        if (type === 'data') {
                            res.send(echoResponse(200, rSelect, 'success', false));
                        } else {
                            res.send(echoResponse(200, rSelect.length, 'success', false));
                        }
                    } else {
                        res.send(echoResponse(404, '404 not found', 'success', false));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/readed', urlParser, function(req, res) {
    var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    var key = req.body.users_key || req.query.users_key || req.params.users_key;
    var users_key = req.body.users_key || req.query.users_key || req.params.users_key;
    if (key.length == 0) {
        return res.sendStatus(300);
    }
    BASE.authenticateWithToken(key, access_token, function(logged) {
        if (logged) {
            var messages_key = req.body.messages_key || req.query.messages_key || req.params.messages_key || req.headers['messages_key'];
            var sqlselect = "SELECT `nickname` FROM `users` WHERE `key`!='" + users_key + "' AND `key` IN (SELECT `users_key` FROM `message_status` WHERE `messages_key`='" + messages_key + "' AND `status`=2)";
            client.query(sqlselect, function(eSelect, rSelect, fSelect) {
                if (eSelect) {
                    res.send(echoResponse(300, 'error', JSON.stringify(eSelect), true));
                } else {
                    if (rSelect.length > 0) {
                        var data = [];
                        for (var i = 0; i < rSelect.length; i++) {
                            data.push(rSelect[i].nickname);
                        }
                        res.send(echoResponse(200, data.toString(), 'success', false));
                    } else {
                        res.send(echoResponse(404, '404 not found', 'success', false));
                    }
                }
            });
        } else {
            return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
        }
    });
});




router.get('/conversations=:conversations_key', urlParser, function(req, res) {
    // var access_token = req.body.access_token || req.query.access_token || req.headers['x-access-token'];
    // var key = req.body.key || req.query.key || req.params.key;
    // if (key.length == 0) {
    //     return res.sendStatus(300);
    // }
    // BASE.authenticateWithToken(key, access_token, function(logged) {
    //     if (logged) {

    //     } else {
    //         return res.send(echoResponse(403, 'Authenticate failed', 'success', false));
    //     }
    // });

    var conversations_key = req.body.conversations_key || req.query.conversations_key || req.params.conversations_key || req.headers['conversations_key'];
    var page = req.body.page || req.query.page || req.params.page;
    var per_page = req.body.per_page || req.query.per_page || req.params.per_page;

    var sqlu = "SELECT * FROM `messages` WHERE `conversations_key`='" + conversations_key + "' ORDER BY `time` DESC LIMIT " + parseInt(per_page, 10) + " OFFSET " + parseInt(page, 10) * parseInt(per_page, 10) + "";
    client.query(sqlu, function(eSelect, rSelect, fSelect) {
        if (eSelect) {
            res.send(echoResponse(300, 'error', JSON.stringify(eSelect), true));
        } else {
            if (rSelect.length > 0) {
                res.send(echoResponse(200, rSelect, 'success', false));
            } else {
                res.send(echoResponse(404, '404 not found', 'success', false));
            }
        }
    });
});

function sendNotification(type, conversation_key, sender_key, receiver_key, noidung, kieu, posts_id) {
    var senderSQL = "SELECT `nickname` FROM `users` WHERE `key`='" + sender_key + "'";
    client.query(senderSQL, function(loiNguoiGui, dataNguoiGui, FNG) {
        if (loiNguoiGui) {
            console.log(loiNguoiGui);
        } else {
            numberBadge(receiver_key, function(count) {
                var receiverSQL = "SELECT `device_token`,`device_type`,`language` FROM `users` WHERE `key`='" + receiver_key + "'";
                client.query(receiverSQL, function(loiNguoiNhan, dataNguoiNhan, FNN) {
                    if (loiNguoiNhan) {
                        console.log(loiNguoiNhan);
                    } else {
                        // 
                        var checkOn = "SELECT * FROM `members` WHERE `conversations_key`='" + conversation_key + "' AND `users_key`='" + receiver_key + "'";
                        client.query(checkOn, function(eCheckOn, dataCheck, FCO) {
                            if (eCheckOn) {
                                console.log(eCheckOn);
                            } else {
                                if (dataCheck.length > 0) {
                                    if (dataCheck[0].on_notification == 1) {
                                        var sqlSettings = "SELECT `preview_message` FROM `users_settings` WHERE `users_key`='" + receiver_key + "'";
                                        client.query(sqlSettings, function(eSettings, dataSetting, FST) {
                                            if (eSettings) {
                                                console.log(eSettings);
                                            } else {
                                                var msgAlert = "";
                                                if (dataSetting[0].preview_message == 1) {
                                                    if (type == 'Photo') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_sent_a_photo');
                                                    } else if (type == 'Emoji') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_sent_a_emoji');
                                                    } else if (type == 'Gif') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_sent_a_gif');
                                                    } else if (type == 'Video') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_sent_a_video');
                                                    } else if (type == 'Call') {
                                                        if (noidung == '-1') {
                                                            msgAlert = LOCALIZABLE.getLocalMessage(language, 'msg_common_miss_call') + dataNguoiGui[0].nickname;
                                                        } else {
                                                            msgAlert = LOCALIZABLE.getLocalMessage(language, 'msg_common_incomming_call') + dataNguoiGui[0].nickname;
                                                        }
                                                    } else if (type == 'File') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_sent_a_file');
                                                    } else if (type == 'MChangeBackground') {
                                                        msgAlert = dataNguoiGui[0].nickname + LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_changed_background_chat');
                                                    } else if (type == 'MInviteMember') {
                                                        msgAlert = noidung;
                                                    } else {
                                                        msgAlert = dataNguoiGui[0].nickname + ': ' + noidung;
                                                    }
                                                } else {
                                                    msgAlert = LOCALIZABLE.getLocalMessage(dataNguoiNhan[0].language, 'msg_common_new_message');
                                                }
                                                console.log("language: " + dataNguoiNhan[0].language + "mesg:" + msgAlert);
                                                if (dataNguoiNhan[0].device_type == 'ios') {
                                                    //--------APNS
                                                    var note = new apn.Notification();
                                                    note.alert = msgAlert;
                                                    note.sound = 'default';
                                                    note.topic = config.ios;
                                                    note.badge = count;
                                                    if (posts_id) {
                                                        note.payload = {
                                                            "posts_id": posts_id,
                                                            "content": msgAlert,
                                                            "type": kieu
                                                        };
                                                    } else {
                                                        note.payload = {
                                                            "sender_id": sender_key,
                                                            "conversations_key": conversation_key,
                                                            "content": msgAlert,
                                                            "type": kieu
                                                        };
                                                    }
                                                    apnService.send(note, dataNguoiNhan[0].device_token).then(result => {
                                                        console.log("sent:", result.sent.length);
                                                    });
                                                } else {
                                                    var message;
                                                    if (posts_id) {
                                                        message = {
                                                            to: dataNguoiNhan[0].device_token,
                                                            collapse_key: collapse_key,
                                                            data: {
                                                                posts_id: posts_id,
                                                                content: msgAlert,
                                                                type: kieu,
                                                                title: 'IUDI',
                                                                body: msgAlert
                                                            }
                                                        };
                                                    } else {
                                                        message = {
                                                            to: dataNguoiNhan[0].device_token,
                                                            collapse_key: collapse_key,
                                                            data: {
                                                                sender_id: sender_key,
                                                                conversations_key: conversation_key,
                                                                content: msgAlert,
                                                                type: kieu,
                                                                title: 'IUDI',
                                                                body: msgAlert
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
                                    } else {
                                        console.log("This user dont receive notification");
                                    }
                                } else {
                                    console.log("This user no in group");
                                }
                            }
                        });
                    }
                });
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


function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
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


module.exports = router;
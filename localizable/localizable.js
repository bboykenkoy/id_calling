var english = require('./english.js');
var vietnam = require('./vietnam.js');
var arab = require('./arab.js');
module.exports = class Localizable {
    getLocalMessage(language, msg) {
        var languageString = "";
        if (language == 'vi') {
            languageString = vietnam[msg];
        } else if (language == 'ar') {
            languageString = arab[msg];
        } else {
            languageString = english[msg];
        }
        return languageString;
    }
};
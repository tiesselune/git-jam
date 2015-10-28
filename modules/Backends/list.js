var fs = require('fs');
var path = require("path");

module.exports = function(){
    var files = fs.readdirSync(__dirname);
    var backends = [];
    files.forEach(function(element){
        var jsReg = /.*\.js$/gi;
        if(element !== "list.js" && jsReg.exec(element)){
            var stats = fs.statSync(path.join(__dirname, element));
            if(stats && stats.isFile()){
                var backend = require("./" + element);
                if(backend.ConfigurationPrompts && backend.PushFiles && backend.PullFiles){
                    var backendDescription = {ModuleName : element.substr(0,element.length - 3), Module : backend};
                    if(backend.Properties && backend.Properties.DisplayName){
                        backendDescription.DisplayName = backend.Properties.DisplayName;
                    }
                    backends.push(backendDescription);
                }
            }
        }
    });
    return backends;
};

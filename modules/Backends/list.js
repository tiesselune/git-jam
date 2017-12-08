const fs = require('fs');
const path = require("path");

module.exports = function(){
    const files = fs.readdirSync(__dirname);
    let backends = [];
    files.forEach(function(element){
        const jsReg = /.*\.js$/gi;
        if(element !== "list.js" && jsReg.exec(element)){
            const stats = fs.statSync(path.join(__dirname, element));
            if(stats && stats.isFile()){
                const backend = require("./" + element);
                if(backend.ConfigurationPrompts && backend.PushFiles && backend.PullFiles){
                    const backendDescription = {ModuleName : element.substr(0,element.length - 3), Module : backend};
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

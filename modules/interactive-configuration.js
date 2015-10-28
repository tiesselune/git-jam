var When = require('when');
var gitUtils = require('./gitUtils.js');
var readline = require('readline');
var listBackends = require('./Backends/list.js');

exports.InteractiveConfiguration = function(){
    var configProperties = [];
    return gitUtils.jamConfig("backend")
    .then(function(backendName){
        if(backendName){
            var backend = require("./Backends/" + backendName + ".js");
            if(backend && backend.ConfigurationPrompts && backend.PushFiles && backend.PullFiles){
                console.log("Backend is configured. Configuring backend options...");
                return BackendSpecificPrompts(backend.ConfigurationPrompts,configProperties,true);
            }
        }
        return BackendConfiguration(configProperties);
    })
    .then(function(){
        return SetUpJamConfiguration(configProperties);
    })
    .then(function(){
        return HooksConfiguration();
    })
    .then(function(){
        console.log("Interactive configuration completed.");
        return When(true);
    });
};

exports.GetConfigWithPrompt = function(key,backend){
    var configProperties = [];
    var i = 0;
    return gitUtils.jamConfig(key)
    .then(function(value){
        if(value){
            return value;
        }
        var promise = When(true);
        if(key == "backend"){
            promise = BackendConfiguration(configProperties);
        }
        else{
            var prompt;
            if(backend){
                for(i=0;i<backend.ConfigurationPrompts.length;i++){
                    var element = backend.ConfigurationPrompts[i];
                    var path = element.Category+ "." + element.Name;
                    if(key == path){
                        prompt = element;
                        break;
                    }
                }
            }
            if(prompt){
                promise = singlePrompt(prompt,configProperties,true);
            }
            else{
                promise = Ask("Necessary config value " + key + "is not set.\n Please enter a value now :")
                .then(function(answer){
                    configProperties.push({PropertyPath : key, Global : false, Value : answer});
                    return When(true);
                });
            }
        }
        return promise.then(function(){
            return SetUpJamConfiguration(configProperties);
        })
        .then(function(){
            for(i=0;i<configProperties.length;i++){
                if(configPropeties[i].PropertyPath == key){
                    return configProperties[i].Value;
                }
            }
            return undefined;
        });
    });
};

function BackendConfiguration(configProperties){
    console.log("The backend for git-jam is not configured.");
    return YesNoAsk("Would you like to configure it now?")
    .then(function(answer){
        console.log("\n");
        var backends = listBackends();
        var choices = backends.map(function(elem,i,array){return elem.DisplayName ? elem.DisplayName : elem.ModuleName});
        return RangeAsk("Which backend do you want to use ?", choices)
        .then(function(answer){
            configProperties.push({PropertyPath : "backend", Global : true, Value : backends[answer].ModuleName});
            return backends[answer].Module;
        });
    })
    .then(function(backend){
        return BackendSpecificPrompts(backend.ConfigurationPrompts,configProperties,true);
    });
}

function BackendSpecificPrompts(prompts,propertyObject,checkExistingValues){
    var result = When(true);
    prompts.forEach(function(prompt){
        result = result
        .then(function(){return singlePrompt(prompt,propertyObject,checkExistingValues);});
    });
    return result;
}

function SetUpJamConfiguration(configProperties){
    var result = When(true);
    configProperties.forEach(function(property){
        result = result.then(function(){
            return property.Global ? gitUtils.dotJamConfig(property.PropertyPath,property.Value) : gitUtils.gitJamConfig(property.PropertyPath,property.Value);
        });
    });
    return result;
}

function HooksConfiguration(){
    console.log("\n");
    return YesNoAsk("Would you like to set up hooks for automatic jam files handling?")
    .then(function(yes){
        if(yes){
            return gitUtils.setUpHooks();
        }
        return When(true);
    });
}

function singlePrompt(promptObject,propertiesArray,checkExistingValue){
    var configPath = promptObject.Category + "." + promptObject.Name;
    var result = checkExistingValue ? gitUtils.jamConfig(configPath) : When(undefined);
    return result
    .then(function(currentValue){
        if(currentValue){
            var displayedValue = promptObject.Secret ? "*****" : currentValue;
            console.log(configPath,"already has a value :",displayedValue,"Skipping. \nChange it using `git jam config",configPath);
            return When(undefined);
        }
        else{
            console.log("\n");
            if(promptObject.Choices && promptObject.Choices.length > 0){
                return RangeAsk(promptObject.Prompt, promptObject.Choices.map(function(elem){return elem.Display ? elem.Display : (elem.Value ? elem.Value : elem);}))
                .then(function(answer){
                    return promptObject.Choices[answer];
                });
            }
            else{
                return Ask(promptObject.Prompt);
            }
        }
    })
    .then(function(value){
        if(value && value.Value){
            propertiesArray.push({PropertyPath : configPath, Global : promptObject.Global, Value : value.Value});
            if(value.SubsequentPrompts){
                return BackendSpecificPrompts(value.SubsequentPrompts,propertiesArray);
            }
        }
        else if(value){
            propertiesArray.push({PropertyPath : configPath, Global : promptObject.Global, Value : value});
        }
        return When(true);
    });
}

function Ask(question){
    var defered = When.defer();
    var r = readline.createInterface({input: process.stdin,output: process.stdout});
    r.question(question + ' ', function(answer) {
        defered.resolve(answer);
        r.close();
    });
    return defered.promise;
}

function YesNoAsk(question){
    return Ask(question + " [Y/n]")
    .then(function(answer){
        if(["y","yes"].indexOf(answer.toLowerCase()) >= 0){
            return true;
        }
        if(["n","no"].indexOf(answer.toLowerCase()) >= 0){
            return false;
        }
        console.log("\nAnswer is not valid. Please answer \"yes\" or \"no\".");
        return YesNoAsk(question);
    });
}

function RangeAsk(question,choices){
    var questionWithChoices = question;
    var i = 0;
    for(i = 0; i< choices.length; i++){
        questionWithChoices += "\n\t" + (i + 1) + ". " + choices[i];
    }
    return Ask(questionWithChoices + "\n>")
    .then(function(answer){
        var number = parseInt(answer,10);
        if(number && number > 0 && number <= choices.length){
            return number - 1;
        }
        console.log("\nAnswer is not valid. Please choose an answer between 1 and " + choices.length);
        return RangeAsk(question,choices);
    });
}

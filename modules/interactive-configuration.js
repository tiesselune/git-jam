const gitUtils = require('./gitUtils.js');
const readline = require('readline');
const listBackends = require('./Backends/list.js');

exports.InteractiveConfiguration = function(){
    let configProperties = [];
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
        return CompressionConfiguration();
    })
    .then(function(){
        return HooksConfiguration();
    })
    .then(function(){
        console.log("Interactive configuration completed.");
        return Promise.resolve(true);
    });
};

exports.GetConfigWithPrompt = function(key,backend){
    let configProperties = [];
    let i = 0;
    if(key && key instanceof Array){
        return getConfigWithPromptArray(key,backend);
    }
    return gitUtils.jamConfig(key)
    .then(function(value){
        if(value){
            return value;
        }
        let promise = new Promise(true);
        if(key == "backend"){
            promise = BackendConfiguration(configProperties);
        }
        else{
            let prompt;
            if(backend){
                for(i=0;i<backend.ConfigurationPrompts.length;i++){
                    const element = backend.ConfigurationPrompts[i];
                    const path = element.Category+ "." + element.Name;
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
                    return Promise.resolve(true);
                });
            }
        }
        return promise.then(function(){
            return SetUpJamConfiguration(configProperties);
        })
        .then(function(){
            for(i=0;i<configProperties.length;i++){
                if(configProperties[i].PropertyPath == key){
                    return configProperties[i].Value;
                }
            }
            return undefined;
        });
    });
};


function getConfigWithPromptArray(keys,backend){
    let values = [];
    let promise = Promise.resolve(true);
    keys.forEach(function(key){
        promise = promise.then(function(){
            return exports.GetConfigWithPrompt(key,backend);
        })
        .then(function(value){
            values.push(value);
        });
    });
    return promise
    .then(function(){
        return values;
    });
}

function BackendConfiguration(configProperties){
    console.log("The backend for git-jam is not configured.");
    return YesNoAsk("Would you like to configure it now?")
    .then(function(answer){
        console.log("\n");
        const backends = listBackends();
        const choices = backends.map(function(elem,i,array){return elem.DisplayName ? elem.DisplayName : elem.ModuleName});
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
    let result = Promise.resolve(true);
    prompts.forEach(function(prompt){
        result = result
        .then(function(){return singlePrompt(prompt,propertyObject,checkExistingValues);});
    });
    return result;
}

function CompressionConfiguration(){
    console.log("\n");
    return YesNoAsk("Would you like to compress jam files on the backend (saves space)?")
    .then(function(yes){
        return gitUtils.dotJamConfig("gzip",yes);
    });
}

function SetUpJamConfiguration(configProperties){
    let result = Promise.resolve(true);
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
        return Promise.resolve(true);
    });
}

function singlePrompt(promptObject,propertiesArray,checkExistingValue){
    const configPath = promptObject.Category + "." + promptObject.Name;
    let result = checkExistingValue ? gitUtils.jamConfig(configPath) : Promise.resolve(undefined);
    return result
    .then(function(currentValue){
        if(currentValue){
            const displayedValue = promptObject.Secret ? "*****" : currentValue;
            console.log(configPath,"already has a value :",displayedValue,"Skipping. \nChange it using `git jam config",configPath);
            return Promise.resolve(undefined);
        }
        else{
            let promise = Promise.resolve(true);
            console.log("\n");
            if(promptObject.Choices && promptObject.Choices.length > 0){
                promise = RangeAsk(promptObject.Prompt, promptObject.Choices.map(function(elem){return elem.Display ? elem.Display : (elem.Value ? elem.Value : elem);}))
                .then(function(answer){
                    return promptObject.Choices[answer];
                });
            }
            else if(promptObject.Default && promptObject.Default.length > 0){
                promise = DefaultAsk(promptObject.Prompt,promptObject.Default);
            }
            else{
                promise = Ask(promptObject.Prompt);
            }
            if(promptObject.Validate){
                promise = promise.then(function(value){
                    const validationMessage = promptObject.Validate(value);
                    if(validationMessage === ""){
                        return value;
                    }
                    console.log(validationMessage,"Please try again.");
                    return singlePrompt(promptObject,propertiesArray,checkExistingValue);
                });
            }
            return promise;
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
        return Promise.resolve(true);
    });
}

function Ask(question){
    var promise = new Promise(function(resolve,reject){
        process.stdin.resume();
        var r = readline.createInterface({input: process.stdin,output: process.stdout});
        r.question(question + ' ', function(answer) {
            r.close();
            process.stdin.pause();
            resolve(answer);
        });
    });
    return promise;
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

function DefaultAsk(question,def){
    return Ask(question + " (" + def+")")
    .then(function(answer){
        if(answer.length > 0){
            return answer;
        }
        return def;
    });
}

function RangeAsk(question,choices){
    let questionWithChoices = question;
    let i = 0;
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

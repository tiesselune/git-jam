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
                return BackendSpecificPrompts(backend.ConfigurationPrompts,configProperties,true);
            }
        }
        return BackendConfiguration(configProperties);
    })
    .then(function(){
        return HooksConfiguration();
    });
};

function BackendConfiguration(configProperties){
    console.log("The backend for git-jam is not configured.");
    return YesNoAsk("Would you like to configure it now? [Y/n]")
    .then(function(answer){
        var backends = listBackends();
        var choices = backends.map(function(elem,i,array){return elem.DisplayName ? elem.DisplayName : elem.ModuleName});
        return RangeAsk("Which backend do you want to use ?", choices)
        .then(function(answer){
            configProperties.push({"PropertyPath" : "backend", Global : true, Value : backends[answer].ModuleName});
            return backends[answer].Module;
        });
    })
    .then(function(backend){
        return BackendSpecificPrompts(backend.ConfigurationPrompts,configProperties,false);
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

function singlePrompt(promptObject,propertiesArray,checkExistingValue){
    var configPath = promptObject.Category + "." + promptObject.Name;
    var result = checkExistingValue ? When(undefined) : gitUtils.jamConfig(configPath);
    return result
    .then(function(currentValue){
        if(currentValue){
            var displayedValue = promptObject.Secret ? "*****" : currentValue;
            console.log(configPath,"already has a value :",displayedValue,"Skipping. \nChange it using `git jam config",configPath);
            return When(undefined);
        }
        else{
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
            propertiesArray.push({"PropertyPath" : configPath, Global : promptObject.Global, Value : value.Value});
            if(value.SubsequentPrompts){
                return BackendSpecificPrompts(value.SubsequentPrompts,propertiesArray);
            }
        }
        else if(value){
            propertiesArray.push({"PropertyPath" : configPath, Global : promptObject.Global, Value : value});
        }
        return When(true);
    });
}

function Ask(question){
    var defered = When.defer();
    var r = readline.createInterface({input: process.stdin,output: process.stdout});
    r.question(question + ' ', function(answer) {
        r.close();
        defered.resolve(answer);
    });
    return defered.promise;
}

function YesNoAsk(question){
    return Ask(question)
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
var array = [];
BackendConfiguration(array).then(function(){
    console.log(JSON.stringify(array,null,"\t"));
});

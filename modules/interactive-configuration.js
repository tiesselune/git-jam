var When = require('when');
var gitUtils = require('./gitUtils.js');
var readline = require('readline');
var listBackends = require('./Backends/list.js');

exports.InteractiveConfiguration = function(){
    return gitUtils.jamConfig("backend")
    .then(function(backend){
        if(backend){
            return When(true);
        }
        return BackendConfiguration();
    })
    .then(function(){
        return HooksConfiguration();
    });
};

function BackendConfiguration(){
    console.log("The backend for git-jam is not configured.");
    return YesNoAsk("Would you like to configure it now? [Y/n]")
    .then(function(answer){
        if(answer){
            var choices = listBackends().map(function(elem,i,array){return elem.DisplayName ? elem.DisplayName : elem.ModuleName});
            return RangeAsk("Which backend do you want to use ?", choices)
            .then(function(answer){
                console.log("You chose " + choices[answer]);
            });
        }
        return;
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

BackendConfiguration();

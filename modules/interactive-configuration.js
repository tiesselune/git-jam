var When = require('when');
var gitUtils = require('./gitUtils.js');
var readline = require('readline');

exports.InteractiveConfiguration = function(){
    console.log("The backend for git-jam is not configured.");
    return YesNoAsk("Would you like to configure it now? [Y/n]")
    .then(function(answer){
        if(answer){
            var choices = ["the red pill","the blue pill"];
            return RangeAsk("Which of these would you choose ? ", choices)
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

exports.InteractiveConfiguration();

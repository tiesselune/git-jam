var When = require('when');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var JamPath = "";

exports.getJamPath = function(){
	if(JamPath != ""){
		return When(JamPath);
	}
	else{
		return exec('git rev-parse --git-dir')
		.then(function(res){
			var jamPath = path.join(path.join.apply(this,res.trim().split('/')),'jam');
			return jamPath;
		});
	}
}

exports.config = function(param,value){
	return exec('git config "' + param + '" "' + value + '"');
}

function exec(command){
	var defered = When.defer();
	childProcess.exec(command,function(err,stdout){
		if(err){
			defered.reject(new Error(stdout));
		}else{
			defered.resolve(stdout);
		}
	});
	return defered.promise;
}
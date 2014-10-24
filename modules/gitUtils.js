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

exports.lsFiles = function(){
	return exec('git ls-tree --name-only --full-tree -z -r HEAD')
	.then(function(res){
		return res.split('\0');
	});
};

exports.filteredFiles = function(files){
	return exec('git check-attr -z filter ' + files.join(' '));
	.then(function(res){
		var files = [];
		var words = res.split('\0');
		for(var i = 0; i< words.length;i += 3){
			if(words[i+2] == 'jam'){
				files.push(words[i]);
			}
		}
		return files;
	});
};

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
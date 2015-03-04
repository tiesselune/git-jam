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
	return exec(('git config "' + param + '"' + (value === undefined ? '' :  ' "'  + value + '"')));
};

exports.gitJamConfig = function(param,value){
	return exports.config('jam.' + param,value);
};

exports.dotJamConfig = function(param,value){
	return getDotJamJSON()
	.then(function(dotJamJSON){
		if(value === undefined){
			return getDottedObjectProperty(param,dotJamJSON);
		}
		else{
			setDottedObjectProperty(param,dotJamJSON,value);
			setDotJamJSON(dotJamJSON);
		}
	});
}

exports.lsFiles = function(){
	return exec('git ls-tree --name-only --full-tree -z -r HEAD')
	.then(function(res){
		return res.split('\0');
	});
};

exports.filteredFiles = function(files){
	return exec('git check-attr -z filter ' + files.join(' '))
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

function getDottedObjectProperty(property,object){
	var properties = property.split('.');
	if(typeof object != 'object'){
		return undefined;
	}
	if(properties.length == 1){
		return object[properties[0]];
	}else{
		if(object == undefined || object[properties[0]] == undefined){
			return undefined;
		}
		return getDottedObjectProperty(properties.slice(1).join('.'),object[properties[0]]);
	}
}

function setDottedObjectProperty(property,object,value){
	var properties = property.split('.');
	if(properties.length == 1){
		object[properties[0]] = value;
	}else{
		if(object[properties[0]] == undefined){
			object[properties[0]] = {};
		}
		setDottedObjectProperty(properties.slice(1).join('.'),object[properties[0]]);
	}
}

function getDotJamJSON(){
	return getJamPath()
	.then(function(jamPath){
		var dotJamPath = path.resolve(jamPath,'../../.jamconfig');
		if(fs.existsSync(dotJamPath)){
			return JSON.parse(fs.readFileSync(dotJamPath,'utf8'));
		}
		else{
			return {};
		}
	});
}

function setDotJamJSON(object){
	return getJamPath()
	.then(function(jamPath){
		var dotJamPath = path.resolve(jamPath,'../../.jamconfig');
		fs.writeFileSync(JSON.stringify(object));
	});
}

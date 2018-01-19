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
			var jamPath = path.join(path.join.apply(this,[ res[0] == "/" ? res[0] : ""].concat(res.trim().split('/'))),'jam');
			return jamPath;
		})
		.catch(function(err){
			return "";
		});
	}
}

exports.config = function(param,value){
	return exec(('git config "' + param + '"' + (value === undefined ? '' :  (' "'  + value + '"'))));
};

exports.gitJamConfig = function(param,value){
	return exports.config('jam.' + param,value)
	.catch(function(err){
		return When(undefined);
	});
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
};

exports.jamConfig = function(param){
	return exports.gitJamConfig(param)
	.then(function(value){
		if(value === undefined){
			return exports.dotJamConfig(param);
		}
		return When(value);
	});
}

exports.lsFiles = function(){
	return exec('git ls-tree --name-only --full-tree -z -r HEAD')
	.then(function(res){
		var files = res.split('\0');
		return files.map(function(file){return '"' + file +'"';});
	});
};

exports.filteredFiles = function(files){
	var i,j,chunk = 30;
	var fileChunks = [];
	for (i=0,j=files.length; i<j; i+=chunk) {
		fileChunks.push(files.slice(i,i+chunk));
	}
	var promises = fileChunks.map(function(chunk){
			return exec('git check-attr -z filter ' + chunk.join(' '))
			.then(function(res){
				var finalFiles = [];
				var words = res.split('\0');
				for(var k = 0; k< words.length;k += 3){
					if(words[k+2] == 'jam'){
						finalFiles.push(words[k]);
					}
				}
				return finalFiles;
			});
		});
	return When.all(promises)
	.then(function(array){
		var result = [];
		array.forEach(function(filteredFilesChunk){
			result = result.concat(filteredFilesChunk);
		});
		return result;
	});
};

exports.setUpHooks = function(){
	var bang = "#!/bin/sh\n\n";
	var exit = "exit 0";
	var prePush = bang + "git-jam push\n\n" + exit;
	var postCheckout = bang + "git-jam pull\n\n" + exit;
	var postMerge = bang + "git-jam pull\n\n" + exit;
	return exports.getJamPath()
	.then(function(jamPath){
		var hooks = path.resolve(jamPath,"..","hooks");
		var postCheckoutPath = path.join(hooks,"post-checkout");
		var postMergePath = path.join(hooks,"post-merge");
		var prePushPath = path.join(hooks,"pre-push");
		if(!fs.existsSync(postCheckoutPath)){
			fs.writeFileSync(postCheckoutPath,postCheckout);
			fs.chmodSync(postCheckoutPath, "755");
			console.log('Successfully created post-checkout hook.')
		}
		else{
			console.error('A post-checkout hook already exists. Post-checkout has not been set-up.')
		}
		if(!fs.existsSync(postMergePath)){
			fs.writeFileSync(postMergePath,postMerge);
			fs.chmodSync(postMergePath, "755");
			console.log('Successfully created post-merge hook.')
		}
		else{
			console.error('A post-merge hook already exists. Post-merge has not been set-up.')
		}
		if(!fs.existsSync(prePushPath)){
			fs.writeFileSync(prePushPath,prePush);
			fs.chmodSync(prePushPath, "755");
			console.log('Successfully created pre-push hook.')
		}
		else{
			console.error('A pre-push hook already exists. Pre-push has not been set-up.')
		}
		return When(true);
	});
}

function exec(command){
	var defered = When.defer();
	childProcess.exec(command,{maxBuffer: 64 * 1024 * 1024},function(err,stdout){
		if(err){
			defered.reject(new Error(err));
		}else{
			var res = stdout;
			if(res[res.length -1] == '\n'){
				res = res.slice(0,res.length-1);
			}
			defered.resolve(res);
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
		setDottedObjectProperty(properties.slice(1,properties.length).join('.'),object[properties[0]],value);
	}
}

function getDotJamJSON(){
	return exports.getJamPath()
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
	return exports.getJamPath()
	.then(function(jamPath){
		var dotJamPath = path.resolve(jamPath,'../../.jamconfig');
		fs.writeFileSync(dotJamPath,JSON.stringify(object,null,'\t'));
	});
}

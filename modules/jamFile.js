var When = require('when');
var constants = require('./constants.json')
var crypto = require('crypto');
var fs = require('fs');
var gitUtils = require('./gitUtils.js');
var path = require('path');

exports.isJamData = function(data){
	if(!(data instanceof Buffer) || data.length >= 75 || data.length < 52){
		return false;
	}
	var string = new Buffer(data).toString();
	if(string.slice(0,12) != constants.JamCookie && string.slice(0,12) != constants.FatCookie){
		return false;
	}
	return true;
};

exports.isJamPath = function(path){
	if(typeof path == 'string'){
		var data = fs.readFileSync(path);
		return exports.isJamData(data);
	}
	else{
		return false;
	}
}

exports.isJam = function(arg){
	if(typeof arg == 'string'){
		return exports.isJamPath(arg);
	}else if(arg instanceof Buffer){
		return exports.isJamData(arg);
	}else{
		return false;
	}
}

exports.mightBeJam = function(path){
	var size = fs.statSync(path).size;
	return size == 52 || size == 53 || size == 74;
};

exports.getDigestFromJamData = function(data){
	if(!(data instanceof Buffer) || data.length >= 75 || data.length < 52){
		return "";
	}
	if(exports.isJam(data)){
		var string = new Buffer(data).toString();
		return string.slice(12,52);
	}
	return "";
};

exports.getDigestFromJamPath = function(path){
	if(typeof path != 'string'){
		return "";
	}
	var data = fs.readFileSync(path);
	return exports.getDigestFromJamData(data);
};

exports.getDigestFromJam = function(arg){
	if(typeof arg == 'string'){
		return exports.getDigestFromJamPath(arg);
	}
	if(arg instanceof Buffer){
		return exports.getDigestFromJamData(data);
	}
	return "";
}

exports.isAlreadyMissing = function(digest){
	return gitUtils.getJamPath()
	.then(function(jamPath){
		var missingJamPath = path.join(jamPath,constants.MissingJam)
		if(!fs.existsSync(missingJamPath)){
			return false;
		}
		var missingJam = fs.readFileSync(missingJamPath,'utf8');
		var missingFiles = missingJam.split('\n');
		return missingFiles.indexOf(digest) != -1;
	});
}

exports.generateJam = function(data){
	var digest = sha1(data);
	return constants.JamCookie + digest;
};

exports.sha1 = function(chunk){
	var shasum = crypto.createHash('sha1');
	shasum.update(chunk);
	return shasum.digest('hex');
};

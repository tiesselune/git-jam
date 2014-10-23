var When = require('when');
var constants = require('./constants.json')
var crypto = require('crypto');
var fs = require('fs');
var gitUtils = require('./gitUtils.js');
var path = require('path');

exports.isJam = function(data){
	if(!(data instanceof Buffer) || data.length >= 54 || data.length < 52){
		return false;
	}
	var string = new Buffer(data).toString();
	if(string.slice(0,12) != constants.JamCookie && string.slice(0,12) != constants.FatCookie){
		return false;
	}
	return true;
};

exports.getDigestFromJam = function(data){
	if(!(data instanceof Buffer) || data.length >= 54 || data.length < 52){
		return "";
	}
	if(exports.isJam(data)){
		var string = new Buffer(data).toString();
		return string.slice(12,52);
	}
	return "";
};

exports.isAlreadyMissing = function(digest){
	return gitUtils.getJamPath()
	.then(function(jamPath){
		var missingJamPath = path.join(jamPath,'missingJam')
		if(!fs.existsSync(missingJamPath)){
			console.log('HEY');
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
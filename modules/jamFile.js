const constants = require('./constants.json')
const crypto = require('crypto');
const fs = require('fs');
const gitUtils = require('./gitUtils.js');
const path = require('path');

exports.isJamData = function(data){
	if(!(data instanceof Buffer) || data.length >= 75 || data.length < 52){
		return false;
	}
	const string = new Buffer(data).toString();
	if(string.slice(0,12) != constants.JamCookie && string.slice(0,12) != constants.FatCookie){
		return false;
	}
	return true;
};

exports.isJamPath = function(pth){
	if(typeof pth == 'string'){
		const data = fs.readFileSync(pth);
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

exports.mightBeJam = function(filepath){
	const size = fs.statSync(filepath).size;
	return size == 52 || size == 53 || size == 54 || size == 74;
};

exports.getDigestFromJamData = function(data){
	if(!(data instanceof Buffer) || data.length >= 75 || data.length < 52){
		return "";
	}
	if(exports.isJam(data)){
		const string = new Buffer(data).toString();
		return string.slice(12,52);
	}
	return "";
};

exports.getDigestFromJamPath = function(filepath){
	if(typeof path != 'string'){
		return "";
	}
	const data = fs.readFileSync(filepath);
	return exports.getDigestFromJamData(data);
};

exports.getDigestFromJam = function(arg){
	if(typeof arg == 'string'){
		return exports.getDigestFromJamPath(arg);
	}
	if(arg instanceof Buffer){
		return exports.getDigestFromJamData(arg);
	}
	return "";
}

exports.isAlreadyMissing = function(digest){
	return gitUtils.getJamPath()
	.then(function(jamPath){
		const missingJamPath = path.join(jamPath,constants.MissingJam)
		if(!fs.existsSync(missingJamPath)){
			return false;
		}
		const missingJam = fs.readFileSync(missingJamPath,'utf8');
		const missingFiles = missingJam.split('\n');
		return missingFiles.indexOf(digest) != -1;
	});
}

exports.generateJam = function(data){
	const digest = sha1(data);
	return constants.JamCookie + digest;
};

exports.sha1 = function(chunk){
	let shasum = crypto.createHash('sha1');
	shasum.update(chunk);
	return shasum.digest('hex');
};

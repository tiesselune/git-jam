var When = require('when');
var fs = require('fs');
var path = require('path');
var gitUtils = require('./gitUtils.js');
var jamFile = require('./jamFile.js');
var constants = require('./constants.json');
var When = require('when');

var BufferStepSize = 10000000;

exports.jamCleanFilter = function(){
	var defered = When.defer();
	var data = new Buffer(BufferStepSize);
	var blength = 0;
	process.stdin.resume();
	process.stdin.on('data',function(chunk){
		while (blength + chunk.length > data.length)
		{
			var nd = new Buffer(data.length + BufferStepSize);
			data.copy(nd);
			data = nd;
		}
		chunk.copy(data, blength);
		blength += chunk.length;
	});
	process.stdin.on('end',function(){
		data=data.slice(0, blength);
		if(!jamFile.isJam(data)){
			var digest = jamFile.sha1(data);
			gitUtils.getJamPath()
			.then(function(jamPath){
				if(!fs.existsSync(path.join(jamPath,digest))){
					fs.writeFileSync(path.join(jamPath,digest),data);
					fs.appendFileSync(path.join(jamPath,constants.ToSyncJam),digest + '\n');
				}
				fs.writeSync(1, constants.JamCookie + digest);
			});
		}else{
			fs.writeSync(1, data, 0, data.length);
		}
		process.stdin.pause();
		defered.resolve(true);
	});
	return defered.promise;
};

exports.jamSmudgeFilter = function(){
	var defered = When.defer();
	var data = new Buffer(BufferStepSize);
	var blength = 0;
	process.stdin.resume();
	process.stdin.on('data',function(chunk){
		while (blength + chunk.length > data.length)
		{
			var nd = new Buffer(data.length + BufferStepSize);
			data.copy(nd);
			data = nd;
		}
		chunk.copy(data, blength);
		blength += chunk.length;
	});
	process.stdin.on('end',function(){
		data=data.slice(0, blength);
		if(jamFile.isJam(data)){
            var digest = jamFile.getDigestFromJam(data);
			gitUtils.getJamPath()
			.then(function(jamPath){
				var objectPath = path.join(jamPath,digest);
				if(!fs.existsSync(objectPath)){
					var line = digest + '\n';
					jamFile.isAlreadyMissing(digest)
					.then(function(res){
						if(!res){
							fs.appendFileSync(path.join(jamPath,constants.MissingJam),line);
						}
					});
					fs.writeSync(1, constants.JamCookie + digest);
				}
				else{
					var file = fs.readFileSync(objectPath);
					fs.writeSync(1, file,0,file.length);
				}
			});
		}
		else{
			fs.writeSync(1, data, 0, data.length);
		}
		process.stdin.pause();
		defered.resolve(true);
	});
	return defered.promise;
};

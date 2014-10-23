var When = require('when');
var fs = require('fs');
var path = require('path');
var gitUtils = require('./gitUtils.js');
var jamFile = require('./jamFile.js');
var constants = require('./constants.json');

exports.jamCleanFilter = function(){
	var stdin = process.openStdin();
	var data = new Buffer(0);
	stdin.on('data',function(chunk){
		data = Buffer.concat([data,chunk]);
	});
	stdin.on('end',function(){
		if(!jamFile.isJam(data)){
			var digest = jamFile.sha1(data);
			gitUtils.getJamPath()
			.then(function(jamPath){
				if(!fs.existsSync(path.join(jamPath,digest))){
					fs.writeFileSync(path.join(jamPath,digest),data);
				}
				fs.writeSync(1, constants.JamCookie + digest + '\n');
			});
		}else{
			fs.writeSync(1, data);
		}
	});
};

exports.jamSmudgeFilter = function(){
	var stdin = process.openStdin();
	var data = new Buffer(0);
	stdin.on('data',function(chunk){
		data = Buffer.concat([data,chunk]);
	});
	stdin.on('end',function(){
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
							fs.appendFileSync(path.join(jamPath,'missingJam'),line);
						}
					});
					fs.writeSync(1, constants.JamCookie + digest);
				}
				else{
					fs.writeSync(1, fs.readFileSync(objectPath));
				}
			});
		}
		else{
			fs.writeSync(1, data);
		}
	});
};
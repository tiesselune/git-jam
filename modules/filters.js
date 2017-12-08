const fs = require('fs');
const path = require('path');
const gitUtils = require('./gitUtils.js');
const jamFile = require('./jamFile.js');
const constants = require('./constants.json');

const BufferStepSize = 10000000;

exports.jamCleanFilter = function(){
	return new Promise(function(resolve,reject){
		let data = new Buffer(BufferStepSize);
		let blength = 0;
		process.stdin.resume();
		process.stdin.on('data',function(chunk){
			while (blength + chunk.length > data.length)
			{
				let nd = new Buffer(data.length + BufferStepSize);
				data.copy(nd);
				data = nd;
			}
			chunk.copy(data, blength);
			blength += chunk.length;
		});
		process.stdin.on('end',function(){
			data=data.slice(0, blength);
			if(!jamFile.isJam(data)){
				const digest = jamFile.sha1(data);
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
			resolve(true);
		});
	});
};

exports.jamSmudgeFilter = function(){
	return new Promise(function(resolve,reject){
		let data = new Buffer(BufferStepSize);
		let blength = 0;
		process.stdin.resume();
		process.stdin.on('data',function(chunk){
			while (blength + chunk.length > data.length)
			{
				let nd = new Buffer(data.length + BufferStepSize);
				data.copy(nd);
				data = nd;
			}
			chunk.copy(data, blength);
			blength += chunk.length;
		});
		process.stdin.on('end',function(){
			data=data.slice(0, blength);
			if(jamFile.isJam(data)){
	            const digest = jamFile.getDigestFromJam(data);
				gitUtils.getJamPath()
				.then(function(jamPath){
					const objectPath = path.join(jamPath,digest);
					if(!fs.existsSync(objectPath)){
						const line = digest + '\n';
						jamFile.isAlreadyMissing(digest)
						.then(function(res){
							if(!res){
								fs.appendFileSync(path.join(jamPath,constants.MissingJam),line);
							}
						});
						fs.writeSync(1, constants.JamCookie + digest);
					}
					else{
						const file = fs.readFileSync(objectPath);
						fs.writeSync(1, file,0,file.length);
					}
				});
			}
			else{
				fs.writeSync(1, data, 0, data.length);
			}
			process.stdin.pause();
			resolve(true);
		});
	});
};

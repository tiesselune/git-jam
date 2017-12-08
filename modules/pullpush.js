const gitUtils = require('./gitUtils.js');
const jamFile = require('./jamFile.js');
const path = require('path');
const fs = require('fs');
const constants = require('./constants.json');

exports.pull = function(){
	return Promise.all([gitUtils.jamConfig('backend'),gitUtils.getJamPath()])
	.then(function(res){
		const [back,jamPath] = res;
		const backend = back? back : "sftp";
		let digests = fs.readFileSync(path.join(jamPath,constants.MissingJam),'utf-8').split('\n');
		if(digests[digests.length - 1] == ""){
			digests = digests.slice(0, digests.length - 1);
		}
		console.log('Preparing to pull',digests.length,'object(s).');
		return Promise.all([require('./Backends/' + backend).PullFiles(jamPath,digests),digests.length,jamPath]);
	})
	.then(function(res){
		const [failedObjects,numberOfObjects,jamPath] = res;
		console.log('\nPulled',numberOfObjects - failedObjects.length,'object(s).');
		if(failedObjects.length !== 0){
			console.error('/!\\ Could not pull',failedObjects.length,'object(s).');
		}
		return exports.restoreFiles();
	})
	.then(function(res){
		console.log('\nDone.');
	});
};

exports.push = function(){
	return Promise.all([gitUtils.jamConfig('backend'),gitUtils.getJamPath()])
	.then(function(res){
		const [back,jamPath] = res;
		const backend = back? back : "sftp";
		let digests = fs.readFileSync(path.join(jamPath,constants.ToSyncJam),'utf-8').split('\n');
		if(digests[digests.length - 1] == ""){
			digests = digests.slice(0, digests.length - 1);
		}
		console.log('Preparing to push',digests.length,'object(s).');
		return Promise.all([require('./Backends/' + backend).PushFiles(jamPath,digests),digests.length,jamPath]);
	})
	.then(function(res){
		const [failedObjects,numberOfObjects,jamPath] = res;
		console.log('\nPushed',numberOfObjects - failedObjects.length,'object(s).');
		if(failedObjects.length !== 0){
			console.error('/!\\ Could not push',failedObjects.length,'object(s).');
		}
		fs.writeFileSync(path.join(jamPath,constants.ToSyncJam),failedObjects.join('\n'));
		return Promise.resolve(true);
	})
	.then(function(res){
		console.log('\nDone.');
	});
};

exports.restoreFiles = function(){
	console.log('Restoring jam files...');
	return gitUtils.lsFiles()
	.then(function(files){
		return Promise.all([gitUtils.filteredFiles(files),gitUtils.getJamPath()]);
	})
	.then(function(res){
		const [files,jamPath] = res;
		console.log('Considering',files.length,'jam file(s).');
		let skippedFiles = [];
		files.forEach(function(file){
			if(jamFile.mightBeJam(file)){
				const digest = jamFile.getDigestFromJam(file);
				const jamFilePath = path.join(jamPath,digest);
				if(digest != "" && fs.existsSync(jamFilePath)){
					console.log('Restoring',file,":",digest)
					fs.writeFileSync(file,fs.readFileSync(jamFilePath));
				}
				else if(digest != ""){
					console.error('/!\\ Could not restore',file,digest);
					skippedFiles.push({File : file, Digest : digest});
				}
			}
		});
		if(skippedFiles.length > 0){
			console.error("/!\\ Could not restore",skippedFiles.length,"file(s).");
		}
		const digestArray = skippedFiles.map(function(obj){return obj.Digest;});
		fs.writeFileSync(path.join(jamPath,constants.MissingJam),digestArray.join('\n'));
		return skippedFiles;
	});
};

exports.getCheckedOutJamFiles = function(){
	let digests = [];
	return gitUtils.lsFiles()
	.then(function(files){
		return gitUtils.filteredFiles(files);
	})
	.then(function(files){
		files.forEach(function(file){
			if(jamFile.isJam(file)){
				digests.push(jamFile.getDigestFromJam(file));
			}
		});
		return digests;
	})
	.catch(function(err){
		return [];
	});
};

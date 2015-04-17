var When = require('when');
var gitUtils = require('./gitUtils.js');
var jamFile = require('./jamFile.js');
var path = require('path');
var fs = require('fs');
var constants = require('./constants.json');

exports.pull = function(){
	return When.all([gitUtils.jamConfig('backend'),gitUtils.getJamPath()])
	.spread(function(back,jamPath){
		var backend = back? back : "sftp";
		var digests = fs.readFileSync(path.join(jamPath,constants.MissingJam),'utf-8').split('\n');
		if(digests[digests.length - 1] == ""){
			digests = digests.slice(0, digests.length - 1);
		}
		console.log('Preparing to pull',digests.length,'object(s).');
		return [require('./Backends/' + backend).PullFiles(jamPath,digests),digests.length,jamPath];
	})
	.spread(function(failedObjects,numberOfObjects,jamPath){
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
	return When.all([gitUtils.jamConfig('backend'),gitUtils.getJamPath()])
	.spread(function(back,jamPath){
		var backend = back? back : "sftp";
		var digests = fs.readFileSync(path.join(jamPath,constants.ToSyncJam),'utf-8').split('\n');
		if(digests[digests.length - 1] == ""){
			digests = digests.slice(0, digests.length - 1);
		}
		console.log('Preparing to push',digests.length,'object(s).');
		return [require('./Backends/' + backend).PushFiles(jamPath,digests),digests.length,jamPath];
	})
	.spread(function(failedObjects,numberOfObjects,jamPath){
		console.log('\nPushed',numberOfObjects - failedObjects.length,'object(s).');
		if(failedObjects.length !== 0){
			console.error('/!\\ Could not push',failedObjects.length,'object(s).');
		}
		fs.writeFileSync(path.join(jamPath,constants.ToSyncJam),failedObjects.join('\n'));
		return When(true);
	})
	.then(function(res){
		console.log('\nDone.');
	});
};

exports.restoreFiles = function(){
	console.log('Restoring jam files...');
	return gitUtils.lsFiles()
	.then(function(files){
		return [gitUtils.filteredFiles(files),gitUtils.getJamPath()];
	})
	.spread(function(files,jamPath){
		console.log('Considering',files.length,'jam file(s).');
		var skippedFiles = [];
		files.forEach(function(file){
			if(jamFile.mightBeJam(file)){
				var digest = jamFile.getDigestFromJam(file);
				var jamFilePath = path.join(jamPath,digest);
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
			var digestArray = skippedFiles.map(function(obj){return obj.Digest;});
			fs.writeFileSync(path.join(jamPath,constants.MissingJam),digestArray.join('\n'));
		}
		return skippedFiles;
	});
};

exports.getCheckedOutJamFiles = function(){
	var digests = [];
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

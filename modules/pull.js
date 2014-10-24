var When = require('when');
var gitUtils = require('./gitUtils.js');
var jamFile = require('./jamFile.js');
var path = require('path');

exports.postPull = function(){
	return gitUtils.lsFiles()
	.then(function(files){
		return [gitUtils.filteredFiles(files),gitUtils.getJamPath()];
	})
	.spread(function(files,jamPath){
		var skippedFiles = [];
		res.forEach(function(file){
			if(jamFile.mightBeJam(file)){
				var digest = jamFile.getDigestFromJam(file);
				var jamFilePath = path.join(jamPath,digest);
				if(digest != "" && fs.existsSync(jamFilePath)){
					fs.writeFileSync(file,fs.readSync(jamFilePath));
				}
				else if(digest != ""){
					skippedFiles.push({File : file, Digest : digest});
				}
			}
		});
		return skippedFiles;
	});
};
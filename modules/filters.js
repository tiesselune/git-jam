var When = require('when');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gitUtils = require('./gitUtils.js');

exports.jamCleanFilter = function(){
	var stdin = process.openStdin();
	stdin.on('data',function(chunk){
		var digest = sha1(chunk);
		gitUtils.getJamPath()
		.then(function(jamPath){
			if(!fs.existsSync(path.join(jamPath,digest))){
				fs.writeFileSync(digest,chunk);
			}
			fs.writeSync(1, '#$# git-jam ' + digest);
		});
	});
}

exports.jamSmudgeFilter = function(){
	var stdin = process.openStdin();
	stdin.on('data',function(chunk){
		var digest = getDigestFromPlaceholder(chunk);
		gitUtils.getJamPath()
		.then(function(jamPath){
			var objectPath = path.join(jamPath,digest);
			if(!fs.existsSync(objectPath)){
				var line = digest + '\n';
				fs.appendFileSync(path.join(jamPath,'missingJam'),line);
				fs.writeSync(1, '#$# git-jam ' + digest);
			}
			else{
				fs.writeSync(1, fs.readFileSync(objectPath));
			}
		});
	});
}

function sha1(chunk){
	var shasum = crypto.createHash('sha1');
	shasum.update(chunk);
	return shasum.digest('hex');
}

function getDigestFromPlaceholder(data){
	var decoder = new StringDecoder('utf8');
	var text = decoder.write(data);
	if(text.indexOf('#$# git-jam ') === 0 
		|| text.indexOf('#$# git-fat ') === 0){
		return text.slice(12);
	}
}
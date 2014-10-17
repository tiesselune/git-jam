#!/usr/bin/node

var When = require('when');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

function main(args){
	if(args.length == 0){
		console.log('Usage : git-jam [init|push|pull]');
	}
	switch(args[0]){
		case 'filter-smudge':
			return jamFilterSmudge();
		case 'filter-clean':
			return jamFilterClean();
		case 'init':
			return jamInit();
		case 'push':
			return jamPush();
		default : 
			console.log('Usage : git-jam [init|push|pull]');
	}
}

function jamFilterSmudge(){

}

function jamFilterClean(){
	
}

function jamPush(){
	
}

function jamInit(dirName){
	var name = dirName || 'jam';
	//Make git config entries
	return command('git config filter.jam.clean "git-jam filter-clean"')
	.then(function(){
		return command('git config filter.jam.smudge "git-jam filter-smudge"');
	})
	.then(function(){
		return command('git rev-parse --git-dir');
	})
	.then(function(res){
		//check if the jam directory exists.
		var jamPath = path.join(path.join.apply(this,res.trim().split('/')),name);
		console.log(jamPath);
		if(fs.existsSync(jamPath)){
			return When(true);
		}else{
			return When(fs.mkdirSync(jamPath));
		}
	});
}

function command(command){
	var defered = When.defer();
	childProcess.exec(command,function(err,stdout,stderr){
		if(err){
			console.log(stdout);
			defered.reject(err);
		}else{
			defered.resolve(stdout);
		}
	});
	return defered.promise;
}

main(process.argv.slice(2));
#!/bin/node

'use strict';

var When = require('when');
var fs = require('fs');
var path = require('path');
var gitUtils = require('./modules/gitUtils.js');

function main(args){
	if(args.length === 0){
		console.log('Usage : git-jam [init|push|pull]');
	}
	var remainingArgs = args.slice(1);
	switch(args[0]){
		case 'filter-smudge':
			return jamFilterSmudge();
		case 'filter-clean':
			return jamFilterClean();
		case 'init':
			return jamInit();
		case 'push':
			return jamPush();
		case 'pull':
			return jamPull();
		case 'filter':
			return addFilter(remainingArgs);
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

function jamPull(){
	
}

function jamInit(){
	var name = 'jam';
	//Make git config entries
	return gitUtils.config('filter.jam.clean','git-jam filter-clean')
	.then(function(){
		return gitUtils.config('filter.jam.smudge','git-jam filter-smudge')
	})
	.then(function(){
		return gitUtils.getJamPath();
	})
	.then(function(jamPath){
		//if it is a fat repo, move the fat content to jam.
		var fatPath = path.resolve(jamPath,'../fat');
		if(fs.existsSync(fatPath)){
			fs.renameSync(fatPath,jamPath);
		}
		else if(!fs.existsSync(jamPath)){
			fs.mkdirSync(jamPath);
		}
		fs.writeFileSync(path.join(jamPath,'missingJam'),'');
		return When(jamPath);
	});
}



main(process.argv.slice(2));
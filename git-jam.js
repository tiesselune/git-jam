#!/bin/node

'use strict';

var When = require('when');
var fs = require('fs');
var path = require('path');
var gitUtils = require('./modules/gitUtils.js');
var filters = require('./modules/filters.js');

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
			return addFilters(remainingArgs);
		default : 
			console.log('Usage : git-jam [init|push|pull]');
	}
}

function jamFilterSmudge(){
	filters.jamSmudgeFilter();
}

function jamFilterClean(){
	filters.jamCleanFilter();
}

function jamPush(){
	
}

function jamPull(){
	
}

function addFilters(args){
	args.forEach(function(filter){
		addFilter(filter);
	});
}

function addFilter(filter){
	gitUtils.getJamPath()
	.then(function(jamPath){
		var attributesPath = path.resolve(jamPath,'../../.gitattributes');
		if(!fs.existsSync(attributesPath)){
			fs.writeFileSync(attributesPath,'');
		}
		var attributes = fs.readFileSync(attributesPath,'utf8');
		var expression = filter + ' filter=';
		var foundAt = attributes.indexOf(filter + ' filter=');
		if(foundAt >= 0){
			var line = attributes.slice(foundAt);
			var endOfLine = line.indexOf('\n') == - 1 ? line.length : line.indexOf('\n');
			line = line.slice(0,endOfLine);
			attributes = attributes.replace(line,filter + ' filter=jam -crlf');
		}
		else{
			attributes += (attributes[attributes.length] == '\n' || attributes.length == 0 ? '' : '\n') + filter + ' filter=jam -crlf';
		}
		fs.writeFileSync(attributesPath,attributes);
	});
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
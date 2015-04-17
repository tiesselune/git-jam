#!/bin/node

'use strict';

var When = require('when');
var fs = require('fs');
var path = require('path');
var gitUtils = require('./modules/gitUtils.js');
var filters = require('./modules/filters.js');
var pullpush = require('./modules/pullpush.js');
var constants = require('./modules/constants.json');

var usage = 'Usage : git-jam (init|filter <extension>|push|pull|config [-g] <property> [<value>]|restore)';

function main(args){
	if(args.length === 0){
		console.log(usage);
		return;
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
		case 'restore':
			return jamRestore();
		case 'filter':
			return addFilters(remainingArgs);
		case 'config':
			if(remainingArgs.length > 0){
				return jamConfig(remainingArgs);
			}
		default :
			console.log(usage);
	}
}

function jamFilterSmudge(){
	filters.jamSmudgeFilter();
}

function jamFilterClean(){
	filters.jamCleanFilter();
}

function jamPush(){
	pullpush.push();
}

function jamPull(){
	pullpush.pull();
}

function jamRestore(){
	pullpush.restoreFiles();
}

function jamConfig(args){
	var g = args.indexOf('-g');
	if(g >= 0){
		args.splice(g,1);
		var result = gitUtils.dotJamConfig(args[0],args[1])
		.then(function(result){
			if(result){
				console.log(result);
			}
		});
	}
	else{
		var result = gitUtils.gitJamConfig(args[0],args[1])
		.then(function(result){
			if(result){
				console.log(result);
			}
		})
		.catch(function(err){

		});
	}

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
		return [pullpush.getCheckedOutJamFiles(),jamPath];
	})
	.spread(function(digests,jamPath){
		fs.writeFileSync(path.join(jamPath,constants.MissingJam),digests.join('\n'));
		fs.writeFileSync(path.join(jamPath,constants.ToSyncJam),'');
		return When(true);
	});
}

var args = process.argv;
for(var i = 0;i <args.length;i++){
	if(args[i].indexOf('git-jam') >= 0){
		break;
	}
}

main(args.slice(i + 1));

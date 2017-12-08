#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const gitUtils = require('./modules/gitUtils.js');
const filters = require('./modules/filters.js');
const pullpush = require('./modules/pullpush.js');
const constants = require('./modules/constants.json');
const iConfig = require("./modules/interactive-configuration.js");
const spawn = require('child_process').spawn;

const usage = 'Usage : git-jam (init|filter <extension>|push|pull|config [-g] <property> [<value>]|restore|setup-hooks)';

function main(args){
	if(args.length === 0){
		console.log(usage);
		return ;
	}
	const remainingArgs = args.slice(1);
	return gitUtils.getJamPath()
	.then(function(jamPath){
		if((jamPath == "" || !fs.existsSync(jamPath)) && args[0] != "init"){
			console.error("You are not in a jam repository.");
			return 1;
		}
		switch(args[0]){
			case 'filter-smudge':
				return jamFilterSmudge();
			case 'filter-clean':
				return jamFilterClean();
			case 'init':
				return jamInit(remainingArgs);
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
			case 'setup-hooks':
				return gitUtils.setUpHooks();
			default :
				console.log(usage);
		}
	})
	.then(function(){
		process.stdin.destroy();
	})
	.catch(function(err){
		console.error("The operation failed. Here is the stack trace of the error : ");
		console.error(err.stack);
		process.stdin.destroy();
	});

}

function jamFilterSmudge(){
	return filters.jamSmudgeFilter();
}

function jamFilterClean(){
	return filters.jamCleanFilter();
}

function jamPush(){
	return pullpush.push()
	.catch(function(err){
		console.log(err.message);
	});
}

function jamPull(){
	return pullpush.pull()
	.catch(function(err){
		console.log(err.message);
	});
}

function jamRestore(){
	return pullpush.restoreFiles()
	.catch(function(err){
		console.log(err.message);
	});
}

function jamConfig(args){
	let g = args.indexOf('-g');
	if(g >= 0){
		args.splice(g,1);
		let result = gitUtils.dotJamConfig(args[0],args[1])
		.then(function(result){
			if(result){
				console.log(result);
			}
		});
	}
	else{
		let result = gitUtils.gitJamConfig(args[0],args[1])
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
	return gitUtils.getJamPath()
	.then(function(jamPath){
		let attributesPath = path.resolve(jamPath,'../../.gitattributes');
		if(!fs.existsSync(attributesPath)){
			fs.writeFileSync(attributesPath,'');
		}
		let attributes = fs.readFileSync(attributesPath,'utf8');
		let expression = filter + ' filter=';
		let foundAt = attributes.indexOf(filter + ' filter=');
		if(foundAt >= 0){
			let line = attributes.slice(foundAt);
			let endOfLine = line.indexOf('\n') == - 1 ? line.length : line.indexOf('\n');
			line = line.slice(0,endOfLine);
			attributes = attributes.replace(line,filter + ' filter=jam -crlf');
		}
		else{
			attributes += (attributes[attributes.length] == '\n' || attributes.length == 0 ? '' : '\n') + filter + ' filter=jam -crlf';
		}
		fs.writeFileSync(attributesPath,attributes);
	});
}

function replaceFatFilters(jamPath){
	let attributesPath = path.resolve(jamPath,'../../.gitattributes');
	if(!fs.existsSync(attributesPath)){
		fs.writeFileSync(attributesPath,'');
	}
	let attributes = fs.readFileSync(attributesPath,'utf8');
	let newAttributes = attributes.replace(/fat -crlf/g,"jam -crlf");
	fs.writeFileSync(attributesPath,newAttributes);
}

function jamInit(args){
	//Make git config entries
	return gitUtils.config('filter.jam.clean','git-jam filter-clean')
	.then(function(){
		return gitUtils.config('filter.jam.smudge','git-jam filter-smudge')
	})
	.then(function(){
		return gitUtils.getJamPath();
	})
	.then(function(jamPath){
		let importFat = args.length > 0 && (args.indexOf('--fat-import') >= 0 || args.indexOf('-f') >=0 );
		//if it is a fat repo, move the fat content to jam.
		let fatPath = path.resolve(jamPath,'../fat');
		if(importFat && fs.existsSync(fatPath)){
			fs.renameSync(fatPath,jamPath);
			let objectsPath = path.join(jamPath,"objects");
			if(fs.existsSync(objectsPath)){
				moveAllFiles(objectsPath,jamPath);
			}
		}
		else if(!fs.existsSync(jamPath)){
			fs.mkdirSync(jamPath);
		}
		if(importFat){
			 replaceFatFilters(jamPath);
		}
		return Promise.all([pullpush.getCheckedOutJamFiles(jamPath),Promise.resolve(jamPath)]);
	})
	.then(function(digestsAndPath){
		const [digets,jamPath] = digestsAndPath;
		fs.writeFileSync(path.join(jamPath,constants.MissingJam),digests.join('\n'));
		fs.writeFileSync(path.join(jamPath,constants.ToSyncJam),'');
		return Promise.resolve(true);
	})
	.then(function(){
		return iConfig.InteractiveConfiguration().then(function(){return Promise.resolve(true);});
	});
}

function moveAllFiles(src,dest){
	const files = fs.readdirSync(src);
	files.forEach(function(file){
		fs.renameSync(path.join(src,file), path.join(dest,file));
	});
}

const args = process.argv;
for(let i = 0;i <args.length;i++){
	if(args[i].indexOf('git-jam') >= 0){
		break;
	}
}

main(args.slice(i + 1));

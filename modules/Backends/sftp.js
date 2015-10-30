var ssh2 = require('ssh2');
var When = require('when');
var gitUtils = require('../gitUtils.js');
var iConfig = require("../interactive-configuration.js");
var path = require('path');
var fs = require('fs');

exports.Properties = {
	DisplayName : "SFTP"
};

exports.ConfigurationPrompts = [
	{
		Global : true,
		Category : "sftp",
		Name : "host",
		Prompt : "Please set up the remote SSH hostname : "
	},
	{
		Global : true,
		Category : "sftp",
		Name : "system",
		Prompt : "What is the remote system ?",
		Choices : [{Display : "Unix", Value : "unix"},{Display : "Windows", Value : "windows"}]
	},
	{
		Global : true,
		Category : "sftp",
		Name : "path",
		Prompt : "Please set up the path of the target directory on the remote host:\n>",
	},
	{
		Global : false,
		Category : "sftp",
		Name : "user",
		Prompt : "What is your SSH user name? "
	},
	{
		Global : false,
		Category : "sftp",
		Name : "auth-method",
		Prompt : "Which SSH authentication method would you like to use ?",
		Choices : [
			{
				Display : "SSH Keypair",Value : "ssh-keypair",
				SubsequentPrompts :
				[
					{
						Global : false,
						Category : "sftp",
						Name : "ssh-keypath",
						Prompt : "Enter the path of your private SSH key relative to $HOME",
						Default : ".ssh/id_rsa",
						Validate : function(value){
							var privateKeyPath = path.resolve(getUserHome(),value);
							return fs.existsSync(privateKeyPath) ? "" : "This file does not exist.";
						}
					}
				]
			},
			{Display : "Pageant",Value : "pageant",},
			{Display : "Ssh-agent",Value : "ssh-agent"},
			{
				Display : "Password [Not recommended : stored as clear text]",
				Value : "password",
				SubsequentPrompts :
				[
					{
						Global : false,
						Category : "sftp",
						Name : "password",
						Secret : true,
						Prompt : "What is your SSH password? "
					}
				]
			}
		]
	}
];

exports.PushFiles = function(jamPath,digests){
	var failedDigestList = [];
	var sshConn = new exports.SSHConnection();
	return sshConn.connectUsingCredentials()
	.then(function(){
		return [sshConn.sftp(),iConfig.GetConfigWithPrompt(['sftp.path','sftp.system'],exports)];
	})
	.spread(function(sftp,configArray){
		var remotePath = configArray[0];
		var remoteSystem = configArray[1];
		var pathSeparator = "/";
		if(remoteSystem !== undefined && ["win32","windows"].indexOf(remoteSystem.toLowerCase()) >= 0){
			pathSeparator = "\\";
		}
		var promiseChain = When(true);
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return sftp.fastPut(path.join(jamPath, digest),remotePath + pathSeparator + digest,{});
			})
			.then(function(){
				console.log('Pushed',digest +'.');
				return When(true);
			})
			.catch(function(err){
				failedDigestList.push(digest);
				console.error("Error on",digest + ".",err.message);
			});
		});
		return promiseChain;
	})
	.then(function(){
		sshConn.end();
		return When(failedDigestList);
	})
	.catch(function(err){
		try{
			sshConn.end();
		}catch(err){
		}
		throw err;
	});
};

exports.PullFiles = function(jamPath,digests){
	var failedDigestList = [];
	var sshConn = new exports.SSHConnection();
	return sshConn.connectUsingCredentials()
	.then(function(){
		return [sshConn.sftp(),iConfig.GetConfigWithPrompt(['sftp.path','sftp.system'],exports)];
	})
	.spread(function(sftp,configArray){
		var remotePath = configArray[0];
		var remoteSystem = configArray[1];
		var pathSeparator = "/";
		if(remoteSystem !== undefined && ["win32","windows"].indexOf(remoteSystem.toLowerCase()) >= 0){
			pathSeparator = "\\";
		}
		var promiseChain = When(true);
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return sftp.fastGet(remotePath + pathSeparator + digest,path.join(jamPath,digest),{});
			})
			.then(function(){
				console.log('Pulled',digest + '.');
				return When(true);
			})
			.catch(function(err){
				failedDigestList.push(digest);
				console.error("Error on",digest + ".",err.message);
			});
		});
		return promiseChain;
	})
	.then(function(){
		sshConn.end();
		return When(failedDigestList);
	})
	.catch(function(err){
		try{
			sshConn.end();
		}catch(err){
		}
		throw err;
	});
};

exports.SSHConnection = function(){
	this.connection = new ssh2();
}

exports.SSHConnection.prototype.connect = function(options){
	var defered = When.defer();

	this.connection
	.on('ready',function(){
		defered.resolve(true);
	})
	.on('error',function(err){
		defered.reject(err);
	})
	.connect(options);

	return defered.promise;
};

exports.SSHConnection.prototype.connectUsingCredentials = function(){
	return iConfig.GetConfigWithPrompt(['sftp.host','sftp.user','sftp.auth-method'],exports)
	.then(function(config){
		var host = config[0];
		var user = config[1];
		var authMethod = config[2];
		switch(authMethod){
			case "pageant":
			return this.connect({host : host, username : user, agent : "pageant", port : 22});
			case "ssh-agent":
			return this.connect({host : host, username : user, agent : process.env["SSH_AUTH_SOCK"], port : 22});
			case "ssh-keypair":
			return this.connectWithKeyPair(host,user);
			case "password":
			return this.connectWithPassword(host,user);
			default :
			return this.getConfigWithPrompt('sftp.auth-method',exports)
			.then(function(){
				this.connectUsingCredentials();
			});
		}
	}.bind(this));
};

exports.SSHConnection.prototype.connectWithKeyPair = function(host,user){
	return iConfig.GetConfigWithPrompt('sftp.ssh-keypath',exports)
	.then(function(keypath){
		var privateKeyPath = path.resolve(getUserHome(),keypath);
		if(fs.existsSync(privateKeyPath)){
			return this.connect({host : host,username : user, privateKey : fs.readFileSync(privateKeyPath), port : 22});
		}
		else{
			console.log("Current path for private SSH key is invalid.");
			return iConfig.GetConfigWithPrompt('sftp.ssh-keypath',exports)
			.then(function(){
				return this->connectWithKeyPair(host,user);
			});
		}
	});
};

exports.SSHConnection.prototype.connectWithPassword = function(host,user){
	return iConfig.GetConfigWithPrompt('sftp.password',exports)
	.then(function(password){
		return this.connect({host : host,username : user, password : password, port : 22});
	});
};

exports.SSHConnection.prototype.sftp = function(){
	var defered = When.defer();
	this.connection.sftp(function(err,sftp){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(new SFTP(sftp));
		}
	});
	return defered.promise;
};

exports.SSHConnection.prototype.end = function(){
	this.connection.end();
};

function SFTP(sftpObject){
	this.sftp = sftpObject;
};

SFTP.prototype.fastGet = function(remotePath,localPath,options){
	var defered = When.defer();
	this.sftp.fastGet(remotePath,localPath,options,function(err){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(true);
		}
	});
	return defered.promise;
};

SFTP.prototype.fastPut = function(localPath,remotePath,options){
	var defered = When.defer();
	this.sftp.fastPut(localPath,remotePath,options,function(err){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(true);
		}
	});
	return defered.promise;
};

SFTP.prototype.open = function(filename,mode){
	var defered = When.defer();
	this.sftp.open(filename,mode,function(err,handle){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(handle);
		}
	});
	return defered.promise;
};

SFTP.prototype.close = function(handle){
	var defered = When.defer();
	this.sftp.close(handle,function(err){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(true);
		}
	});
	return defered.promise;
};

SFTP.prototype.fchmod = function(handle,mod){
	var defered = When.defer();
	this.sftp.fchmod(handle,mod,function(err){
		if(err){
			defered.reject(err);
		}
		else{
			defered.resolve(true);
		}
	});
	return defered.promise;
};

SFTP.prototype.chmod = function(filename,mod){
	return this.open(filename,'w')
	.then(function(handle){
		return [handle,this.fchmod(handle,mod)];
	}.bind(this))
	.spread(function(handle){
		return this.close(handle);
	}.bind(this));
};

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

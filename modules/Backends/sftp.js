var ssh2 = require('ssh2');
var When = require('when');
var gitUtils = require('../gitUtils.js');
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
		Prompt : "Please set up the path of the target directory on the remote host:\n> ",
	},
	{
		Global : false,
		Category : "sftp",
		Name : "auth-method",
		Prompt : "Which SSH authentication method would you like to use ?",
		Choices : [
			{Display : "SSH Keypair",Value : "ssh-keypair"},
			{Display : "Pageant",Value : "pageant",},
			{Display : "Ssh-agent",Value : "ssh-agent"},
			{
				Display : "User & Password [Not recommended : stored as clear text]",
				Value : "password",
				SubsequentPrompts :
				[
					{
						Global : false,
						Category : "sftp",
						Name : "user",
						Prompt : "What is your SSH user name? "
					},
					{
						Global : false,
						Category : "sftp",
						Name : "password",
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
		return [sshConn.sftp(),gitUtils.jamConfig('sftp.path'),gitUtils.jamConfig('sftp.system')];
	})
	.spread(function(sftp,remotePath,remoteSystem){
		var pathSeparator = "/";
		if(remoteSystem !== undefined && ["win32","windows"].indexOf(remoteSystem.toLowerCase()) >= 0){
			pathSeparator = "\\";
		}
		if(!remotePath){
			throw new Error("Please specify a remote path :\n\tgit jam config -g sftp.path <path>");
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
		return [sshConn.sftp(),gitUtils.jamConfig('sftp.path'),gitUtils.jamConfig('sftp.system')];
	})
	.spread(function(sftp,remotePath,remoteSystem){
		var pathSeparator = "/";
		if(remoteSystem !== undefined && ["win32","windows"].indexOf(remoteSystem.toLowerCase()) >= 0){
			pathSeparator = "\\";
		}
		if(!remotePath){
			throw new Error("Please specify a remote path :\n\tgit jam config -g sftp.path \"<path>\"");
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
	return gitUtils.jamConfig('sftp.host')
	.then(function(host){
		if(host == undefined){
			throw new Error('Please set up a host for SFTP connection :\n\tgit jam config -g sftp.host example.com');
		}
		return [host,gitUtils.jamConfig('sftp.user'),gitUtils.jamConfig('sftp.password')];
	})
	.spread(function(host,user,password){
		if(user == undefined){
			throw new Error('Please set up a user for SFTP connection :\n\tgit jam config sftp.user username');
		}
		if(password != null){
			return this.connect({host : host,username : user, password : password, port : 22});
		}
		else{
			var privateKeyPath = path.resolve(getUserHome(),'.ssh/id_rsa');
			// assume ssh-agent is running when the environment variable containing the socket is set
			if(process.env["SSH_AUTH_SOCK"] != undefined){
				return this.connect({host : host, username : user, agent : process.env["SSH_AUTH_SOCK"], port : 22});
			}
			else if(fs.existsSync(privateKeyPath)){
				return this.connect({host : host,username : user, privateKey : fs.readFileSync(privateKeyPath), port : 22});
			}
			else{
				throw new Error('Please set up a password for SFTP connection :\n\tgit jam config sftp.password <pswd>\nYou can also set up a SSH key pair in HOME/.ssh.');
			}
		}
	}.bind(this));
}

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

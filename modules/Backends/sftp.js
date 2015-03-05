var ssh2 = require('ssh2');
var When = require('when');
var gitUtils = require('../gitUtils.js');
var path = require('path');

exports.PushFiles = function(jamPath,digests){
	var failedDigestList = [];
	var sshConn = new SSHConnection();
	return conn.connectionAttempt()
	.then(function(){
		return [conn.sftp(),gitUtils.dotJamConfig('sftp.path')];
	})
	.then(function(sftp,remotePath){
		var promiseChain = When(true);
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return sftp.fastPut(path.join(jamPath,digest),path.join(remotePath,digest),{});
			})
			.then(function(){
				return sftp.chmod(path.join(jamPath,digest),0750);
			})
			.then(function(){
				console.log('Pushed',digest,'.');
				return When(true);
			})
			.catch(function(err){
				failedDigestList.push(digest);
				console.error("Error on",digest,".",err.message);
			});
		});
		return promiseChain
		.then(function(){
			return failedDigestList;
		});
	})
	.catch(function(err){
		console.error(err.message);
	});
};

exports.PullFiles = function(jamPath,digests){
	var failedDigestList = [];
	var sshConn = new SSHConnection();
	return conn.connectionAttempt()
	.then(function(){
		return [conn.sftp(),gitUtils.dotJamConfig('sftp.path')];
	})
	.then(function(sftp,remotePath){
		var promiseChain = When(true);
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return sftp.fastGet(path.join(remotePath,digest),path.join(jamPath,digest),{});
			})
			.then(function(){
				console.log('Pulled',digest,'.');
				return When(true);
			})
			.catch(function(err){
				failedDigestList.push(digest);
				console.error("Error on",digest,".",err.message);
			});
		});
		return promiseChain;
	})
	.then(function(){
		return failedDigestList;
	})
	.catch(function(err){
		console.error(err.message);
	});
};

function sendFiles(files,targetDirectory){
	var connection = new ssh2();
	connection.on('')
}


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

exports.SSHConnection.prototype.getSFTP = function(){
	return gitUtils.dotJamConfig('sftp.host')
	.then(function(host){
		if(host == undefined){
			throw new Error('Please set up a host for SFTP connection : git jam config sftp.host example.com');
		}
		return [host,gitUtils.gitJamConfig('jam.sftp-user'),gitUtils.gitJamConfig('jam.sftp-password')];
	})
	.spread(function(host,user,password){
		if(user == undefined){
			throw new Error('Please set up a user for SFTP connection : git config jam.sftp-user username');
		}
		if(password != null){
			return this.connect({host : host,username : user, password : password, port : 22});
		}
		else{
			var privateKeyPath = path.resolve(getUserHome(),'.ssh/id_rsa');
			if(fs.existsSync(privateKeyPath)){
				return this.connect({host : host,username : user, privateKey : fs.readFileSync(privateKeyPath), port : 22});
			}
			else{
				throw new Error('Please set up a password for SFTP connection : git config jam.sftp-password <pswd>\nYou can also set up a SSH key pair in HOME/.ssh.');
			}
		}
	});
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
	})
	.spread(function(handle){
		return this.close(handle);
	});
};

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

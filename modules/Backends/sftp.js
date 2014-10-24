var ssh2 = require('ssh2');
var When = require('when');
var gitUtils = require('./gitUtils.js');

exports.PushFiles = function(){
	var connection = new ssh2();
};

exports.PullFiles = function(){
	
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

exports.SSHConnection.prototype.connectionAttempt = function(){
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
		}
	})
	.then(function(res){
		
	})
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

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}
var aws = require('aws-sdk');
var When = require('when');
var gitUtils = require('../gitUtils.js');
var iConfig = require("../interactive-configuration.js");
var path = require('path');
var fs = require('fs');

exports.Properties = {
	DisplayName : "Amazon S3"
};

exports.ConfigurationPrompts = [
	{
		Global : true,
		Category : "s3",
		Name : "Region",
		Prompt : "Please set up the S3 region (ex : eu-west-1) :"
	},
	{
		Global : true,
		Category : "s3",
		Name : "Bucket",
		Prompt : "Please enter the name of your target bucket :"
	},
	{
		Global : true,
		Category : "s3",
		Name : "Path",
		Prompt : "Please set up the path of the target directory in the bucket :\n>",
	},
	{
		Global : false,
		Category : "s3",
		Name : "AccessKeyID",
		Prompt : "Enter your access key ID from Amazon IAM :\n>",
	},
	{
		Global : false,
		Category : "s3",
		Name : "SecretAccessKey",
		Prompt : "Enter your secret access key from Amazon IAM: \n>",
	}
];

exports.PushFiles = function(jamPath,digests){
	var failedDigestList = [];;
	return configureAWS()
	.then(function(){
		return iConfig.GetConfigWithPrompt(['s3.Bucket','s3.Path'],exports);
	})
	.then(function(config){
		var bucket = config[0];
		var basePath = config[1];
		var promiseChain = When(true);
        var s3 = new S3(bucket);
        var cleanBasePath = basePath[basePath.length - 1] == "/" ?  basePath : basePath + "/";
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return s3.UploadFile(path.join(jamPath,digest),cleanBasePath + splitHash(digest));
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
        return When(failedDigestList);
    });
};

exports.PullFiles = function(jamPath,digests){
    var failedDigestList = [];;
	return configureAWS()
	.then(function(){
		return iConfig.GetConfigWithPrompt(['s3.Bucket','s3.Path'],exports);
	})
	.then(function(config){
		var bucket = config[0];
		var basePath = config[1];
		var promiseChain = When(true);
        var s3 = new S3(bucket);
        var cleanBasePath = basePath[basePath.length - 1] == "/" ?  basePath : basePath + "/";
		digests.forEach(function(digest){
			promiseChain = promiseChain.then(function(){
				return s3.DownloadFile(cleanBasePath + splitHash(digest));
			})
			.then(function(data){
                fs.writeFileSync(path.join(jamPath,digest),data);
				console.log('Pulled',digest +'.');
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
        return When(failedDigestList);
    });
};

function configureAWS(){
    return iConfig.GetConfigWithPrompt(['s3.AccessKeyID','s3.SecretAccessKey','s3.Region'],exports)
    .then(function(values){
        aws.config.accessKeyId = values[0];
        aws.config.secretAccessKey = values[1];
        aws.config.region = values[2];
        return When(true);
    });
}

function S3(bucketName, path){
    this.bucket = new aws.S3({params: {Bucket: bucketName}});
}

S3.prototype.UploadFile = function(localPath,remotePath){
    var defered = When.defer();
    var content = fs.readFileSync(localPath);
    this.bucket.upload({Key : remotePath, Body : content},function(err,data){
        if(err){
            defered.reject(err);
        }
        else{
            defered.resolve(data);
        }
    });
    return defered.promise;
}

S3.prototype.DownloadFile = function(path){
    var defered = When.defer();
    this.bucket.getObject({Key : path},function(err,data){
        if(err){
            defered.reject(err);
        }
        else{
            defered.resolve(data.Body);
        }
    });
    return defered.promise;
}

function splitHash(hash){
    return hash.substr(0,4) + "/" + hash.substr(4,4) + "/" + hash.substring(8,hash.length);
}

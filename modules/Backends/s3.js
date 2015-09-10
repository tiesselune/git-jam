var aws = require('aws-sdk');
var When = require('when');
var gitUtils = require('../gitUtils.js');
var path = require('path');
var fs = require('fs');

exports.PushFiles = function(jamPath,digests){
	var failedDigestList = [];;
	return configureAWS()
	.then(function(){
		return [gitUtils.jamConfig('s3.Bucket'),gitUtils.jamConfig('s3.Path')];
	})
	.spread(function(bucket,basePath){
        if(!bucket){
            throw new Error("Please specify a bucket :\n\tgit jam config -g s3.Bucket <bucket name>");
        }
		if(!basePath){
			throw new Error("Please specify a base path :\n\tgit jam config -g s3.Path <path>");
		}
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
		return [gitUtils.jamConfig('s3.Bucket'),gitUtils.jamConfig('s3.Path')];
	})
	.spread(function(bucket,basePath){
        if(!bucket){
            throw new Error("Please specify a bucket :\n\tgit jam config -g s3.Bucket <bucket name>");
        }
		if(!basePath){
			throw new Error("Please specify a base path :\n\tgit jam config -g s3.Path <path>");
		}
		var promiseChain = When(true);
        var s3 = new S3(bucketName);
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
    return When.all([gitUtils.jamConfig('s3.AccessKeyID'),gitUtils.jamConfig('s3.SecretAccessKey'),gitUtils.jamConfig('s3.Region')])
    .spread(function(key1,key2,region){
        if(!key1){
            throw new Error("Please specify an Access Key ID :\n\tgit jam config -g s3.AccessKeyID <Key>");
        }
        if(!key2){
            throw new Error("Please specify a Secret Access Key :\n\tgit jam config -g s3.SecretAccessKey <Key>");
        }
        if(!region){
            throw new Error("Please specify a Region :\n\tgit jam config -g s3.Region <region>");
        }
        aws.config.accessKeyId = key1;
        aws.config.secretAccessKey = key2;
        aws.config.region = region;
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
            defered.resolve(data);
        }
    });
    return defered.promise;
}

function splitHash(hash){
    return hash.substr(0,4) + "/" + hash.substr(4,4) + "/" + hash.substring(8,hash.length);
}

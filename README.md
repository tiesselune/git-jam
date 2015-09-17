git-jam
=======

Yet another binary manager for git, largely inspired by git-fat, but aimed at being more cross-platform

## TL;DR

    //Installation
    git clone https://github.com/tiesselune/git-jam.git
    cd git-jam
    sudo npm install -g

    //Configuration
    git jam init
    git jam filter "*.png"
    git jam config -g sftp.host "myexamplehost.com"
    git jam config -g sftp.path "/share/DATA/GitJam/MyProject"
    git jam config sftp.user "j.tiesselune"
    git jam config sftp.password "******"

    //Usage
    git add somefile.png
    git commit -m "Some commit message"
    git jam push

    git checkout someOtherBranch
    git jam pull



## Why git-jam?

`git-jam` is aimed at giving an alternative to [git-fat](https://github.com/jedbrown/git-fat), but using the same mechanics.

The main problems I encountered in `git-fat` (although it's a great tool) are:

 * Windows use. Configuration of `git-fat` under windows has proven being a lot of sweat, especially when installing the system to more and more computers
 * Rsync. Though rsync is great, we had to install cygwin to use it under windows when a simple SCP would have suited our needs.
 * Speed. Some things are being merged into `git-fat` to increase its speed and usability. But as our project grew, `git fat` operations grew slower and slower.

## What's new?

**The first concern** is cross-platform compatibility to ease configuration under windows and remove cygwin as a dependency (which forced to have two environments set up, one for use with windows GUI versionning tools and the other being rsync-enabled cygwin environment). Especially when cygwin and windows versions of git had to be set up differently.

For that purpose, I've chosen to develop it with **Javascript and Node.js**, as it has become a cross-plaform guarantee for scripts and CLI tools.

Rsync won't be a dependency anymore, as I have chosen to copy files directly via SSH and track changes with a file-based system.

## Installing

### Using npm

Use NPM to install git-jam:

    npm install -g git-jam

### By cloning

Clone the project:

    git clone https://github.com/tiesselune/git-jam.git

Then install it using npm:

    cd git-jam
    sudo npm install -g

## Usage

> **Important Note : Under windows**, in the git bash environment, `git-jam` can't be invoked in the command-line using `git jam`. Until [this pull request](https://github.com/ForbesLindesay/cmd-shim/pull/4) is merged into `cmd-shim` used by npm, the dash in `git-jam` is mandatory to invoke `git-jam` commands.

### Configuration
To enable git-jam, inside a git repo, run :

    git jam init

If your git repo is a git-fat enabled repo, use the `-f` or `--fat-import` option to transfer filters and objects to the jam system.

    git jam init -f

> It does not matter whether you cloned your git repository from an existing git-jam enabled repo or just created a new one. You should call `git jam init` each time you clone a repo for which you wish git jam will work.

Then define some files to be managed by `git-jam`.

    git jam filter "*.png"
    git jam filter "*.jpg"
    git jam filter "SomeHugeVideo.mp4"

>These commands will create entries in your `.gitattributes` file. If this file is committed, then you won't have to add those filters again the next time you clone your repo.

>**Don't forget to use double quotes around your pattern : it will be matched otherwise.**

You can now configure your backend.

### Setting a configuration key-value pair.

There are two places for configuration in git-jam.

 1. the `.jamconfig` file
 2. the repository config file.

> Everything you save in the `.jamconfig` file can be committed so that every clone automatically inherits these values. The values you set in your git config files will remain on your local clone.

To save a value to the `.jamconfig` file, use the -g option:

    git jam config -g <param> <value>

To save a value to the normal git config, use:

    git jam config <param> <value>.

> If a key exists in both the `.jamconfig` file and in the local git config, local git config will be preferred. That way you can locally override options in `.jamconfig`.

### SFTP
Currently, this is the default backend for `git-jam`.

The SFTP backend needs 3 inputs in order to work.
* Your ssh user name;
* The host on which your jam files will be saved *Ex : myexamplehost.com*
* The path to a jam directory (that you have setup on your host): *Ex : /share/DATA/GitJam/MyProject*
* Optionally, your ssh password.

> If you have a configured ssh keypair under $HOME/.ssh/, you can skip the password. Otherwise, you will have to save your password in a config file, which I **strongly advise not to do**.

You can setup those values that way:

    git jam config -g sftp.host "myexamplehost.com"
    git jam config -g sftp.path "/share/DATA/GitJam/MyProject"

    //If your sftp *host* is under Windows. Linux is supported by default.
    git jam config -g sftp.system "win32"

    git jam config sftp.user "j.tiesselune"
    git jam config sftp.password "******"

If you don't provide your password (*and you really should not*), your ssh keypair will be used (`id_rsa` & `id_rsa.pub`).

> The `-g` option is optional. Usually, the host and path are the same for every user of your repo, so you should probably use it for that. But you probably don't want everyone in your team sharing your username.

> **Under Windows**, Mysysgit might transform your path to `C:\\something` which obviously won't work on linux remote hosts. You can always change it directly in the `.jamconfig` file.

### Amazon S3

The **Amazon S3** backend can be enabled by running

    git jam config backend s3

in a `git-jam` enabled git repository.

You'll have to configure 5 variables in order for it to work.

    git jam config s3.AccessKeyID <someKey> //with your access key ID from AWS IAM.
    git jam config s3.SecretAccessKey <someKey> //with your secret key from AWS IAM
    git jam config -g s3.Region <bucket region> // with the region of an existing bucket
    git jam config -g s3.Bucket <bucket name> // With an existing S3 bucket name
    git jam config -g s3.Path <path inside bucket> // A path if you want to target a specific directory in the bucket.

### Jam file workflow

Once you defined your filters, you can add your files to the index the way you would do it normally:

    git add somefile.png
    git commit -m "My commit"

There are two ways of synchronizing files with your backend:

    1. Manual push and pull
    2. Git-hooks

#### Manual push and pull

In order to have your files synchonised with your backend, you must invoke

    git jam push

When you checkout a branch, all filtered files will be text reprensentations of your files. Use

    git jam pull

to fetch and replace them with their actual content.

#### Git hooks.

Git provides `pre-push`, `post-checkout` and `post-merge` hooks to invoke custom operations.

`git-jam` comes with a simple way to setup those hooks to automatically invoke `git jam push` and `git-jam pull` on those operations.

Just run

    git-jam setup-hooks

in your repository's folder and those hooks will be installed, automatically invoking `git-jam push` and `git-jam pull` on your behalf when doing push, pull and checkout operations in git.


## Using `git-jam` in `gitolite`

[`gitolite`](http://gitolite.com/gitolite/index.html) is a popular server backend for git, as it provides fairly easy setup and good flexibility. It is not very hard to setup `gitolite` to use `git-jam`. Here is how:

By default `gitolite` does not support sftp, which `git-jam` uses to move the binary files to and from the server. To add sftp support to gitolite you need to do the following things.

1. In your .gitolite.rc under the ENABLE section is a COMMANDS block. Add 'sftp-server' to it (don't forget the comma):


```
ENABLE => [

    # COMMANDS

        # These are the commands enabled by default
        'help',
        'desc',
        'info',
        'perms',
        'writable',

	'lock',

	# Used by git-jam
	'sftp-server',
```

1. Find the commented out value for `LOCAL_CODE` and enable it for `$ENV{HOME}/local`:

```
    # suggested locations for site-local gitolite code (see cust.html)

        # this one is managed directly on the server
        LOCAL_CODE                =>  "$ENV{HOME}/local",

```

1. Create the actual command executable. In your `gitolite3` home directory create a subdirectory `local` with a subdirectory `commands`. In there create a link to the OpenSSH `sftp-server` executable, probably something like this:

`ln -sf /usr/libexec/openssh/sftp-server local/commands/sftp-server`

1. Unfortunately the way OpenSSH handles sftp and the way gitolite expects local commands don't work well together. To make it work it is necessary to change the OpenSSH configuration. In your `/etc/ssh/sshd_config` change the `Subsystem sftp /usr/libexec/openssh/sftp-server` line to 

`Subsystem	sftp	sftp-server`

The problem with this is that it disables `sftp` support for other users. If that is important you will have to add the `/usr/libexec/openssh` path to the user's `PATH`.

**Warning!** Every change to `sshd_config` can have security consequences! Don't use this on a server where you have to worry about your users trying to do bad things, or on a public facing server if you're not sure what it does!

1. Copy the gitolite SSH key to `${HOME}/.ssh/id_rsa` for git-jam to pick it up correctly.

That should be it. Enjoy!


## What about other storage options?

Other storage options are to be considered, but are not my priority for the time being. Rsync should be fairly easy to implement, for instance, to have a fully git-fat compatible repository.

If you want to implement your own, you'd have to create a new node module in `modules/Backends`, exposing 2 functions :

    exports.PushFiles(<string> jamPath, <string array> digests)
    exports.PullFiles(<string> jamPath, <string array> digests)

 * PushFiles must save the files (enumerated in the `digest` array) found under the `jamPath` directory to a remote location and return a promise to an array of the digests that could not be pushed.
 * PullFiles must get the files (enumerated in the `digest` array) from the remote location and save them under the `jamPath` directory and return a promise to an array of the digests that could not be pulled.

Then, just set your config to the name of your backend using `git jam config`.

### Example

Let's say you want a rsync backend.

 1. Create a `rsync.js` module in `modules/Backends`
 2. Implement PushFiles and PullFiles functions
 3. Execute `git jam config backend rsync`
 4. Enjoy.
 5. Feel free to submit a pull request with your awesome backend.

> Inside the PullFiles and PushFiles functions, you can use the jam config to configure your rsync backend. To access a jam config value, use `require('../gitUtils.js').jamConfig(key)`.

## License

`git-jam` is licensed under the MIT license.

git-jam
=======

Yet another binary manager for git, largely inspired by git-fat, but aimed at being more cross-platform

##TL;DR

    //Installation
    git clone https://github.com/tiesselune/git-jam.git
    cd git-jam
    sudo npm install -g

    //Configuration
    git jam init
    git jam filter "*.png"
    git jam config -g sftp.host myexamplehost.com
    git jam config -g sftp.path /share/DATA/GitJam/MyProject
    git jam config sftp.user j.tiesselune
    git jam config sftp.password ******

    //Usage
    git add somefile.png
    git commit -m "Some commit message"
    git jam push

    git checkout someOtherBranch
    git jam pull



##Why git-jam?

`git-jam` is aimed at giving an alternative to [git-fat](https://github.com/jedbrown/git-fat), but using the same mechanics.

The main problems I encountered in `git-fat` (although it's a great tool) are:

 * Windows use. Configuration of `git-fat` under windows has proven being a lot of sweat, especially when installing the system to more and more computers
 * Rsync. Though rsync is great, we had to install cygwin to use it under windows when a simple SCP would have suited our needs.
 * Speed. Some things are being merged into `git-fat` to increase its speed and usability. But as our project grew, `git fat` operations grew slower and slower.

##What's new?

**The first concern** is cross-platform compatibility to ease configuration under windows and remove cygwin as a dependency (which forced to have two environments set up, one for use with windows GUI versionning tools and the other being rsync-enabled cygwin environment). Especially when cygwin and windows versions of git had to be set up differently.

For that purpose, I've chosen to develop it with **Javascript and Node.js**, as it has become a cross-plaform guarantee for scripts and CLI tools.

Rsync won't be a dependency anymore, as I have chosen to copy files directly via SSH and track changes with a file-based system.

##Installing

###By cloning

Clone the project:

    git clone https://github.com/tiesselune/git-jam.git

Then install it using npm:

    cd git-jam
    sudo npm install -g

##Usage

> **Important Note : Under windows**, in the git bash environment, `git-jam` can't be invoked in the command-line using `git jam`. Until [this pull request](https://github.com/ForbesLindesay/cmd-shim/pull/4) is merged into `cmd-shim` used by npm, the dash in `git-jam` is mandatory to invoke `git-jam` commands.

###Configuration
To enable git-jam, inside a git repo, run :

    git jam init

> It does not matter whether you cloned your git repository from an existing git-jam enabled repo or just created a new one. You should call `git jam init` each time you clone a repo for which you wish git jam will work.

Then define some files to be managed by `git-jam`.

    git jam filter "*.png"
    git jam filter "*.jpg"
    git jam filter "SomeHugeVideo.mp4"

>These commands will create entries in your `.gitattributes` file. If this file is committed, then you won't have to add those filters again the next time you clone your repo.

>**Don't forget to use double quotes around your pattern : it will be matched otherwise.**

You can now configure your backend.

###Setting a configuration key-value pair.

There are two places for configuration in git-jam.

 1. the `.jamconfig` file
 2. the repository config file.

> Everything you save in the `.jamconfig` file can be committed so that every clone automatically inherits these values. The values you set in your git config files will remain on your local clone.

To save a value to the `.jamconfig` file, use the -g option:

    git jam config -g <param> <value>

To save a value to the normal git config, use:

    git jam config <param> <value>.

> If a key exists in both the `.jamconfig` file and in the local git config, local git config will be preferred. That way you can locally override options in `.jamconfig`.

###SFTP
The SFTP backend needs 3 inputs in order to work.
* Your ssh user name;
* The host on which your jam files will be saved *Ex : myexamplehost.com*
* The path to a jam directory (that you have setup on your host): *Ex : /share/DATA/GitJam/MyProject*
* Optionally, your ssh password.

> If you have a configured ssh keypair under $HOME/.ssh/, you can skip the password. Otherwise, you will have to save your password in a config file, which I **strongly advise not to do**.

You can setup those values that way:

    git jam config -g sftp.host myexamplehost.com
    git jam config -g sftp.path /share/DATA/GitJam/MyProject
    git jam config sftp.user j.tiesselune
    git jam config sftp.password ******

If you don't provide your password (*and you really should not*), your ssh keypair will be used (`id_rsa` & `id_rsa.pub`).

> The `-g` option is optional. Usually, the host and path are the same for every user of your repo, so you should probably use it for that. But you probably don't want everyone in your team sharing your username.

###Jam file workflow

Once you defined your filters, you can add your files to the index the way you would do it normally:

    git add somefile.png
    git commit -m "My commit"

But in order to have your files synchonised with your backend, you must invoke

    git jam push

When you checkout a branch, all filtered files will be text reprensentations of your files. Use

    git jam pull

to fetch and replace them with their actual content.

##What about other storage options?

Other storage options are to be considered, but are not my priority for the time being. Rsync should be fairly easy to implement, for instance, to have a fully git-fat compatible repository.

If you want to implement your own, you'd have to create a new node module in `modules/Backends`, exposing 2 functions :

    exports.PushFiles(<string> jamPath, <string array> digests)
    exports.PullFiles(<string> jamPath, <string array> digests)

 * PushFiles must save the files (enumerated in the `digest` array) found under the `jamPath` directory to a remote location and return a promise to an array of the digests that could not be pushed.
 * PullFiles must get the files (enumerated in the `digest` array) from the remote location and save them under the `jamPath` directory and return a promise to an array of the digests that could not be pulled.

Then, just set your config to the name of your backend using `git jam config`.

###Example

Let's say you want a rsync backend.

 1. Create a `rsync.js` module in `modules/Backends`
 2. Implement PushFiles and PullFiles functions
 3. Execute `git jam config backend rsync`
 4. Enjoy.
 5. Feel free to submit a pull request with your awesome backend.

> Inside the PullFiles and PushFiles functions, you can use the jam config to configure your rsync backend. To access a jam config value, use `require('../gitUtils.js').jamConfig(key)`.

##License

`git-jam` is licensed under the MIT license.

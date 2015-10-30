git-jam
=======
<div style="text-align:center"><img src ="./git-jam.svg" /></div>
___
Yet another binary manager for git, largely inspired by git-fat, but aimed at being more cross-platform



## TL;DR

    //Installation
    git clone https://github.com/tiesselune/git-jam.git
    cd git-jam
    sudo npm install -g

    //Configuration
    git jam init
    git jam filter "*.png"

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

**These should be handled when initializing `git-jam`. If you want to manually handle git-jam's configuration, you can refer to this guide :**

There are two places for configuration in git-jam.

 1. the `.jamconfig` file
 2. the repository config file.

> Everything you save in the `.jamconfig` file can be committed so that every clone automatically inherits these values. The values you set in your git config files will remain on your local clone.

To save a value to the `.jamconfig` file, use the -g option:

    git jam config -g <param> <value>

To save a value to the normal git config, use:

    git jam config <param> <value>.

> If a key exists in both the `.jamconfig` file and in the local git config, local git config will be preferred. That way you can locally override options in `.jamconfig`.

### Backends :

The main goal `git-jam` is to handle binary or large files out of the git tree.
Versions of these files should still be saved somewhere. To be more flexible than `git-fat`, `git-jam` allows different backend solutions:

Currently, those backends are supported:

   1. SFTP (FTP through SSH, available wherever SSH exists)
   2. Amazon S3.

Interactive configuration of those backends should happen when running

    git jam init

### Jam file workflow

Once you defined your filters, you can add your files to the index the way you would do it normally:

    git add somefile.png
    git commit -m "My commit"

There are two ways of synchronizing files with your backend:

    1. Git-hooks
    1. Manual push and pull

#### Manual push and pull

In order to have your files synchronised with your backend, you must invoke

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

* In your `.gitolite.rc` under the `ENABLE` section is a `COMMANDS` block. Add `'sftp-server',` to it (don't forget the comma):


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

* Find the commented out value for `LOCAL_CODE` and enable it for `$ENV{HOME}/local`:

```
    # suggested locations for site-local gitolite code (see cust.html)

        # this one is managed directly on the server
        LOCAL_CODE                =>  "$ENV{HOME}/local",

```

* Create the actual command executable. In your `gitolite3` home directory create a subdirectory `local` with a subdirectory `commands`. In there create a link to the OpenSSH `sftp-server` executable, probably something like this:

`ln -sf /usr/libexec/openssh/sftp-server local/commands/sftp-server`

* Unfortunately the way OpenSSH handles sftp and the way gitolite expects local commands don't work well together. To make it work it is necessary to change the OpenSSH configuration. In your `/etc/ssh/sshd_config` change the `Subsystem sftp /usr/libexec/openssh/sftp-server` line to

`Subsystem	sftp	sftp-server`

The problem with this is that it disables `sftp` support for other users. If that is important you will have to add the `/usr/libexec/openssh` path to the user's `PATH`.

**Warning!** Every change to `sshd_config` can have security consequences! Don't use this on a server where you have to worry about your users trying to do bad things, or on a public facing server if you're not sure what it does!

* Copy the `gitolite` SSH key to `${HOME}/.ssh/id_rsa` for `git-jam` to pick it up correctly.

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

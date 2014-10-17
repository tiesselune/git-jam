git-fat
=======

Yet another binary manager for git, largely inspired by git-fat, but aimed at being more cross-platform

##Why git-jam?

`git-jam` is aimed at giving an alternative to [git-fat](https://github.com/jedbrown/git-fat), but using the same mechanics.

The main problems I encountered in `git-fat` (although it's a great tool) are:

 * Windows use. Configuration of `git-fat` under windows has proven being a lot of sweat, especially when installing the system to more and more computers
 * Rsync. Though rsync is great, we noticed `git fat` operations being slower and slower as the project grew.

##What's new?

**The first concern** is cross-platform compatibility to ease configuration under windows and remove cygwin as a dependency (which forced to have two environments set up, one for use with windows GUI versionning tools and the other being rsync-enabled cygwin environment). Especially when cygwin and windows versions of git had to be set up differently.

For that purpose, I've chosen to develop it with **Javascript and Node.js**, as it has become a cross-plaform guarantee for scripts and CLI tools.

Rsync won't be a dependency anymore, as I have chosen to copy files directly via SSH and track changes with a file-based system.

##What about other storage options?

Other storage options are to be considered, but are not my priority for the time being. Rsync should be fairly easy to implement, for instance, to have a fully git-fat compatible repository.

##License

`git-jam` is licensed under the MIT license.
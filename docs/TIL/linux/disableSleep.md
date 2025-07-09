# How to disable sleep/hibernate on Ubuntu systems

I had an issue where I set up a computer with Ubuntu 24.04, but it was disconnecting from wifi after a few hours.

The solution was evident, but took me some times to understand : The desktop (made for desktop usage, and just abandonned as a server) was going to sleep after some times and turned off wifi at that moment.

## How to prevent system from going to sleep

Please update to your needs, but I disabled everything (since it's a server, I don't want it to sleep nor save energy somehow) : 

```
$ sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
[sudo] password for tired-server:
Created symlink /etc/systemd/system/sleep.target → /dev/null.
Created symlink /etc/systemd/system/suspend.target → /dev/null.
Created symlink /etc/systemd/system/hibernate.target → /dev/null.
Created symlink /etc/systemd/system/hybrid-sleep.target → /dev/null.
```

If you want to revert this, just needs to `unmask` those targets : 

```
sudo systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

## Links 
- https://unix.stackexchange.com/a/329081


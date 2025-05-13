# How to disable lid trigger on ubuntu

## Context

It's bothering to keep a laptop-server opened just to not put the server to sleep...

## How to 


For 13.10 - 24.04:

To disable Ubuntu doing anything closing the laptop lid:

- Open the `/etc/systemd/logind.conf` file in a text editor as root
```
sudo nano /etc/systemd/logind.conf
```

- Uncomment (if line starts with `#`) and change `HandleLidSwitch` to `ignore` (can be `{lock,ignore,poweroff,hibernate}`)
```
HandleLidSwitch=ignore
```

- Restart the systemd daemon (be aware that this will log you off) with this command:
```
sudo systemctl restart systemd-logind
```

## Ref
- https://askubuntu.com/a/372616
- https://ubuntuhandbook.org/index.php/2020/05/lid-close-behavior-ubuntu-20-04/


# How to blank the screen of a headless Linux server

## Context

This setup allow to disable (blank the console) any connected screen to a headless linux server.

This can be a desirable behavior while converting a laptop into a headless server and avoid burning the display or have too much light coming from it.

---

## How To

You can configure it within GRUB as part of the default command line.

To do so, open grub :

```sh
sudo nano /etc/default/grub
```
and edit `GRUB_CMDLINE_LINUX_DEFAULT` by adding `consoleblank=300` at the end of the arguments.

> NOTE
> The `300` in the example is the duration (in second) before the screen effectively blank. I prefer to give myself 5 minutes before it blanks, so I set 60 * 5 = `300`

Once you set this parameter, you need to regenerate grub and it will work on the next boot of your device.

```sh
sudo update-grub
```

---

## Ref

- https://askubuntu.com/a/1351633

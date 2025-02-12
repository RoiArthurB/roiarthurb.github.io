# How to not upgrade a package while using APT

## Context 

This can be a desirable behavior (in some very particular cases). Note here that I do not recommend this in general.

However, in my case, it's been a need as the [rmtfs](https://github.com/linux-msm/rmtfs) package was crashing my [mobian](https://mobian.org) little server.

---

## How To

APT has a built-in way to _hold_ a package and not update it further : 

```sh
sudo apt-mark hold <packageName>
``` 

Giving this : 

```sh
$ sudo apt-mark hold rmtfs
rmtfs set on hold.
```

---

## Ref

- https://www.cyberciti.biz/faq/apt-get-hold-back-packages-command/
- https://manpages.ubuntu.com/manpages/bionic/man8/apt-mark.8.html#prevent%20changes%20for%20a%20package
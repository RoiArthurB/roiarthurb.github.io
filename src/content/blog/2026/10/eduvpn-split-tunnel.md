---
title: 'Making a split tunnel out of eduVPN for mail and intranet only'
description: "My institute wants me on a VPN to send mail, but I made that VPN carry only my mails and nothing more."
#startDate: '2026-10-19'
pubDate: '2026-10-21'
toc: true
tags:
  - linux
  - network
  - wireguard
  - networkmanager
  - vpn
publish: true
---

My institute (IRD) was hacked recently and is strengthening its security by requiring all users to use a VPN. As a result, I can only send mail from Thunderbird on my professional laptop when I'm connected to its [eduVPN](https://www.eduvpn.org/) (an institutional VPN solution). The problem: I'm working in Vietnam and the VPN is hosted in France. I don't want my whole laptop behind that VPN for the sake of one SMTP server (a ping to `1.1.1.1` went from around *37 ms* to around *330 ms* on the VPN).

<figure>
    <img src="/images/eduvpn-split-tunnel-eduVPN-logo.webp" alt="eduVPN Logo" />
    <figcaption>eduVPN Logo</figcaption>
</figure>


I tweaked and tried a lot of things, and ended up letting the official client connect, then using a NetworkManager dispatcher script to remove the VPN's catch-all rule and re-enable the tunnel only for the few destinations that really need it (such as the mail server).

Here is the path in order, dead ends included, so you can skip the ones I fell into. If you're on Linux with [*NetworkManager*](https://en.wikipedia.org/wiki/NetworkManager) and a [*WireGuard*](https://en.wikipedia.org/wiki/WireGuard) VPN that grabs your whole default route, this should help even if you're not using eduVPN.

## The setup

- A Linux laptop on Wi-Fi (`wlan0`).
  - This article should apply to any distro, but I'm running [EndeavourOS](https://endeavouros.com/) (Arch Linux based) with NetworkManager `v1.58.1`.
- The official [eduVPN](https://www.eduvpn.org/) Linux client. You open the app, log in through the browser with SSO, and it hands a _WireGuard_ connection named `eduVPN` to NetworkManager.
  - The client creates a new 12-hour session every time I connect.
  - More on this below.

My goal is to keep my work's VPN active all the time, but only send the needed traffic (mail, intranet, etc.) through it. The solution needs to be as robust and low-maintenance as possible (zero maintenance would be even better). A set-and-forget setup would be perfect 😇

> [!NOTE]
> Four terms I'll use a lot:
> - **Split tunnel**: only some of my traffic goes through the VPN, the rest uses the normal connection (i.e. not the VPN) ([Wikipedia](https://en.wikipedia.org/wiki/Split_tunneling)).
> - **Dispatcher script**: an executable file in `/etc/NetworkManager/dispatcher.d/` that NetworkManager runs on network events (*interface up*, *interface down*...). It receives the interface name and the event as arguments.
> - **Policy routing** (`ip rule`): a list of rules, checked in order, that choose *which routing table* a packet uses (you'll understand it in the article) ([Wikipedia](https://en.wikipedia.org/wiki/Policy-based_routing)).
> - **Handshake**: the WireGuard packet exchange between your VPN client and the server. If `wg show` says nothing about a "latest handshake", the server never answered you.

## Idea 1: containerize the VPN and proxy Thunderbird

My first idea: run the VPN in a container (with [gluetun](https://github.com/qdm12/gluetun) or similar), expose a SOCKS5 proxy, and point Thunderbird at it. I'm fine with 1 s of latency on my whole inbox.

To do so, gluetun wants a WireGuard or OpenVPN config file, and eduVPN doesn't give a clean config through the client. Also, it's hard to run eduVPN directly in a headless container, as it needs a browser to log in.

### Let's steal a WireGuard config

Looking more closely at what eduVPN is doing, I see that the connection is a WireGuard (lightweight VPN protocol) connection.

More precisely, the client validates my institute's SSO login and hands its connection (i.e. a WireGuard configuration) to NetworkManager, so the config is in there somewhere[^1]. Let's inspect this new connection with NetworkManager's utility `nmcli`. By default, `nmcli` hides the private key (`wireguard.private-key: <hidden>`), which is needed to rebuild a config file, but not if you ask nicely:

```bash
sudo nmcli --show-secrets -g wireguard.private-key connection show eduVPN
```

There, I got everything and rebuilt an `eduvpn0.conf` by hand with one nice twist: `AllowedIPs` set to the mail server's IP only, instead of the default wildcard (`0.0.0.0/0`). That makes it a *split tunnel* by itself: only the mail server goes through the VPN and not the rest of my traffic, and it would even remove the need for Docker. I brought it up with the client disconnected:

```bash
$ sudo wg show
interface: eduvpn0
  listening port: 47821

peer: <server-key>
  endpoint: <endpoint>:51820
  allowed ips: <mail-ip>/32
  transfer: 0 B received, 1.45 KiB sent
  persistent keepalive: every 25 seconds

$ ip route get <mail-ip>
<mail-ip> dev eduvpn0 src <tunnel-ip> uid 1000
```
> [!TIP]
> `eduvpn0.conf` is my rebuilt WireGuard configuration file.
>
> WireGuard creates a new interface named after the configuration file (here `eduvpn0`), as visible in the log above.

The route was right. But look at the transfer line: *0 B received*, and no `latest handshake` line at all. My config isn't connecting.

The reason showed up when I compared my notes: every time I connect and disconnect with the eduVPN client, I get a different public/private key. My explanation (I haven't verified it server-side) is that each session registers a fresh peer, and the old key is dead as soon as the client disconnects (probably both for GDPR reasons, to avoid identifying users, and to keep the pool of VPN IPs rolling). So we can't steal a WireGuard config file. 😥

## Idea 2: let the client connect, then cut the catch-all rule

<figure>
    <img src="/images/eduvpn-split-tunnel-eduVPN-client.webp" alt="eduVPN client connected to my institute" />
    <figcaption>eduVPN client connected to my institute</figcaption>
</figure>

If I can't have my own config, I can still tweak my laptop: I'll use the client's connection and change its routing afterwards. How does the client send everything into the tunnel? By having NetworkManager set up the appropriate policy rules:

```bash
$ ip rule show
0:      from all lookup local
1:      from all to <tunnel-ip>/21 lookup 51860 suppress_prefixlength 0 proto static
2:      from all to <not-sure-ip>/8 lookup main suppress_prefixlength 0 proto static
2:      from all to <netbird-ip>/12 lookup main suppress_prefixlength 0 proto static
2:      from all to <laptop-ip>/16 lookup main suppress_prefixlength 0 proto static
3:      not from all fwmark 0xca94 lookup 51860 proto static
105:    from all lookup main suppress_prefixlength 0
110:    not from all fwmark 0x1bd00 lookup 7120
32766:  from all lookup main
32767:  from all lookup default
```

In words: the rule at priority 3 sends everything through routing table `51860`, whose default route is the tunnel. The WireGuard packets themselves carry a mark (`0xca94`[^2]) that lets them skip the rule and reach the server through the normal network. Delete the rule, and the catch-all is gone. Then add back a route for what I actually want:

```bash
sudo ip rule del priority 3     # Removing IPv4 catch-all rule
sudo ip -6 rule del priority 3  # Removing IPv6 catch-all rule
sudo ip route replace <mail-ip>/32 dev eduVPN # Adding mail server IP to use eduVPN interface
```

Testing:

```bash
$ ip route get 1.1.1.1
1.1.1.1 via <gateway> dev wlan0 src <laptop-ip> uid 1000
$ ip route get <mail-ip>
<mail-ip> dev eduVPN src <tunnel-ip> uid 1000
$ sudo wg show eduVPN
...
  latest handshake: 17 seconds ago
  transfer: 6.70 KiB received, 9.16 KiB sent
```

The internet goes out through Wi-Fi, the mail server goes through the tunnel, and the handshake is fresh. Routing solved. Then I tried to resolve the mail server's name, and nothing: I couldn't resolve my work's webmail anymore.

### It was DNS

The VPN profile pushes a search domain `~.`, which in resolver language means "send *every* lookup to the VPN's DNS servers". Those servers are only reachable through the tunnel, and I had just removed the tunnel from the picture. Every lookup timed out.

My attempts, in order, all of them wrong:

1. `resolvectl revert eduVPN`: `Failed to revert interface configuration: ... unknown unit`. No `systemd-resolved`[^3] on this machine.
2. `nmcli connection modify eduVPN ipv4.dns-search ...`: worked once, then everything reset at the next connect. The journal explains it: the client *deletes and recreates* the NetworkManager connection every time (`connection-delete`), so edits to the profile never survive.
  - This could be a good solution, but I don't want to run that command by hand every time, so I'm rejecting it.
3. The same `nmcli` commands from inside the dispatcher script didn't work either, for some reason.

The actual culprit, much later: on this laptop `/etc/resolv.conf` isn't owned by NetworkManager at all. [NetBird](https://netbird.io/), my mesh VPN ([I talked about it here](/blog/2026/08/headscale-to-netbird-benchmark/)), rewrites it. So two systems were fighting over one file, which is probably why my NetworkManager edits kept making things worse.

Long story short, DNS configuration is hard. The fix I went for is to resolve the name at connect time. There's a good window for it: right after the VPN comes up, the catch-all rule is still in place, so the VPN's DNS is reachable and answers. Resolve first, *then* delete the rule, then add the routes. And since eduVPN ends my session every 12 hours anyway, resolving once per connection is fresh enough (I could even build a proper caching system with a caching DNS resolver like [unbound](https://en.wikipedia.org/wiki/Unbound_(DNS_server))... but that's overkill).

### More than one host: routing the institute's block

Mail works. But I also wanted to reach a couple of institute web services that seem to care where the traffic comes from. Adding hosts by name works (with a simple `HOSTS="a b c"` list), but the list only grows, and a wildcard like `*.ird.fr` can't work: the script routes *IP addresses*, and DNS has no way to list every host under a domain.

What does work is routing a whole IP block. `whois` on one of the institute's addresses:

```txt
$ whois <ird-address> | grep -iE 'inetnum|netname|route|descr'
inetnum:        91.203.32.0 - 91.203.35.255
netname:        IRD-NET
```

`91.203.32.0` to `91.203.35.255` is exactly `91.203.32.0/22`. One route, a thousand addresses.

There's a trap, though, and it's a good one: **the VPN server's own endpoint sits inside that block.** If I route the whole `/22` into `eduVPN`, the WireGuard packets to the server get sent into the tunnel itself, and the tunnel dies in a loop. The client's packets skip the *catch-all rule* thanks to their mark, but they still follow the *main routing table*, which now says "this /22 goes into the tunnel". So the script has to pin the endpoint to the real gateway first.

## Where it landed

The final `/etc/NetworkManager/dispatcher.d/90-eduvpn-split`, with my private values replaced by placeholders:

```sh
#!/bin/sh
# root:root, chmod 755. Don't forget this part.
[ "$1" = "eduVPN" ] && [ "$2" = "up" ] || exit 0

HOSTS="mail.ird.fr intra.ird.fr"    # hosted at Renater and elsewhere, resolved by name every time
NETS="91.203.32.0/22"               # IRD-NET, routed as a whole
VPN_DNS="<vpn-dns-1> <vpn-dns-2>"   # the DNS servers pushed by the VPN profile
DNS1=${VPN_DNS%% *}

{ # 0. Save and date the logs
  echo "== $(date '+%F %T') eduVPN up"

  # 1. Resolve via the VPN DNS while the tunnel still carries everything
  IPS4=""; IPS6=""
  for h in $HOSTS; do
    IPS4="$IPS4 $(dig +short +time=2 +tries=1 @"$DNS1" "$h" A    | grep -E '^[0-9.]+$')"
    IPS6="$IPS6 $(dig +short +time=2 +tries=1 @"$DNS1" "$h" AAAA | grep -E '^[0-9a-f:]+$')"
  done

  # 2. Pin the WireGuard endpoint to the real gateway (it sits inside IRD-NET)
  EP=$(wg show eduVPN endpoints | awk '{print $2}' | cut -d: -f1)
  if [ -n "$EP" ]; then
    R=$(ip route get "$EP" mark 0xca94 | head -1 | sed -E 's/ (src|uid) .*//; s/^[0-9.]+ //')
    ip route replace "$EP/32" $R
    echo "endpoint $EP pinned: $R"
  else
    echo "no endpoint found, skipping NETS to avoid a routing loop"
    NETS=""
  fi

  # 3. Drop the catch-all rules
  ip rule del priority 3
  ip -6 rule del priority 3

  # 4. Only these destinations use the tunnel
  for s in $VPN_DNS; do ip route replace "$s/32" dev eduVPN; done
  for n in $NETS;    do ip route replace "$n" dev eduVPN; done
  for a in $IPS4;    do ip route replace "$a/32" dev eduVPN; done
  for a in $IPS6;    do ip -6 route replace "$a/128" dev eduVPN; done

  echo "routed via eduVPN: $VPN_DNS $NETS $IPS4 $IPS6"
} >> /tmp/eduvpn-split.log 2>&1
```

What each step does:

| Step | What | Why |
|---|---|---|
| 1 | Resolve `HOSTS` through the VPN's DNS | The tunnel still carries everything at this point, so that DNS answers. Nothing hard-coded: if the mail server's IP changes, the next connection picks it up. |
| 2 | Pin the endpoint to the normal gateway | Avoids the routing loop described above. If no endpoint is found, the script skips the big route instead of risking it. |
| 3 | Delete the catch-all `ip rule`, IPv4 and IPv6 | This is what turns "full tunnel" into "split tunnel". |
| 4 | Add routes for the VPN DNS, the block and the resolved hosts | Keeps the DNS servers pushed by the profile reachable, so a resolver still pointing at them doesn't time out. |

> [!TIP]
> The dispatcher file needs to be (1) a script (in our case a shell script, `#!/bin/sh`), and (2) executable. It sounds obvious, but I forgot it a lot and complained that nothing was working 😅
>
> So don't be me, and don't forget to run:
> ```bash
> sudo chmod 755 /etc/NetworkManager/dispatcher.d/90-eduvpn-split
> ```

The check after connecting:

```bash
$ cat /tmp/eduvpn-split.log
== 2026-10-20 14:31:12 eduVPN up
endpoint <endpoint> pinned: via <gateway> dev wlan0
routed via eduVPN: <vpn-dns-1> <vpn-dns-2> 91.203.32.0/22  <mail-ip>
== 2026-10-21 10:32:00 eduVPN up
endpoint <endpoint> pinned: via <gateway> dev wlan0
routed via eduVPN: <vpn-dns-1> <vpn-dns-2> 91.203.32.0/22  <mail-ip> <internal-host-ip>

$ ip route get <ird-address>
<ird-address> dev eduVPN src <tunnel-ip> uid 1000
$ ip route get <endpoint>
<endpoint> via <gateway> dev wlan0 src <laptop-ip> uid 1000
$ sudo wg show eduVPN | grep handshake
  latest handshake: 20 seconds ago
```

Two connections, two runs of the script, and the handshake keeps refreshing, so no loop. The script also runs automatically every time I enable the VPN, so there's no manual task (other than starting the VPN and reconnecting every 12 hours). And I can now send email from Thunderbird without having my whole network travel around the planet.

<!-- --- -->

[^1]: I'm a *H4cK3r*, so I'll do most of the things in the terminal.
[^2]: `0xca94` is `51860` in hexadecimal, the same number as the routing table.
[^3]: EndeavourOS uses `systemd-resolvconf` instead.

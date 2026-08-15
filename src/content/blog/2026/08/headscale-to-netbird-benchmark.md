---
title: 'I benchmarked Headscale against NetBird, then migrated'
description: "Two mesh VPNs, one Viettel CGNAT line, and the four measurements that moved my homelab off Headscale."
#startDate: '2026-08-13'
pubDate: '2026-08-14'
toc: true
tags:
  - linux
  - server
  - mesh-network
publish: true
---

My homelab is not in one place. Some boxes run in my apartment in Hanoi, others at my parents' house in France, plus a few VPSs. Most machines sit behind routers I do not administer, and my laptop and phone move around with me. Reaching any of it from anywhere else used to mean port forwarding, or publishing a service to the open internet behind a login form and hoping for the best.

A mesh [Virtual Private Network](https://en.wikipedia.org/wiki/Virtual_private_network) (*mesh VPN* for short) solves that. Every machine gets a private address that belongs to it and an encrypted tunnel to every other machine, built peer-to-peer instead of routed through a central concentrator. `ssh my-server.internal` is the same command whether I type it from the living room or from a phone on 5G.

Modern mesh VPNs split into two halves. The control plane is a small server that knows every peer, distributes keys, and tells each machine how to reach the others. The connection between machines is generally [WireGuard](https://www.wireguard.com/) running straight between the peers, with the control server staying out of it. WireGuard is what made this class of tool practical: short keys, no session negotiation, and little enough overhead that the tunnel disappears into the noise.

<figure>
    <img src="/images/headscale-to-netbird-benchmark-netbird-front.webp" alt="Architecture of Netbird's mesh VPN" />
    <figcaption>Illustration of a mesh VPN layout. One central server coordinating direct connections between all the peers.<br/>Credits to <a href="https://netbird.io/" target="_blank">Netbird</a></figcaption>
</figure>

Peers cannot always reach each other, and homes behind carrier NAT often cannot. When the direct tunnel fails to come up, traffic falls back to a relay server that both sides can reach. Hold on to that word, because it decides most of this article.

I have been interested in this for a few years, and I started by testing various solutions: manual WireGuard configuration, [Nebula](https://nebula.defined.net/docs/) (Slack's take on the problem), and others. They mostly worked well, but they all wanted me to hand-manage every certificate and every host definition, which stopped fitting my needs as the node count grew. The most popular mesh VPN out there is [Tailscale](https://tailscale.com). However, as a European citizen and as of 2026, I would rather not hand the control plane of my private network to a ~~US~~ Canadian company[^6]. Especially when a FOSS reimplementation of that server exists, so I self-hosted [Headscale](https://headscale.net/) instead.

Headscale ran the whole thing for about a year and a half without drama. Two things wore me down.
- The first was the gap that comes with reimplementing someone else's control protocol. Among other things: [Tailnet Lock](https://github.com/juanfont/headscale/issues/1307) is still an open issue, the ACL support was rough at the time I needed it, and I never figured out how to get point-to-point working.
- The second was cost on small hardware: `tailscaled` sat in the top five processes on most of my servers, which is more than a mesh client should ask for when the mesh is idle[^4].

> [!NOTE]
> I didn't find many people complaining about any of that, so it might be a me problem rather than a common one. But on the first point especially, going past ten nodes kept Tailscale as one of the top processes on each of my machines.
>
> Can't say whether it was a Headscale problem, a Tailscale one, or something else entirely... Your mileage might vary 🙃

[NetBird](https://netbird.io/) works the same way underneath (coordination server, WireGuard, relay), but it has a different shape. First, the whole stack is FOSS, server and clients, which settles my first complaint. Then it comes with the batteries included: a nice integrated web interface instead of a config file and a CLI, straightforward access configuration, and more. The newer additions are what caught my attention: [a built-in reverse proxy](https://docs.netbird.io/manage/reverse-proxy), and [lazy peer connections](https://docs.netbird.io/manage/peers/lazy-connection), which settles my second complaint.

I still had one reason to stay put. Tailscale's global [DERP server network](https://tailscale.com/docs/reference/derp-servers) (a network of high-availability relay servers) is a real perk, especially from Vietnam where Viettel's [CGNAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT) pushes most of my traffic through relays. So I stood NetBird up alongside Headscale, ran both in parallel on my homelab, and measured.

## The rig

For these tests, I decided to use the widest range of machines I have running.

Two peers, both in Hanoi on Viettel connections in different parts of the city: an Intel NUC running [Debian](https://www.debian.org/) on x86_64, and a OnePlus 6 running [postmarketOS](https://postmarketos.org/)[^2] as a small ARM64 server. My trusty cheap [OVH](https://www.ovh.com/) [VPS](https://en.wikipedia.org/wiki/Virtual_private_server)[^1] in Singapore carries both control planes (Headscale and NetBird) during the parallel run, including NetBird's built-in relay. Tailscale's nearest DERP region for this path is Hong Kong.

<figure>
    <img src="/images/headscale-to-netbird-benchmark-architecture.webp" alt="Architecture of this series of tests" />
    <figcaption>Architecture of this series of tests.</figcaption>
</figure>

That topology is what makes this comparison interesting, at least to me. Published comparisons of these tools tend to run between well-connected servers on clean paths (VPS to VPS over fiber), where every difference listed below rounds to zero. Half of my test rig is a phone with Android scraped off it, sitting behind a residential line in a city with flaky internet connectivity.

I wanted four numbers out of the testing:
1. Whether either stack can build a direct tunnel at all;
1. How fast the link runs;
1. How much latency each overlay adds;
1. What each one costs while nothing is happening.

> [!NOTE]
> In this article I call my *Headscale* network *Tailscale* for the most part.
>
> The thing is, yes, I run the *Headscale* coordination server, but the clients are Tailscale's, the connections are relayed on Tailscale's servers, and at the end of the day none of my tests really involved Headscale code itself.

## Everything gets relayed with CGNAT

No suspense: neither stack builds a direct tunnel between these two peers, and neither one can.

Viettel puts my connections behind [Carrier-Grade NAT (CGNAT)](https://en.wikipedia.org/wiki/Carrier-grade_NAT), and at least one side of this pair gets symmetric mapping: the carrier assigns a fresh source port for every destination a peer talks to. The public address a peer discovers for itself is therefore useless to anybody else, and the hole-punching both meshes attempt has nothing to aim at.

Tailscale reached that conclusion on its own, which is what makes me believe it. Its NAT traversal is as good as this field gets, down to birthday-paradox port guessing against uncooperative carriers, and it still gave up and relayed. NetBird came to the same answer.

So every number below compares one relay against another: NetBird through my own VPS in Singapore 🇸🇬, Tailscale through DERP Hong Kong 🇭🇰, both connecting clients in Vietnam 🇻🇳. That is how my mesh runs every day, which makes it the comparison I care about.

## Throughput

`iperf3` pushes traffic between two hosts and reports what arrives at the far end. Thirty seconds of TCP over the relay path, in both directions:

| Path | Throughput |
|---|---|
| NetBird, relayed through my Singapore VPS | 10.8 Mbps |
| Tailscale, relayed through DERP Hong Kong | 6.15 Mbps |

NetBird looks like the winner, but two other things explain that gap. Geography comes first, since my own relay sits closer to both peers than Hong Kong does. The second is the OnePlus device: Tailscale ships userspace WireGuard while NetBird uses the Linux kernel module, and on a phone SoC that per-packet cost compounds across a thirty-second run. More on that below.

I ignored every UDP figure I got out of `iperf3 -u -b 0` on a relayed path[^3].

## Latency

Latency is the important day-to-day number I see. Throughput matters when I copy a backup once a month; latency matters every time I type into an SSH session or load a web UI running on another machine.

The main difference is the level the WireGuard tunnel runs at, kernel or userspace. Tailscale's client always runs `wireguard-go` in userspace, which buys them very wide compatibility from a single implementation but costs a trip out of the kernel and back for every packet. NetBird uses the kernel WireGuard module when Linux offers it, which means weaker compatibility and better native performance. The difference runs from tens to a couple hundred microseconds per packet, which sounds like nothing but adds up.

500 samples at 50 ms intervals, with a raw LAN baseline to anchor the two overlays:

```bash
ping -c 500 -i 0.05 nuc.local          # LAN, no overlay
ping -c 500 -i 0.05 nuc.ts.internal    # Tailscale
ping -c 500 -i 0.05 nuc.nb.internal    # NetBird
```

| Path | avg | overhead vs LAN |
|---|---|---|
| Raw LAN | 5.64 ms | |
| NetBird | 5.91 ms | +0.27 ms |
| Tailscale | 7.21 ms | +1.56 ms |
| NetBird (relayed) | 243.27 ms | +237.63 ms |
| Tailscale (relayed) | 257.32 ms | +251.68 ms |

500 samples is enough to erase most of the statistical noise (more won't tell you much), so the 1.3 ms gap between the two overlays is a real result. NetBird costs a quarter of a millisecond over raw LAN, about what kernel WireGuard encap and decap should cost. Tailscale's 1.56 ms is the userspace tax on this hardware. The relayed pair keeps the same ordering.

One detail I enjoyed: the LAN baseline's worst sample during those tests came in at 38.6 ms, higher than the maximum of either overlay on LAN. My WiFi throws bigger outliers than either mesh does 😅

## The idle cost, which I only half measured

Kernel WireGuard buys per-packet latency on a pair that is already talking. NetBird's lazy connections buy something else, and no ping test will show it.

Tailscale keeps every pair in the netmap alive, with keepalives and periodic handshake attempts running for peers a machine speaks to twice a month. On a homelab that peaked around ten nodes for me, most of that work exists for nothing. It never broke anything and it never cost me an outage, it just eats more resources than an idle mesh should ask for.

NetBird brings a tunnel up when traffic wants to flow and lets it drop afterwards. A peer I have not spoken to in a week sits in `Idle`, costs nothing while it waits, and pays a small setup penalty on the first packet I send it.

Putting a number on that needs `tailscaled` against `netbird` CPU time over an hour of silence. I forgot to measure the *Tailscale* side, and by then I had already settled on one solution... Sorry, not sorry 🤷

| Machine | NetBird's idle cost |
|---|---|
| Intel NUC, x86_64 | 15 CPU-s per hour, 0.42% of one core |
| OnePlus 6 linux, arm64 | 13.2 CPU-s per hour, 0.37% of one core |
| Raspberry Pi 4 | 41.7 CPU-s per hour, 1.16% of one core |

<figure>
    <img src="/images/headscale-to-netbird-benchmark-htop.webp" alt="Picture of Htop showing Netbird process far from the top 5" />
    <figcaption>Close to nothing on my NUC while streaming music and homelabbing.</figcaption>
</figure>

## The one column DERP wins

One result went the other way. Under a UDP flood, DERP degraded and survived where my own relay collapsed. DERP Hong Kong delivered 3.27 Mbps out of a 10 Mbps offer, dropped 67%, and stayed up, discarding the overflow and carrying on. On the NetBird path the receiver stopped getting bytes, the control socket died, and Docker restarted the container.

I did not chase it further. That test produces an artificial load I never generate: the heaviest real traffic on my mesh is Navidrome streaming, which sits well inside what the relay handles.

## Worth a weekend

| | Headscale + Tailscale client | NetBird |
|---|---|---|
| WireGuard implementation | userspace `wireguard-go` | kernel module |
| Latency added over raw LAN | +1.56 ms | +0.27 ms |
| Relay throughput | 6.15 Mbps (DERP Hong Kong) | 10.8 Mbps (my VPS) |
| Direct tunnel over Viettel CGNAT | never | never |
| Idle peers | whole netmap kept alive | brought up on demand |
| Under a UDP flood | degrades and survives | collapsed |
| Open source | client is Tailscale's, control plane reimplemented | FOSS end to end |
| Administration | config file and CLI | web interface |

I'll admit this comparison is not perfect, since Headscale supports a dedicated self-hosted DERP server (the same setup that won it for NetBird) and I forgot to measure plenty of other interesting things, as I wasn't planning to write an article about it at the time. But those metrics, on top of all the nicer quality of life in administrating my mesh, sold it to me.

Reconfiguring everything took me a weekend or so. I reinstalled the clients, rebuilt the access rules in a web interface instead of a JSON file, repointed the handful of services with old mesh addresses baked into their configs, and got site-to-site routing working in a way I understand.

*Bref*, my homelab now runs FOSS from client to control plane, comes with nice features, and moves packets faster and lighter on the hardware I own.

<!-- --- -->

[^1]: The old [*Starter VPS 2020*](https://us.ovhcloud.com/resources/blog/vps-2020/) offer, which doesn't exist anymore: 1 vCore, 2 GB of RAM and 20 GB of storage for a few euros per month. Honestly I don't know how it runs this well on those specs!
[^2]: Yes, a smartphone with Android scraped away and turned into a full server. Maybe an article about that one day. 🤷 Maybe.
[^3]: Uncapped UDP measures how fast the sender stuffs its own socket, not what crosses the network. On my relayed path the sender finished at 30.00 s while the receiver line spanned 52.60 s, still draining buffered packets 22 seconds after the sender stopped, at 99% loss. Cap the rate (`-b 10M`, then 15M, then 20M) and read the receiver's loss column instead.
[^4]: I didn't capture anything about it, so you'll have to trust me. But I recall a Raspberry Pi 4 taking up to 10% CPU for Tailscale. Not an insane number, but still too much for me.
[^6]: I made a mistake while writing this article... Thanks [Reddit](https://old.reddit.com/r/Tailscale/comments/1vp753w/i_benchmarked_tailscale_against_netbird_then/p3v707d/) for the correction!

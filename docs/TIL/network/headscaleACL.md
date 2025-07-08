# Headscale ACL Security Setup

How to isolate shared homelab devices from a shared Headscale network, while maintaining admin access ?

My point was to be able to block incoming connection, but still keep full access to it.

## Problem
- Shared homelab with physical access by others
- Need to prevent homelab devices from accessing personal devices
- Need to maintain internal homelab devices connection
- Admins need full access to everything

## Solution: Tag-based ACLs

The solution is simple, I have to manually **tag** every devices (most importantly the ones from the homelab, but it's good to tag them all explicitly to apply rules - I think headscale is denying all connection per default, at least on 26.1 - ) then use rules to isolate the homelab.

:::tip

For some magical reason, it's important to explicitly list each communication protocol (TCP, UDP and ICMP for `ping`).

Maybe it's not relevant anymore in the future

:::

:::note

Go figured why it's not wildcatching by default 🤷

I lost a lot of time on this one...

:::


You can either apply it with the `policy.json` or with a web interface (like [Headplane](https://github.com/tale/headplane)).

### 1. ACL Configuration

```json
{
  "groups": {
    "group:trusted-users": ["admin1@", "admin2@"],
    "group:work": ["shared-user@"]
  },
  "tagOwners": {
    "tag:trusted": ["group:trusted-users"],
    "tag:shared-homelab": ["group:trusted-users"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:trusted"],
      "dst": ["tag:trusted:*", "tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:trusted"],
      "proto": "icmp",
      "dst": ["tag:trusted:*", "tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:trusted"],
      "proto": "tcp",
      "dst": ["tag:trusted:*", "tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:trusted"],
      "proto": "udp",
      "dst": ["tag:trusted:*", "tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:shared-homelab"],
      "dst": ["tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:shared-homelab"],
      "proto": "icmp",
      "dst": ["tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:shared-homelab"],
      "proto": "tcp",
      "dst": ["tag:shared-homelab:*"]
    },
    {
      "action": "accept",
      "src": ["tag:shared-homelab"],
      "proto": "udp",
      "dst": ["tag:shared-homelab:*"]
    }
  ]
}
```

### 2. Tag Your Devices

Again, either with the command line as below, or with web ui:

```bash
# Tag admin devices as trusted
sudo -u headscale headscale nodes tag -i <node_id> tag:trusted

# Tag homelab devices as isolated
sudo -u headscale headscale nodes tag -i <node_id> tag:shared-homelab
```

### 3. Apply Configuration

## Result
- **`tag:trusted`**: Full access to everything (ping, SSH, HTTP, etc.)
- **`tag:shared-homelab`**: Isolated sandbox, can only talk to each other
- **Security**: Homelab can't initiate connections to personal devices
- **Stateful**: Return traffic automatically allowed

## Key Points
- Use tags, not user-based ACLs (more reliable)
- Explicit protocols needed (TCP, UDP, ICMP)
- Verify tags are applied: `headscale nodes list --tags`
- ACLs are directional but stateful (meaning, if you can connect, it can answer; but might not be able to create the connection first)

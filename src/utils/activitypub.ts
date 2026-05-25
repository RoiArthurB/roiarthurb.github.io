// ActivityPub shared configuration
export const AP_DOMAIN = 'arthurbrugiere.fr';
export const AP_BASE_URL = `https://${AP_DOMAIN}`;
export const AP_USERNAME = 'me';
export const AP_ACTOR_URL = `${AP_BASE_URL}/activitypub/actor.json`;
export const AP_OUTBOX_URL = `${AP_BASE_URL}/activitypub/outbox.json`;
export const AP_INBOX_URL = `${AP_BASE_URL}/activitypub/inbox`;
export const AP_FOLLOWERS_URL = `${AP_BASE_URL}/activitypub/followers.json`;
export const AP_FOLLOWING_URL = `${AP_BASE_URL}/activitypub/following.json`;

// Public key for HTTP signatures.
// The matching PRIVATE key is needed ONLY if you want to "push" new blog posts to
// followers' timelines (deliver Create activities to their inboxes).
// For a purely static read-only site, you don't need the private key at all.
// If you add push delivery later, store the private key as a GitHub Secret
// (e.g. ACTIVITYPUB_PRIVATE_KEY) and use it in a workflow — never commit it.
export const AP_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAplFdrLJ86+zr91ULos1y
OgN002nQ1hcpZ6EJZyzuziJmO/Yj49maCBSM0BrcWz4C5MKvKkpIHckALq3NKDri
ETChHBOSSAr8G3zctcfHWFqDVWAhi22CdztLPasARVDbavX0rlPRq519Nh6BJX/x
jVp6ZHur6zzl0FtGsKYqhhkkxjLk6OONgjrXDXezZNMDWo4d9DSiTgZ006hAgKlc
h4K7o3xfjYcNekYjBX+ZtH4+MahI1ho3sfUJjlXKCefbaY+VEc6firxeT6+imBBu
sfJxGbE5zPvWfsjQJXCN/unE+pz2r0gBodzb4m+LarZ/r3MeC+MCzpe4BgFOQ/Jf
QQIDAQAB
-----END PUBLIC KEY-----`;

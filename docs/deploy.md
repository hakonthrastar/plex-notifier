# Deploying to the home server

The app runs as three containers on a Debian VM on Proxmox:

| Service  | What it does                                                         |
| -------- | -------------------------------------------------------------------- |
| `app`    | The website. Applies database migrations on every start.             |
| `worker` | Checks Plex every 15 minutes and emails the digests.                 |
| `caddy`  | HTTPS on ports 80/443, certificates from Let's Encrypt, proxies to `app`. |

Images are built by GitHub Actions on every merge to `main` and published to
`ghcr.io/hakonthrastar/vibecode-lab`. The server only pulls them.

## 1. Create the VM (Proxmox)

1. Download the Debian 13 netinst ISO to Proxmox (*local → ISO Images → Download from URL*).
2. *Create VM*: 2 cores, 2 GB RAM, 16 GB disk, *QEMU Guest Agent* on.
3. Install Debian: no desktop environment, tick *SSH server*.
4. In your router, give the VM a **fixed IP** (DHCP reservation). The port forwarding below points at it.

## 2. Install Docker (on the VM)

```sh
sudo apt update && sudo apt install -y ca-certificates curl qemu-guest-agent
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in afterwards
```

## 3. Router and DNS

1. **Port forwarding** on your router to the VM's IP:
   - TCP 80 (Let's Encrypt and the http→https redirect)
   - TCP 443 (the site)
   - UDP 443 (HTTP/3; optional)
2. **Cloudflare DNS**: add an `A` record `plex` → your home's public IP, **proxy status: DNS only (grey cloud)**.
   Caddy needs to answer Let's Encrypt itself; start with the grey cloud and get everything working first.
3. **Changing home IP?** If your ISP doesn't give you a fixed IP, the A record must follow it.
   A small dynamic-DNS container (e.g. `favonia/cloudflare-ddns` with a Cloudflare API token limited to *Zone → DNS → Edit* for your domain) handles that.

Check from your phone on mobile data that `plex.<your domain>` resolves to your home IP before continuing.

## 4. Configure the app (on the VM)

```sh
mkdir -p ~/plex-notifier && cd ~/plex-notifier
```

Copy the two files from the repo onto the VM, from your laptop:

```sh
scp docker-compose.yml Caddyfile <user>@<vm-ip>:~/plex-notifier/
```

Create `~/plex-notifier/.env` (start from `.env.example`):

```sh
PLEX_TOKEN=...
RESEND_API_KEY=re_...
EMAIL_FROM=Plex Notifier <plex@notify.yourdomain.com>
BETTER_AUTH_SECRET=...            # a NEW one: openssl rand -base64 32
BETTER_AUTH_URL=https://plex.yourdomain.com
APP_DOMAIN=plex.yourdomain.com
```

Then `chmod 600 .env`, since it holds your tokens.

## 5. Log in to GitHub's registry (once)

The images are private. On GitHub: *Settings → Developer settings → Personal access tokens → Tokens (classic)*,
create one with **only** `read:packages`. On the VM:

```sh
docker login ghcr.io -u hakonthrastar   # paste the token as the password
```

## 6. Start it

```sh
docker compose up -d
docker compose ps          # app should become "healthy" within ~30 s
docker compose logs -f     # Ctrl+C to stop following
```

Caddy gets the certificate within a minute of the app being healthy. Then:

```sh
docker compose exec app node scripts/add-person.ts "Your Name" you@example.com
```

Open `https://plex.<your domain>`, request a sign-in link, press **Refresh from Plex**, follow your shows,
and invite others from **People**. The worker's first run records the existing episodes silently.

## Updating

After a merge to `main`, once the CI run is green:

```sh
cd ~/plex-notifier && docker compose pull && docker compose up -d
```

Migrations run automatically. If the change touched `docker-compose.yml` or `Caddyfile`, copy those over first.

## Backups

The database lives in the `data` Docker volume inside the VM. In Proxmox, *Datacenter → Backup → Add*:
the VM, daily, mode *Snapshot*, keep 7. Restoring the VM restores everything, certificates included.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `app` not healthy | `docker compose logs app`: usually a missing `.env` value |
| No certificate / browser warning | `docker compose logs caddy`: ports 80/443 forwarded? A record correct and grey-cloud? |
| Sign-in link goes to the wrong address | `BETTER_AUTH_URL` must be `https://plex.<your domain>` |
| No digest emails | `docker compose logs worker`: shows each run, and any Plex or Resend errors |

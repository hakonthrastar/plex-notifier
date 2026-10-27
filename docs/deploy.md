# Deploying to the home server

The app runs as two containers on a Debian VM on Proxmox:

| Service  | What it does                                                          |
| -------- | --------------------------------------------------------------------- |
| `app`    | The website, plain HTTP on port 3000. Applies migrations on every start. |
| `worker` | Checks Plex every 15 minutes and emails the digests.                  |

TLS is **not** part of this setup. Your own reverse proxy (with your NAT/port forwarding)
terminates HTTPS and forwards plain HTTP to the VM.

Images are built by GitHub Actions on every merge to `main` and published to
`ghcr.io/hakonthrastar/vibecode-lab`. The server only pulls them.

## 1. Create the VM (Proxmox)

1. Download the Debian 13 netinst ISO to Proxmox (*local → ISO Images → Download from URL*).
2. *Create VM*: 2 cores, 2 GB RAM, 16 GB disk, *QEMU Guest Agent* on.
3. Install Debian: no desktop environment, tick *SSH server*.
4. In your router, give the VM a **fixed IP** (DHCP reservation). Your proxy forwards to it.

## 2. Install Docker (on the VM)

```sh
sudo apt update && sudo apt install -y ca-certificates curl qemu-guest-agent
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out and back in afterwards
```

## 3. Your reverse proxy

Point the proxy for `https://plex.<your domain>` at `http://<vm-ip>:3000`. Whatever proxy you use:

- **Serve the site on the exact address in `BETTER_AUTH_URL`.** Redirects, sign-in links and
  digest emails use that address, and sign-in requests from any other origin are rejected.
- **Send `X-Forwarded-For`.** Login rate limiting uses the client IP; without it every visitor
  looks like the proxy and shares one limit.
- `Host` and `X-Forwarded-Proto` are good practice but not required: the app doesn't build URLs from them.

Example for nginx:

```nginx
location / {
    proxy_pass http://<vm-ip>:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Port 3000 on the VM serves the app without TLS. Only the proxy should reach it: if the proxy runs
elsewhere, restrict the port in the Proxmox firewall (*VM → Firewall*: allow TCP 3000 from the
proxy's IP only, then enable the firewall). Don't forward port 3000 on your router.

## 4. Configure the app (on the VM)

```sh
mkdir -p ~/plex-notifier && cd ~/plex-notifier
```

Copy the compose file onto the VM, from your laptop:

```sh
scp docker-compose.yml <user>@<vm-ip>:~/plex-notifier/
```

Create `~/plex-notifier/.env` (start from `.env.example`):

```sh
PLEX_TOKEN=...
RESEND_API_KEY=re_...
EMAIL_FROM=Plex Notifier <plex@notify.yourdomain.com>
BETTER_AUTH_SECRET=...            # a NEW one: openssl rand -base64 32
BETTER_AUTH_URL=https://plex.yourdomain.com
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
docker compose ps                         # app should become "healthy" within ~30 s
curl http://localhost:3000/api/health     # {"ok":true}
docker compose logs -f                    # Ctrl+C to stop following
```

Add yourself:

```sh
docker compose exec app node scripts/add-person.ts "Your Name" you@example.com
```

Open `https://plex.<your domain>` (through the proxy, not `http://<vm-ip>:3000`), request a sign-in link,
press **Refresh from Plex**, follow your shows, and invite others from **People**.
The worker's first run records the existing episodes silently.

## Updating

After a merge to `main`, once the CI run is green:

```sh
cd ~/plex-notifier && docker compose pull && docker compose up -d
```

Migrations run automatically. If the change touched `docker-compose.yml`, copy it over first.

## Backups

The database lives in the `data` Docker volume inside the VM. In Proxmox, *Datacenter → Backup → Add*:
the VM, daily, mode *Snapshot*, keep 7.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `app` not healthy | `docker compose logs app`: usually a missing `.env` value |
| Redirected to the wrong address | `BETTER_AUTH_URL` in `.env`; restart with `docker compose up -d` after changing it |
| "Invalid origin" / sign-in does nothing | The browser's address must match `BETTER_AUTH_URL` exactly (scheme and host) |
| Sign-in link goes to the wrong address | `BETTER_AUTH_URL` must be `https://plex.<your domain>` |
| No digest emails | `docker compose logs worker`: shows each run, and any Plex or Resend errors |

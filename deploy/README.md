# Holy Shift release boundary

This directory describes the required deployment shape. It is not evidence that
the live host or Cloudflare account already uses it.

## Non-negotiable controls

1. Build once in CI from an approved commit with `npm ci && npm run check`.
2. Record SHA-256 hashes for every file, the Node/npm versions, dependency audit,
   browser reports and the source commit. Keep the evidence for at least 90 days.
3. A privileged operator first copies the CI manifest obtained through the
   authenticated Actions run into a root-owned, read-only manifest directory.
   A deployment account that cannot edit the Git working tree may then copy the
   artifact into a new incoming directory. The account must not be able to edit
   the trusted manifest.
4. Before promotion, copy the incoming tree into a private, root-owned candidate
   directory and reverify its complete inventory and hashes against that same
   trusted CI manifest. The first-phase check is diagnostic; only this second,
   privileged check is authoritative. Never serve `/home/ubuntu/holyshift/dist`
   or any other developer-writable build or incoming directory.
5. Publish content-hashed assets from the verified candidate into the root-owned,
   append-only `/srv/holyshift/assets/` store, then atomically switch
   `/srv/holyshift/current` to the new release. Keep assets referenced by every
   retained release so an HTML-to-asset request cannot cross into a 404 during
   a release switch or rollback. Do not build into `current`.
6. Keep the previous release and roll back by atomically switching the symlink.
   Manifest installation, promotion and rollback must all hold the same
   root-only `/run/holyshift/release.lock`; record the operator, timestamps,
   commit hashes and post-rollback checks.
7. Use the location rules in `nginx-holyshift.locations.conf`. Unknown paths must
   be a real 404; this application has no client-side routes.

## Edge and origin requirements

- Cloudflare SSL mode: **Full (strict)** with a valid origin certificate, or use
  Cloudflare Tunnel. Flexible/plain-HTTP origin transport is forbidden.
- Redirect every HTTP request to the matching HTTPS URL with 301/308.
- Set Minimum TLS Version to 1.2. Verify TLS 1.0/1.1 fail and TLS 1.2/1.3 work.
- Start HSTS at `max-age=300`; increase to `31536000` only after every relevant
  path and subdomain has passed HTTPS rollback testing. Evaluate
  `includeSubDomains` and `preload` separately.
- The origin must not be generally reachable from the Internet. Allow only
  authenticated Cloudflare traffic (Tunnel/AOP and firewall allowlist), reject
  unknown Host values, and configure trusted proxy ranges plus
  `real_ip_header CF-Connecting-IP` for auditable client logs.
- Patch the OS, Nginx and OpenSSL before release, then restart where required and
  repeat the full verification matrix.
- Prefer an isolated Holy Shift origin/subdomain so another same-origin
  application cannot inherit its storage and script authority.

## Atomic release example

The operator must replace the placeholders with an approved commit and a
verified CI artifact path. Before accepting any incoming files, a privileged
operator downloads `SHA256SUMS` directly from the approved, authenticated GitHub
Actions run, checks that the run's source commit is the approved commit, and
installs the manifest into a root-owned directory the deployment identity can
read but cannot modify:

```sh
set -eu
umask 077
install -d -o root -g root -m 0700 /run/holyshift
test ! -L /run/holyshift
test "$(stat -c '%U:%G:%a' /run/holyshift)" = root:root:700
exec 9>/run/holyshift/release.lock
flock -x 9
approved_commit=REPLACE_WITH_40_HEX_COMMIT
ci_manifest=/absolute/path/from/authenticated-actions-download/SHA256SUMS
trusted_manifest=/srv/holyshift/manifests/$approved_commit.SHA256SUMS
test "${#approved_commit}" -eq 40
case "$approved_commit" in *[!0-9a-f]*) exit 1 ;; esac
install -d -o root -g root -m 0755 /srv/holyshift/manifests
test ! -e "$trusted_manifest"
manifest_install=$(mktemp /srv/holyshift/manifests/.SHA256SUMS.XXXXXX)
trap 'rm -f "$manifest_install"' EXIT HUP INT TERM
install -o root -g root -m 0444 "$ci_manifest" "$manifest_install"
mv -T "$manifest_install" "$trusted_manifest"
trap - EXIT HUP INT TERM
```

The incoming directory must be new; `mkdir` must fail rather than merge files
from an older release. Run this copy and preliminary verification as the
restricted deployment identity. `mktemp` prevents a predictable temporary-file
symlink attack:

```sh
set -eu
approved_commit=REPLACE_WITH_40_HEX_COMMIT
artifact_dir=/absolute/path/to/verified-artifact
trusted_manifest=/srv/holyshift/manifests/$approved_commit.SHA256SUMS
release_stage=/srv/holyshift/staging/$approved_commit.new
actual_manifest=$(mktemp "${TMPDIR:-/tmp}/holyshift-manifest.XXXXXX")
trap 'rm -f "$actual_manifest"' EXIT HUP INT TERM
test "${#approved_commit}" -eq 40
case "$approved_commit" in *[!0-9a-f]*) exit 1 ;; esac
test ! -e "$release_stage"
test ! -L "$release_stage"
mkdir -m 0755 "$release_stage"
cp -a "$artifact_dir"/. "$release_stage"/
unexpected_entry=$(find "$release_stage" ! -type d ! -type f -print -quit)
test -z "$unexpected_entry"
(cd "$release_stage" && sha256sum -c "$trusted_manifest")
(cd "$release_stage" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$actual_manifest"
cmp "$trusted_manifest" "$actual_manifest"
```

The restricted account still controls the incoming tree, so that check alone is
never sufficient. A privileged release operator copies it into a private
root-owned candidate, then repeats the complete trusted-manifest check there.
`cp -a --no-preserve=ownership` creates new root-owned inodes, so an open file
descriptor held by the deployment identity cannot alter the candidate after the
copy. All manifest scratch files live below the root-only candidate directory:

```sh
set -eu
umask 077
install -d -o root -g root -m 0700 /run/holyshift
test ! -L /run/holyshift
test "$(stat -c '%U:%G:%a' /run/holyshift)" = root:root:700
exec 9>/run/holyshift/release.lock
flock -x 9
approved_commit=REPLACE_WITH_40_HEX_COMMIT
trusted_manifest=/srv/holyshift/manifests/$approved_commit.SHA256SUMS
release_stage=/srv/holyshift/staging/$approved_commit.new
release_candidate=/srv/holyshift/candidates/$approved_commit.candidate
release_final=/srv/holyshift/releases/$approved_commit
shared_assets=/srv/holyshift/assets
test "${#approved_commit}" -eq 40
case "$approved_commit" in *[!0-9a-f]*) exit 1 ;; esac
test -f "$trusted_manifest"
test "$(stat -c '%U:%G:%a' "$trusted_manifest")" = root:root:444
install -d -o root -g root -m 0700 /srv/holyshift/candidates
test ! -e "$release_candidate"
test ! -L "$release_candidate"
test ! -e "$release_final"
test ! -L "$release_final"
nginx -t
mkdir -m 0700 "$release_candidate"
cp -a --no-preserve=ownership "$release_stage"/. "$release_candidate"/
unexpected_entry=$(find "$release_candidate" ! -type d ! -type f -print -quit)
test -z "$unexpected_entry"
chown -R root:root "$release_candidate"
find "$release_candidate" -type d -exec chmod 0755 {} +
find "$release_candidate" -type f -exec chmod 0644 {} +
actual_manifest=$(mktemp /srv/holyshift/candidates/.manifest.XXXXXX)
trap 'rm -f "$actual_manifest"' EXIT HUP INT TERM
asset_manifest=$(mktemp /srv/holyshift/candidates/.assets.XXXXXX)
trap 'rm -f "$actual_manifest" "$asset_manifest"' EXIT HUP INT TERM
(cd "$release_candidate" && sha256sum -c "$trusted_manifest")
(cd "$release_candidate" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$actual_manifest"
cmp "$trusted_manifest" "$actual_manifest"
install -d -o root -g root -m 0755 "$shared_assets"
cp -a --no-preserve=ownership --update=none "$release_candidate/assets"/. "$shared_assets"/
(cd "$release_candidate/assets" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$asset_manifest"
(cd "$shared_assets" && sha256sum -c "$asset_manifest")
chown -R root:root "$shared_assets"
find "$shared_assets" -type d -exec chmod 0755 {} +
find "$shared_assets" -type f -exec chmod 0644 {} +
mv -T "$release_candidate" "$release_final"
ln -sfn "$release_final" /srv/holyshift/current.next
mv -Tf /srv/holyshift/current.next /srv/holyshift/current
rm -f "$actual_manifest" "$asset_manifest"
trap - EXIT HUP INT TERM
```

The Nginx configuration must already have been validated before switching.
Changing Cloudflare, firewall, certificates, live Nginx, branch protection or
GitHub Environment settings is an external change and requires an authorized
human operator. Until those checks are recorded, release status remains HOLD.

## Acceptance probes

- HTTP returns 301/308 and never serves the application shell.
- HTTPS has valid HSTS and the expected CSP/security headers.
- `/holyshift/` and its hashed assets return 200 with correct MIME types.
- an index fetched immediately before a forward switch or rollback can still
  load every referenced hashed asset immediately after the switch.
- random paths, nested paths, missing assets and source maps return 404.
- the public artifact hashes match the approved CI artifact, not a working tree.
- the local-only test bridge is absent on the public hostname.
- two external networks cannot connect directly to the origin or use an unknown
  Host value.
- a timed rollback restores the previous hash set without a mixed-version window.

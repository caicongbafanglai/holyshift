import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(relativePath) {
  return readFileSync(
    new globalThis.URL(`../${relativePath}`, import.meta.url),
    'utf8'
  );
}

describe('release boundary configuration', () => {
  it('builds for the canonical subpath and keeps test output isolatable', () => {
    const vite = read('vite.config.js');
    expect(vite).toContain("base: '/holyshift/'");
    expect(vite).toContain('HOLYSHIFT_DIST_DIR');
    expect(vite).toContain('tmpdir()');
    expect(vite).toContain('^holyshift-build\\.');
    expect(vite).toContain('emptyOutDir: customBuildOutDir ? false : true');
    expect(vite).toContain('must be a dedicated holyshift-build.* directory');
  });

  it('serves only an atomically switched artifact and returns real 404s', () => {
    const nginx = read('deploy/nginx-holyshift.locations.conf');
    expect(nginx).toContain('/srv/holyshift/current');
    expect(nginx).not.toContain('/home/ubuntu/holyshift/dist');
    expect(nginx).toContain('alias /srv/holyshift/current/;');
    expect(nginx).toContain('alias /srv/holyshift/assets/;');
    expect(nginx).toContain('try_files index.html =404;');
    expect(nginx).toContain('return 404;');
    expect(nginx.match(/Strict-Transport-Security/g)).toHaveLength(5);
  });

  it('retains browser evidence, a hash manifest and an SBOM', () => {
    const workflow = read('.github/workflows/verify-dev.yml');
    expect(workflow).toContain('playwright-report');
    expect(workflow).toContain('SHA256SUMS');
    expect(workflow).toContain('sbom.spdx.json');
    expect(workflow).toContain('npm-audit.json');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('VITE_HOLYSHIFT_COMMIT');
    const playwright = read('playwright.config.js');
    expect(playwright).toContain('reuseExistingServer: false');
    expect(playwright).toContain('quoteForPosixShell');
    expect(playwright).not.toContain('JSON.stringify(buildOutDir)');
  });

  it('documents a clean, exact and root-owned atomic promotion', () => {
    const deployment = read('deploy/README.md');
    expect(deployment).toContain('test ! -e "$release_stage"');
    expect(deployment).toContain('(cd "$release_stage" && sha256sum -c');
    expect(deployment).toContain('unexpected_entry=$(find');
    expect(deployment).toContain('cmp "$trusted_manifest"');
    expect(deployment).toContain('/srv/holyshift/manifests');
    expect(deployment).toContain('stat -c');
    expect(deployment).toContain('/srv/holyshift/candidates');
    expect(deployment.match(/flock -x 9/g)).toHaveLength(2);
    expect(
      deployment.match(/exec 9>\/run\/holyshift\/release\.lock/g)
    ).toHaveLength(2);
    expect(deployment).not.toContain('/run/lock/holyshift-release.lock');
    expect(deployment).toContain('cp -a --no-preserve=ownership');
    expect(deployment).toContain('(cd "$release_candidate" && sha256sum -c');
    expect(deployment).toContain('mktemp /srv/holyshift/candidates/');
    expect(deployment).toContain('-type d -exec chmod 0755');
    expect(deployment).toContain('-type f -exec chmod 0644');
    expect(deployment).not.toContain('/tmp/holyshift-$approved_commit');
    expect(deployment).toContain('test ! -e "$release_final"');
    expect(deployment).toContain('--update=none "$release_candidate/assets"/.');
    expect(deployment).toContain('mv -T "$release_candidate" "$release_final"');
    expect(deployment).toContain('chown -R root:root');
    expect(deployment).toContain('mv -Tf');
  });
});

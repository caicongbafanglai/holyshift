import { defineConfig } from 'vite';
import { tmpdir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';

const customBuildOutDir = process.env.HOLYSHIFT_DIST_DIR?.trim();

function resolveBuildOutDir() {
  if (!customBuildOutDir) return 'dist';

  const absoluteOutDir = resolve(customBuildOutDir);
  const temporaryRoot = resolve(tmpdir());
  const relativeToTemporaryRoot = relative(temporaryRoot, absoluteOutDir);
  if (
    absoluteOutDir === temporaryRoot ||
    relativeToTemporaryRoot.startsWith('..') ||
    isAbsolute(relativeToTemporaryRoot) ||
    !/^holyshift-build\.[A-Za-z0-9_-]+$/.test(relativeToTemporaryRoot)
  ) {
    throw new Error(
      'HOLYSHIFT_DIST_DIR must be a dedicated holyshift-build.* directory directly below the operating-system temporary directory'
    );
  }
  return absoluteOutDir;
}

export default defineConfig({
  base: '/holyshift/',
  build: {
    outDir: resolveBuildOutDir(),
    // A caller-provided path is never recursively emptied. Callers must use a
    // fresh `mktemp -d` directory so a typo cannot erase unrelated files.
    emptyOutDir: customBuildOutDir ? false : true,
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700
  },
  server: {
    strictPort: true
  },
  preview: {
    strictPort: true
  },
  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['e2e/**']
  }
});

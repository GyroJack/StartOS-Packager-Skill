// startos/manifest/index.ts
// Replace EVERY <PLACEHOLDER>. Keep `id:` single-quoted on its own line
// (the Makefile greps it with awk).
import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: '<package-id>', // lowercase, hyphenated, >=3 chars, stable forever
  title: '<Title>',
  license: '<SPDX-ID e.g. MIT>',
  packageRepo: 'https://github.com/<you>/<package>-startos',
  upstreamRepo: 'https://github.com/<upstream>/<repo>',
  marketingUrl: 'https://<project-site>',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    main: {
      // Build from source (preferred). Or use { dockerTag: 'ghcr.io/org/app:1.2.3' }.
      source: { dockerBuild: { dockerfile: 'Dockerfile', workdir: '.' } },
      arch: ['x86_64', 'aarch64'], // keep in sync with Makefile ARCHES
      emulateMissingAs: null,
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})

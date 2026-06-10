// startos/main.ts — simple variant (no mandatory pre-start config).
// If the service refuses to start without config, use main.gated.ts instead.
import { sdk } from './sdk'
import { servicePort } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const subcontainer = await sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'main-sub',
  )

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer,
    // argv that starts the service. Point at an entrypoint script if the
    // service needs setup (cd into /data, symlink assets, seed files) first.
    exec: { command: ['<service-binary-or-/usr/local/bin/start.sh>'] },
    ready: {
      display: 'Web Interface',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, servicePort, {
          successMessage: 'The service is ready',
          errorMessage: 'The service is not ready',
        }),
    },
    requires: [],
  })
})

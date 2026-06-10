// startos/main.ts — GATED variant.
// Use when the upstream crashes/exits without mandatory config. Until the user
// configures it, run a holding daemon with a failing, actionable health check
// instead of crash-looping. See reference/patterns-and-pitfalls.md.
import { sdk } from './sdk'
import { servicePort } from './utils'
import { configFile } from './fileModels' // a FileHelper for the config file

export const main = sdk.setupMain(async ({ effects }) => {
  // `.const(effects)` re-runs main if the file changes (e.g. after Configure).
  const cfg = await configFile.read().const(effects)
  const configured = !!cfg && !!cfg.REQUIRED_KEY // adapt to your mandatory field

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

  if (!configured) {
    return sdk.Daemons.of(effects).addDaemon('primary', {
      subcontainer,
      exec: { command: ['sleep', 'infinity'] },
      ready: {
        display: 'Setup Required',
        fn: async () => ({
          result: 'failure',
          message:
            'Not configured. Run the "Configure" action, set <REQUIRED_KEY>, then restart.',
        }),
      },
      requires: [],
    })
  }

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer,
    exec: { command: ['<service-binary-or-/usr/local/bin/start.sh>'] },
    ready: {
      display: 'Service',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, servicePort, {
          successMessage: 'The service is online',
          errorMessage: 'The service is not reachable',
        }),
    },
    requires: [],
  })
})

// startos/interfaces.ts
import { sdk } from './sdk'
import { servicePort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, 'ui-multi')
  const origin = await host.bindPort(servicePort, { protocol: 'http' })

  const ui = sdk.createInterface(effects, {
    name: 'Web UI',
    id: 'ui',
    description: 'The web interface of <service>',
    type: 'ui', // 'ui' | 'api' | 'p2p'
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const receipt = await origin.export([ui])
  return [receipt]
})

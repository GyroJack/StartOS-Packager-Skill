// startos/actions/config.ts — a tiered Configure action.
// Pattern: simple fields at the root, grouped fields in Value.object sections.
// `getInput` prefills from disk; `run` writes the COMPLETE config (never a diff).
import { sdk } from '../sdk'
import { configFile } from '../fileModels'

const { InputSpec, Value } = sdk

export const configSpec = InputSpec.of({
  // ---- simple (always visible) ----
  requiredKey: Value.text({
    name: 'Required Key',
    description: 'The one setting the service cannot start without.',
    required: true,
    default: null,
    // patterns: [{ regex: '^...$', description: 'must match ...' }],
  }),
  // ---- advanced (collapsible group) ----
  advanced: Value.object(
    { name: 'Advanced Settings', description: 'Optional tuning.' },
    InputSpec.of({
      logLevel: Value.select({
        name: 'Log Level',
        default: 'info',
        values: { debug: 'Debug', info: 'Info', warn: 'Warn', error: 'Error' },
      }),
      maxConnections: Value.number({
        name: 'Max Connections',
        required: true,
        default: 100,
        integer: true,
        min: 1,
      }),
    }),
  ),
})

type ConfigInput = typeof configSpec._TYPE

// Build the COMPLETE config every time (defaults + user input). Adapt to your
// service's full required key set — grep upstream for its required vars.
function buildConfig(input: ConfigInput): Record<string, string> {
  return {
    REQUIRED_KEY: input.requiredKey,
    LOG_LEVEL: input.advanced.logLevel,
    MAX_CONNECTIONS: String(input.advanced.maxConnections),
    // ...every other key the service requires, with sane defaults...
  }
}

export const configure = sdk.Action.withInput(
  'configure',
  async ({ effects }) => ({
    name: 'Configure',
    description: 'Set up the service. Restart after saving for changes to apply.',
    warning: null,
    visibility: 'enabled',
    allowedStatuses: 'any',
    group: null,
  }),
  configSpec,
  // getInput: prefill from the file on disk
  async ({ effects }) => {
    const cfg = await configFile.read().const(effects)
    if (!cfg) return null
    return {
      requiredKey: cfg.REQUIRED_KEY || undefined,
      advanced: {
        logLevel: (cfg.LOG_LEVEL as ConfigInput['advanced']['logLevel']) || 'info',
        maxConnections: cfg.MAX_CONNECTIONS ? Number(cfg.MAX_CONNECTIONS) : 100,
      },
    }
  },
  // run: write the whole config
  async ({ effects, input }) => {
    await configFile.write(effects, buildConfig(input))
    return null
  },
)

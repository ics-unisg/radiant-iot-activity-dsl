import { DeployOptions } from "../cli/actions/deploy.js"
import { loadConfig } from "../config/index.js"
import { withDefaults } from "../config/options.js"
import { AdapterConfig } from "../config/schema.js"
import { Artifact } from "../generator/artifact.js"
import { Changeset } from "./changeset.js"
import SiddhiAdapter from "./siddhi/index.js"

export type DeployResult = {
  changeset: Changeset
  dryRun: boolean
  error?: Error
  success: boolean
  info: {
    adapter: {
      name: string
      version: string
      endpoint: string
    }
  }
}

export abstract class Adapter {
  abstract readonly name: string
  abstract readonly version: string
  readonly config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  abstract deploy(artifacts: Artifact[], dryRun?: boolean): Promise<Changeset>
  abstract deployDry(artifacts: Artifact[]): Promise<Changeset>
}

export async function deploy(artifacts: Artifact[], entrypoint: string, opts: DeployOptions): Promise<DeployResult> {

    const options = withDefaults({
        configFilepath: opts.config,
        destinationDir: opts.destination,
        entrypoint,
    })
    const config = loadConfig(options);

    // Check if adapter config exists
    if (config.adapter === undefined) {
        throw new Error("Adapter config not found. Make sure you have an adapter configured in your config file.")
    }

    let adapter: Adapter
    switch (config.adapter.type) {
      // As of now, only Siddhi is supported
      case 'siddhi':
      default:
        adapter = new SiddhiAdapter(config.adapter)
        break;
    }

    let changeset: Changeset
    try {
      if (opts.dryRun) {
        changeset = await adapter.deployDry(artifacts)
      } else {
        changeset = await adapter.deploy(artifacts)
      }
    } catch (e: unknown) {
      return {
        changeset: new Changeset(),
        dryRun: opts.dryRun || false,
        error: e as Error,
        success: false,
        info: {
          adapter: {
            name: adapter.name,
            version: adapter.version,
            endpoint: adapter.config.endpoint
          }
        }
      }
    }

    return {
      changeset,
      dryRun: opts.dryRun || false,
      success: true,
      info: {
        adapter: {
          name: adapter.name,
          version: adapter.version,
          endpoint: adapter.config.endpoint
        }
      }
    }
}
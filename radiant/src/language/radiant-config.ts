import { loadConfig } from "../config/index.js";
import { RadiantOptions, withDefaults } from "../config/options.js";
import { Config } from "../config/schema.js";
import fallbackConfig from "../config/fallback-config.js"

export type ConfigWithOptions = {
    config: Config,
    options: Required<RadiantOptions>
}

export class RadiantConfigScopeProvider {
    browserMode = false

    options: RadiantOptions = { 
        entrypoint: ".",
    }

    setBrowserMode(mode: boolean) {
        this.browserMode = mode
    }

    getConfigScope(configFilepath?: string): ConfigWithOptions {

        if (this.browserMode) {
            return {
                config: fallbackConfig as Config,
                options: {
                    entrypoint: ".",
                    configFilepath: '',
                    destinationDir: '',
                    artifactKind: 'memory'
                }
            }
        }

        if (configFilepath !== undefined) {
            this.options.configFilepath = configFilepath
        } 

        const opts = withDefaults(this.options)
        const cfg = loadConfig(opts)

        return {
            config: cfg,
            options: opts
        }
    }

    setConfigFilepath(filepath: string) {
        this.options.configFilepath = filepath
    }

    setEntrypoint(entrypoint: string) {
        this.options.configFilepath = undefined
        this.options.destinationDir = undefined
        this.options.entrypoint = stripFileProtocol(entrypoint)
    }
}

/**
 * Removes the "file://" protocol from a file path.
 *
 * @param filepath The file path to strip the protocol from.
 * @returns The file path without the protocol.
 */
function stripFileProtocol(filepath: string): string {
    return filepath.replace('file://', '')
}

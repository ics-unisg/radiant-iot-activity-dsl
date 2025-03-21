import path from "path"
import { ArtifactKind } from "../generator/artifact.js"

const DEFAULT_CONFIG_FILENAME = 'radiant.yaml'
const DEFAULT_DESTINATION_DIR = './out/'

export type RadiantOptions = {
  artifactKind?: ArtifactKind
  configFilepath?: string
  destinationDir?: string
  entrypoint: string
}

/**
 * Fills in default values for the options.
 *
 * If no options are specified, the config file is expected to be in the same
 * directory as the entrypoint file, and the destination files are written to
 * a directory called 'out' in the same directory as the entrypoint file.
 *
 * @param opts The options to fill in.
 * @returns The options with default values.
 */
export function withDefaults(opts: RadiantOptions): Required<RadiantOptions> {
  opts.artifactKind = opts.artifactKind || 'disk'
  opts.configFilepath = (opts.configFilepath === undefined) 
    ? defaultFilepath(opts.entrypoint, DEFAULT_CONFIG_FILENAME)
    : asAbsolutePath(opts.configFilepath)
  opts.destinationDir = (opts.destinationDir === undefined) 
    ? defaultFilepath(opts.entrypoint, DEFAULT_DESTINATION_DIR) 
    : asAbsolutePath(opts.destinationDir)

  return opts as Required<RadiantOptions>;
}

/**
 * Generates the default filepath based on the entrypoint and filename.
 * 
 * @param entrypoint The entrypoint path
 * @param filename The name of the file
 * @returns The resolved default filepath
 */
function defaultFilepath(entrypoint: string, filename: string): string {
  return path.resolve(path.dirname(entrypoint), filename)
}

/**
 * Converts a filepath to an absolute path.
 *
 * If the filepath is already an absolute path, it is returned unchanged.
 * Otherwise, it is resolved relative to the current working directory.
 *
 * @param filepath The filepath to convert
 * @returns The absolute path
 */
function asAbsolutePath(filepath: string): string {
  return path.resolve(filepath)
}
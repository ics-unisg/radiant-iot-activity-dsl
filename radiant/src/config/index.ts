import fs from 'node:fs';
import { parse } from "@std/yaml";
import { deepMerge } from '@std/collections';
import { Config, ConfigSchema, Preset, Sensor, Station } from "./schema.js";
import { RadiantOptions } from './options.js';
import process from 'process';
import path from 'node:path';

/**
 * Loads the configuration from a YAML file.
 *
 * @param options The options for the generate command. The `configFilepath` property is used to determine the path to the YAML file.
 * @returns The parsed configuration
 * @throws If the file does not exist or if the config is invalid
 */
export function loadConfig(options: Required<RadiantOptions>): Config {
  // Fill in default paths if nothing specified
  const rawCfg = readConfig(options.configFilepath);
  const config = buildConfig(rawCfg);
  checkSensorsIncludesAllFromSchema(config);

  return config;
}

/**
 * Reads a configuration file at the given `filepath` and returns the parsed, validated and normalized config.
 *
 * @param filepath the path to the configuration file
 * @returns the parsed config
 * @throws when the config is invalid
 */
function readConfig(filepath: string) {
  if (!fs.existsSync(filepath)) {
    // check for alternative file extension
    filepath = (filepath.endsWith('.yaml'))
      ? filepath.replace(/\.yaml$/, '.yml')
      : filepath.replace(/\.yml$/, '.yaml')

    if (!fs.existsSync(filepath)) {
      throw new Error(`Could not find configuration file at ${filepath}`)
    }
  }

  const data = fs.readFileSync(filepath, 'utf-8')

  const parsed = parse(data);

  // Load environment variables from the .env file in the same directory
  const envPath = path.resolve(path.dirname(filepath), '.env')
  if (fs.existsSync(envPath)) {
    process.loadEnvFile(envPath)
  }

  const withEnv = replaceEnvVariables(parsed)

  const result = ConfigSchema.safeParse(withEnv)

  if (!result.success) {
    console.log("Invalid config:", result.error);
    // exit with non-zero exit code in node
    process.exit(1);
  }

  return withEnv as Config;
}

/**
 * Replaces all ${ENV_VAR} occurrences recursively in the given fragment with the respective value from the
 * environment variables.
 *
 * @param fragment the value to replace environment variables in
 * @returns the new value with all environment variables replaced
 */
function replaceEnvVariables(fragment: string | unknown[] | Record<string, unknown> | unknown): unknown {
  if (typeof fragment === 'string') {
    const matches = fragment.matchAll(/\${([^}]+)}/g)

    let temp = fragment
    for (const match of matches) {
      const key = match[1]

      if (Object.hasOwn(process.env, key)) {
        temp = temp.replace(match[0], process.env[key]!)
      }
    }

    return temp
  } else if (Array.isArray(fragment)) {
    return fragment.map((c: unknown) => replaceEnvVariables(c))
  } else if (typeof fragment === 'object') {
    let intermediate = fragment as Record<string, unknown>
    for (const key in intermediate) {
      intermediate[key] = replaceEnvVariables(intermediate[key])
    }

    return intermediate
  } else {
    return fragment
  }
}

function buildConfig(cfg: Config) {
  cfg.stations = cfg.stations.map((station) => buildStationConfig(station, cfg.presets))
  // sort source.schema keys alphabetically (besides timestamp, should be first) and also sort sensors alphabetically (besides timestamp, should be first)
  cfg.sources.forEach((source) => {
    const sortedSchema = Object.fromEntries(
      Object.entries(source.schema).sort(([keyA], [keyB]) => {
        if (keyA === 'timestamp' && keyB !== 'timestamp') return -1;
        if (keyB === 'timestamp' && keyA !== 'timestamp') return 1;
        return keyA.localeCompare(keyB);
      })
    );
    source.schema = sortedSchema;
  });
  cfg.stations.forEach((station) => {
    station.sensors = station.sensors.sort((a, b) => {
      if (a.id === 'timestamp' && b.id !== 'timestamp') return -1;
      if (b.id === 'timestamp' && a.id !== 'timestamp') return 1;
      return a.id.localeCompare(b.id);
    });
  });
  

  return cfg
}

function buildStationConfig(station: Station, presets: Preset[]) {
  station.sensors = station.sensors.map((sensor) => buildSensorConfig(sensor, presets))

  return station
}

function buildSensorConfig(sensor: Sensor, presets: Preset[]) {
  if (Object.hasOwn(sensor, "preset")) {
    const preset = presets.find(p => p.id === sensor.preset)
    if (preset) {
      sensor = deepMerge(preset, sensor)
    }
  }

  if (sensor.type === "switch") {
    sensor.min_value = 0
    sensor.max_value = 1
    sensor.states = {
      "off": 0,
      "on": 1
    }
  }

  if (sensor.discretization && sensor.states) {
    throw new Error(`Sensor ${sensor.id} cannot have both discretization and states`)
  }
  
  return sensor
}

/**
 * Check whether sensors includes as id all keys from schema (besides timestamp)
 * 
 * For each source, check if all schema elements (minus timestamp) equals sensor ids
 * @param config The configuration object
 * @returns None
 */
function checkSensorsIncludesAllFromSchema(config: Config) {
  config.sources.forEach((source) => {
    const schemaKeys = Object.keys(source.schema).filter((key) => key !== 'timestamp')
    const sensorIds = config.stations.filter((station) => station.source === source.id).flatMap((station) => station.sensors.map((sensor) => sensor.id))

    if (!schemaKeys.every((key) => sensorIds.includes(key)) || !sensorIds.every((key) => schemaKeys.includes(key))) {
      throw new Error(`Source ${source.id} schema keys do not match sensor ids`)
    }
  })
}
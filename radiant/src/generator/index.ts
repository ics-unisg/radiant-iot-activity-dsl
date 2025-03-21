import { NodeFileSystem } from "langium/node";
import { extractAstNode } from "../cli/cli-util.js";
import { GenerateOptions } from "../cli/actions/generate.js";
import { loadConfig } from "../config/index.js";
import { Condition, Model } from "../language/generated/ast.js";
import { createRadiantServices } from "../language/radiant-module.js";
import { SiddhiGenerator } from "./siddhi/index.js";
import { Diagnostic } from "vscode-languageserver";
import { Config, Sensor } from "../config/schema.js";
import { RadiantOptions, withDefaults } from "../config/options.js";
import { Artifact, ArtifactKind } from "./artifact.js";

export abstract class Generator {
    abstract readonly name: string
    abstract readonly version: string

    abstract generate(options: RadiantOptions): Artifact[]
}

/**
 * Generate code for the given model and write it to files.
 *
 * @param entrypoint The path to the entrypoint source file.
 * @param destinationDir The directory to write the generated files to.
 * @returns The list of generated file paths.
 */
export type GeneratorFn = (entrypoint: string, destinationDir: string) => string[]

export type GenerateCommandResult = {
    artifacts: Artifact[],
    diagnostics: Diagnostic[],
    info: {
      generator: {
        name: string,
        version: string
      }
    }
  }

export async function generateCommand(entrypoint: string, generateOptions: GenerateOptions, artifactKind: ArtifactKind = "disk"): Promise<GenerateCommandResult> {
    
    const options = withDefaults({
        artifactKind,
        configFilepath: generateOptions.config,
        destinationDir: generateOptions.destination,
        entrypoint,
    })

    const services = createRadiantServices(NodeFileSystem, options).Radiant;
    let { model, diagnostics } = await extractAstNode<Model>(options.entrypoint, services);

    const config = loadConfig(options);

    // Replace descrete values with numerical values in the model
    model = replaceStateNames(config, model);

    // Replace underscores in activity names with whitespace
    model = actNameUnderscoreToWhitespace(model);

    // Generator selection
    let generator: Generator
    switch (config.generator.type) {
      case 'siddhi':
      default:
        generator = new SiddhiGenerator(model, config);
        break;
    }

    // Generate code
    const artifacts = generator.generate(options);

    return {
        artifacts,
        diagnostics,
        info: {
            generator: {
                name: generator.name,
                version: generator.version
            }
        }
    }
}

/**
 * Replace discrete values in a model with their corresponding numerical values.
 * The function loops over all activities in the process and replaces the discrete values
 * in the start, intermediate and end patterns with the corresponding numerical values
 * from the sensor defined in the config.
 *
 * @param config The configuration
 * @param model The model
 * @returns The modified model
 */
function replaceStateNames(config: Config, model: Model): Model {
    let sensor: Sensor;
    model.process.activities.forEach(a => {
        if (a.startPattern.cases.length > 0) {
            a.startPattern.cases.forEach(c => {
                c.conditions.forEach(c => {
                    sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                    c = replaceValue(c, sensor);
                });
            });
        } else {
            a.startPattern.conditions.forEach(c => {
                sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                c = replaceValue(c, sensor);
            });
        }
        a.intermediates.forEach(i => {
            if (i.cases.length > 0) {
                i.cases.forEach(c => {
                    c.conditions.forEach(c => {
                        sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                        c = replaceValue(c, sensor);
                    });
                });
            } else {
                i.conditions.forEach(c => {
                    sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                    c = replaceValue(c, sensor);
                });
            }
        });
        a.endPattern.conditions.forEach(c => {
            sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
            c = replaceValue(c, sensor);
        });
        if (a.endPattern.cases.length > 0) {
            a.endPattern.cases.forEach(c => {
                c.conditions.forEach(c => {
                    sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                    c = replaceValue(c, sensor);
                });
            });
        } else {
            a.endPattern.conditions.forEach(c => {
                sensor = config.stations.find(s => s.id === c.station)!.sensors.find(s => s.id === c.sensor)!;
                c = replaceValue(c, sensor);
            });
        }
    });
    return model;
}

/**
 * Replace underscores in activity names with whitespace.
 * 
 * @param model The model
 * @returns The modified model
 */
function actNameUnderscoreToWhitespace(model: Model): Model {
    model.process.activities.forEach(a => {
        a.name = a.name.replace(/_/g, ' ');
    });
    return model;
}


function replaceValue(condition: Condition, sensor: Sensor): Condition {
    switch (condition.$type) {
        case 'RangeCondition':
        case 'ChangeCondition':
            if (sensor.states && condition.value_from in sensor.states){
                condition.value_from = sensor!.states![condition.value_from].toString();
            }
            if (sensor.states && condition.value_to in sensor.states){
                condition.value_to = sensor!.states![condition.value_to].toString();
            }
            break;
        case 'IsEqualCondition':
        case 'IsHigherCondition':
        case 'IsHigherOrEqualCondition':
        case 'IsLowerCondition':
        case 'IsLowerOrEqualCondition':
            if (sensor.states && condition.value in sensor.states){
                condition.value = sensor!.states![condition.value].toString();
            }
        default:
            break;
    }
    return condition;
}

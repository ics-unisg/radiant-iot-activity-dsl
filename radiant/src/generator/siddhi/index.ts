import * as path from 'node:path';
import { CompositeGeneratorNode, joinToNode, toString } from 'langium/generate';
import type { Model } from '../../language/generated/ast.js';
import type { Generator } from '../index.js';
import { Config } from '../../config/schema.js';

import { emptyLineNode, getRelevantStationNames } from './util.js';
import { generateApp } from './app.js';
import { generateSource, generateDiscretizedSource, generateSourceToDiscMapper } from './source.js';
import { generateMqttSink, generatePatternSinkLog } from './sink.js';
import { generateActivityPattern, generateDetectActivityPattern, generateHighQuery } from './pattern.js';
import { RadiantOptions } from '../../config/options.js';
import { Artifact, DiskArtifact, MemoryArtifact } from '../artifact.js';

export class SiddhiGenerator implements Generator {
  readonly name = "Siddhi"
  readonly version = "0.1.0"

  model: Model
  config: Config

  constructor(model: Model, config: Config) {
    this.model = model;
    this.config = config;
  }

  /**
   * Generate Siddhi app code for the given model and write it to files.
   *
   * @param options The options for the generate command. The `destinationDir` property is used to determine the path to write the generated files to.
   * @returns The list of generated file paths.
   */
  generate(options: Required<RadiantOptions>): Artifact[] {

    const documents: Artifact[] = [];

    for (const activity of this.model.process.activities) {
      const filename = `${this.model.process.name}_${activity.name.replace(/\s+/g, '')}.siddhi`;
      const filepath = `${path.join(options.destinationDir, filename)}`;
      const relevant_station_names = getRelevantStationNames(activity);
      const relevant_stations = this.config.stations.filter(stat => relevant_station_names.includes(stat.id));
      const relevant_sources = this.config.sources.filter(source => relevant_stations.map(stat => stat.source).includes(source.id));
      const nodes: (CompositeGeneratorNode | undefined)[] = [
        generateApp(this.model, activity.name),

 

        joinToNode(relevant_sources, source => generateSource(source, activity.name), {
          separator: emptyLineNode
        }),

        joinToNode(relevant_sources, source => generateDiscretizedSource(source, this.config.stations.filter(stat => stat.source == source.id)[0]), {
          separator: emptyLineNode
        }),
        
        generatePatternSinkLog(
          this.config.generator.patterns_sink,
          "Low"
        ),

        generatePatternSinkLog(
          this.config.generator.patterns_sink,
          "High"
        ),

        // The main sink containing the detected activities
        // that is being published to the defined sink
        generateMqttSink(
          this.config.sink,
          "DetectedActivities",
          [
            ["activity", "string"],
            ["ts_start", "string"],
            ["ts_end", "string"]
          ],
          activity.name
        ),

        joinToNode(relevant_sources, source => generateSourceToDiscMapper(source, this.config.stations.filter(stat => stat.source == source.id)[0]), {
          separator: emptyLineNode
        }),

        generateActivityPattern(activity.startPattern, "StartPattern", activity.name, this.config, 1),
        generateHighQuery(1),

        joinToNode(
          activity.intermediates.flatMap((intermediate, i) => [
            generateActivityPattern(intermediate, "IntermediatePattern" + (i + 1), activity.name, this.config, i + 2),
            generateHighQuery(i + 2)
          ]),
          { separator: emptyLineNode }
        ),

        generateActivityPattern(activity.endPattern, "EndPattern", activity.name, this.config, activity.intermediates.length + 2),
        generateHighQuery(activity.intermediates.length + 2),

        generateDetectActivityPattern(activity.name, activity.intermediates.length)
      ]

      const rootNode = new CompositeGeneratorNode();
      for (let i = 0; i < nodes.length; i++) {
        rootNode
          .append(nodes[i])
          .appendNewLineIfNotEmpty()

        if (nodes[i] && (i + 1) < nodes.length) {
          rootNode.append(emptyLineNode)
        }
      }

      switch (options.artifactKind) {
        case 'memory':
          documents.push(new MemoryArtifact(`memory://${filename}`, toString(rootNode)))
          break
        case 'disk':
        default:
          documents.push(new DiskArtifact(filepath, toString(rootNode)))
          break
      }

    }

    return documents
  }
}


import { generateCommand, GenerateCommandResult } from '../../generator/index.js';
import { bgGreen, bgRed, bgYellow, bold, green, yellow } from 'yoctocolors';
import { logHeading } from '../cli-util.js';
import { Diagnostic } from 'vscode-languageserver';
import { deploy, DeployResult } from '../../adapter/index.js';

export type DeployOptions = {
  destination?: string
  config?: string
  dryRun?: boolean
}

/**
 * Action to generate and deploy siddhi code from a given radiant file
 * 
 * @param entrypoint The path to the entrypoint radiant file
 * @param opts The options to the deploy command
 */
export const deployAction = async (entrypoint: string, opts: DeployOptions): Promise<void> => {
    const startGen = Date.now();

    const { artifacts, diagnostics, info } = await generateCommand(entrypoint, opts, "memory")

    const endGen = Date.now();
    const durationGen = endGen - startGen;

    printWarnings(entrypoint, diagnostics);
    
    logHeading(`Generation | Completed successfully in ${durationGen}ms`, bgGreen)
    console.log(`Generator: ${info.generator.name} v${info.generator.version}`)
    console.log()
    console.log(bold('Generated files:'))
    artifacts
      .forEach(art => console.log(green(`+ ${art.filepath}`)))
    
    const startDep = Date.now();
    const result = await deploy(artifacts, entrypoint, opts)
    const endDep = Date.now();
    const durationDep = endDep - startDep;
      
    if (!result.success) {
      logHeading(`Deployment | Failed in ${durationDep}ms.`, bgRed)
      console.log(`Adapter: ${result.info.adapter.name} v${result.info.adapter.version}`);
      console.log(`Endpoint: ${result.info.adapter.endpoint}`)
      console.log()
      console.log(result.error?.stack)
      return
    }

    if (result.dryRun) {
      logHeading(`Deployment | Dry run completed successfully in ${durationDep}ms.`, bgGreen)
      console.log(`Adapter: ${result.info.adapter.name} v${result.info.adapter.version}`);
      console.log(`Endpoint: ${result.info.adapter.endpoint}`)
      console.log()
      console.log(bold('Expected changes:'));
      result.changeset.print()
    } else {
      logHeading(`Deployment | Completed successfully in ${durationDep}ms.`, bgGreen)
      console.log(`Adapter: ${result.info.adapter.name} v${result.info.adapter.version}`);
      console.log(`Endpoint: ${result.info.adapter.endpoint}`)
      console.log()
      console.log(bold('Deployed files:'))
      result.changeset.print()
    }
};


type GenerateAndDeployResult = {
  generateResult: GenerateCommandResult
  deployResult: DeployResult
}

export const generateAndDeploy = async (entrypoint: string, opts: DeployOptions): Promise<GenerateAndDeployResult> => {
    // TODO: proper error handling, bubbling up
    const generateResult = await generateCommand(entrypoint, opts, "memory")
    const deployResult = await deploy(generateResult.artifacts, entrypoint, opts)
      
    return {
      generateResult,
      deployResult
    }
    
};

function printWarnings(entrypoint: string, diagnostics: Diagnostic[]) {
    const warnings = diagnostics.filter(d => d.severity === 2);
    if (warnings.length > 0) {
        logHeading(`${warnings.length} ${warnings.length === 1 ? 'Warning' : 'Warnings'}:`, bgYellow)
    }
    warnings.forEach(warning => {
        console.log(yellow(`${entrypoint}:${warning.range.start.line}:${warning.range.start.character} ${warning.message}`)); 
    })
}

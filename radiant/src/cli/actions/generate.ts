import { generateCommand } from '../../generator/index.js';
import { bgGreen, bgYellow, bold, green, yellow } from 'yoctocolors';
import { logHeading } from '../cli-util.js';
import { Diagnostic } from 'vscode-languageserver';

export type GenerateOptions = {
    destination?: string;
    config?: string;
}

/**
 * Action to generate siddhi code from a given radiant file
 * 
 * @param entrypoint The path to the entrypoint radiant file
 * @param opts The options to the generate command
 */
export const generateAction = async (entrypoint: string, opts: GenerateOptions): Promise<void> => {
    const start = Date.now();

    const { artifacts, diagnostics, info } = await generateCommand(entrypoint, opts)

    const end = Date.now();
    const duration = end - start;

    printWarnings(entrypoint, diagnostics);
    
    logHeading(`Generation | Completed successfully in ${duration}ms`, bgGreen);
    console.log(`Generator: ${info.generator.name} v${info.generator.version}`);
    console.log()
    console.log(bold(`Generated files:`));
    artifacts
        .forEach(art => console.log(green(`+ ${art.filepath}`)))
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
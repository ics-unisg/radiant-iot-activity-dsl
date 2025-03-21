import { Command } from 'commander';
import { RadiantLanguageMetaData } from '../language/generated/module.js';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateAction } from './actions/generate.js';
import { previewConfigAction } from './actions/config-preview.js';
import { deployAction } from './actions/deploy.js';
import { generateSchemaAction } from './actions/schema.js';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
const packageContent = await fs.readFile(packagePath, 'utf-8');

/**
 * Entrypoint for the CLI
 */
export default function(): void {
    const program = new Command();

    program.version(JSON.parse(packageContent).version);

    const fileExtensions = RadiantLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-c, --config <file>', 'configuration file')
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates Siddhi code')
        .action(generateAction);

    program
        .command('deploy')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-c, --config <file>', 'configuration file')
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('--dry-run', 'show what would be deployed')
        .description('generates and deploys Siddhi code')
        .action(deployAction);

    program
        .command('config')
        .argument('<file>', 'configuration file')
        .description('preview configuration')
        .action(previewConfigAction);

    program
        .command('schema')
        .description('generate JSON schema for YAML config')
        .action(generateSchemaAction);

    program.parse(process.argv);
}

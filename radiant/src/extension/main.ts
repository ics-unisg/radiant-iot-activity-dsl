import type { LanguageClientOptions, ServerOptions} from 'vscode-languageclient/node.js';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node.js';
import { generateAction } from '../cli/actions/generate.js';
import { generateCommand } from '../generator/index.js';
import { generateAndDeploy } from '../cli/actions/deploy.js';

let client: LanguageClient;

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    client = startLanguageClient(context);
    registerGenerateCommand(context, client);
    registerDeployCommand(context, client);

    vscode.workspace.onDidSaveTextDocument((doc) => {
        if (vscode.workspace.getConfiguration("radiant").get("generateOnSave") === true) {
            generateAction(doc.fileName, {})
        }
    })
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client) {
        return client.stop();
    }
    return undefined;
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: '*', language: 'radiant' }]
    };

    // Create the language client and start the client.
    const client = new LanguageClient(
        'radiant',
        'Radiant',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    client.start();
    return client;
}

function registerGenerateCommand(context: vscode.ExtensionContext, client: LanguageClient) {
    registerCommand(context, "radiant.generate", async () => {
        const fileName = vscode.window.activeTextEditor?.document.fileName.toString()

        if (fileName !== undefined) {
            const result = await generateCommand(fileName, {})
            client.outputChannel.appendLine(JSON.stringify(result, undefined, 2))
        }
    })
}

function registerDeployCommand(context: vscode.ExtensionContext, client: LanguageClient) {
    registerCommand(context, "radiant.deploy", async () => {
        const fileName = vscode.window.activeTextEditor?.document.fileName.toString()

        if (fileName !== undefined) {
            const result = await generateAndDeploy(fileName, {})
            client.outputChannel.appendLine(JSON.stringify(result, undefined, 2))

            if (!result.deployResult.success) {
                vscode.window.showErrorMessage(`Deploy failed. Check output channel for more details.`)
                return
            }
            vscode.window.showInformationMessage(`Deployed successfully to ${result.deployResult.info.adapter.endpoint}`)
        }
    })
}

function registerCommand(context: vscode.ExtensionContext, command: string, commandHandler: (...args: any[]) => any) {
    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler))
}

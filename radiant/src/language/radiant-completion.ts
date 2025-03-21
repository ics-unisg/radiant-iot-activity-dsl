import { CompletionContext, DefaultCompletionProvider, NextFeature, CompletionAcceptor } from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import { RadiantConfigScopeProvider } from "./radiant-config.js";
import { RadiantServices } from "./radiant-module.js";
import { TimeUnits } from "./radiant-enums.js";

export class RadiantCompletionProvider extends DefaultCompletionProvider {
    private configProvider: RadiantConfigScopeProvider;

    constructor(services: RadiantServices) {
        super(services);
        this.configProvider = services.config.RadiantConfigScopeProvider;
    }

    protected override async completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): Promise<void> {
        await super.completionFor(context, next, acceptor);
        const conditionProperties = ["value_from", "value_to", "value"];
        
        this.configProvider.setEntrypoint(context.textDocument.uri);
        const stations = this.configProvider.getConfigScope().config.stations;
        const stationId = getTokensOnSameLine(context)[1];
        const sensorId = getTokensOnSameLine(context)[3];
        if (next.property === "station") {
            stations.forEach((scope) => {
                acceptor(context, {
                    label: scope.id,
                    kind: CompletionItemKind.Value,
                })
            });
        }
        if (next.property === "sensor") {
            const station = stations.find((s) => s.id === stationId);
            if (!station) {
                return;
            }
            station.sensors.forEach((sensor) => {
                acceptor(context, {
                    label: sensor.id,
                    kind: CompletionItemKind.Value,
                })
            });
        }
        if (next.property !== undefined && conditionProperties.includes(next.property!)) {
            const states = stations.find(s => s.id === stationId)?.sensors.find(s => s.id === sensorId)?.states
            if (states){
                Object.entries(states).forEach(([key, value]) => {
                    acceptor(context, {
                        label: key,
                        kind: CompletionItemKind.Value,
                    })
                });
            }
        }
        if (next.property === "time_unit") {
            Object.entries(TimeUnits).forEach(([key]) => {
                acceptor(context, {
                    label: key,
                    kind: CompletionItemKind.Value,
                })
            });
        }
    }

}

function getTokensOnSameLine(context: CompletionContext) {
    const document = context.document;
    const cursorOffset = context.offset;

    // Get the entire text content of the document
    const text = document.textDocument.getText();
    const lines = text.split(/\r\n?|\n/);

    // Find the line number of the cursor
    const cursorPosition = document.textDocument.positionAt(cursorOffset);
    const lineNumber = cursorPosition.line;

    // Get the text of the line where the cursor is located
    const lineText = lines[lineNumber];

    // Simple tokenization of the line (modify this to suit your grammar's needs)
    const lineTokens = lineText.split(/\s+/).filter(token => token.length > 0);

    return lineTokens;
}
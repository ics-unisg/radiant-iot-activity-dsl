# Radiant
Radiant is a Domain Specific Language [DSL] for monitoring and activity detection, especially in an CPS environment. This extension provides the complete set of tooling around the DSL including LSP, code generation and direct deployment to a Siddhi runner.

## Commands

### Generate
Generate the currently focused file via the command palette.

- Only available in `.rad` files
- Expects a `radiant.yaml` in the same directory

### Deploy
Generate and deploy the currently focused file via the command palette.

- Only available in `.rad` files
- Expects a `radiant.yaml` in the same directory

## Settings

### Generate on File Save
The extension has built in support for generation on file save. Given that the current file is a `.rad` file, the generation is triggered on file save. A `radiant.yaml` is expected to exist in the same directory as the `.rad` file. The output will be written into the default output directory. 

This setting is **enabled by default** but can be configured via the extension settings (see [Configuring extensions](https://code.visualstudio.com/docs/editor/extension-marketplace#_configuring-extensions)).

```json
# settings.json
{
  "radiant.generateOnSave": true,
}
```

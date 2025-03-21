<img src="radiant_logo.svg" width="200" />

## Getting Started
Follow the steps below to get started writing and deploying Radiant. Note that the published VSCode extension and NeoVim integration are not available in this anonymized repository during peer-review.

### 1. Install Extension Locally
First, for this demo usage you need to open this repository in VSCode. Furthermore, you need to have Node.js installed. Then, to use the extension locally in development mode follow the steps below:

```bash
cd radiant
npm install
npm run langium:generate
npm run build
```

Press `F5` to open a new window with your extension loaded.

### 2. Write Radiant & Generate Siddhi
Open one of the folders from the `examples` folder (`examples/healthcare` or `examples/factory`) with the VSCode window that has the extension loaded. Press `Ctrl-S` with the `.rad` file open. The generated Siddhi apps will appear in the `out` subfolder. You can modify the `.rad` or `.yaml` file, the Siddhi apps are regenerated on each save. For information on language features, please refer to the paper.

### 4. Deploy
The Siddhi apps can then be deployed with Siddhi. For testing we used the local Siddhi runner, version 5.1.

### 5. Detect
Produce real or simulated events on the incoming source streams and view the outoing sink for detected activities (e.g. using [MQTT Explorer](https://mqtt-explorer.com/)).

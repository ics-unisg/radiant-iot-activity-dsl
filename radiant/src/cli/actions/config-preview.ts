import { loadConfig } from "../../config/index.js";
import { withDefaults } from "../../config/options.js";

export const previewConfigAction = async (filepath: string): Promise<void> => {
  const opts = withDefaults({ entrypoint: '', configFilepath: filepath });

  const config = loadConfig(opts);
  console.dir(config, { depth: null });
}
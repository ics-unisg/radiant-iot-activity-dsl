import { expandToNode } from "langium/generate";
import { Model } from "../../language/generated/ast.js";

export function generateApp(model: Model, activityName: string) {
  return expandToNode`@App:name('${model.process.name}_${activityName.replace(/\s+/g, '')}')`.appendNewLine();
}



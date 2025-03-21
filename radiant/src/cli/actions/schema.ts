import { toJsonSchema } from "../../config/schema.js";

export async function generateSchemaAction() {
  console.log(JSON.stringify(toJsonSchema(), undefined, 2));
}
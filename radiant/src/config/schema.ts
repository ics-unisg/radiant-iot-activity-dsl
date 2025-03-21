import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const BaseSourceSchema = z.object({
  id: z.string(),
  type: z.enum(["http", "mqtt"]),
  schema: z.record(z.string()).optional().default({})
})

const HttpSourceSchema = BaseSourceSchema.merge(z.object({
  type: z.literal("http"),
  receiver_url: z.string().optional(),
  content_type: z.string().optional().default("json"),
}))
export type HttpSource = z.infer<typeof HttpSourceSchema>;

const MqttSourceSchema = BaseSourceSchema.merge(z.object({
  type: z.literal("mqtt"),
  url: z.string(),
  topic: z.string(),
  client_id: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  quality_of_service: z.number().int().gte(0).lte(2).optional(),
  clean_session: z.boolean().optional(),
  keep_alive: z.number().int().optional(),
  connection_timeout: z.number().int().optional(),
  content_type: z.string().optional().default("json"),
}));

export type MqttSource = z.infer<typeof MqttSourceSchema>;

const SourceSchema = z.discriminatedUnion("type", [
  HttpSourceSchema,
  MqttSourceSchema
])
export type Source = z.infer<typeof SourceSchema>;


const BaseSinkSchema = z.object({
  type: z.literal("mqtt"),
  url: z.string(),
  client_id: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  quality_of_service: z.number().int().gte(0).lte(2).optional(),
  clean_session: z.boolean().optional(),
  message_retain: z.boolean().optional(),
  keep_alive: z.number().int().optional(),
  connection_timeout: z.number().int().optional(),
})
export type BaseSink = z.infer<typeof BaseSinkSchema>

const MqttSinkSchema = BaseSinkSchema.merge(z.object({
  base_topic: z.string(),
  content_type: z.enum(["json", "json-xes"]).optional().default("json"),
}))
export type MqttSink = z.infer<typeof MqttSinkSchema>

const PatternSinkSchema = BaseSinkSchema.merge(z.object({
  topic: z.string(),
  content_type: z.literal("json"),
}))
export type PatternSink = z.infer<typeof PatternSinkSchema>


const DiscretizationSchema = z.object({
  lower: z.tuple([z.number().int(), z.string()]),
  intermediate: z.array(z.tuple([z.number().int(), z.number().int(), z.string()])).optional(),
  upper: z.tuple([z.number().int(), z.string()]),
})
export type Discretization = z.infer<typeof DiscretizationSchema>;

const SensorPropertiesSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["switch", "follow-source"]).optional().default("follow-source"),
  min_value: z.number().optional().default(0),
  max_value: z.number().optional().default(0),
  states: z.record(z.number()).optional(),
  discretization: DiscretizationSchema.optional()
})
export type SensorProperties = z.infer<typeof SensorPropertiesSchema>;

const PresetSchema = z.object({
  id: z.string(),
}).merge(SensorPropertiesSchema);
export type Preset = z.infer<typeof PresetSchema>;

const SensorSchema = z.object({
  id: z.string(),
  preset: z.string().optional()
}).merge(SensorPropertiesSchema);
export type Sensor = z.infer<typeof SensorSchema>;

const StationSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  sensors: z.array(SensorSchema)
})
export type Station = z.infer<typeof StationSchema>;

const BasicAuthSchema = z.object({
  type: z.literal("basic"),
  username: z.string(),
  password: z.string()
})
export type BasicAuth = z.infer<typeof BasicAuthSchema>;

const AuthSchema = z.discriminatedUnion("type", [
  BasicAuthSchema
])
export type Auth = z.infer<typeof AuthSchema>;

const SiddhiAdapterConfigSchema = z.object({
  type: z.literal("siddhi"),
  endpoint: z.string(),
  auth: AuthSchema.optional()
})
export type SiddhiAdapterConfig = z.infer<typeof SiddhiAdapterConfigSchema>;

const AdapterConfigSchema = z.discriminatedUnion("type", [
  SiddhiAdapterConfigSchema
])
export type AdapterConfig = z.infer<typeof AdapterConfigSchema>;

const SiddhiGeneratorConfigSchema = z.object({
  type: z.literal("siddhi"),
  // Optionally define a sink for the detected intermediate pattern events
  patterns_sink: PatternSinkSchema.optional()
})
export type SiddhiGeneratorConfig = z.infer<typeof SiddhiGeneratorConfigSchema>;

const GeneratorConfigSchema = z.discriminatedUnion("type", [
  SiddhiGeneratorConfigSchema
])
export type GeneratorConfig = z.infer<typeof GeneratorConfigSchema>

export const ConfigSchema = z.object({
  adapter: AdapterConfigSchema.optional(),
  generator: GeneratorConfigSchema.optional().default({ type: "siddhi" }),
  sources: z.array(SourceSchema),
  sink: MqttSinkSchema,
  presets: z.array(PresetSchema).optional().default([]),
  stations: z.array(StationSchema)
})
export type Config = z.infer<typeof ConfigSchema>;

export function toJsonSchema() {
  return zodToJsonSchema(ConfigSchema, 'radiant_config');
}

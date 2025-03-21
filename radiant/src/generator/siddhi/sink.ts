import { expandToNode, joinToNode } from "langium/generate";
import { MqttSink, PatternSink } from "../../config/schema.js";

export function generateLogSink(prefix: string, sinkId: string, schema: [string, string][]) {
  return expandToNode`@sink(type = 'log', prefix='${prefix}', priority='${(prefix === 'Selected Pattern Log') ? 'INFO' : 'DEBUG'}')
define Stream ${sinkId}(${schema.map(([name, type]) => `${name} ${type}`).join(', ')});`.appendNewLineIfNotEmpty()
}

export function generateMqttSink(sink: MqttSink, sinkId: string, schema: [string, string][], activityName: string) {
  const annotation = generateMqttSinkAnnotation(sink, activityName)
  const streamDefinition = expandToNode`define Stream ${sinkId}(${schema.map(([name, type]) => `${name} ${type}`).join(', ')});`

  return joinToNode([
    expandToNode`@sink(type = 'log', prefix='${sinkId}-Log', priority='INFO')`.appendNewLine(),
    annotation,
    streamDefinition
  ])
}

function generateMqttSinkAnnotation(sink: MqttSink, activityName: string) {
  let properties: string[] = [
    `type = '${sink.type}'`,
    `url = '${sink.url}'`,
    `topic = '${sink.content_type == "json-xes" ? `${sink.base_topic}/DefaultSource/DefaultCase/${activityName}` : sink.base_topic}'`,
  ]

  if (sink.username !== undefined) {
    properties.push(`username = '${sink.username}'`)
  }

  if (sink.password !== undefined) {
    properties.push(`password = '${sink.password}'`)
  }

  if (sink.quality_of_service !== undefined) {
    properties.push(`quality.of.service = '${sink.quality_of_service}'`)
  }

  if (sink.clean_session !== undefined) {
    properties.push(`clean.session = '${sink.clean_session}'`)
  }

  if (sink.message_retain !== undefined) {
    properties.push(`message.retain = '${sink.message_retain}'`)
  }

  if (sink.keep_alive !== undefined) {
    properties.push(`keep.alive = '${sink.keep_alive}'`)
  }

  if (sink.connection_timeout !== undefined) {
    properties.push(`connection.timeout = '${sink.connection_timeout}'`)
  }

  switch (sink.content_type) {
    // Using the XES format (in JSON) two events get published in the 
    // activity sink: one containing the start and one the end event using:
    // - lifecycle extension (https://www.xes-standard.org/lifecycle.xesext)
    // - time extension (https://www.xes-standard.org/time.xesext)
    //
    // Example:
    // {
    //   "event": {
    //     "lifecycle:transition":"start",
    //     "time:timestamp":"2023-03-20 11:49:34.30",
    //     "detection:type": "Burn"
    //   }
    // }
    // {
    //   "event": {
    //     "lifecycle:transition":"complete",
    //     "time:timestamp":"2023-03-20 11:49:56.58",
    //     "detection:type": "Burn"
    //   }
    // }
    case "json-xes":
      const propertiesStart = properties
      const propertiesComplete = Array.from(properties) // clone by value not by reference
      if (sink.client_id !== undefined) {
        propertiesStart.push(`client.id = '${sink.client_id}.start'`)
        propertiesComplete.push(`client.id = '${sink.client_id}.complete'`)
      }

      propertiesStart.push(`@map(type = 'json', enclosing.element = '$.event', validate.json = 'true', @payload("""{"lifecycle:transition":"start", "time:timestamp":"{{ts_start}}"}"""))`)
      propertiesComplete.push(`@map(type = 'json', enclosing.element = '$.event', validate.json = 'true', @payload("""{"lifecycle:transition":"complete", "time:timestamp":"{{ts_end}}"}"""))`)

      return joinToNode([
        expandToNode`@sink(${propertiesStart.join(', ')})`,
        expandToNode`@sink(${propertiesComplete.join(', ')})`,
      ], { appendNewLineIfNotEmpty: true })

    default:
      if (sink.client_id !== undefined) {
        properties.push(`client.id = '${sink.client_id}'`)
      }

      properties.push(`@map(type = '${sink.content_type}')`)
      return expandToNode`@sink(${properties.join(', ')})`.appendNewLine()
  }
}

export function generatePatternSink(sink: PatternSink, sinkId: string, schema: [string, string][]) {
  const annotation = generatePatternSinkAnnotation(sink)
  const streamDefinition = expandToNode`define Stream ${sinkId}(${schema.map(([name, type]) => `${name} ${type}`).join(', ')});`

  return joinToNode([
    expandToNode`@sink(type = 'log', prefix='${sinkId}-Log', priority='INFO')`.appendNewLine(),
    annotation,
    streamDefinition
  ])
}

function generatePatternSinkAnnotation(sink: PatternSink) {
  let properties: string[] = [
    `type = '${sink.type}'`,
    `url = '${sink.url}'`,
    `topic = '${sink.topic}'`,
  ]

  if (sink.username !== undefined) {
    properties.push(`username = '${sink.username}'`)
  }

  if (sink.password !== undefined) {
    properties.push(`password = '${sink.password}'`)
  }

  if (sink.quality_of_service !== undefined) {
    properties.push(`quality.of.service = '${sink.quality_of_service}'`)
  }

  if (sink.clean_session !== undefined) {
    properties.push(`clean.session = '${sink.clean_session}'`)
  }

  if (sink.message_retain !== undefined) {
    properties.push(`message.retain = '${sink.message_retain}'`)
  }

  if (sink.keep_alive !== undefined) {
    properties.push(`keep.alive = '${sink.keep_alive}'`)
  }

  if (sink.connection_timeout !== undefined) {
    properties.push(`connection.timeout = '${sink.connection_timeout}'`)
  }

  if (sink.client_id !== undefined) {
    properties.push(`client.id = '${sink.client_id}'`)
  }

  properties.push(`@map(type = '${sink.content_type}')`)
  return expandToNode`@sink(${properties.join(', ')})`.appendNewLine()
}

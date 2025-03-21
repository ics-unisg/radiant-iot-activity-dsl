import { expandToNode, joinToNode } from "langium/generate"
import { Discretization, Source, Station } from "../../config/schema.js"

export function generateSource(source: Source, activityName: string) {
  let properties = [
    `type = '${source.type}'`,
  ]

  switch (source.type) {
    case 'mqtt':
      properties.push(`url = '${source.url}'`)
      properties.push(`topic = '${source.topic}'`)
      properties.push(`client.id = '${source.client_id}.${activityName}'`)

      if (source.username !== undefined) {
        properties.push(`username = '${source.username}'`)
      }

      if (source.password !== undefined) {
        properties.push(`password = '${source.password}'`)
      }

      if (source.quality_of_service !== undefined) {
        properties.push(`quality.of.service = '${source.quality_of_service}'`)
      }

      if (source.clean_session !== undefined) {
        properties.push(`clean.session = '${source.clean_session}'`)
      }

      if (source.keep_alive !== undefined) {
        properties.push(`keep.alive = '${source.keep_alive}'`)
      }

      if (source.connection_timeout !== undefined) {
        properties.push(`connection.timeout = '${source.connection_timeout}'`)
      }
      break

    case 'http':
      if (source.receiver_url !== undefined) {
        properties.push(`receiver.url = '${source.receiver_url}'`)
      }
  }
  const attributes = Object.entries(source.schema || {}).map(e => `${e[0]} = '$.${e[0]}'`).join(', ')

  properties.push(`@map(type = '${source.content_type}', @attributes(${attributes}))`)

  const flatSchema = Object.entries(source.schema || {}).map(e => `${e[0]} ${e[1]}`).join(', ')

  return joinToNode([
    expandToNode`@source(${properties.join(', ')})`,
    expandToNode`define stream ${source.id}(${flatSchema});`
  ], { appendNewLineIfNotEmpty: true })
}

export function generateDiscretizedSource(source: Source, station: Station) {
  const rel_discretization_sens: {disc: Discretization | undefined, sens_id: string}[] = station.sensors.map(s => ({disc: s.discretization, sens_id: s.id}));
  const rel_discretization_sens_map: Map<string, Discretization | undefined> = new Map(
    rel_discretization_sens.map((s) => [s.sens_id, s.disc])
  );
  
  const flatSchema = Object.entries(source.schema || {}).map(e => `${e[0]} ${rel_discretization_sens_map.get(e[0]) == undefined ? e[1] : "string"}`).join(', ')

  return joinToNode([
    expandToNode`define stream ${source.id}Disc(${flatSchema});`
  ], { appendNewLineIfNotEmpty: true })
}

export function generateSourceToDiscMapper(source: Source, station: Station) {
  const rel_discretization_sens: {disc: Discretization | undefined, sens_id: string}[] = station.sensors.map(s => ({disc: s.discretization, sens_id: s.id}));
  const rel_discretization_sens_map: Map<string, Discretization | undefined> = new Map(
    rel_discretization_sens.map((s) => [s.sens_id, s.disc])
  );
  
  let sensorDiscretizedStrings = []
  for (const stat of station.sensors) {
    if (rel_discretization_sens_map.get(stat.id) == undefined) {
      sensorDiscretizedStrings.push(`${stat.id} as ${stat.id}`)
    }
    else {
      let discStrCurr = `ifThenElse(${stat.id} <= ${rel_discretization_sens_map.get(stat.id)?.lower[0]}, '${rel_discretization_sens_map.get(stat.id)?.lower[1]}'`
      for (const disc of rel_discretization_sens_map.get(stat.id)?.intermediate || []) {
        discStrCurr += `, ifThenElse(${stat.id} > ${disc[0]} and ${stat.id} <= ${disc[1]}, '${disc[2]}'`
      }
      discStrCurr += `, ifThenElse(${stat.id} > ${rel_discretization_sens_map.get(stat.id)?.upper[0]}, '${rel_discretization_sens_map.get(stat.id)?.upper[1]}', 'ERROR'`
      // make sure right amount of closing brackets
      discStrCurr += ')'.repeat(rel_discretization_sens_map.get(stat.id)?.intermediate?.length || 0) + '))'
      sensorDiscretizedStrings.push(`${discStrCurr} as ${stat.id}`)
    }
  }


  return joinToNode([
    expandToNode`@info(name = '${source.id}DiscMapper')`,
    expandToNode`from ${source.id}`,
    expandToNode`select timestamp as timestamp, ${sensorDiscretizedStrings.join(', ')}`,
    expandToNode`insert into ${source.id}Disc;`
  ], { appendNewLineIfNotEmpty: true })
}

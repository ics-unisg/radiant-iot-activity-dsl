export default {
  generator: { type: 'siddhi' },
  sources: [
    {
      id: 'IncomingStream',
      type: 'mqtt',
      url: 'tcp://radiant.example:1883',
      client_id: 'mqtt.radiant.demo',
      topic: 'DemoIncoming',
      content_type: 'json',
      schema: {
        id: 'string',
        station: 'string',
        timestamp: 'string',
        i1_pos_switch: 'int',
        i2_pos_switch: 'int',
      }
    }
  ],
  sink: {
    type: 'mqtt',
    url: 'tcp://radiant.example:1883',
    client_id: 'mqtt.radiant.demo',
    base_topic: 'Demo',
    content_type: 'json'
  },
  presets: [],
  stations: [
    {
      id: 'IncomingStream',
      name: 'Incoming Demo Stream',
      source: 'IncomingStream',
      sensors: [
        {
          id: 'i1_pos_switch',
          type: 'int',
          min_value: 0,
          max_value: 1,
          states: { off: 0, on: 1 }
        },
        {
          id: 'i2_pos_switch',
          type: 'int',
          min_value: 0,
          max_value: 1,
          states: { off: 0, on: 1 }
        },
      ]
    }
  ]
}

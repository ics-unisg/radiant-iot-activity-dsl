import { expandToNode, joinToNode } from "langium/generate";
import { Condition, Pattern } from "../../language/generated/ast.js";
import { Config } from "../../config/schema.js";

export function generateActivityPattern(pattern: Pattern, patternName: String, activityName: String, config: Config, num: number) {
  const nameNode = expandToNode`@info(name="${patternName}")`;
  let patternNode;
  if (containsChangePattern(pattern)) {
    patternNode = generateChangePattern(pattern, config);
  } else {
    patternNode = generateSimplePattern(pattern, config);
  }
  const timestamp = containsChangePattern(pattern) ? "e1.timestamp" : "timestamp";
  const eventNode = expandToNode`select "${patternName}" as event, "${activityName}" as activity, ${timestamp} as ts, ${num} as num`;
  const insertNode = expandToNode`insert into DetectedPatternsLow;`;

  return joinToNode([nameNode, patternNode, eventNode, insertNode], {
    appendNewLineIfNotEmpty: true
  });
}

export function generateHighQuery(curr_num: number) {
  const nameNode = expandToNode`@info(name="HighQuery-${curr_num}")`;
  let fromNode;
  if (curr_num == 1) {
    fromNode = expandToNode`from every l = DetectedPatternsLow[num == ${curr_num}]`;
  } else {
    fromNode = expandToNode`from every DetectedPatternsHigh[num == ${curr_num-1}] -> l = DetectedPatternsLow[num == ${curr_num}]`;
  }
  const eventNode = expandToNode`select l.event as event, l.activity as activity, l.ts as ts, l.num as num`;
  const insertNode = expandToNode`insert into DetectedPatternsHigh;`;


  return joinToNode([nameNode, fromNode, eventNode, insertNode], {
    appendNewLineIfNotEmpty: true
  });
}

function generateSimplePattern(pattern: Pattern, config: Config) {
  let source;
  if (pattern.cases.length > 0) {
    source = getStationSource(pattern.cases[0].conditions[0].station, config);
    return expandToNode`from ${source}Disc[${pattern.cases.map(ca => '(' + ca.conditions.map(c => generateCondition(c)).join(' and ') + ')').join(' or ')}]`;
  } else {
    source = getStationSource(pattern.conditions[0].station, config);
    return expandToNode`from ${source}Disc[${pattern.conditions.map(c => generateCondition(c)).join(' and ')}]`;
  }
}

function generateChangePattern(pattern: Pattern, config: Config) {
  let source;
  var timeConstraint = getTimeConstraint(pattern);
  if (pattern.cases.length > 0) {
    source = getStationSource(pattern.cases[0].conditions[0].station, config);
    return expandToNode`from every e1 = ${source}Disc, e2 = ${source}Disc[${pattern.cases.map(ca => '(' + ca.conditions.map(c => generateCondition(c)).join(' and ') + ')').join(' or ')}] ${timeConstraint}`;
  } else {
    source = getStationSource(pattern.conditions[0].station, config);
    return expandToNode`from every e1 = ${source}Disc, e2 = ${source}Disc[${pattern.conditions.map(c => generateCondition(c)).join(' and ')}] ${timeConstraint}`;
  }
}

function maybeApos(value: string) {
  return isNaN(Number(value)) ? `'${value}'` : value;
}

function generateCondition(condition: Condition): string {
  switch (condition.$type) {
    case 'ChangeCondition':
      return `(e1.${condition.sensor}==${maybeApos(condition.value_from)} and e2.${condition.sensor}==${maybeApos(condition.value_to)})`
    case 'RangeCondition':
      return `(${condition.sensor} >= ${maybeApos(condition.value_from)} and ${condition.sensor} <= ${maybeApos(condition.value_to)})`
    case 'IsEqualCondition':
      return `(${condition.sensor} == ${maybeApos(condition.value)})`
    case 'IsHigherCondition':
      return `(${condition.sensor} > ${maybeApos(condition.value)})`
    case 'IsHigherOrEqualCondition':
      return `(${condition.sensor} >= ${maybeApos(condition.value)})`
    case 'IsLowerCondition':
      return `(${condition.sensor} < ${maybeApos(condition.value)})`
    case 'IsLowerOrEqualCondition':
      return `(${condition.sensor} <= ${maybeApos(condition.value)})`
    case 'DecreasingCondition':
      return `(e1.${condition.sensor} > e2.${condition.sensor})`
    case 'IncreasingCondition':
      return `(e1.${condition.sensor} < e2.${condition.sensor})`
    case 'ChangingCondition':
      return `(e1.${condition.sensor} != e2.${condition.sensor})`
    default:
      // unreachable
      return ''
  }
}

export function generateDetectActivityPattern(activity_name: string, num_intermediates: number) {
  const nameNode = expandToNode`@info(name="Detect-Activity")`;
  let fromNode = 'from every e1 = DetectedPatternsLow[event == "StartPattern"]'
  for (let i = 1; i <= num_intermediates; i++) {
    fromNode += ` -> not DetectedPatternsLow[event == "StartPattern"] and e${i + 1} = DetectedPatternsLow[event == "IntermediatePattern${i}" and time:timestampInMilliseconds(ts, 'yyyy-MM-dd HH:mm:ss.SS') >= time:timestampInMilliseconds(e${i}.ts, 'yyyy-MM-dd HH:mm:ss.SS')]`
  }
  fromNode += ` -> not DetectedPatternsLow[event == "StartPattern"] and e${num_intermediates + 2} = DetectedPatternsLow[event == "EndPattern" and time:timestampInMilliseconds(ts, 'yyyy-MM-dd HH:mm:ss.SS') >= time:timestampInMilliseconds(e${num_intermediates + 1}.ts, 'yyyy-MM-dd HH:mm:ss.SS')]`;
  const selectNode = expandToNode`select "${activity_name}" as activity, e1.ts as ts_start, e${num_intermediates + 2}.ts as ts_end`;
  const insertNode = expandToNode`insert into DetectedActivities;`;

  return joinToNode([nameNode, fromNode, selectNode, insertNode], {
    appendNewLineIfNotEmpty: true
  });
}


function containsChangePattern(pattern: Pattern) {
  let match = false;
  if (pattern.cases.length > 0) {
    pattern.cases.forEach(c => {
      c.conditions.forEach(cond => {
        if (isChangePattern(cond.$type)) {
          match = true;
        }
      });
    })
  } else {
    pattern.conditions.forEach(cond => {
      if (isChangePattern(cond.$type)) {
        match = true;
      }
    });
  }
  return match;
}

function isChangePattern(type: string) {
  return type === 'DecreasingCondition' || type === 'IncreasingCondition' || type === 'ChangeCondition' || type === 'ChangingCondition';
}

function getStationSource(station: string, config: Config) {
  return config.stations.find(s => s.id === station)!.source;
}

function getTimeConstraint(pattern: Pattern) {
  var timeConstraint = '';
  if (pattern.cases.length > 0) {
    pattern.cases.forEach(c => {
      c.conditions.forEach(cond => {
        if (cond.$type === 'ChangeCondition' && cond.time_constraint.length > 0) {
          console.log("Time Constraint")
          console.log(cond.time_constraint)
          console.log("Duration")
          console.log(cond.time_constraint[0].time_unit)
          timeConstraint = `within ${cond.time_constraint[0].amount} ${cond.time_constraint[0].time_unit}`;
        }
      })
    });
  } else {
    pattern.conditions.forEach(cond => {
      if (cond.$type === 'ChangeCondition' && cond.time_constraint.length > 0) {
        timeConstraint = `within ${cond.time_constraint[0].amount} ${cond.time_constraint[0].time_unit}`;
      }
    });
  }
  return timeConstraint;
}

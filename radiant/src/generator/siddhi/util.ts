import { expandToNode } from "langium/generate";
import { Activity, EndPattern, Intermediate, StartPattern } from "../../language/generated/ast.js";

export const emptyLineNode = expandToNode``.appendNewLine();

export function getRelevantStationNames(activity: Activity) {
    let relevant_stations: string[] = [];
    relevant_stations.push(...getStationNamesPattern(activity.startPattern));
    activity.intermediates.forEach(intermediate => {
        relevant_stations.push(...getStationNamesPattern(intermediate));
    }
    )
    relevant_stations.push(...getStationNamesPattern(activity.endPattern));
    // remove duplicates
    return Array.from(new Set(relevant_stations));
}

function getStationNamesPattern(pattern: (StartPattern | Intermediate | EndPattern)) {
    let stations: string[] = [];
    pattern.cases.forEach(c => {
        c.conditions.forEach(cond => {
            if (cond.station) {
                stations.push(cond.station);
            }
        }
        )
    }
    )
    pattern.conditions.forEach(cond => {
        if (cond.station) {
            stations.push(cond.station);
        }
    }
    )
    return stations;
}
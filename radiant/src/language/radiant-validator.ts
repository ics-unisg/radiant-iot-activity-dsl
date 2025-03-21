import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { Activity, ChangeCondition, Condition, Pattern, Process, RadiantAstType, TimeConstraint } from './generated/ast.js';
import type { RadiantServices } from './radiant-module.js';
import { RadiantConfigScopeProvider } from './radiant-config.js';
import { Sensor } from '../config/schema.js';
import { TimeUnits } from './radiant-enums.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RadiantServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.RadiantValidator;
    const validators: ValidationChecks<RadiantAstType> = {
        Process: validator.checkProcess,
        Activity: validator.checkActivity,
        Pattern: validator.checkPattern,
        Condition: validator.checkCondition,
        TimeConstraint: validator.checkTimeConstraint
    };
    registry.register(validators, validator);
}

/**
 * Implementation of custom validations.
 */
export class RadiantValidator {
    private readonly scope: RadiantConfigScopeProvider;

    constructor(services: RadiantServices) {
        this.scope = services.config.RadiantConfigScopeProvider;
    }

    checkProcess(process: Process, accept: ValidationAcceptor): void {
        if (process.name) {
            const firstChar = process.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Process name should start with a capital.', { node: process, property: 'name' });
            }
        }
        const names = new Set<string>();
        for (const activity of process.activities) {
            if (names.has(activity.name)) {
                accept('error', `Activity name '${activity.name}' is not unique.`, { node: activity, property: 'name' });
            } else {
                names.add(activity.name);
            }
        }
    }

    checkActivity(activity: Activity, accept: ValidationAcceptor): void {
        if (activity.name) {
            const firstChar = activity.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Activity name should start with a capital.', { node: activity, property: 'name' });
            }
        }
        // check that no other pattern has the same condition as the start pattern TODO
    }

    checkPattern(pattern: Pattern, accept: ValidationAcceptor): void {
        if (pattern.cases.length > 0) {
            const firstStation = pattern.cases[0].conditions[0].station;
            pattern.cases.forEach(c => {
                c.conditions.forEach(cond => {
                    if (cond.station !== firstStation) {
                        accept('error', `All conditions of a pattern should have the same station.`, { node: pattern });
                    }
                });
            });
            var timeConstraints = 0;
            pattern.cases.forEach(c => {
                c.conditions.forEach(cond => {
                    if (cond.$type === 'ChangeCondition' && cond.time_constraint.length > 0) {
                        timeConstraints++;
                    }
                    if (timeConstraints > 1) {
                        accept('error', `A pattern can have only one condition with time constraint. For all other conditions the time constraint is applied automatically.`, { node: pattern });
                    }
                })
            })
        }
        if (pattern.conditions.length > 0) {
            const firstStation = pattern.conditions[0].station;
            pattern.conditions.forEach(c => {
                if (c.station !== firstStation) {
                    accept('error', `All conditions of a pattern should have the same station.`, { node: pattern });
                }
            });
        }
        var changePatterns = pattern.conditions.filter(c => c.$type === 'ChangeCondition' && c.time_constraint.length > 0) as ChangeCondition[];
        if (changePatterns.length > 1) {
            accept('error', `A pattern can have only one change pattern with time constraint.`, { node: pattern });
        }
    }

    checkCondition(condition: Condition, accept: ValidationAcceptor): void {
        const config = this.scope.getConfigScope().config;
        // Check if station of condition is defined in the config
        const station = config.stations.find(s => s.id === condition.station);
        if (!station) {
            accept('error', `Station '${condition.station}' is not defined in the config.`, { node: condition, property: 'station' });
        }
        // Check if sensor of condition is defined in the config and belongs to the station
        const sensor = station?.sensors.find(s => s.id === condition.sensor);
        if (!sensor) {
            accept('error', `Sensor '${condition.sensor}' is not defined in the config.`, { node: condition, property: 'sensor' });
            return;
        };
        // Check if sensor values are within allowed range
        switch (condition.$type) {
            case 'ChangeCondition':
            case 'RangeCondition':
                try {
                    getSensorValue(sensor, condition.value_from);
                } catch (e) {
                    accept('error', (e as Error).message, { node: condition, property: 'value_from' });
                    return;
                }
                try {
                    getSensorValue(sensor, condition.value_to);
                } catch (e) {
                    accept('error', (e as Error).message, { node: condition, property: 'value_to' });
                    return;
                }
                break;
            case 'IsEqualCondition':
            case 'IsHigherCondition':
            case 'IsLowerCondition':
            case 'IsHigherOrEqualCondition':
            case 'IsLowerOrEqualCondition':
                try {
                    getSensorValue(sensor, condition.value);
                } catch (e) {
                    accept('error', (e as Error).message, { node: condition, property: 'value' });
                    return;
                }
            default:
                break;
        }
    }

    checkTimeConstraint(timeConstraint: TimeConstraint, accept: ValidationAcceptor): void {
        const amount: number =+ timeConstraint.amount;
        if (amount < 1) {
            accept('error', `Time constraint amount should be at least 1.`, { node: timeConstraint, property: 'amount' });
        }
        if (!Object.keys(TimeUnits).includes(timeConstraint.time_unit)) {
            accept('error', `Time unit not supported.`, { node: timeConstraint, property: 'time_unit' });
        }
    }
}

function isNumeric(str: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(str);
}

function getSensorValue(sensor: Sensor, state: string): void {
    let possible_discretized_values: string[] = [];
    if (sensor.discretization) {
        possible_discretized_values.push(sensor.discretization.lower[1]);
        if (sensor.discretization.intermediate) {
            sensor.discretization.intermediate.forEach(i => possible_discretized_values.push(i[2]));
        }
        possible_discretized_values.push(sensor.discretization.upper[1]);
    }
    let value;
    if (isNumeric(state)) {
        value = parseFloat(state);
    } else if (sensor.states && Object.keys(sensor.states).includes(state)) {
        value = sensor.states[state];
    } else if (sensor.discretization && possible_discretized_values.includes(state)) {
        return;
    } else {
        throw Error("Invalid state: " + state);
    }
    if (value < sensor!.min_value || value > sensor!.max_value) {
        throw Error("Value out of range. Allowed range: " + sensor!.min_value + "-" + sensor!.max_value);
    }
}


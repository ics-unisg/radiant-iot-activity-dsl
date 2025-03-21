grammar Radiant

entry Model:
    process=Process;

Process:
    'Process' name=ID ':'
        (activities+=Activity)*;

Activity:
    'Activity' name=ID ':'
        startPattern=StartPattern
        (intermediates+=Intermediate)*
        endPattern=EndPattern;

Pattern:
    StartPattern | Intermediate | EndPattern;

StartPattern:
    'Start:'
        (conditions+=Condition+ | cases+=CasePattern+);

Intermediate:
    'Intermediate:'
        (conditions+=Condition | cases+=CasePattern)+;

EndPattern:
    'End:'
        (conditions+=Condition | cases+=CasePattern)+;

CasePattern:
    'Case:'
        (conditions+=Condition)+;

Condition:
    ChangeCondition | RangeCondition | IsEqualCondition | IsLowerCondition | IsLowerOrEqualCondition | IsHigherCondition | IsHigherOrEqualCondition | IncreasingCondition | DecreasingCondition | ChangingCondition;

ChangeCondition:
    'In' station=ID 'sensor' sensor=ID 'changes_from' value_from=VALUE 'to' value_to=VALUE (time_constraint+=TimeConstraint)*';';

RangeCondition:
    'In' station=ID 'sensor' sensor=ID 'in_range' value_from=VALUE 'to' value_to=VALUE';';

IsEqualCondition:
    'In' station=ID 'sensor' sensor=ID 'is_equal' value=VALUE';';

IsLowerCondition:
    'In' station=ID 'sensor' sensor=ID 'is_lower' value=VALUE';';

IsLowerOrEqualCondition:
    'In' station=ID 'sensor' sensor=ID 'is_lower_or_equal' value=VALUE';';

IsHigherCondition:
    'In' station=ID 'sensor' sensor=ID 'is_higher' value=VALUE';';

IsHigherOrEqualCondition:
    'In' station=ID 'sensor' sensor=ID 'is_higher_or_equal' value=VALUE';';

IncreasingCondition:
    'In' station=ID 'sensor' sensor=ID 'is_increasing'';';

DecreasingCondition:
    'In' station=ID 'sensor' sensor=ID 'is_decreasing'';';

ChangingCondition:
    'In' station=ID 'sensor' sensor=ID 'is_changing'';';

TimeConstraint:
    'within' amount=INT time_unit=ID;


hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal FLOAT: /-?[0-9]+[.][0-9]+/;
terminal INT: /-?[0-9]+/;
VALUE returns string: FLOAT | INT | ID;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

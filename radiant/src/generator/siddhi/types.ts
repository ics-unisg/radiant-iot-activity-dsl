type AttributeTypeUpper = 'STRING' | 'INT' | 'LONG' | 'DOUBLE' | 'FLOAT' | 'BOOL' | 'OBJECT'; 
type AttributeTypeLower = Lowercase<AttributeTypeUpper>
export type AttributeType = AttributeTypeUpper | AttributeTypeLower
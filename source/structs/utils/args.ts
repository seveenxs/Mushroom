export type Prettify<I> = {
    [K in keyof I]: I[K]
};

export type FormatterTypes = {
    str: string;
    num: number;
    bool: boolean;
};

export type Formatter<Segment extends string> =
    Segment extends `${infer Type}:${infer Key}` 
        ? Type extends keyof FormatterTypes 
            ? Record<Key, FormatterTypes[Type]> 
            : never 
        : Segment extends `${infer Type}[]:${infer Key}`
            ? Type extends keyof FormatterTypes
                ? Record<Key, FormatterTypes[Type][]>
                : never : never;
//

export type Args<Id> =
    Id extends `[${infer Arguments}]`
        ? Arguments extends `${infer Segment}, ${infer Arg}`
            ? Segment extends `${string}:${string}`
                ? Formatter<Segment> & Args<`[${Arg}]`>
                : Args<`[${Arg}]`>
            : Arguments extends `${string}:${string}`
                ? Formatter<Arguments>
                : {}
        : Id extends `${string}:${string}`
            ? Formatter<Id>
            : {};
//

export function getArguments<Definition extends string>(definition: Definition, customId: string):  Prettify<Args<Definition>> | null {
    const defArr = definition.replace(/\[|\]/g, '').split(',').map(item => item.trim());
    const customArr = customId.replace(/\[|\]/g, '').split(',').map(item => item.trim());

    if (defArr.length !== customArr.length) return null;

    const result: Record<string, any> = {};

    for (let i = 0; i < defArr.length; i++) {
        const defItem = defArr[i];
        const customItem = customArr[i];

        const [type, key] = defItem.split(':');
        
        if (type && key) {
            if (type === 'bool') {
                result[key] = customItem === 'true';
            } else if (type === 'num') {
                result[key] = Number(customItem);
            } else if (type === 'str') {
                result[key] = customItem;
            }
        }
    }

    return result as Prettify<Args<Definition>>;
}
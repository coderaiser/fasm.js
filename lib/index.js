import {createBlinkStore} from './blink/store.js';

export const translate = async (source) => {
    const blinkStore = await createBlinkStore(source);
    const blink = blinkStore.getInstance();
    
    blink.loadASM(source);
    
    await blink.waitForState([
        blink.states.PROGRAM_LOADED,
        blink.states.PROGRAM_STOPPED,
        blink.states.READY,
    ]);
    
    const out = blink
        .assembler_logs
        .split('\n')
        .slice(2)
        .join('\n');
    
    const places = blink.assembler_errors;
    
    if (!places.length)
        return [
            blink.readTranslated(),
            places,
            out,
        ];
    
    return [
        [],
        places.map(convertPlace(source)),
        out,
    ];
};

const convertPlace = (source) => ({line, error}) => {
    const instr = source.split('\n')[line - 1];
    const trimmed = instr.trim();
    const message = error.replace('error: ', '');
    
    return {
        column: 0,
        line,
        message: `${message.slice(0, -1)}: '${trimmed}'`,
    };
};

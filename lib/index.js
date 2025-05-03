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
    
    const out = blink.assembler_logs.split('\n').slice(2)
        .join('\n');
    const places = blink.assembler_errors;
    
    if (!places.length)
        return [places, blink.readTranslated(), out];
    
    return [places, [], out];
};

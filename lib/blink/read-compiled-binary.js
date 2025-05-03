export const readCompiledBinary = (blink) => {
    const startPtr = blink.m.getPtr('dis__buffer');
    const lines = blink.m.getPtr('dis__max_lines');
    const line_len = blink.m.getPtr('dis__max_line_len');
    const mem = blink.m.memView;
    
    // -----------------
    // Redraw everything
    // -----------------
    const result = new Uint8Array(line_len * lines);
    
    for (let i = 0; i < lines; i++) {
        for (let j = 0; j < line_len; j++) {
            const currentCount = i * line_len + j;
            const ch = mem.getUint8(startPtr + currentCount);
            
            if (!ch)
                break;
            
            //const str = String.fromCharCode(ch);
            result[currentCount] = ch;
        }
    }
    
    return result;
};

function getFirstLine(mem, startPtr, line_len) {
    let str = '';
    
    for (let j = 0; j < line_len; j++) {
        const ch = mem.getUint8(startPtr + j);
        
        if (!ch)
            break;
        
        str += String.fromCharCode(ch);
    }
    
    return str;
}


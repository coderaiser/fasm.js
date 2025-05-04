import {test} from 'supertape';
import montag from 'montag';
import {translate} from '../lib/index.js';

test('fasm.js: translate', async (t) => {
    const source = montag`
        org 7c00h
        use16
        xor ax, ax
    `;
    
    const [, result] = await translate(source);
    const expected = new Uint8Array([0x31, 0xc0]);
    
    t.deepEqual(result, expected);
    t.end();
});

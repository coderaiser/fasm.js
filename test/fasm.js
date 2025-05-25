import {test} from 'supertape';
import montag from 'montag';
import {translate} from '../lib/index.js';

test('fasm.js: translate', async (t) => {
    const source = montag`
        org 7c00h
        use16
        xor ax, ax
    `;
    
    const [result] = await translate(source);
    const expected = new Uint8Array([0x31, 0xc0]);
    
    t.deepEqual(result, expected);
    t.end();
});

test('fasm.js: translate: error', async (t) => {
    const source = '    if (a)';
    
    const [, errors] = await translate(source);
    const [first] = errors;
    const expected = `missing end directive: 'if (a)'`;
    
    t.equal(first.message, expected);
    t.end();
});

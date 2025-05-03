#!/usr/bin/env node
import process from 'node:process';
import {readFileSync, writeFileSync} from 'node:fs';
import {translate} from '../lib/index.js';

const [name] = process.argv.slice(2);

if (!name) {
    console.log('flat assembler  version 1.73.32');
    console.log('usage: fasm [name]');
    process.exit(1);
}

const source = readFileSync(name, 'utf8');
const [places, buffer, stdout] = await translate(source);

if (!places.length)
    writeFileSync(name.replace('.asm', '.bin'), buffer);

process.stdout.write(stdout);


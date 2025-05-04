import {TextEncoder, TextDecoder} from 'node:util';
import {gzipSync, gunzipSync} from 'fflate';

function base64UrlsafeToBytes(base64_url) {
    const base64 = base64_url
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .replace(/\./g, '=');
    
    const binString = atob(base64);
    
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToBase64Urlsafe(bytes) {
    const binString = Array
        .from(bytes, (byte) => String.fromCodePoint(byte))
        .join('');
    
    const base64 = btoa(binString);
    
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '.');
}

module.epxorts.compressStringToBase64 = function compressStringToBase64(input) {
    const encoder = new TextEncoder();
    const inputUint8Array = encoder.encode(input);
    const gzipped = gzipSync(inputUint8Array, {
        filename: '',
        // Can be a Date, date string, or Unix timestamp
        mtime: '9/1/16 2:00 PM',
    });
    
    return bytesToBase64Urlsafe(gzipped);
};

module.epxorts.decompressBase64ToString = function decompressBase64ToString(base64) {
    const compressedUint8Array = base64UrlsafeToBytes(base64);
    const decompressedUint8Array = gunzipSync(compressedUint8Array);
    const decoder = new TextDecoder();
    
    return decoder.decode(decompressedUint8Array);
};

import {assemblers} from './assemblers.js';
import {
    compressStringToBase64,
    decompressBase64ToString,
} from './compression.js';

const APPSTATE_VERSION = 1;

/**
 * Deserializers / Migrations
 *
 * AppState can change between versions.
 * This is why we add a version number when serializing an AppState,
 * and we define a deserializer for every SerializedAppState version.
 * This allows us to retroactively support old AppStates, eventually
 * migrating old states into new formats
 */
const deserializers = {
    /**
     * Deserialize a Serialized AppState V1 into the current AppState
     */
    1: function(serialized) {
        let ret = null;
        const obj = serialized.data;
        const obj_is_valid = typeof obj === 'object'
            && obj !== null
            && typeof obj.editorContent === 'string'
            && typeof obj.mode === 'string'
            && assemblers.hasOwnProperty(obj.mode);
        
        if (obj_is_valid) {
            ret = {
                editorContent: obj.editorContent,
                mode: obj.mode,
            };
        }
        
        return ret;
    },
};

function isSerializedAppState(obj) {
    return (
        typeof obj === 'object'
        && obj !== null
        && typeof obj.version === 'number'
        && deserializers.hasOwnProperty(obj.version)
        && typeof obj.magic === 'string'
        && obj.magic == 'it.halb.x64'
        && typeof obj.data === 'object'
        && obj.data != null
    );
}

function serializeAppState(state) {
    const serialized = {
        magic: 'it.halb.x64',
        version: APPSTATE_VERSION,
        data: state,
    };
    const jsonString = JSON.stringify(serialized);
    
    return compressStringToBase64(jsonString);
}

function deserializeAppState(serialized) {
    if (!serialized)
        return null;
    
    try {
        const jsonstring = decompressBase64ToString(serialized);
        const parsedState = JSON.parse(jsonstring);
        
        if (isSerializedAppState(parsedState)) {
            return deserializers[parsedState.version](parsedState);
        }
        
        console.error(
            'Deserialized object does not match SerializedAppState shape',
        );
        return null;
    } catch(error) {
        console.error('Failed to deserialize blob:', error);
        return null;
    }
}

/**
 * TODO: use a standard serializedAppState object even for snippets.
 */
export function snippetToAppState(snippet) {
    return {
        editorContent: snippet.editorContent,
        mode: snippet.mode,
    };
}

export function storage_setAppState(state) {
    try {
        localStorage.setItem('appstate', serializeAppState(state));
    } catch(error) {
        console.error(error);
    }
}

export function storage_getAppState() {
    const item = localStorage.getItem('appstate');
    
    if (item == null)
        return null;
    
    return deserializeAppState(item);
}

export function storage_deleteAppState() {
    localStorage.removeItem('appstate');
}

export function uri_serializeAppState(state, wantFullUrl = false) {
    const param = serializeAppState(state);
    
    if (wantFullUrl) {
        const urlWithoutParams = window.location.origin + window.location.pathname;
        return `${urlWithoutParams}?appstate=${param}`;
    }
    
    return param;
}

export function uri_getAppState() {
    const params = new URLSearchParams(document.location.search);
    const str = params.get('appstate');
    
    return deserializeAppState(str);
}

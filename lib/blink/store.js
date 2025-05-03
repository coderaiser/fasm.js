import {Blink} from './blink.js';
import {assemblers} from './assemblers.js';
import {
    snippets,
    default_snippet,
} from './example-snippets.js';

const {assign} = Object;

const snippetToAppState = (snippet) => ({
    editorContent: snippet.editorContent,
    mode: snippet.mode,
});

export async function createBlinkStore(source, {onChangeState} = {}) {
    const selected_snippet = snippets[default_snippet];
    const defaultAppState = snippetToAppState(selected_snippet);
    
    defaultAppState.editorContent = source;
    
    const store = {
        term_buffer: '',
        state: '',
        signal: '',
        manual_render: 0,
        mode: defaultAppState.mode,
        uploadedElf: '',
        //change this to programmatically update the editor input box
        editorContent_write: defaultAppState.editorContent,
        //real time value of the text editor input box.
        
        //changing this will not cause a rerender
        
        //TODO: to reduce input lag, move this to a dedicated writable store
        editorContent_read: defaultAppState.editorContent,
    };
    
    /*
     * Autosave, debounced
     */
    const stdinHander = () => null;
    
    const stdoutHandler = (charcode) => {
        store.term_buffer += String.fromCharCode(charcode);
    };
    
    const stderrHander = (charcode) => {
        store.term_buffer += String.fromCharCode(charcode);
    };
    
    const signalHander = () => {
        ++store.manual_render;
    };
    
    const stateChangeHander = (state) => {
        assign(store, {
            state,
            manual_render: store.manual_render + 1,
        });
        
        onChangeState?.(state);
    };
    
    const blink = new Blink(assemblers[defaultAppState.mode], stdinHander, stdoutHandler, stderrHander, signalHander, stateChangeHander);
    await blink.initEmscripten();
    
    store.state = blink.state;
    
    function setAppState(state) {
        assign(store, {
            manual_render: store.manual_render + 1,
            mode: state.mode,
            editorContent_read: state.editorContent,
            editorContent_write: state.editorContent,
        });
        
        //changes to mode require manual updates to the blink object
        blink.setMode(assemblers[state.mode]);
    }
    
    function getAppState() {
        return {
            editorContent: store.editorContent_read,
            mode: store.mode,
        };
    }
    
    return {
        setAppState,
        getAppState,
        getInstance() {
            return blink;
        },
        notifyEditorContent(content) {
            store.editorContent_read = content;
        },
        setEditorContent(content) {
            store.editorContent_write = content;
        },
        setUploadedElfName(uploadedElf) {
            assign(store, {
                uploadedElf,
            });
        },
        setMode(mode) {
            assign(store, {
                mode,
            });
            
            //changes to mode require manual updates to the blink object
            blink.setMode(assemblers[mode]);
        },
    };
}

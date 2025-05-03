const blinkenlib_web = (() => {
    return (
        async function(moduleArg = {}) {
            let moduleRtn;
            
            // include: shell.js
            // The Module object: Our interface to the outside world. We import
            // and export values on it. There are various ways Module can be used:
            // 1. Not defined. We create it here
            // 2. A function parameter, function(moduleArg) => Promise<Module>
            // 3. pre-run appended it, var Module = {}; ..generated code..
            // 4. External script tag defines var Module.
            // We need to check if Module already exists (e.g. case 3 above).
            // Substitution will be replaced with actual code on later stage of the build,
            // this way Closure Compiler will not mangle it (e.g. case 4. above).
            // Note that if you want to run closure, and also to use Module
            // after the generated code, you will need to define   var Module = {};
            // before the code. Then that object will be used in the code, and you
            // can continue to use Module afterwards as well.
            const Module = moduleArg;
            
            // Set up the promise that indicates the Module is initialized
            let readyPromiseResolve, readyPromiseReject;
            const readyPromise = new Promise((resolve, reject) => {
                readyPromiseResolve = resolve;
                readyPromiseReject = reject;
            });
            
            // Determine the runtime environment we are in. You can customize this by
            // setting the ENVIRONMENT setting at compile time (see settings.js).
            
            const ENVIRONMENT_IS_WEB = true;
            const ENVIRONMENT_IS_WORKER = false;
            const ENVIRONMENT_IS_NODE = false;
            const ENVIRONMENT_IS_SHELL = false;
            
            // --pre-jses are emitted after the Module integration code, so that they can
            // refer to Module (if they choose; they can also define Module)
            
            let arguments_ = [];
            let thisProgram = './this.program';
            const quit_ = (status, toThrow) => {
                throw toThrow;
            };
            
            const _scriptName = import.meta.url;
            
            // `/` should be present at the end if `scriptDirectory` is not empty
            let scriptDirectory = '';
            
            function locateFile(path) {
                if (Module.locateFile) {
                    return Module.locateFile(path, scriptDirectory);
                }
                
                return scriptDirectory + path;
            }
            
            // Hooks that are implemented differently in different runtime environments.
            let readAsync, readBinary;
            
            if (ENVIRONMENT_IS_SHELL) {
                if (typeof process == 'object' && typeof require === 'function' || typeof window == 'object' || typeof WorkerGlobalScope != 'undefined')
                    throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');
            } else
            
            // Note that this includes Node.js workers when relevant (pthreads is enabled).
            // Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
            // ENVIRONMENT_IS_NODE.
                if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
                    try {
                        scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
                    } catch {
                        // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
                        // infer anything from them.
                    }
                    
                    if (!(typeof window == 'object' || typeof WorkerGlobalScope != 'undefined'))
                        throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');
                    
                    {
                        // include: web_or_worker_shell_read.js
                        readAsync = async (url) => {
                            assert(!isFileURI(url), 'readAsync does not work with file:// URLs');
                            const response = await fetch(url, {credentials: 'same-origin'});
                            
                            if (response.ok) {
                                return response.arrayBuffer();
                            }
                            
                            throw new Error(response.status + ' : ' + response.url);
                        };
                        // end include: web_or_worker_shell_read.js
                    }
                } else {
                    throw new Error('environment detection error');
                }
            
            let out = console.log.bind(console);
            let err = console.error.bind(console);
            
            const IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
            const PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
            const WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
            const FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
            const ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
            const JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
            const OPFS = 'OPFS is no longer included by default; build with -lopfs.js';
            
            const NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';
            
            // perform assertions in shell.js after we set up out() and err(), as otherwise
            // if an assertion fails it cannot print the message
            
            assert(!ENVIRONMENT_IS_WORKER, 'worker environment detected but not enabled at build time.  Add `worker` to `-sENVIRONMENT` to enable.');
            
            assert(!ENVIRONMENT_IS_NODE, 'node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.');
            
            assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.');
            
            // end include: shell.js
            
            // include: preamble.js
            // === Preamble library stuff ===
            
            // Documentation for the public APIs defined in this file must be updated in:
            //    site/source/docs/api_reference/preamble.js.rst
            // A prebuilt local version of the documentation is available at:
            //    site/build/text/docs/api_reference/preamble.js.txt
            // You can also build docs locally as HTML or other formats in site/
            // An online HTML version (which may be of a different version of Emscripten)
            //    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
            
            let wasmBinary;
            
            if (typeof WebAssembly != 'object') {
                err('no native wasm support detected');
            }
            
            // Wasm globals
            
            let wasmMemory;
            
            //========================================
            // Runtime essentials
            //========================================
            
            // whether we are quitting the application. no code should run after this.
            // set in exit() and abort()
            let ABORT = false;
            
            // set by exit() and abort().  Passed to 'onExit' handler.
            // NOTE: This is also used as the process return code code in shell environments
            // but only when noExitRuntime is false.
            let EXITSTATUS;
            
            // In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
            // don't define it at all in release modes.  This matches the behaviour of
            // MINIMAL_RUNTIME.
            // TODO(sbc): Make this the default even without STRICT enabled.
            /** @type {function(*, string=)} */
            function assert(condition, text) {
                if (!condition) {
                    abort('Assertion failed' + (text ? ': ' + text : ''));
                }
            }
            
            // We used to include malloc/free by default in the past. Show a helpful error in
            // builds with assertions.
            function _free() {
                // Show a helpful error since we used to include free by default in the past.
                abort('free() called but not included in the build - add `_free` to EXPORTED_FUNCTIONS');
            }
            
            // Memory management
            
            let HEAP,
                /** @type {!Int8Array} */
                HEAP8,
                /** @type {!Uint8Array} */
                HEAPU8,
                /** @type {!Int16Array} */
                HEAP16,
                /** @type {!Uint16Array} */
                HEAPU16,
                /** @type {!Int32Array} */
                HEAP32,
                /** @type {!Uint32Array} */
                HEAPU32,
                /** @type {!Float32Array} */
                HEAPF32,
                /* BigInt64Array type is not correctly defined in closure
/** not-@type {!BigInt64Array} */
                HEAP64,
                /* BigUint64Array type is not correctly defined in closure
/** not-t@type {!BigUint64Array} */
                HEAPU64,
                /** @type {!Float64Array} */
                HEAPF64;
            
            let runtimeInitialized = false;
            
            /**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
            var isFileURI = (filename) => filename.startsWith('file://');
            
            // include: runtime_shared.js
            // include: runtime_stack_check.js
            // Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
            function writeStackCookie() {
                let max = _emscripten_stack_get_end();
                assert((max & 3) == 0);
                
                // If the stack ends at address zero we write our cookies 4 bytes into the
                // stack.  This prevents interference with SAFE_HEAP and ASAN which also
                // monitor writes to address zero.
                if (max == 0) {
                    max += 4;
                }
                
                // The stack grow downwards towards _emscripten_stack_get_end.
                // We write cookies to the final two words in the stack and detect if they are
                // ever overwritten.
                HEAPU32[max >> 2] = 0x02135467;
                HEAPU32[max + 4 >> 2] = 0x89BACDFE;
                // Also test the global address 0 for integrity.
                HEAPU32[0 >> 2] = 1668509029;
            }
            
            function checkStackCookie() {
                if (ABORT)
                    return;
                
                let max = _emscripten_stack_get_end();
                
                // See writeStackCookie().
                if (max == 0) {
                    max += 4;
                }
                
                const cookie1 = HEAPU32[max >> 2];
                const cookie2 = HEAPU32[max + 4 >> 2];
                
                if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
                    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
                }
                
                // Also test the global address 0 for integrity.
                if (HEAPU32[0 >> 2] != 0x63736d65 /* 'emsc' */) {
                    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
                }
            }
            // end include: runtime_stack_check.js
            // include: runtime_exceptions.js
            // end include: runtime_exceptions.js
            // include: runtime_debug.js
            const runtimeDebug = true; // Switch to false at runtime to disable logging at the right times
            
            // Used by XXXXX_DEBUG settings to output debug messages.
            function dbg(...args) {
                if (!runtimeDebug && typeof runtimeDebug != 'undefined')
                    return;
                
                // TODO(sbc): Make this configurable somehow.  Its not always convenient for
                // logging to show up as warnings.
                console.warn(...args);
            }
            
            // Endianness check
            (() => {
                const h16 = new Int16Array(1);
                const h8 = new Int8Array(h16.buffer);
                
                h16[0] = 0x6373;
                
                if (h8[0] !== 0x73 || h8[1] !== 0x63)
                    throw 'Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)';
            })();
            
            function consumedModuleProp(prop) {
                if (!Object.getOwnPropertyDescriptor(Module, prop)) {
                    Object.defineProperty(Module, prop, {
                        configurable: true,
                        set() {
                            abort(`Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`);
                        },
                    });
                }
            }
            
            function ignoredModuleProp(prop) {
                if (Object.getOwnPropertyDescriptor(Module, prop)) {
                    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
                }
            }
            
            // forcing the filesystem exports a few things by default
            function isExportedByForceFilesystem(name) {
                return name === 'FS_createPath'
         || name === 'FS_createDataFile'
         || name === 'FS_createPreloadedFile'
         || name === 'FS_unlink'
         || name === 'addRunDependency'
         // The old FS has some functionality that WasmFS lacks.
         || name === 'FS_createLazyFile'
         || name === 'FS_createDevice'
         || name === 'removeRunDependency';
            }
            
            /**
 * Intercept access to a global symbol.  This enables us to give informative
 * warnings/errors when folks attempt to use symbols they did not include in
 * their build, or no symbols that no longer exist.
 */
            function hookGlobalSymbolAccess(sym, func) {
                if (typeof globalThis != 'undefined' && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
                    Object.defineProperty(globalThis, sym, {
                        configurable: true,
                        get() {
                            func();
                            return undefined;
                        },
                    });
                }
            }
            
            function missingGlobal(sym, msg) {
                hookGlobalSymbolAccess(sym, () => {
                    warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
                });
            }
            
            missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
            missingGlobal('asm', 'Please use wasmExports instead');
            
            function missingLibrarySymbol(sym) {
                hookGlobalSymbolAccess(sym, () => {
                    // Can't `abort()` here because it would break code that does runtime
                    // checks.  e.g. `if (typeof SDL === 'undefined')`.
                    let msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
                    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
                    // library.js, which means $name for a JS name with no prefix, or name
                    // for a JS name like _name.
                    let librarySymbol = sym;
                    
                    if (!librarySymbol.startsWith('_')) {
                        librarySymbol = '$' + sym;
                    }
                    
                    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
                    
                    if (isExportedByForceFilesystem(sym)) {
                        msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
                    }
                    
                    warnOnce(msg);
                });
                
                // Any symbol that is not included from the JS library is also (by definition)
                // not exported on the Module object.
                unexportedRuntimeSymbol(sym);
            }
            
            function unexportedRuntimeSymbol(sym) {
                if (!Object.getOwnPropertyDescriptor(Module, sym)) {
                    Object.defineProperty(Module, sym, {
                        configurable: true,
                        get() {
                            let msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
                            
                            if (isExportedByForceFilesystem(sym)) {
                                msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
                            }
                            
                            abort(msg);
                        },
                    });
                }
            }
            
            // end include: runtime_debug.js
            // include: memoryprofiler.js
            // end include: memoryprofiler.js
            
            function updateMemoryViews() {
                const b = wasmMemory.buffer;
                HEAP8 = new Int8Array(b);
                HEAP16 = new Int16Array(b);
                HEAPU8 = new Uint8Array(b);
                HEAPU16 = new Uint16Array(b);
                HEAP32 = new Int32Array(b);
                HEAPU32 = new Uint32Array(b);
                HEAPF32 = new Float32Array(b);
                HEAPF64 = new Float64Array(b);
                HEAP64 = new BigInt64Array(b);
                HEAPU64 = new BigUint64Array(b);
            }
            
            // end include: runtime_shared.js
            assert(
                typeof Int32Array != 'undefined' && typeof Float64Array !== 'undefined' && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined,
                'JS engine does not provide full typed array support',
            );
            
            function preRun() {
                if (Module.preRun) {
                    if (typeof Module.preRun == 'function')
                        Module.preRun = [Module.preRun];
                    
                    while (Module.preRun.length) {
                        addOnPreRun(Module.preRun.shift());
                    }
                }
                
                consumedModuleProp('preRun');
                // Begin ATPRERUNS hooks
                callRuntimeCallbacks(onPreRuns);
                // End ATPRERUNS hooks
            }
            
            function initRuntime() {
                assert(!runtimeInitialized);
                runtimeInitialized = true;
                
                checkStackCookie();
                
                // Begin ATINITS hooks
                if (!Module.noFSInit && !FS.initialized)
                    FS.init();
                
                TTY.init();
                PIPEFS.root = FS.mount(PIPEFS, {}, null);
                // End ATINITS hooks
                
                wasmExports.__wasm_call_ctors();
                
                // Begin ATPOSTCTORS hooks
                FS.ignorePermissions = false;
                // End ATPOSTCTORS hooks
            }
            
            function preMain() {
                checkStackCookie();
                // No ATMAINS hooks
            }
            
            function postRun() {
                checkStackCookie();
                // PThreads reuse the runtime from the main thread.
                
                if (Module.postRun) {
                    if (typeof Module.postRun == 'function')
                        Module.postRun = [Module.postRun];
                    
                    while (Module.postRun.length) {
                        addOnPostRun(Module.postRun.shift());
                    }
                }
                
                consumedModuleProp('postRun');
                
                // Begin ATPOSTRUNS hooks
                callRuntimeCallbacks(onPostRuns);
                // End ATPOSTRUNS hooks
            }
            
            // A counter of dependencies for calling run(). If we need to
            // do asynchronous work before running, increment this and
            // decrement it. Incrementing must happen in a place like
            // Module.preRun (used by emcc to add file preloading).
            // Note that you can add dependencies in preRun, even though
            // it happens right before run - run will be postponed until
            // the dependencies are met.
            let runDependencies = 0;
            let dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
            const runDependencyTracking = {};
            let runDependencyWatcher = null;
            
            function getUniqueRunDependency(id) {
                const orig = id;
                
                while (1) {
                    if (!runDependencyTracking[id])
                        return id;
                    
                    id = orig + Math.random();
                }
            }
            
            function addRunDependency(id) {
                runDependencies++;
                
                Module.monitorRunDependencies?.(runDependencies);
                
                if (id) {
                    assert(!runDependencyTracking[id]);
                    runDependencyTracking[id] = 1;
                    
                    if (runDependencyWatcher === null && typeof setInterval != 'undefined') {
                        // Check for missing dependencies every few seconds
                        runDependencyWatcher = setInterval(() => {
                            if (ABORT) {
                                clearInterval(runDependencyWatcher);
                                runDependencyWatcher = null;
                                
                                return;
                            }
                            
                            let shown = false;
                            
                            for (const dep in runDependencyTracking) {
                                if (!shown) {
                                    shown = true;
                                    err('still waiting on run dependencies:');
                                }
                                
                                err(`dependency: ${dep}`);
                            }
                            
                            if (shown) {
                                err('(end of list)');
                            }
                        }, 10000);
                    }
                } else {
                    err('warning: run dependency added without ID');
                }
            }
            
            function removeRunDependency(id) {
                runDependencies--;
                
                Module.monitorRunDependencies?.(runDependencies);
                
                if (id) {
                    assert(runDependencyTracking[id]);
                    delete runDependencyTracking[id];
                } else {
                    err('warning: run dependency removed without ID');
                }
                
                if (runDependencies == 0) {
                    if (runDependencyWatcher !== null) {
                        clearInterval(runDependencyWatcher);
                        runDependencyWatcher = null;
                    }
                    
                    if (dependenciesFulfilled) {
                        const callback = dependenciesFulfilled;
                        dependenciesFulfilled = null;
                        callback(); // can add another dependenciesFulfilled
                    }
                }
            }
            
            /** @param {string|number=} what */
            function abort(what) {
                Module.onAbort?.(what);
                
                what = 'Aborted(' + what + ')';
                // TODO(sbc): Should we remove printing and leave it up to whoever
                // catches the exception?
                err(what);
                
                ABORT = true;
                
                // Use a wasm runtime error, because a JS error might be seen as a foreign
                // exception, which means we'd run destructors on it. We need the error to
                // simply make the program stop.
                // FIXME This approach does not work in Wasm EH because it currently does not assume
                // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
                // a trap or not based on a hidden field within the object. So at the moment
                // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
                // allows this in the wasm spec.
                
                // Suppress closure compiler warning here. Closure compiler's builtin extern
                // definition for WebAssembly.RuntimeError claims it takes no arguments even
                // though it can.
                // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
                /** @suppress {checkTypes} */
                const e = new WebAssembly.RuntimeError(what);
                
                readyPromiseReject(e);
                // Throw the error whether or not MODULARIZE is set because abort is used
                // in code paths apart from instantiation where an exception is expected
                // to be thrown when abort is called.
                throw e;
            }
            
            function createExportWrapper(name, nargs) {
                return (...args) => {
                    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
                    
                    const f = wasmExports[name];
                    
                    assert(f, `exported native function \`${name}\` not found`);
                    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
                    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
                    
                    return f(...args);
                };
            }
            
            let wasmBinaryFile;
            
            function findWasmBinary() {
                if (Module.locateFile) {
                    return locateFile('blinkenlib.wasm');
                }
                
                // Use bundler-friendly `new URL(..., import.meta.url)` pattern; works in browsers too.
                return new URL('blinkenlib.wasm', import.meta.url).href;
            }
            
            function getBinarySync(file) {
                if (file == wasmBinaryFile && wasmBinary) {
                    return new Uint8Array(wasmBinary);
                }
                
                if (readBinary) {
                    return readBinary(file);
                }
                
                throw 'both async and sync fetching of the wasm failed';
            }
            
            async function getWasmBinary(binaryFile) {
                // If we don't have the binary yet, load it asynchronously using readAsync.
                if (!wasmBinary) {
                    // Fetch the binary using readAsync
                    try {
                        const response = await readAsync(binaryFile);
                        return new Uint8Array(response);
                    } catch {
                        // Fall back to getBinarySync below;
                    }
                }
                
                // Otherwise, getBinarySync should be able to get it synchronously
                return getBinarySync(binaryFile);
            }
            
            async function instantiateArrayBuffer(binaryFile, imports) {
                try {
                    const binary = await getWasmBinary(binaryFile);
                    const instance = await WebAssembly.instantiate(binary, imports);
                    
                    return instance;
                } catch(reason) {
                    err(`failed to asynchronously prepare wasm: ${reason}`);
                    
                    // Warn on some common problems.
                    if (isFileURI(wasmBinaryFile)) {
                        err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
                    }
                    
                    abort(reason);
                }
            }
            
            async function instantiateAsync(binary, binaryFile, imports) {
                if (!binary && typeof WebAssembly.instantiateStreaming == 'function'
                ) {
                    try {
                        const response = fetch(binaryFile, {credentials: 'same-origin'});
                        const instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
                        
                        return instantiationResult;
                    } catch(reason) {
                        // We expect the most common failure cause to be a bad MIME type for the binary,
                        // in which case falling back to ArrayBuffer instantiation should work.
                        err(`wasm streaming compile failed: ${reason}`);
                        err('falling back to ArrayBuffer instantiation');
                        // fall back of instantiateArrayBuffer below
                    }
                }
                
                return instantiateArrayBuffer(binaryFile, imports);
            }
            
            function getWasmImports() {
                // prepare imports
                return {
                    env: wasmImports,
                    wasi_snapshot_preview1: wasmImports,
                };
            }
            
            // Create the wasm instance.
            // Receives the wasm imports, returns the exports.
            async function createWasm() {
                // Load the wasm module and create an instance of using native support in the JS engine.
                // handle a generated wasm instance, receiving its exports and
                // performing other necessary setup
                /** @param {WebAssembly.Module=} module*/
                function receiveInstance(instance, module) {
                    wasmExports = instance.exports;
                    
                    Module.wasmExports = wasmExports;
                    
                    wasmMemory = wasmExports.memory;
                    
                    assert(wasmMemory, 'memory not found in wasm exports');
                    updateMemoryViews();
                    
                    wasmTable = wasmExports.__indirect_function_table;
                    
                    assert(wasmTable, 'table not found in wasm exports');
                    
                    removeRunDependency('wasm-instantiate');
                    return wasmExports;
                }
                // wait for the pthread pool (if any)
                addRunDependency('wasm-instantiate');
                
                // Prefer streaming instantiation if available.
                // Async compilation can be confusing when an error on the page overwrites Module
                // (for example, if the order of elements is wrong, and the one defining Module is
                // later), so we save Module and check it later.
                let trueModule = Module;
                
                function receiveInstantiationResult(result) {
                    // 'result' is a ResultObject object which has both the module and instance.
                    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
                    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
                    trueModule = null;
                    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
                    // When the regression is fixed, can restore the above PTHREADS-enabled path.
                    return receiveInstance(result.instance);
                }
                
                const info = getWasmImports();
                
                // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
                // to manually instantiate the Wasm module themselves. This allows pages to
                // run the instantiation parallel to any other async startup actions they are
                // performing.
                // Also pthreads and wasm workers initialize the wasm instance through this
                // path.
                if (Module.instantiateWasm) {
                    return new Promise((resolve, reject) => {
                        try {
                            Module.instantiateWasm(info, (mod, inst) => {
                                resolve(receiveInstance(mod, inst));
                            });
                        } catch(e) {
                            err(`Module.instantiateWasm callback failed with error: ${e}`);
                            reject(e);
                        }
                    });
                }
                
                wasmBinaryFile ??= findWasmBinary();
                try {
                    const result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
                    const exports = receiveInstantiationResult(result);
                    
                    return exports;
                } catch(e) {
                    // If instantiation fails, reject the module ready promise.
                    readyPromiseReject(e);
                    return Promise.reject(e);
                }
            }
            
            // end include: preamble.js
            
            // Begin JS library code
            
            class ExitStatus {
                name = 'ExitStatus';
                constructor(status) {
                    this.message = `Program terminated with exit(${status})`;
                    this.status = status;
                }
            }
            
            var callRuntimeCallbacks = (callbacks) => {
                while (callbacks.length > 0) {
                    // Pass the module as the first argument.
                    callbacks.shift()(Module);
                }
            };
            var onPostRuns = [];
            var addOnPostRun = (cb) => onPostRuns.push(cb);
            
            var onPreRuns = [];
            var addOnPreRun = (cb) => onPreRuns.push(cb);
            
            /**
     * @param {number} ptr
     * @param {string} type
     */
            function getValue(ptr, type = 'i8') {
                if (type.endsWith('*'))
                    type = '*';
                
                switch(type) {
                case 'i1': return HEAP8[ptr];
                case 'i8': return HEAP8[ptr];
                case 'i16': return HEAP16[ptr >> 1];
                case 'i32': return HEAP32[ptr >> 2];
                case 'i64': return HEAP64[ptr >> 3];
                case 'float': return HEAPF32[ptr >> 2];
                case 'double': return HEAPF64[ptr >> 3];
                case '*': return HEAPU32[ptr >> 2];
                default: abort(`invalid type for getValue: ${type}`);
                }
            }
            
            let noExitRuntime = true;
            
            var ptrToString = (ptr) => {
                assert(typeof ptr === 'number');
                // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
                ptr >>>= 0;
                
                return '0x' + ptr.toString(16).padStart(8, '0');
            };
            
            /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
            function setValue(ptr, value, type = 'i8') {
                if (type.endsWith('*'))
                    type = '*';
                
                switch(type) {
                case 'i1': HEAP8[ptr] = value; break;
                case 'i8': HEAP8[ptr] = value; break;
                case 'i16': HEAP16[ptr >> 1] = value; break;
                case 'i32': HEAP32[ptr >> 2] = value; break;
                case 'i64': HEAP64[ptr >> 3] = BigInt(value); break;
                case 'float': HEAPF32[ptr >> 2] = value; break;
                case 'double': HEAPF64[ptr >> 3] = value; break;
                case '*': HEAPU32[ptr >> 2] = value; break;
                default: abort(`invalid type for setValue: ${type}`);
                }
            }
            
            const stackRestore = (val) => __emscripten_stack_restore(val);
            
            const stackSave = () => _emscripten_stack_get_current();
            
            var warnOnce = (text) => {
                warnOnce.shown ||= {};
                
                if (!warnOnce.shown[text]) {
                    warnOnce.shown[text] = 1;
                    err(text);
                }
            };
            
            const wasmTableMirror = [];
            
            /** @type {WebAssembly.Table} */
            let wasmTable;
            const getWasmTableEntry = (funcPtr) => {
                let func = wasmTableMirror[funcPtr];
                
                if (!func) {
                    /** @suppress {checkTypes} */
                    wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
                }
                
                /** @suppress {checkTypes} */
                assert(wasmTable.get(funcPtr) == func, 'JavaScript-side Wasm function table mirror is out of date!');
                
                return func;
            };
            const ___call_sighandler = (fp, sig) => getWasmTableEntry(fp)(sig);
            
            var PATH = {
                isAbs: (path) => path.charAt(0) === '/',
                splitPath: (filename) => {
                    const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
                    return splitPathRe.exec(filename).slice(1);
                },
                normalizeArray: (parts, allowAboveRoot) => {
                    // if the path tries to go above the root, `up` ends up > 0
                    let up = 0;
                    
                    for (let i = parts.length - 1; i >= 0; i--) {
                        const last = parts[i];
                        
                        if (last === '.') {
                            parts.splice(i, 1);
                        } else if (last === '..') {
                            parts.splice(i, 1);
                            up++;
                        } else if (up) {
                            parts.splice(i, 1);
                            up--;
                        }
                    }
                    
                    // if the path is allowed to go above the root, restore leading ..s
                    if (allowAboveRoot) {
                        for (; up; up--) {
                            parts.unshift('..');
                        }
                    }
                    
                    return parts;
                },
                normalize: (path) => {
                    const isAbsolute = PATH.isAbs(path),
                        trailingSlash = path.slice(-1) === '/';
                    // Normalize the path
                    path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
                    
                    if (!path && !isAbsolute) {
                        path = '.';
                    }
                    
                    if (path && trailingSlash) {
                        path += '/';
                    }
                    
                    return (isAbsolute ? '/' : '') + path;
                },
                dirname: (path) => {
                    let result = PATH.splitPath(path),
                        root = result[0],
                        dir = result[1];
                    
                    if (!root && !dir) {
                        // No dirname whatsoever
                        return '.';
                    }
                    
                    if (dir) {
                        // It has a dirname, strip trailing slash
                        dir = dir.slice(0, -1);
                    }
                    
                    return root + dir;
                },
                basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
                join: (...paths) => PATH.normalize(paths.join('/')),
                join2: (l, r) => PATH.normalize(l + '/' + r),
            };
            
            const initRandomFill = () => {
                return (view) => crypto.getRandomValues(view);
            };
            let randomFill = (view) => {
                // Lazily init on the first invocation.
                (randomFill = initRandomFill())(view);
            };
            
            var PATH_FS = {
                resolve: (...args) => {
                    let resolvedPath = '',
                        resolvedAbsolute = false;
                    
                    for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                        const path = i >= 0 ? args[i] : FS.cwd();
                        
                        // Skip empty and invalid entries
                        if (typeof path != 'string') {
                            throw new TypeError('Arguments to path.resolve must be strings');
                        } else if (!path) {
                            return ''; // an invalid portion invalidates the whole thing
                        }
                        
                        resolvedPath = path + '/' + resolvedPath;
                        resolvedAbsolute = PATH.isAbs(path);
                    }
                    
                    // At this point the path should be resolved to a full absolute path, but
                    // handle relative paths to be safe (might happen when process.cwd() fails)
                    resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
                    
                    return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
                },
                relative: (from, to) => {
                    from = PATH_FS.resolve(from).slice(1);
                    to = PATH_FS.resolve(to).slice(1);
                    
                    function trim(arr) {
                        let start = 0;
                        
                        for (; start < arr.length; start++) {
                            if (arr[start] !== '')
                                break;
                        }
                        
                        let end = arr.length - 1;
                        
                        for (; end >= 0; end--) {
                            if (arr[end] !== '')
                                break;
                        }
                        
                        if (start > end)
                            return [];
                        
                        return arr.slice(start, end - start + 1);
                    }
                    const fromParts = trim(from.split('/'));
                    const toParts = trim(to.split('/'));
                    const length = Math.min(fromParts.length, toParts.length);
                    let samePartsLength = length;
                    
                    for (var i = 0; i < length; i++) {
                        if (fromParts[i] !== toParts[i]) {
                            samePartsLength = i;
                            break;
                        }
                    }
                    
                    let outputParts = [];
                    
                    for (var i = samePartsLength; i < fromParts.length; i++) {
                        outputParts.push('..');
                    }
                    
                    outputParts = outputParts.concat(toParts.slice(samePartsLength));
                    return outputParts.join('/');
                },
            };
            
            const UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder() : undefined;
            
            /**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */
            const UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
                const endIdx = idx + maxBytesToRead;
                let endPtr = idx;
                
                // TextDecoder needs to know the byte length in advance, it doesn't stop on
                // null terminator by itself.  Also, use the length info to avoid running tiny
                // strings through TextDecoder, since .subarray() allocates garbage.
                // (As a tiny code save trick, compare endPtr against endIdx using a negation,
                // so that undefined/NaN means Infinity)
                while (heapOrArray[endPtr] && !(endPtr >= endIdx))
                    ++endPtr;
                
                if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
                    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
                }
                
                let str = '';
                
                // If building with TextDecoder, we have already computed the string length
                // above, so test loop end condition against that
                while (idx < endPtr) {
                    // For UTF8 byte structure, see:
                    // http://en.wikipedia.org/wiki/UTF-8#Description
                    // https://www.ietf.org/rfc/rfc2279.txt
                    // https://tools.ietf.org/html/rfc3629
                    let u0 = heapOrArray[idx++];
                    
                    if (!(u0 & 0x80)) {
                        str += String.fromCharCode(u0); continue;
                    }
                    
                    const u1 = heapOrArray[idx++] & 63;
                    
                    if ((u0 & 0xE0) == 0xC0) {
                        str += String.fromCharCode((u0 & 31) << 6 | u1); continue;
                    }
                    
                    const u2 = heapOrArray[idx++] & 63;
                    
                    if ((u0 & 0xF0) == 0xE0) {
                        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
                    } else {
                        if ((u0 & 0xF8) != 0xF0)
                            warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
                        
                        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
                    }
                    
                    if (u0 < 0x10000) {
                        str += String.fromCharCode(u0);
                    } else {
                        const ch = u0 - 0x10000;
                        str += String.fromCharCode(0xD800 | ch >> 10, 0xDC00 | ch & 0x3FF);
                    }
                }
                
                return str;
            };
            
            let FS_stdin_getChar_buffer = [];
            
            const lengthBytesUTF8 = (str) => {
                let len = 0;
                
                for (let i = 0; i < str.length; ++i) {
                    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
                    // unit, not a Unicode code point of the character! So decode
                    // UTF16->UTF32->UTF8.
                    // See http://unicode.org/faq/utf_bom.html#utf16-3
                    const c = str.charCodeAt(i); // possibly a lead surrogate
                    
                    if (c <= 0x7F) {
                        len++;
                    } else if (c <= 0x7FF) {
                        len += 2;
                    } else if (c >= 0xD800 && c <= 0xDFFF) {
                        len += 4; ++i;
                    } else {
                        len += 3;
                    }
                }
                
                return len;
            };
            
            const stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
                assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
                
                // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
                // undefined and false each don't write out any bytes.
                if (!(maxBytesToWrite > 0))
                    return 0;
                
                const startIdx = outIdx;
                const endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
                
                for (let i = 0; i < str.length; ++i) {
                    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
                    // unit, not a Unicode code point of the character! So decode
                    // UTF16->UTF32->UTF8.
                    // See http://unicode.org/faq/utf_bom.html#utf16-3
                    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
                    // and https://www.ietf.org/rfc/rfc2279.txt
                    // and https://tools.ietf.org/html/rfc3629
                    let u = str.charCodeAt(i); // possibly a lead surrogate
                    
                    if (u >= 0xD800 && u <= 0xDFFF) {
                        const u1 = str.charCodeAt(++i);
                        u = 0x10000 + ((u & 0x3FF) << 10) | u1 & 0x3FF;
                    }
                    
                    if (u <= 0x7F) {
                        if (outIdx >= endIdx)
                            break;
                        
                        heap[outIdx++] = u;
                    } else if (u <= 0x7FF) {
                        if (outIdx + 1 >= endIdx)
                            break;
                        
                        heap[outIdx++] = 0xC0 | u >> 6;
                        heap[outIdx++] = 0x80 | u & 63;
                    } else if (u <= 0xFFFF) {
                        if (outIdx + 2 >= endIdx)
                            break;
                        
                        heap[outIdx++] = 0xE0 | u >> 12;
                        heap[outIdx++] = 0x80 | u >> 6 & 63;
                        heap[outIdx++] = 0x80 | u & 63;
                    } else {
                        if (outIdx + 3 >= endIdx)
                            break;
                        
                        if (u > 0x10FFFF)
                            warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
                        
                        heap[outIdx++] = 0xF0 | u >> 18;
                        heap[outIdx++] = 0x80 | u >> 12 & 63;
                        heap[outIdx++] = 0x80 | u >> 6 & 63;
                        heap[outIdx++] = 0x80 | u & 63;
                    }
                }
                
                // Null-terminate the pointer to the buffer.
                heap[outIdx] = 0;
                
                return outIdx - startIdx;
            };
            /** @type {function(string, boolean=, number=)} */
            const intArrayFromString = (stringy, dontAddNull, length) => {
                const len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
                const u8array = new Array(len);
                const numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
                
                if (dontAddNull)
                    u8array.length = numBytesWritten;
                
                return u8array;
            };
            const FS_stdin_getChar = () => {
                if (!FS_stdin_getChar_buffer.length) {
                    let result = null;
                    
                    if (typeof window != 'undefined'
          && typeof window.prompt == 'function') {
                        // Browser.
                        result = window.prompt('Input: '); // returns null on cancel
                        
                        if (result !== null) {
                            result += '\n';
                        }
                    } else {}
                    
                    if (!result) {
                        return null;
                    }
                    
                    FS_stdin_getChar_buffer = intArrayFromString(result, true);
                }
                
                return FS_stdin_getChar_buffer.shift();
            };
            var TTY = {
                ttys: [],
                init() {
                    // https://github.com/emscripten-core/emscripten/pull/1555
                    // if (ENVIRONMENT_IS_NODE) {
                    //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
                    //   // device, it always assumes it's a TTY device. because of this, we're forcing
                    //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
                    //   // with text files until FS.init can be refactored.
                    //   process.stdin.setEncoding('utf8');
                    // }
                },
                shutdown() {
                    // https://github.com/emscripten-core/emscripten/pull/1555
                    // if (ENVIRONMENT_IS_NODE) {
                    //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
                    //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
                    //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
                    //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
                    //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
                    //   process.stdin.pause();
                    // }
                },
                register(dev, ops) {
                    TTY.ttys[dev] = {
                        input: [],
                        output: [],
                        ops: ops,
                    };
                    FS.registerDevice(dev, TTY.stream_ops);
                },
                stream_ops: {
                    open(stream) {
                        const tty = TTY.ttys[stream.node.rdev];
                        
                        if (!tty) {
                            throw new FS.ErrnoError(43);
                        }
                        
                        stream.tty = tty;
                        stream.seekable = false;
                    },
                    close(stream) {
                        // flush any pending line data
                        stream.tty.ops.fsync(stream.tty);
                    },
                    fsync(stream) {
                        stream.tty.ops.fsync(stream.tty);
                    },
                    read(stream, buffer, offset, length, pos /* ignored */) {
                        if (!stream.tty || !stream.tty.ops.get_char) {
                            throw new FS.ErrnoError(60);
                        }
                        
                        let bytesRead = 0;
                        
                        for (let i = 0; i < length; i++) {
                            var result;
                            try {
                                result = stream.tty.ops.get_char(stream.tty);
                            } catch(e) {
                                throw new FS.ErrnoError(29);
                            }
                            
                            if (result === undefined && bytesRead === 0) {
                                throw new FS.ErrnoError(6);
                            }
                            
                            if (result === null || result === undefined)
                                break;
                            
                            bytesRead++;
                            buffer[offset + i] = result;
                        }
                        
                        if (bytesRead) {
                            stream.node.atime = Date.now();
                        }
                        
                        return bytesRead;
                    },
                    write(stream, buffer, offset, length, pos) {
                        if (!stream.tty || !stream.tty.ops.put_char) {
                            throw new FS.ErrnoError(60);
                        }
                        
                        try {
                            for (var i = 0; i < length; i++) {
                                stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
                            }
                        } catch(e) {
                            throw new FS.ErrnoError(29);
                        }
                        
                        if (length) {
                            stream.node.mtime = stream.node.ctime = Date.now();
                        }
                        
                        return i;
                    },
                },
                default_tty_ops: {
                    get_char(tty) {
                        return FS_stdin_getChar();
                    },
                    put_char(tty, val) {
                        if (val === null || val === 10) {
                            out(UTF8ArrayToString(tty.output));
                            tty.output = [];
                        } else {
                            if (val != 0)
                                tty.output.push(val); // val == 0 would cut text output off in the middle.
                        }
                    },
                    fsync(tty) {
                        if (tty.output?.length > 0) {
                            out(UTF8ArrayToString(tty.output));
                            tty.output = [];
                        }
                    },
                    ioctl_tcgets(tty) {
                        // typical setting
                        return {
                            c_iflag: 25856,
                            c_oflag: 5,
                            c_cflag: 191,
                            c_lflag: 35387,
                            c_cc: [
                                0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
                                0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                            ],
                        };
                    },
                    ioctl_tcsets(tty, optional_actions, data) {
                        // currently just ignore
                        return 0;
                    },
                    ioctl_tiocgwinsz(tty) {
                        return [24, 80];
                    },
                },
                default_tty1_ops: {
                    put_char(tty, val) {
                        if (val === null || val === 10) {
                            err(UTF8ArrayToString(tty.output));
                            tty.output = [];
                        } else {
                            if (val != 0)
                                tty.output.push(val);
                        }
                    },
                    fsync(tty) {
                        if (tty.output?.length > 0) {
                            err(UTF8ArrayToString(tty.output));
                            tty.output = [];
                        }
                    },
                },
            };
            
            const zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
            
            const alignMemory = (size, alignment) => {
                assert(alignment, 'alignment argument is required');
                return Math.ceil(size / alignment) * alignment;
            };
            const mmapAlloc = (size) => {
                size = alignMemory(size, 65536);
                const ptr = _emscripten_builtin_memalign(65536, size);
                
                if (ptr)
                    zeroMemory(ptr, size);
                
                return ptr;
            };
            var MEMFS = {
                ops_table: null,
                mount(mount) {
                    return MEMFS.createNode(null, '/', 16895, 0);
                },
                createNode(parent, name, mode, dev) {
                    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
                        // no supported
                        throw new FS.ErrnoError(63);
                    }
                    
                    MEMFS.ops_table ||= {
                        dir: {
                            node: {
                                getattr: MEMFS.node_ops.getattr,
                                setattr: MEMFS.node_ops.setattr,
                                lookup: MEMFS.node_ops.lookup,
                                mknod: MEMFS.node_ops.mknod,
                                rename: MEMFS.node_ops.rename,
                                unlink: MEMFS.node_ops.unlink,
                                rmdir: MEMFS.node_ops.rmdir,
                                readdir: MEMFS.node_ops.readdir,
                                symlink: MEMFS.node_ops.symlink,
                            },
                            stream: {
                                llseek: MEMFS.stream_ops.llseek,
                            },
                        },
                        file: {
                            node: {
                                getattr: MEMFS.node_ops.getattr,
                                setattr: MEMFS.node_ops.setattr,
                            },
                            stream: {
                                llseek: MEMFS.stream_ops.llseek,
                                read: MEMFS.stream_ops.read,
                                write: MEMFS.stream_ops.write,
                                mmap: MEMFS.stream_ops.mmap,
                                msync: MEMFS.stream_ops.msync,
                            },
                        },
                        link: {
                            node: {
                                getattr: MEMFS.node_ops.getattr,
                                setattr: MEMFS.node_ops.setattr,
                                readlink: MEMFS.node_ops.readlink,
                            },
                            stream: {},
                        },
                        chrdev: {
                            node: {
                                getattr: MEMFS.node_ops.getattr,
                                setattr: MEMFS.node_ops.setattr,
                            },
                            stream: FS.chrdev_stream_ops,
                        },
                    };
                    const node = FS.createNode(parent, name, mode, dev);
                    
                    if (FS.isDir(node.mode)) {
                        node.node_ops = MEMFS.ops_table.dir.node;
                        node.stream_ops = MEMFS.ops_table.dir.stream;
                        node.contents = {};
                    } else if (FS.isFile(node.mode)) {
                        node.node_ops = MEMFS.ops_table.file.node;
                        node.stream_ops = MEMFS.ops_table.file.stream;
                        node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
                        // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
                        // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
                        // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
                        node.contents = null;
                    } else if (FS.isLink(node.mode)) {
                        node.node_ops = MEMFS.ops_table.link.node;
                        node.stream_ops = MEMFS.ops_table.link.stream;
                    } else if (FS.isChrdev(node.mode)) {
                        node.node_ops = MEMFS.ops_table.chrdev.node;
                        node.stream_ops = MEMFS.ops_table.chrdev.stream;
                    }
                    
                    node.atime = node.mtime = node.ctime = Date.now();
                    
                    // add the new node to the parent
                    if (parent) {
                        parent.contents[name] = node;
                        parent.atime = parent.mtime = parent.ctime = node.atime;
                    }
                    
                    return node;
                },
                getFileDataAsTypedArray(node) {
                    if (!node.contents)
                        return new Uint8Array(0);
                    
                    if (node.contents.subarray)
                        return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
                    
                    return new Uint8Array(node.contents);
                },
                expandFileStorage(node, newCapacity) {
                    const prevCapacity = node.contents ? node.contents.length : 0;
                    
                    if (prevCapacity >= newCapacity)
                        return; // No need to expand, the storage was already large enough.
                    
                    // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
                    // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
                    // avoid overshooting the allocation cap by a very large margin.
                    const CAPACITY_DOUBLING_MAX = 1024 * 1024;
                    
                    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125) >>> 0);
                    
                    if (prevCapacity != 0)
                        newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
                    
                    const oldContents = node.contents;
                    node.contents = new Uint8Array(newCapacity); // Allocate new storage.
                    
                    if (node.usedBytes > 0)
                        node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
                },
                resizeFileStorage(node, newSize) {
                    if (node.usedBytes == newSize)
                        return;
                    
                    if (newSize == 0) {
                        node.contents = null; // Fully decommit when requesting a resize to zero.
                        node.usedBytes = 0;
                    } else {
                        const oldContents = node.contents;
                        node.contents = new Uint8Array(newSize); // Allocate new storage.
                        
                        if (oldContents) {
                            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
                        }
                        
                        node.usedBytes = newSize;
                    }
                },
                node_ops: {
                    getattr(node) {
                        const attr = {};
                        // device numbers reuse inode numbers.
                        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
                        attr.ino = node.id;
                        attr.mode = node.mode;
                        attr.nlink = 1;
                        attr.uid = 0;
                        attr.gid = 0;
                        attr.rdev = node.rdev;
                        
                        if (FS.isDir(node.mode)) {
                            attr.size = 4096;
                        } else if (FS.isFile(node.mode)) {
                            attr.size = node.usedBytes;
                        } else if (FS.isLink(node.mode)) {
                            attr.size = node.link.length;
                        } else {
                            attr.size = 0;
                        }
                        
                        attr.atime = new Date(node.atime);
                        attr.mtime = new Date(node.mtime);
                        attr.ctime = new Date(node.ctime);
                        // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
                        //       but this is not required by the standard.
                        attr.blksize = 4096;
                        attr.blocks = Math.ceil(attr.size / attr.blksize);
                        
                        return attr;
                    },
                    setattr(node, attr) {
                        for (const key of ['mode', 'atime', 'mtime', 'ctime']) {
                            if (attr[key] != null) {
                                node[key] = attr[key];
                            }
                        }
                        
                        if (attr.size !== undefined) {
                            MEMFS.resizeFileStorage(node, attr.size);
                        }
                    },
                    lookup(parent, name) {
                        throw new FS.ErrnoError(44);
                    },
                    mknod(parent, name, mode, dev) {
                        return MEMFS.createNode(parent, name, mode, dev);
                    },
                    rename(old_node, new_dir, new_name) {
                        let new_node;
                        try {
                            new_node = FS.lookupNode(new_dir, new_name);
                        } catch(e) {}
                        
                        if (new_node) {
                            if (FS.isDir(old_node.mode)) {
                                // if we're overwriting a directory at new_name, make sure it's empty.
                                for (const i in new_node.contents) {
                                    throw new FS.ErrnoError(55);
                                }
                            }
                            
                            FS.hashRemoveNode(new_node);
                        }
                        
                        // do the internal rewiring
                        delete old_node.parent.contents[old_node.name];
                        new_dir.contents[new_name] = old_node;
                        old_node.name = new_name;
                        new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
                    },
                    unlink(parent, name) {
                        delete parent.contents[name];
                        parent.ctime = parent.mtime = Date.now();
                    },
                    rmdir(parent, name) {
                        const node = FS.lookupNode(parent, name);
                        
                        for (const i in node.contents) {
                            throw new FS.ErrnoError(55);
                        }
                        
                        delete parent.contents[name];
                        parent.ctime = parent.mtime = Date.now();
                    },
                    readdir(node) {
                        return ['.', '..', ...Object.keys(node.contents)];
                    },
                    symlink(parent, newname, oldpath) {
                        const node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
                        node.link = oldpath;
                        
                        return node;
                    },
                    readlink(node) {
                        if (!FS.isLink(node.mode)) {
                            throw new FS.ErrnoError(28);
                        }
                        
                        return node.link;
                    },
                },
                stream_ops: {
                    read(stream, buffer, offset, length, position) {
                        const contents = stream.node.contents;
                        
                        if (position >= stream.node.usedBytes)
                            return 0;
                        
                        const size = Math.min(stream.node.usedBytes - position, length);
                        assert(size >= 0);
                        
                        if (size > 8 && contents.subarray) { // non-trivial, and typed array
                            buffer.set(contents.subarray(position, position + size), offset);
                        } else {
                            for (let i = 0; i < size; i++)
                                buffer[offset + i] = contents[position + i];
                        }
                        
                        return size;
                    },
                    write(stream, buffer, offset, length, position, canOwn) {
                        // The data buffer should be a typed array view
                        assert(!(buffer instanceof ArrayBuffer));
                        
                        // If the buffer is located in main memory (HEAP), and if
                        // memory can grow, we can't hold on to references of the
                        // memory buffer, as they may get invalidated. That means we
                        // need to do copy its contents.
                        if (buffer.buffer === HEAP8.buffer) {
                            canOwn = false;
                        }
                        
                        if (!length)
                            return 0;
                        
                        const node = stream.node;
                        node.mtime = node.ctime = Date.now();
                        
                        if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
                            if (canOwn) {
                                assert(position === 0, 'canOwn must imply no weird position inside the file');
                                node.contents = buffer.subarray(offset, offset + length);
                                node.usedBytes = length;
                                
                                return length;
                            }
                            
                            if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
                                node.contents = buffer.slice(offset, offset + length);
                                node.usedBytes = length;
                                
                                return length;
                            }
                            
                            if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
                                node.contents.set(buffer.subarray(offset, offset + length), position);
                                return length;
                            }
                        }
                        
                        // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
                        MEMFS.expandFileStorage(node, position + length);
                        
                        if (node.contents.subarray && buffer.subarray) {
                            // Use typed array write which is available.
                            node.contents.set(buffer.subarray(offset, offset + length), position);
                        } else {
                            for (let i = 0; i < length; i++) {
                                node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
                            }
                        }
                        
                        node.usedBytes = Math.max(node.usedBytes, position + length);
                        return length;
                    },
                    llseek(stream, offset, whence) {
                        let position = offset;
                        
                        if (whence === 1) {
                            position += stream.position;
                        } else if (whence === 2) {
                            if (FS.isFile(stream.node.mode)) {
                                position += stream.node.usedBytes;
                            }
                        }
                        
                        if (position < 0) {
                            throw new FS.ErrnoError(28);
                        }
                        
                        return position;
                    },
                    mmap(stream, length, position, prot, flags) {
                        if (!FS.isFile(stream.node.mode)) {
                            throw new FS.ErrnoError(43);
                        }
                        
                        let ptr;
                        let allocated;
                        let contents = stream.node.contents;
                        
                        // Only make a new copy when MAP_PRIVATE is specified.
                        if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
                            // We can't emulate MAP_SHARED when the file is not backed by the
                            // buffer we're mapping to (e.g. the HEAP buffer).
                            allocated = false;
                            ptr = contents.byteOffset;
                        } else {
                            allocated = true;
                            ptr = mmapAlloc(length);
                            
                            if (!ptr) {
                                throw new FS.ErrnoError(48);
                            }
                            
                            if (contents) {
                                // Try to avoid unnecessary slices.
                                if (position > 0 || position + length < contents.length) {
                                    if (contents.subarray) {
                                        contents = contents.subarray(position, position + length);
                                    } else {
                                        contents = Array.prototype.slice.call(contents, position, position + length);
                                    }
                                }
                                
                                HEAP8.set(contents, ptr);
                            }
                        }
                        
                        return {ptr, allocated};
                    },
                    msync(stream, buffer, offset, length, mmapFlags) {
                        MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
                        // should we check if bytesWritten and length are the same?
                        return 0;
                    },
                },
            };
            
            const asyncLoad = async (url) => {
                const arrayBuffer = await readAsync(url);
                assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
                
                return new Uint8Array(arrayBuffer);
            };
            
            const FS_createDataFile = (...args) => FS.createDataFile(...args);
            
            let preloadPlugins = [];
            const FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
                // Ensure plugins are ready.
                if (typeof Browser != 'undefined')
                    Browser.init();
                
                let handled = false;
                preloadPlugins.forEach((plugin) => {
                    if (handled)
                        return;
                    
                    if (plugin.canHandle(fullname)) {
                        plugin.handle(byteArray, fullname, finish, onerror);
                        handled = true;
                    }
                });
                
                return handled;
            };
            const FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
                // TODO we should allow people to just pass in a complete filename instead
                // of parent and name being that we just join them anyways
                const fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
                const dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
                
                function processData(byteArray) {
                    function finish(byteArray) {
                        preFinish?.();
                        
                        if (!dontCreateFile) {
                            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
                        }
                        
                        onload?.();
                        removeRunDependency(dep);
                    }
                    
                    if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
                        onerror?.();
                        removeRunDependency(dep);
                    })) {
                        return;
                    }
                    
                    finish(byteArray);
                }
                addRunDependency(dep);
                
                if (typeof url == 'string') {
                    asyncLoad(url).then(processData, onerror);
                } else {
                    processData(url);
                }
            };
            
            const FS_modeStringToFlags = (str) => {
                const flagModes = {
                    'r': 0,
                    'r+': 2,
                    'w': 512 | 64 | 1,
                    'w+': 512 | 64 | 2,
                    'a': 1024 | 64 | 1,
                    'a+': 1024 | 64 | 2,
                };
                const flags = flagModes[str];
                
                if (typeof flags == 'undefined') {
                    throw new Error(`Unknown file open mode: ${str}`);
                }
                
                return flags;
            };
            
            const FS_getMode = (canRead, canWrite) => {
                let mode = 0;
                
                if (canRead)
                    mode |= 292 | 73;
                
                if (canWrite)
                    mode |= 146;
                
                return mode;
            };
            
            /**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */
            const UTF8ToString = (ptr, maxBytesToRead) => {
                assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
                return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
            };
            
            const strError = (errno) => UTF8ToString(_strerror(errno));
            
            const ERRNO_CODES = {
                EPERM: 63,
                ENOENT: 44,
                ESRCH: 71,
                EINTR: 27,
                EIO: 29,
                ENXIO: 60,
                E2BIG: 1,
                ENOEXEC: 45,
                EBADF: 8,
                ECHILD: 12,
                EAGAIN: 6,
                EWOULDBLOCK: 6,
                ENOMEM: 48,
                EACCES: 2,
                EFAULT: 21,
                ENOTBLK: 105,
                EBUSY: 10,
                EEXIST: 20,
                EXDEV: 75,
                ENODEV: 43,
                ENOTDIR: 54,
                EISDIR: 31,
                EINVAL: 28,
                ENFILE: 41,
                EMFILE: 33,
                ENOTTY: 59,
                ETXTBSY: 74,
                EFBIG: 22,
                ENOSPC: 51,
                ESPIPE: 70,
                EROFS: 69,
                EMLINK: 34,
                EPIPE: 64,
                EDOM: 18,
                ERANGE: 68,
                ENOMSG: 49,
                EIDRM: 24,
                ECHRNG: 106,
                EL2NSYNC: 156,
                EL3HLT: 107,
                EL3RST: 108,
                ELNRNG: 109,
                EUNATCH: 110,
                ENOCSI: 111,
                EL2HLT: 112,
                EDEADLK: 16,
                ENOLCK: 46,
                EBADE: 113,
                EBADR: 114,
                EXFULL: 115,
                ENOANO: 104,
                EBADRQC: 103,
                EBADSLT: 102,
                EDEADLOCK: 16,
                EBFONT: 101,
                ENOSTR: 100,
                ENODATA: 116,
                ETIME: 117,
                ENOSR: 118,
                ENONET: 119,
                ENOPKG: 120,
                EREMOTE: 121,
                ENOLINK: 47,
                EADV: 122,
                ESRMNT: 123,
                ECOMM: 124,
                EPROTO: 65,
                EMULTIHOP: 36,
                EDOTDOT: 125,
                EBADMSG: 9,
                ENOTUNIQ: 126,
                EBADFD: 127,
                EREMCHG: 128,
                ELIBACC: 129,
                ELIBBAD: 130,
                ELIBSCN: 131,
                ELIBMAX: 132,
                ELIBEXEC: 133,
                ENOSYS: 52,
                ENOTEMPTY: 55,
                ENAMETOOLONG: 37,
                ELOOP: 32,
                EOPNOTSUPP: 138,
                EPFNOSUPPORT: 139,
                ECONNRESET: 15,
                ENOBUFS: 42,
                EAFNOSUPPORT: 5,
                EPROTOTYPE: 67,
                ENOTSOCK: 57,
                ENOPROTOOPT: 50,
                ESHUTDOWN: 140,
                ECONNREFUSED: 14,
                EADDRINUSE: 3,
                ECONNABORTED: 13,
                ENETUNREACH: 40,
                ENETDOWN: 38,
                ETIMEDOUT: 73,
                EHOSTDOWN: 142,
                EHOSTUNREACH: 23,
                EINPROGRESS: 26,
                EALREADY: 7,
                EDESTADDRREQ: 17,
                EMSGSIZE: 35,
                EPROTONOSUPPORT: 66,
                ESOCKTNOSUPPORT: 137,
                EADDRNOTAVAIL: 4,
                ENETRESET: 39,
                EISCONN: 30,
                ENOTCONN: 53,
                ETOOMANYREFS: 141,
                EUSERS: 136,
                EDQUOT: 19,
                ESTALE: 72,
                ENOTSUP: 138,
                ENOMEDIUM: 148,
                EILSEQ: 25,
                EOVERFLOW: 61,
                ECANCELED: 11,
                ENOTRECOVERABLE: 56,
                EOWNERDEAD: 62,
                ESTRPIPE: 135,
            };
            var FS = {
                root: null,
                mounts: [],
                devices: {
                },
                streams: [],
                nextInode: 1,
                nameTable: null,
                currentPath: '/',
                initialized: false,
                ignorePermissions: true,
                filesystems: null,
                syncFSRequests: 0,
                readFiles: {
                },
                ErrnoError: class extends Error {
                    name = 'ErrnoError';
                    // We set the `name` property to be able to identify `FS.ErrnoError`
                    // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
                    // - when using PROXYFS, an error can come from an underlying FS
                    // as different FS objects have their own FS.ErrnoError each,
                    // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
                    // we'll use the reliable test `err.name == "ErrnoError"` instead
                    constructor(errno) {
                        super(runtimeInitialized ? strError(errno) : '');
                        this.errno = errno;
                        for (const key in ERRNO_CODES) {
                            if (ERRNO_CODES[key] === errno) {
                                this.code = key;
                                break;
                            }
                        }
                    }
                },
                FSStream: class {
                    shared = {};
                    get object() {
                        return this.node;
                    }
                    set object(val) {
                        this.node = val;
                    }
                    get isRead() {
                        return (this.flags & 2097155) !== 1;
                    }
                    get isWrite() {
                        return (this.flags & 2097155) !== 0;
                    }
                    get isAppend() {
                        return this.flags & 1024;
                    }
                    get flags() {
                        return this.shared.flags;
                    }
                    set flags(val) {
                        this.shared.flags = val;
                    }
                    get position() {
                        return this.shared.position;
                    }
                    set position(val) {
                        this.shared.position = val;
                    }
                },
                FSNode: class {
                    node_ops = {};
                    stream_ops = {};
                    readMode = 292 | 73;
                    writeMode = 146;
                    mounted = null;
                    constructor(parent, name, mode, rdev) {
                        if (!parent) {
                            parent = this; // root node sets parent to itself
                        }
                        
                        this.parent = parent;
                        this.mount = parent.mount;
                        this.id = FS.nextInode++;
                        this.name = name;
                        this.mode = mode;
                        this.rdev = rdev;
                        this.atime = this.mtime = this.ctime = Date.now();
                    }
                    get read() {
                        return (this.mode & this.readMode) === this.readMode;
                    }
                    set read(val) {
                        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
                    }
                    get write() {
                        return (this.mode & this.writeMode) === this.writeMode;
                    }
                    set write(val) {
                        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
                    }
                    get isFolder() {
                        return FS.isDir(this.mode);
                    }
                    get isDevice() {
                        return FS.isChrdev(this.mode);
                    }
                },
                lookupPath(path, opts = {}) {
                    if (!path) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    opts.follow_mount ??= true;
                    
                    if (!PATH.isAbs(path)) {
                        path = FS.cwd() + '/' + path;
                    }
                    
                    // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                    linkloop: for (let nlinks = 0; nlinks < 40; nlinks++) {
                        // split the absolute path
                        const parts = path.split('/').filter((p) => !!p);
                        
                        // start at the root
                        let current = FS.root;
                        let current_path = '/';
                        
                        for (let i = 0; i < parts.length; i++) {
                            const islast = i === parts.length - 1;
                            
                            if (islast && opts.parent) {
                                // stop resolving
                                break;
                            }
                            
                            if (parts[i] === '.') {
                                continue;
                            }
                            
                            if (parts[i] === '..') {
                                current_path = PATH.dirname(current_path);
                                
                                if (FS.isRoot(current)) {
                                    path = current_path + '/' + parts.slice(i + 1).join('/');
                                    continue linkloop;
                                } else {
                                    current = current.parent;
                                }
                                
                                continue;
                            }
                            
                            current_path = PATH.join2(current_path, parts[i]);
                            try {
                                current = FS.lookupNode(current, parts[i]);
                            } catch(e) {
                                // if noent_okay is true, suppress a ENOENT in the last component
                                // and return an object with an undefined node. This is needed for
                                // resolving symlinks in the path when creating a file.
                                if (e?.errno === 44 && islast && opts.noent_okay) {
                                    return {path: current_path};
                                }
                                
                                throw e;
                            }
                            
                            // jump to the mount's root node if this is a mountpoint
                            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
                                current = current.mounted.root;
                            }
                            
                            // by default, lookupPath will not follow a symlink if it is the final path component.
                            // setting opts.follow = true will override this behavior.
                            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
                                if (!current.node_ops.readlink) {
                                    throw new FS.ErrnoError(52);
                                }
                                
                                let link = current.node_ops.readlink(current);
                                
                                if (!PATH.isAbs(link)) {
                                    link = PATH.dirname(current_path) + '/' + link;
                                }
                                
                                path = link + '/' + parts.slice(i + 1).join('/');
                                continue linkloop;
                            }
                        }
                        
                        return {path: current_path, node: current};
                    }
                    
                    throw new FS.ErrnoError(32);
                },
                getPath(node) {
                    let path;
                    
                    while (true) {
                        if (FS.isRoot(node)) {
                            const mount = node.mount.mountpoint;
                            
                            if (!path)
                                return mount;
                            
                            return mount[mount.length - 1] !== '/' ? `${mount}/${path}` : mount + path;
                        }
                        
                        path = path ? `${node.name}/${path}` : node.name;
                        node = node.parent;
                    }
                },
                hashName(parentid, name) {
                    let hash = 0;
                    
                    for (let i = 0; i < name.length; i++) {
                        hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
                    }
                    
                    return (parentid + hash >>> 0) % FS.nameTable.length;
                },
                hashAddNode(node) {
                    const hash = FS.hashName(node.parent.id, node.name);
                    node.name_next = FS.nameTable[hash];
                    FS.nameTable[hash] = node;
                },
                hashRemoveNode(node) {
                    const hash = FS.hashName(node.parent.id, node.name);
                    
                    if (FS.nameTable[hash] === node) {
                        FS.nameTable[hash] = node.name_next;
                    } else {
                        let current = FS.nameTable[hash];
                        
                        while (current) {
                            if (current.name_next === node) {
                                current.name_next = node.name_next;
                                break;
                            }
                            
                            current = current.name_next;
                        }
                    }
                },
                lookupNode(parent, name) {
                    const errCode = FS.mayLookup(parent);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    const hash = FS.hashName(parent.id, name);
                    
                    for (let node = FS.nameTable[hash]; node; node = node.name_next) {
                        const nodeName = node.name;
                        
                        if (node.parent.id === parent.id && nodeName === name) {
                            return node;
                        }
                    }
                    
                    // if we failed to find it in the cache, call into the VFS
                    return FS.lookup(parent, name);
                },
                createNode(parent, name, mode, rdev) {
                    assert(typeof parent == 'object');
                    const node = new FS.FSNode(parent, name, mode, rdev);
                    
                    FS.hashAddNode(node);
                    
                    return node;
                },
                destroyNode(node) {
                    FS.hashRemoveNode(node);
                },
                isRoot(node) {
                    return node === node.parent;
                },
                isMountpoint(node) {
                    return !!node.mounted;
                },
                isFile(mode) {
                    return (mode & 61440) === 32768;
                },
                isDir(mode) {
                    return (mode & 61440) === 16384;
                },
                isLink(mode) {
                    return (mode & 61440) === 40960;
                },
                isChrdev(mode) {
                    return (mode & 61440) === 8192;
                },
                isBlkdev(mode) {
                    return (mode & 61440) === 24576;
                },
                isFIFO(mode) {
                    return (mode & 61440) === 4096;
                },
                isSocket(mode) {
                    return (mode & 49152) === 49152;
                },
                flagsToPermissionString(flag) {
                    let perms = ['r', 'w', 'rw'][flag & 3];
                    
                    if (flag & 512) {
                        perms += 'w';
                    }
                    
                    return perms;
                },
                nodePermissions(node, perms) {
                    if (FS.ignorePermissions) {
                        return 0;
                    }
                    
                    // return 0 if any user, group or owner bits are set.
                    if (perms.includes('r') && !(node.mode & 292)) {
                        return 2;
                    }
                    
                    if (perms.includes('w') && !(node.mode & 146)) {
                        return 2;
                    }
                    
                    if (perms.includes('x') && !(node.mode & 73)) {
                        return 2;
                    }
                    
                    return 0;
                },
                mayLookup(dir) {
                    if (!FS.isDir(dir.mode))
                        return 54;
                    
                    const errCode = FS.nodePermissions(dir, 'x');
                    
                    if (errCode)
                        return errCode;
                    
                    if (!dir.node_ops.lookup)
                        return 2;
                    
                    return 0;
                },
                mayCreate(dir, name) {
                    if (!FS.isDir(dir.mode)) {
                        return 54;
                    }
                    
                    try {
                        const node = FS.lookupNode(dir, name);
                        return 20;
                    } catch(e) {
                    }
                    return FS.nodePermissions(dir, 'wx');
                },
                mayDelete(dir, name, isdir) {
                    let node;
                    try {
                        node = FS.lookupNode(dir, name);
                    } catch(e) {
                        return e.errno;
                    }
                    const errCode = FS.nodePermissions(dir, 'wx');
                    
                    if (errCode) {
                        return errCode;
                    }
                    
                    if (isdir) {
                        if (!FS.isDir(node.mode)) {
                            return 54;
                        }
                        
                        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                            return 10;
                        }
                    } else {
                        if (FS.isDir(node.mode)) {
                            return 31;
                        }
                    }
                    
                    return 0;
                },
                mayOpen(node, flags) {
                    if (!node) {
                        return 44;
                    }
                    
                    if (FS.isLink(node.mode)) {
                        return 32;
                    }
                    
                    if (FS.isDir(node.mode)) {
                        if (FS.flagsToPermissionString(flags) !== 'r' // opening for write
              || flags & (512 | 64)) { // TODO: check for O_SEARCH? (== search for dir only)
                            return 31;
                        }
                    }
                    
                    return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
                },
                checkOpExists(op, err) {
                    if (!op) {
                        throw new FS.ErrnoError(err);
                    }
                    
                    return op;
                },
                MAX_OPEN_FDS: 4096,
                nextfd() {
                    for (let fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
                        if (!FS.streams[fd]) {
                            return fd;
                        }
                    }
                    
                    throw new FS.ErrnoError(33);
                },
                getStreamChecked(fd) {
                    const stream = FS.getStream(fd);
                    
                    if (!stream) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    return stream;
                },
                getStream: (fd) => FS.streams[fd],
                createStream(stream, fd = -1) {
                    assert(fd >= -1);
                    
                    // clone it, so we can return an instance of FSStream
                    stream = Object.assign(new FS.FSStream(), stream);
                    
                    if (fd == -1) {
                        fd = FS.nextfd();
                    }
                    
                    stream.fd = fd;
                    FS.streams[fd] = stream;
                    
                    return stream;
                },
                closeStream(fd) {
                    FS.streams[fd] = null;
                },
                dupStream(origStream, fd = -1) {
                    const stream = FS.createStream(origStream, fd);
                    stream.stream_ops?.dup?.(stream);
                    
                    return stream;
                },
                doSetAttr(stream, node, attr) {
                    let setattr = stream?.stream_ops.setattr;
                    const arg = setattr ? stream : node;
                    
                    setattr ??= node.node_ops.setattr;
                    FS.checkOpExists(setattr, 63);
                    setattr(arg, attr);
                },
                chrdev_stream_ops: {
                    open(stream) {
                        const device = FS.getDevice(stream.node.rdev);
                        // override node's stream ops with the device's
                        stream.stream_ops = device.stream_ops;
                        // forward the open call
                        stream.stream_ops.open?.(stream);
                    },
                    llseek() {
                        throw new FS.ErrnoError(70);
                    },
                },
                major: (dev) => dev >> 8,
                minor: (dev) => dev & 0xff,
                makedev: (ma, mi) => ma << 8 | mi,
                registerDevice(dev, ops) {
                    FS.devices[dev] = {
                        stream_ops: ops,
                    };
                },
                getDevice: (dev) => FS.devices[dev],
                getMounts(mount) {
                    const mounts = [];
                    const check = [mount];
                    
                    while (check.length) {
                        const m = check.pop();
                        
                        mounts.push(m);
                        
                        check.push(...m.mounts);
                    }
                    
                    return mounts;
                },
                syncfs(populate, callback) {
                    if (typeof populate == 'function') {
                        callback = populate;
                        populate = false;
                    }
                    
                    FS.syncFSRequests++;
                    
                    if (FS.syncFSRequests > 1) {
                        err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
                    }
                    
                    const mounts = FS.getMounts(FS.root.mount);
                    let completed = 0;
                    
                    function doCallback(errCode) {
                        assert(FS.syncFSRequests > 0);
                        FS.syncFSRequests--;
                        
                        return callback(errCode);
                    }
                    
                    function done(errCode) {
                        if (errCode) {
                            if (!done.errored) {
                                done.errored = true;
                                return doCallback(errCode);
                            }
                            
                            return;
                        }
                        
                        if (++completed >= mounts.length) {
                            doCallback(null);
                        }
                    }
                    
                    // sync all mounts
                    mounts.forEach((mount) => {
                        if (!mount.type.syncfs) {
                            return done(null);
                        }
                        
                        mount.type.syncfs(mount, populate, done);
                    });
                },
                mount(type, opts, mountpoint) {
                    if (typeof type == 'string') {
                        // The filesystem was not included, and instead we have an error
                        // message stored in the variable.
                        throw type;
                    }
                    
                    const root = mountpoint === '/';
                    const pseudo = !mountpoint;
                    let node;
                    
                    if (root && FS.root) {
                        throw new FS.ErrnoError(10);
                    } else if (!root && !pseudo) {
                        const lookup = FS.lookupPath(mountpoint, {follow_mount: false});
                        
                        mountpoint = lookup.path; // use the absolute path
                        node = lookup.node;
                        
                        if (FS.isMountpoint(node)) {
                            throw new FS.ErrnoError(10);
                        }
                        
                        if (!FS.isDir(node.mode)) {
                            throw new FS.ErrnoError(54);
                        }
                    }
                    
                    const mount = {
                        type,
                        opts,
                        mountpoint,
                        mounts: [],
                    };
                    
                    // create a root node for the fs
                    const mountRoot = type.mount(mount);
                    
                    mountRoot.mount = mount;
                    mount.root = mountRoot;
                    
                    if (root) {
                        FS.root = mountRoot;
                    } else if (node) {
                        // set as a mountpoint
                        node.mounted = mount;
                        
                        // add the new mount to the current mount's children
                        if (node.mount) {
                            node.mount.mounts.push(mount);
                        }
                    }
                    
                    return mountRoot;
                },
                unmount(mountpoint) {
                    const lookup = FS.lookupPath(mountpoint, {follow_mount: false});
                    
                    if (!FS.isMountpoint(lookup.node)) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    // destroy the nodes for this mount, and all its child mounts
                    const node = lookup.node;
                    const mount = node.mounted;
                    const mounts = FS.getMounts(mount);
                    
                    Object.keys(FS.nameTable).forEach((hash) => {
                        let current = FS.nameTable[hash];
                        
                        while (current) {
                            const next = current.name_next;
                            
                            if (mounts.includes(current.mount)) {
                                FS.destroyNode(current);
                            }
                            
                            current = next;
                        }
                    });
                    
                    // no longer a mountpoint
                    node.mounted = null;
                    
                    // remove this mount from the child mounts
                    const idx = node.mount.mounts.indexOf(mount);
                    
                    assert(idx !== -1);
                    node.mount.mounts.splice(idx, 1);
                },
                lookup(parent, name) {
                    return parent.node_ops.lookup(parent, name);
                },
                mknod(path, mode, dev) {
                    const lookup = FS.lookupPath(path, {parent: true});
                    const parent = lookup.node;
                    const name = PATH.basename(path);
                    
                    if (!name) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    if (name === '.' || name === '..') {
                        throw new FS.ErrnoError(20);
                    }
                    
                    const errCode = FS.mayCreate(parent, name);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    if (!parent.node_ops.mknod) {
                        throw new FS.ErrnoError(63);
                    }
                    
                    return parent.node_ops.mknod(parent, name, mode, dev);
                },
                statfs(path) {
                    return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
                },
                statfsStream(stream) {
                    // We keep a separate statfsStream function because noderawfs overrides
                    // it. In noderawfs, stream.node is sometimes null. Instead, we need to
                    // look at stream.path.
                    return FS.statfsNode(stream.node);
                },
                statfsNode(node) {
                    // NOTE: None of the defaults here are true. We're just returning safe and
                    //       sane values. Currently nodefs and rawfs replace these defaults,
                    //       other file systems leave them alone.
                    const rtn = {
                        bsize: 4096,
                        frsize: 4096,
                        blocks: 1e6,
                        bfree: 5e5,
                        bavail: 5e5,
                        files: FS.nextInode,
                        ffree: FS.nextInode - 1,
                        fsid: 42,
                        flags: 2,
                        namelen: 255,
                    };
                    
                    if (node.node_ops.statfs) {
                        Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
                    }
                    
                    return rtn;
                },
                create(path, mode = 0o666) {
                    mode &= 4095;
                    mode |= 32768;
                    
                    return FS.mknod(path, mode, 0);
                },
                mkdir(path, mode = 0o777) {
                    mode &= 511 | 512;
                    mode |= 16384;
                    
                    return FS.mknod(path, mode, 0);
                },
                mkdirTree(path, mode) {
                    const dirs = path.split('/');
                    let d = '';
                    
                    for (const dir of dirs) {
                        if (!dir)
                            continue;
                        
                        if (d || PATH.isAbs(path))
                            d += '/';
                        
                        d += dir;
                        try {
                            FS.mkdir(d, mode);
                        } catch(e) {
                            if (e.errno != 20)
                                throw e;
                        }
                    }
                },
                mkdev(path, mode, dev) {
                    if (typeof dev == 'undefined') {
                        dev = mode;
                        mode = 0o666;
                    }
                    
                    mode |= 8192;
                    return FS.mknod(path, mode, dev);
                },
                symlink(oldpath, newpath) {
                    if (!PATH_FS.resolve(oldpath)) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    const lookup = FS.lookupPath(newpath, {parent: true});
                    const parent = lookup.node;
                    
                    if (!parent) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    const newname = PATH.basename(newpath);
                    const errCode = FS.mayCreate(parent, newname);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    if (!parent.node_ops.symlink) {
                        throw new FS.ErrnoError(63);
                    }
                    
                    return parent.node_ops.symlink(parent, newname, oldpath);
                },
                rename(old_path, new_path) {
                    const old_dirname = PATH.dirname(old_path);
                    const new_dirname = PATH.dirname(new_path);
                    const old_name = PATH.basename(old_path);
                    const new_name = PATH.basename(new_path);
                    // parents must exist
                    let lookup, old_dir, new_dir;
                    
                    // let the errors from non existent directories percolate up
                    lookup = FS.lookupPath(old_path, {parent: true});
                    old_dir = lookup.node;
                    lookup = FS.lookupPath(new_path, {parent: true});
                    new_dir = lookup.node;
                    
                    if (!old_dir || !new_dir)
                        throw new FS.ErrnoError(44);
                    
                    // need to be part of the same mount
                    if (old_dir.mount !== new_dir.mount) {
                        throw new FS.ErrnoError(75);
                    }
                    
                    // source must exist
                    const old_node = FS.lookupNode(old_dir, old_name);
                    // old path should not be an ancestor of the new path
                    let relative = PATH_FS.relative(old_path, new_dirname);
                    
                    if (relative.charAt(0) !== '.') {
                        throw new FS.ErrnoError(28);
                    }
                    
                    // new path should not be an ancestor of the old path
                    relative = PATH_FS.relative(new_path, old_dirname);
                    
                    if (relative.charAt(0) !== '.') {
                        throw new FS.ErrnoError(55);
                    }
                    
                    // see if the new path already exists
                    let new_node;
                    try {
                        new_node = FS.lookupNode(new_dir, new_name);
                    } catch(e) {
                        // not fatal
                    }
                    
                    // early out if nothing needs to change
                    if (old_node === new_node) {
                        return;
                    }
                    
                    // we'll need to delete the old entry
                    const isdir = FS.isDir(old_node.mode);
                    let errCode = FS.mayDelete(old_dir, old_name, isdir);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    // need delete permissions if we'll be overwriting.
                    // need create permissions if new doesn't already exist.
                    errCode = new_node
                        ? FS.mayDelete(new_dir, new_name, isdir)
                        : FS.mayCreate(new_dir, new_name);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    if (!old_dir.node_ops.rename) {
                        throw new FS.ErrnoError(63);
                    }
                    
                    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
                        throw new FS.ErrnoError(10);
                    }
                    
                    // if we are going to change the parent, check write permissions
                    if (new_dir !== old_dir) {
                        errCode = FS.nodePermissions(old_dir, 'w');
                        
                        if (errCode) {
                            throw new FS.ErrnoError(errCode);
                        }
                    }
                    
                    // remove the node from the lookup hash
                    FS.hashRemoveNode(old_node);
                    // do the underlying fs rename
                    try {
                        old_dir.node_ops.rename(old_node, new_dir, new_name);
                        // update old node (we do this here to avoid each backend
                        // needing to)
                        old_node.parent = new_dir;
                    } catch(e) {
                        throw e;
                    } finally {
                        // add the node back to the hash (in case node_ops.rename
                        // changed its name)
                        FS.hashAddNode(old_node);
                    }
                },
                rmdir(path) {
                    const lookup = FS.lookupPath(path, {parent: true});
                    const parent = lookup.node;
                    const name = PATH.basename(path);
                    const node = FS.lookupNode(parent, name);
                    const errCode = FS.mayDelete(parent, name, true);
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    if (!parent.node_ops.rmdir) {
                        throw new FS.ErrnoError(63);
                    }
                    
                    if (FS.isMountpoint(node)) {
                        throw new FS.ErrnoError(10);
                    }
                    
                    parent.node_ops.rmdir(parent, name);
                    FS.destroyNode(node);
                },
                readdir(path) {
                    const lookup = FS.lookupPath(path, {follow: true});
                    const node = lookup.node;
                    const readdir = FS.checkOpExists(node.node_ops.readdir, 54);
                    
                    return readdir(node);
                },
                unlink(path) {
                    const lookup = FS.lookupPath(path, {parent: true});
                    const parent = lookup.node;
                    
                    if (!parent) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    const name = PATH.basename(path);
                    const node = FS.lookupNode(parent, name);
                    const errCode = FS.mayDelete(parent, name, false);
                    
                    if (errCode) {
                        // According to POSIX, we should map EISDIR to EPERM, but
                        // we instead do what Linux does (and we must, as we use
                        // the musl linux libc).
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    if (!parent.node_ops.unlink) {
                        throw new FS.ErrnoError(63);
                    }
                    
                    if (FS.isMountpoint(node)) {
                        throw new FS.ErrnoError(10);
                    }
                    
                    parent.node_ops.unlink(parent, name);
                    FS.destroyNode(node);
                },
                readlink(path) {
                    const lookup = FS.lookupPath(path);
                    const link = lookup.node;
                    
                    if (!link) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    if (!link.node_ops.readlink) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    return link.node_ops.readlink(link);
                },
                stat(path, dontFollow) {
                    const lookup = FS.lookupPath(path, {follow: !dontFollow});
                    const node = lookup.node;
                    const getattr = FS.checkOpExists(node.node_ops.getattr, 63);
                    
                    return getattr(node);
                },
                fstat(fd) {
                    const stream = FS.getStreamChecked(fd);
                    const node = stream.node;
                    let getattr = stream.stream_ops.getattr;
                    const arg = getattr ? stream : node;
                    
                    getattr ??= node.node_ops.getattr;
                    FS.checkOpExists(getattr, 63);
                    
                    return getattr(arg);
                },
                lstat(path) {
                    return FS.stat(path, true);
                },
                doChmod(stream, node, mode, dontFollow) {
                    FS.doSetAttr(stream, node, {
                        mode: mode & 4095 | node.mode & ~4095,
                        ctime: Date.now(),
                        dontFollow,
                    });
                },
                chmod(path, mode, dontFollow) {
                    let node;
                    
                    if (typeof path == 'string') {
                        const lookup = FS.lookupPath(path, {follow: !dontFollow});
                        node = lookup.node;
                    } else {
                        node = path;
                    }
                    
                    FS.doChmod(null, node, mode, dontFollow);
                },
                lchmod(path, mode) {
                    FS.chmod(path, mode, true);
                },
                fchmod(fd, mode) {
                    const stream = FS.getStreamChecked(fd);
                    FS.doChmod(stream, stream.node, mode, false);
                },
                doChown(stream, node, dontFollow) {
                    FS.doSetAttr(stream, node, {
                        timestamp: Date.now(),
                        dontFollow,
                        // we ignore the uid / gid for now
                    });
                },
                chown(path, uid, gid, dontFollow) {
                    let node;
                    
                    if (typeof path == 'string') {
                        const lookup = FS.lookupPath(path, {follow: !dontFollow});
                        node = lookup.node;
                    } else {
                        node = path;
                    }
                    
                    FS.doChown(null, node, dontFollow);
                },
                lchown(path, uid, gid) {
                    FS.chown(path, uid, gid, true);
                },
                fchown(fd, uid, gid) {
                    const stream = FS.getStreamChecked(fd);
                    FS.doChown(stream, stream.node, false);
                },
                doTruncate(stream, node, len) {
                    if (FS.isDir(node.mode)) {
                        throw new FS.ErrnoError(31);
                    }
                    
                    if (!FS.isFile(node.mode)) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    const errCode = FS.nodePermissions(node, 'w');
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    FS.doSetAttr(stream, node, {
                        size: len,
                        timestamp: Date.now(),
                    });
                },
                truncate(path, len) {
                    if (len < 0) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    let node;
                    
                    if (typeof path == 'string') {
                        const lookup = FS.lookupPath(path, {follow: true});
                        node = lookup.node;
                    } else {
                        node = path;
                    }
                    
                    FS.doTruncate(null, node, len);
                },
                ftruncate(fd, len) {
                    const stream = FS.getStreamChecked(fd);
                    
                    if (len < 0 || (stream.flags & 2097155) === 0) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    FS.doTruncate(stream, stream.node, len);
                },
                utime(path, atime, mtime) {
                    const lookup = FS.lookupPath(path, {follow: true});
                    const node = lookup.node;
                    const setattr = FS.checkOpExists(node.node_ops.setattr, 63);
                    
                    setattr(node, {
                        atime: atime,
                        mtime: mtime,
                    });
                },
                open(path, flags, mode = 0o666) {
                    if (path === '') {
                        throw new FS.ErrnoError(44);
                    }
                    
                    flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
                    
                    if (flags & 64) {
                        mode = mode & 4095 | 32768;
                    } else {
                        mode = 0;
                    }
                    
                    let node;
                    let isDirPath;
                    
                    if (typeof path == 'object') {
                        node = path;
                    } else {
                        isDirPath = path.endsWith('/');
                        // noent_okay makes it so that if the final component of the path
                        // doesn't exist, lookupPath returns `node: undefined`. `path` will be
                        // updated to point to the target of all symlinks.
                        const lookup = FS.lookupPath(path, {
                            follow: !(flags & 131072),
                            noent_okay: true,
                        });
                        
                        node = lookup.node;
                        path = lookup.path;
                    }
                    
                    // perhaps we need to create the node
                    let created = false;
                    
                    if (flags & 64) {
                        if (node) {
                            // if O_CREAT and O_EXCL are set, error out if the node already exists
                            if (flags & 128) {
                                throw new FS.ErrnoError(20);
                            }
                        } else if (isDirPath) {
                            throw new FS.ErrnoError(31);
                        } else {
                            // node doesn't exist, try to create it
                            // Ignore the permission bits here to ensure we can `open` this new
                            // file below. We use chmod below the apply the permissions once the
                            // file is open.
                            node = FS.mknod(path, mode | 0o777, 0);
                            created = true;
                        }
                    }
                    
                    if (!node) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    // can't truncate a device
                    if (FS.isChrdev(node.mode)) {
                        flags &= ~512;
                    }
                    
                    // if asked only for a directory, then this must be one
                    if (flags & 65536 && !FS.isDir(node.mode)) {
                        throw new FS.ErrnoError(54);
                    }
                    
                    // check permissions, if this is not a file we just created now (it is ok to
                    // create and write to a file with read-only permissions; it is read-only
                    // for later use)
                    if (!created) {
                        const errCode = FS.mayOpen(node, flags);
                        
                        if (errCode) {
                            throw new FS.ErrnoError(errCode);
                        }
                    }
                    
                    // do truncation if necessary
                    if (flags & 512 && !created) {
                        FS.truncate(node, 0);
                    }
                    
                    // we've already handled these, don't pass down to the underlying vfs
                    flags &= ~(128 | 512 | 131072);
                    
                    // register the stream with the filesystem
                    const stream = FS.createStream({
                        node,
                        path: FS.getPath(node), // we want the absolute path to the node
                        flags,
                        seekable: true,
                        position: 0,
                        stream_ops: node.stream_ops,
                        // used by the file family libc calls (fopen, fwrite, ferror, etc.)
                        ungotten: [],
                        error: false,
                    });
                    
                    // call the new stream's open function
                    if (stream.stream_ops.open) {
                        stream.stream_ops.open(stream);
                    }
                    
                    if (created) {
                        FS.chmod(node, mode & 0o777);
                    }
                    
                    if (Module.logReadFiles && !(flags & 1)) {
                        if (!(path in FS.readFiles)) {
                            FS.readFiles[path] = 1;
                        }
                    }
                    
                    return stream;
                },
                close(stream) {
                    if (FS.isClosed(stream)) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if (stream.getdents)
                        stream.getdents = null; // free readdir state
                    
                    try {
                        if (stream.stream_ops.close) {
                            stream.stream_ops.close(stream);
                        }
                    } catch(e) {
                        throw e;
                    } finally {
                        FS.closeStream(stream.fd);
                    }
                    stream.fd = null;
                },
                isClosed(stream) {
                    return stream.fd === null;
                },
                llseek(stream, offset, whence) {
                    if (FS.isClosed(stream)) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if (!stream.seekable || !stream.stream_ops.llseek) {
                        throw new FS.ErrnoError(70);
                    }
                    
                    if (whence != 0 && whence != 1 && whence != 2) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    stream.position = stream.stream_ops.llseek(stream, offset, whence);
                    stream.ungotten = [];
                    
                    return stream.position;
                },
                read(stream, buffer, offset, length, position) {
                    assert(offset >= 0);
                    
                    if (length < 0 || position < 0) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    if (FS.isClosed(stream)) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if ((stream.flags & 2097155) === 1) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if (FS.isDir(stream.node.mode)) {
                        throw new FS.ErrnoError(31);
                    }
                    
                    if (!stream.stream_ops.read) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    const seeking = typeof position != 'undefined';
                    
                    if (!seeking) {
                        position = stream.position;
                    } else if (!stream.seekable) {
                        throw new FS.ErrnoError(70);
                    }
                    
                    const bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
                    
                    if (!seeking)
                        stream.position += bytesRead;
                    
                    return bytesRead;
                },
                write(stream, buffer, offset, length, position, canOwn) {
                    assert(offset >= 0);
                    
                    if (length < 0 || position < 0) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    if (FS.isClosed(stream)) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if ((stream.flags & 2097155) === 0) {
                        throw new FS.ErrnoError(8);
                    }
                    
                    if (FS.isDir(stream.node.mode)) {
                        throw new FS.ErrnoError(31);
                    }
                    
                    if (!stream.stream_ops.write) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    if (stream.seekable && stream.flags & 1024) {
                        // seek to the end before writing in append mode
                        FS.llseek(stream, 0, 2);
                    }
                    
                    const seeking = typeof position != 'undefined';
                    
                    if (!seeking) {
                        position = stream.position;
                    } else if (!stream.seekable) {
                        throw new FS.ErrnoError(70);
                    }
                    
                    const bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
                    
                    if (!seeking)
                        stream.position += bytesWritten;
                    
                    return bytesWritten;
                },
                mmap(stream, length, position, prot, flags) {
                    // User requests writing to file (prot & PROT_WRITE != 0).
                    // Checking if we have permissions to write to the file unless
                    // MAP_PRIVATE flag is set. According to POSIX spec it is possible
                    // to write to file opened in read-only mode with MAP_PRIVATE flag,
                    // as all modifications will be visible only in the memory of
                    // the current process.
                    if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
                        throw new FS.ErrnoError(2);
                    }
                    
                    if ((stream.flags & 2097155) === 1) {
                        throw new FS.ErrnoError(2);
                    }
                    
                    if (!stream.stream_ops.mmap) {
                        throw new FS.ErrnoError(43);
                    }
                    
                    if (!length) {
                        throw new FS.ErrnoError(28);
                    }
                    
                    return stream.stream_ops.mmap(stream, length, position, prot, flags);
                },
                msync(stream, buffer, offset, length, mmapFlags) {
                    assert(offset >= 0);
                    
                    if (!stream.stream_ops.msync) {
                        return 0;
                    }
                    
                    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
                },
                ioctl(stream, cmd, arg) {
                    if (!stream.stream_ops.ioctl) {
                        throw new FS.ErrnoError(59);
                    }
                    
                    return stream.stream_ops.ioctl(stream, cmd, arg);
                },
                readFile(path, opts = {}) {
                    opts.flags = opts.flags || 0;
                    opts.encoding = opts.encoding || 'binary';
                    
                    if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
                        throw new Error(`Invalid encoding type "${opts.encoding}"`);
                    }
                    
                    let ret;
                    const stream = FS.open(path, opts.flags);
                    const stat = FS.stat(path);
                    const length = stat.size;
                    const buf = new Uint8Array(length);
                    
                    FS.read(stream, buf, 0, length, 0);
                    
                    if (opts.encoding === 'utf8') {
                        ret = UTF8ArrayToString(buf);
                    } else if (opts.encoding === 'binary') {
                        ret = buf;
                    }
                    
                    FS.close(stream);
                    return ret;
                },
                writeFile(path, data, opts = {}) {
                    opts.flags = opts.flags || 577;
                    const stream = FS.open(path, opts.flags, opts.mode);
                    
                    if (typeof data == 'string') {
                        const buf = new Uint8Array(lengthBytesUTF8(data) + 1);
                        const actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
                        
                        FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
                    } else if (ArrayBuffer.isView(data)) {
                        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
                    } else {
                        throw new Error('Unsupported data type');
                    }
                    
                    FS.close(stream);
                },
                cwd: () => FS.currentPath,
                chdir(path) {
                    const lookup = FS.lookupPath(path, {follow: true});
                    
                    if (lookup.node === null) {
                        throw new FS.ErrnoError(44);
                    }
                    
                    if (!FS.isDir(lookup.node.mode)) {
                        throw new FS.ErrnoError(54);
                    }
                    
                    const errCode = FS.nodePermissions(lookup.node, 'x');
                    
                    if (errCode) {
                        throw new FS.ErrnoError(errCode);
                    }
                    
                    FS.currentPath = lookup.path;
                },
                createDefaultDirectories() {
                    FS.mkdir('/tmp');
                    FS.mkdir('/home');
                    FS.mkdir('/home/web_user');
                },
                createDefaultDevices() {
                    // create /dev
                    FS.mkdir('/dev');
                    // setup /dev/null
                    FS.registerDevice(FS.makedev(1, 3), {
                        read: () => 0,
                        write: (stream, buffer, offset, length, pos) => length,
                        llseek: () => 0,
                    });
                    FS.mkdev('/dev/null', FS.makedev(1, 3));
                    // setup /dev/tty and /dev/tty1
                    // stderr needs to print output using err() rather than out()
                    // so we register a second tty just for it.
                    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
                    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
                    FS.mkdev('/dev/tty', FS.makedev(5, 0));
                    FS.mkdev('/dev/tty1', FS.makedev(6, 0));
                    // setup /dev/[u]random
                    // use a buffer to avoid overhead of individual crypto calls per byte
                    let randomBuffer = new Uint8Array(1024), randomLeft = 0;
                    const randomByte = () => {
                        if (randomLeft === 0) {
                            randomFill(randomBuffer);
                            randomLeft = randomBuffer.byteLength;
                        }
                        
                        return randomBuffer[--randomLeft];
                    };
                    
                    FS.createDevice('/dev', 'random', randomByte);
                    FS.createDevice('/dev', 'urandom', randomByte);
                    // we're not going to emulate the actual shm device,
                    // just create the tmp dirs that reside in it commonly
                    FS.mkdir('/dev/shm');
                    FS.mkdir('/dev/shm/tmp');
                },
                createSpecialDirectories() {
                    // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
                    // name of the stream for fd 6 (see test_unistd_ttyname)
                    FS.mkdir('/proc');
                    
                    const proc_self = FS.mkdir('/proc/self');
                    
                    FS.mkdir('/proc/self/fd');
                    FS.mount({
                        mount() {
                            const node = FS.createNode(proc_self, 'fd', 16895, 73);
                            node.stream_ops = {
                                llseek: MEMFS.stream_ops.llseek,
                            };
                            node.node_ops = {
                                lookup(parent, name) {
                                    const fd = +name;
                                    const stream = FS.getStreamChecked(fd);
                                    const ret = {
                                        parent: null,
                                        mount: {mountpoint: 'fake'},
                                        node_ops: {readlink: () => stream.path},
                                        id: fd + 1,
                                    };
                                    
                                    ret.parent = ret; // make it look like a simple root node
                                    return ret;
                                },
                                readdir() {
                                    return Array.from(FS.streams.entries())
                                        .filter(([k, v]) => v)
                                        .map(([k, v]) => k.toString());
                                },
                            };
                            
                            return node;
                        },
                    }, {}, '/proc/self/fd');
                },
                createStandardStreams(input, output, error) {
                    // TODO deprecate the old functionality of a single
                    // input / output callback and that utilizes FS.createDevice
                    // and instead require a unique set of stream ops
                    
                    // by default, we symlink the standard streams to the
                    // default tty devices. however, if the standard streams
                    // have been overwritten we create a unique device for
                    // them instead.
                    if (input) {
                        FS.createDevice('/dev', 'stdin', input);
                    } else {
                        FS.symlink('/dev/tty', '/dev/stdin');
                    }
                    
                    if (output) {
                        FS.createDevice('/dev', 'stdout', null, output);
                    } else {
                        FS.symlink('/dev/tty', '/dev/stdout');
                    }
                    
                    if (error) {
                        FS.createDevice('/dev', 'stderr', null, error);
                    } else {
                        FS.symlink('/dev/tty1', '/dev/stderr');
                    }
                    
                    // open default streams for the stdin, stdout and stderr devices
                    const stdin = FS.open('/dev/stdin', 0);
                    const stdout = FS.open('/dev/stdout', 1);
                    const stderr = FS.open('/dev/stderr', 1);
                    
                    assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
                    assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
                    assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
                },
                staticInit() {
                    FS.nameTable = new Array(4096);
                    
                    FS.mount(MEMFS, {}, '/');
                    
                    FS.createDefaultDirectories();
                    FS.createDefaultDevices();
                    FS.createSpecialDirectories();
                    
                    FS.filesystems = {
                        MEMFS: MEMFS,
                    };
                },
                init(input, output, error) {
                    assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
                    FS.initialized = true;
                    
                    // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
                    input ??= Module.stdin;
                    output ??= Module.stdout;
                    error ??= Module.stderr;
                    
                    FS.createStandardStreams(input, output, error);
                },
                quit() {
                    FS.initialized = false;
                    // force-flush all streams, so we get musl std streams printed out
                    _fflush(0);
                    // close all of our streams
                    for (const stream of FS.streams) {
                        if (stream) {
                            FS.close(stream);
                        }
                    }
                },
                findObject(path, dontResolveLastLink) {
                    const ret = FS.analyzePath(path, dontResolveLastLink);
                    
                    if (!ret.exists) {
                        return null;
                    }
                    
                    return ret.object;
                },
                analyzePath(path, dontResolveLastLink) {
                    // operate from within the context of the symlink's target
                    try {
                        var lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
                        path = lookup.path;
                    } catch(e) {
                    }
                    const ret = {
                        isRoot: false,
                        exists: false,
                        error: 0,
                        name: null,
                        path: null,
                        object: null,
                        parentExists: false,
                        parentPath: null,
                        parentObject: null,
                    };
                    try {
                        var lookup = FS.lookupPath(path, {parent: true});
                        ret.parentExists = true;
                        ret.parentPath = lookup.path;
                        ret.parentObject = lookup.node;
                        ret.name = PATH.basename(path);
                        lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
                        ret.exists = true;
                        ret.path = lookup.path;
                        ret.object = lookup.node;
                        ret.name = lookup.node.name;
                        ret.isRoot = lookup.path === '/';
                    } catch(e) {
                        ret.error = e.errno;
                    }
                    
                    return ret;
                },
                createPath(parent, path, canRead, canWrite) {
                    parent = typeof parent == 'string' ? parent : FS.getPath(parent);
                    const parts = path.split('/').reverse();
                    
                    while (parts.length) {
                        const part = parts.pop();
                        
                        if (!part)
                            continue;
                        
                        var current = PATH.join2(parent, part);
                        try {
                            FS.mkdir(current);
                        } catch(e) {
                            if (e.errno != 20)
                                throw e;
                        }
                        parent = current;
                    }
                    
                    return current;
                },
                createFile(parent, name, properties, canRead, canWrite) {
                    const path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
                    const mode = FS_getMode(canRead, canWrite);
                    
                    return FS.create(path, mode);
                },
                createDataFile(parent, name, data, canRead, canWrite, canOwn) {
                    let path = name;
                    
                    if (parent) {
                        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
                        path = name ? PATH.join2(parent, name) : parent;
                    }
                    
                    const mode = FS_getMode(canRead, canWrite);
                    const node = FS.create(path, mode);
                    
                    if (data) {
                        if (typeof data == 'string') {
                            const arr = new Array(data.length);
                            
                            for (let i = 0, len = data.length; i < len; ++i)
                                arr[i] = data.charCodeAt(i);
                            
                            data = arr;
                        }
                        
                        // make sure we can write to the file
                        FS.chmod(node, mode | 146);
                        const stream = FS.open(node, 577);
                        
                        FS.write(stream, data, 0, data.length, 0, canOwn);
                        FS.close(stream);
                        FS.chmod(node, mode);
                    }
                },
                createDevice(parent, name, input, output) {
                    const path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
                    const mode = FS_getMode(!!input, !!output);
                    
                    FS.createDevice.major ??= 64;
                    const dev = FS.makedev(FS.createDevice.major++, 0);
                    // Create a fake device that a set of stream ops to emulate
                    // the old behavior.
                    FS.registerDevice(dev, {
                        open(stream) {
                            stream.seekable = false;
                        },
                        close(stream) {
                            // flush any pending line data
                            if (output?.buffer?.length) {
                                output(10);
                            }
                        },
                        read(stream, buffer, offset, length, pos /* ignored */) {
                            let bytesRead = 0;
                            
                            for (let i = 0; i < length; i++) {
                                var result;
                                try {
                                    result = input();
                                } catch(e) {
                                    throw new FS.ErrnoError(29);
                                }
                                
                                if (result === undefined && bytesRead === 0) {
                                    throw new FS.ErrnoError(6);
                                }
                                
                                if (result === null || result === undefined)
                                    break;
                                
                                bytesRead++;
                                buffer[offset + i] = result;
                            }
                            
                            if (bytesRead) {
                                stream.node.atime = Date.now();
                            }
                            
                            return bytesRead;
                        },
                        write(stream, buffer, offset, length, pos) {
                            for (var i = 0; i < length; i++) {
                                try {
                                    output(buffer[offset + i]);
                                } catch(e) {
                                    throw new FS.ErrnoError(29);
                                }
                            }
                            
                            if (length) {
                                stream.node.mtime = stream.node.ctime = Date.now();
                            }
                            
                            return i;
                        },
                    });
                    
                    return FS.mkdev(path, mode, dev);
                },
                forceLoadFile(obj) {
                    if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
                        return true;
                    
                    if (typeof XMLHttpRequest != 'undefined') {
                        throw new Error('Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.');
                    } else { // Command-line.
                        try {
                            obj.contents = readBinary(obj.url);
                            obj.usedBytes = obj.contents.length;
                        } catch(e) {
                            throw new FS.ErrnoError(29);
                        }
                    }
                },
                createLazyFile(parent, name, url, canRead, canWrite) {
                    // Lazy chunked Uint8Array (implements get and length from Uint8Array).
                    // Actual getting is abstracted away for eventual reuse.
                    class LazyUint8Array {
                        lengthKnown = false;
                        chunks = []; // Loaded chunks. Index is the chunk number
                        get(idx) {
                            if (idx > this.length - 1 || idx < 0) {
                                return undefined;
                            }
                            
                            const chunkOffset = idx % this.chunkSize;
                            const chunkNum = idx / this.chunkSize | 0;
                            
                            return this.getter(chunkNum)[chunkOffset];
                        }
                        setDataGetter(getter) {
                            this.getter = getter;
                        }
                        cacheLength() {
                            // Find length
                            const xhr = new XMLHttpRequest();
                            xhr.open('HEAD', url, false);
                            xhr.send(null);
                            
                            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                                throw new Error('Couldn\'t load ' + url + '. Status: ' + xhr.status);
                            
                            let datalength = Number(xhr.getResponseHeader('Content-length'));
                            let header;
                            const hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
                            const usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
                            
                            let chunkSize = 1024 * 1024; // Chunk size in bytes
                            
                            if (!hasByteServing)
                                chunkSize = datalength;
                            
                            // Function to get a range from the remote URL.
                            const doXHR = (from, to) => {
                                if (from > to)
                                    throw new Error('invalid range (' + from + ', ' + to + ') or no bytes requested!');
                                
                                if (to > datalength - 1)
                                    throw new Error('only ' + datalength + ' bytes available! programmer error!');
                                
                                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                                const xhr = new XMLHttpRequest();
                                
                                xhr.open('GET', url, false);
                                
                                if (datalength !== chunkSize)
                                    xhr.setRequestHeader('Range', 'bytes=' + from + '-' + to);
                                
                                // Some hints to the browser that we want binary data.
                                xhr.responseType = 'arraybuffer';
                                
                                if (xhr.overrideMimeType) {
                                    xhr.overrideMimeType('text/plain; charset=x-user-defined');
                                }
                                
                                xhr.send(null);
                                
                                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                                    throw new Error('Couldn\'t load ' + url + '. Status: ' + xhr.status);
                                
                                if (xhr.response !== undefined) {
                                    return new Uint8Array(/** @type{Array<number>} */xhr.response || []);
                                }
                                
                                return intArrayFromString(xhr.responseText || '', true);
                            };
                            const lazyArray = this;
                            
                            lazyArray.setDataGetter((chunkNum) => {
                                const start = chunkNum * chunkSize;
                                let end = (chunkNum + 1) * chunkSize - 1; // including this byte
                                end = Math.min(end, datalength - 1); // if datalength-1 is selected, this is the last block
                                
                                if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                                    lazyArray.chunks[chunkNum] = doXHR(start, end);
                                }
                                
                                if (typeof lazyArray.chunks[chunkNum] == 'undefined')
                                    throw new Error('doXHR failed!');
                                
                                return lazyArray.chunks[chunkNum];
                            });
                            
                            if (usesGzip || !datalength) {
                                // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
                                chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
                                datalength = this.getter(0).length;
                                chunkSize = datalength;
                                out('LazyFiles on gzip forces download of the whole file when length is accessed');
                            }
                            
                            this._length = datalength;
                            this._chunkSize = chunkSize;
                            this.lengthKnown = true;
                        }
                        get length() {
                            if (!this.lengthKnown) {
                                this.cacheLength();
                            }
                            
                            return this._length;
                        }
                        get chunkSize() {
                            if (!this.lengthKnown) {
                                this.cacheLength();
                            }
                            
                            return this._chunkSize;
                        }
                    }
                    
                    if (typeof XMLHttpRequest != 'undefined') {
                        if (!ENVIRONMENT_IS_WORKER)
                            throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
                        
                        const lazyArray = new LazyUint8Array();
                        var properties = {
                            isDevice: false,
                            contents: lazyArray,
                        };
                    } else {
                        var properties = {
                            isDevice: false,
                            url: url,
                        };
                    }
                    
                    const node = FS.createFile(parent, name, properties, canRead, canWrite);
                    
                    // This is a total hack, but I want to get this lazy file code out of the
                    // core of MEMFS. If we want to keep this lazy file concept I feel it should
                    // be its own thin LAZYFS proxying calls to MEMFS.
                    if (properties.contents) {
                        node.contents = properties.contents;
                    } else if (properties.url) {
                        node.contents = null;
                        node.url = properties.url;
                    }
                    
                    // Add a function that defers querying the file size until it is asked the first time.
                    Object.defineProperties(node, {
                        usedBytes: {
                            get: function() {
                                return this.contents.length;
                            },
                        },
                    });
                    // override each stream op with one that tries to force load the lazy file first
                    const stream_ops = {};
                    const keys = Object.keys(node.stream_ops);
                    
                    keys.forEach((key) => {
                        const fn = node.stream_ops[key];
                        stream_ops[key] = (...args) => {
                            FS.forceLoadFile(node);
                            return fn(...args);
                        };
                    });
                    
                    function writeChunks(stream, buffer, offset, length, position) {
                        const contents = stream.node.contents;
                        
                        if (position >= contents.length)
                            return 0;
                        
                        const size = Math.min(contents.length - position, length);
                        assert(size >= 0);
                        
                        if (contents.slice) { // normal array
                            for (var i = 0; i < size; i++) {
                                buffer[offset + i] = contents[position + i];
                            }
                        } else {
                            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
                                buffer[offset + i] = contents.get(position + i);
                            }
                        }
                        
                        return size;
                    }
                    // use a custom read function
                    stream_ops.read = (stream, buffer, offset, length, position) => {
                        FS.forceLoadFile(node);
                        return writeChunks(stream, buffer, offset, length, position);
                    };
                    // use a custom mmap function
                    stream_ops.mmap = (stream, length, position, prot, flags) => {
                        FS.forceLoadFile(node);
                        const ptr = mmapAlloc(length);
                        
                        if (!ptr) {
                            throw new FS.ErrnoError(48);
                        }
                        
                        writeChunks(stream, HEAP8, ptr, length, position);
                        return {ptr, allocated: true};
                    };
                    node.stream_ops = stream_ops;
                    
                    return node;
                },
                absolutePath() {
                    abort('FS.absolutePath has been removed; use PATH_FS.resolve instead');
                },
                createFolder() {
                    abort('FS.createFolder has been removed; use FS.mkdir instead');
                },
                createLink() {
                    abort('FS.createLink has been removed; use FS.symlink instead');
                },
                joinPath() {
                    abort('FS.joinPath has been removed; use PATH.join instead');
                },
                mmapAlloc() {
                    abort('FS.mmapAlloc has been replaced by the top level function mmapAlloc');
                },
                standardizePath() {
                    abort('FS.standardizePath has been removed; use PATH.normalize instead');
                },
            };
            
            var SYSCALLS = {
                DEFAULT_POLLMASK: 5,
                calculateAt(dirfd, path, allowEmpty) {
                    if (PATH.isAbs(path)) {
                        return path;
                    }
                    
                    // relative path
                    let dir;
                    
                    if (dirfd === -100) {
                        dir = FS.cwd();
                    } else {
                        const dirstream = SYSCALLS.getStreamFromFD(dirfd);
                        dir = dirstream.path;
                    }
                    
                    if (path.length == 0) {
                        if (!allowEmpty) {
                            throw new FS.ErrnoError(44);
                        }
                        
                        return dir;
                    }
                    
                    return dir + '/' + path;
                },
                writeStat(buf, stat) {
                    HEAP32[buf >> 2] = stat.dev;
                    HEAP32[buf + 4 >> 2] = stat.mode;
                    HEAPU32[buf + 8 >> 2] = stat.nlink;
                    HEAP32[buf + 12 >> 2] = stat.uid;
                    HEAP32[buf + 16 >> 2] = stat.gid;
                    HEAP32[buf + 20 >> 2] = stat.rdev;
                    HEAP64[buf + 24 >> 3] = BigInt(stat.size);
                    HEAP32[buf + 32 >> 2] = 4096;
                    HEAP32[buf + 36 >> 2] = stat.blocks;
                    const atime = stat.atime.getTime();
                    const mtime = stat.mtime.getTime();
                    const ctime = stat.ctime.getTime();
                    
                    HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1000));
                    HEAPU32[buf + 48 >> 2] = atime % 1000 * 1000 * 1000;
                    HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1000));
                    HEAPU32[buf + 64 >> 2] = mtime % 1000 * 1000 * 1000;
                    HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1000));
                    HEAPU32[buf + 80 >> 2] = ctime % 1000 * 1000 * 1000;
                    HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
                    
                    return 0;
                },
                writeStatFs(buf, stats) {
                    HEAP32[buf + 4 >> 2] = stats.bsize;
                    HEAP32[buf + 40 >> 2] = stats.bsize;
                    HEAP32[buf + 8 >> 2] = stats.blocks;
                    HEAP32[buf + 12 >> 2] = stats.bfree;
                    HEAP32[buf + 16 >> 2] = stats.bavail;
                    HEAP32[buf + 20 >> 2] = stats.files;
                    HEAP32[buf + 24 >> 2] = stats.ffree;
                    HEAP32[buf + 28 >> 2] = stats.fsid;
                    HEAP32[buf + 44 >> 2] = stats.flags; // ST_NOSUID
                    HEAP32[buf + 36 >> 2] = stats.namelen;
                },
                doMsync(addr, stream, len, flags, offset) {
                    if (!FS.isFile(stream.node.mode)) {
                        throw new FS.ErrnoError(43);
                    }
                    
                    if (flags & 2) {
                        // MAP_PRIVATE calls need not to be synced back to underlying fs
                        return 0;
                    }
                    
                    const buffer = HEAPU8.slice(addr, addr + len);
                    FS.msync(stream, buffer, offset, len, flags);
                },
                getStreamFromFD(fd) {
                    const stream = FS.getStreamChecked(fd);
                    return stream;
                },
                varargs: undefined,
                getStr(ptr) {
                    const ret = UTF8ToString(ptr);
                    return ret;
                },
            };
            
            function ___syscall_chdir(path) {
                try {
                    path = SYSCALLS.getStr(path);
                    FS.chdir(path);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_chmod(path, mode) {
                try {
                    path = SYSCALLS.getStr(path);
                    FS.chmod(path, mode);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_dup(fd) {
                try {
                    const old = SYSCALLS.getStreamFromFD(fd);
                    return FS.dupStream(old).fd;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_dup3(fd, newfd, flags) {
                try {
                    const old = SYSCALLS.getStreamFromFD(fd);
                    assert(!flags);
                    
                    if (old.fd === newfd)
                        return -28;
                    
                    // Check newfd is within range of valid open file descriptors.
                    if (newfd < 0 || newfd >= FS.MAX_OPEN_FDS)
                        return -8;
                    
                    const existing = FS.getStream(newfd);
                    
                    if (existing)
                        FS.close(existing);
                    
                    return FS.dupStream(old, newfd).fd;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_faccessat(dirfd, path, amode, flags) {
                try {
                    path = SYSCALLS.getStr(path);
                    assert(flags === 0 || flags == 512);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    
                    if (amode & ~7) {
                        // need a valid mode
                        return -28;
                    }
                    
                    const lookup = FS.lookupPath(path, {follow: true});
                    const node = lookup.node;
                    
                    if (!node) {
                        return -44;
                    }
                    
                    let perms = '';
                    
                    if (amode & 4)
                        perms += 'r';
                    
                    if (amode & 2)
                        perms += 'w';
                    
                    if (amode & 1)
                        perms += 'x';
                    
                    if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
                        return -2;
                    }
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fchdir(fd) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    FS.chdir(stream.path);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fchmod(fd, mode) {
                try {
                    FS.fchmod(fd, mode);
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fchmodat2(dirfd, path, mode, flags) {
                try {
                    const nofollow = flags & 256;
                    path = SYSCALLS.getStr(path);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    FS.chmod(path, mode, nofollow);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fchown32(fd, owner, group) {
                try {
                    FS.fchown(fd, owner, group);
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fchownat(dirfd, path, owner, group, flags) {
                try {
                    path = SYSCALLS.getStr(path);
                    const nofollow = flags & 256;
                    
                    flags = flags & ~256;
                    assert(flags === 0);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    (nofollow ? FS.lchown : FS.chown)(path, owner, group);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            /** @suppress {duplicate } */
            const syscallGetVarargI = () => {
                assert(SYSCALLS.varargs != undefined);
                // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
                const ret = HEAP32[+SYSCALLS.varargs >> 2];
                
                SYSCALLS.varargs += 4;
                
                return ret;
            };
            const syscallGetVarargP = syscallGetVarargI;
            
            function ___syscall_fcntl64(fd, cmd, varargs) {
                SYSCALLS.varargs = varargs;
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    switch(cmd) {
                    case 0: {
                        var arg = syscallGetVarargI();
                        
                        if (arg < 0) {
                            return -28;
                        }
                        
                        while (FS.streams[arg]) {
                            arg++;
                        }
                        let newStream;
                        
                        newStream = FS.dupStream(stream, arg);
                        
                        return newStream.fd;
                    }
                    case 1:
                    case 2:
                        return 0; // FD_CLOEXEC makes no sense for a single process.
                    case 3:
                        return stream.flags;
                    case 4: {
                        var arg = syscallGetVarargI();
                        stream.flags |= arg;
                        
                        return 0;
                    }
                    case 12: {
                        var arg = syscallGetVarargP();
                        const offset = 0;
                        // We're always unlocked.
                        HEAP16[arg + offset >> 1] = 2;
                        
                        return 0;
                    }
                    case 13:
                    case 14:
                        // Pretend that the locking is successful. These are process-level locks,
                        // and Emscripten programs are a single process. If we supported linking a
                        // filesystem between programs, we'd need to do more here.
                        // See https://github.com/emscripten-core/emscripten/issues/23697
                        return 0;
                    }
                    
                    return -28;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fdatasync(fd) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    return 0; // we can't do anything synchronously; the in-memory FS is already synced to
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fstat64(fd, buf) {
                try {
                    return SYSCALLS.writeStat(buf, FS.fstat(fd));
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_fstatfs64(fd, size, buf) {
                try {
                    assert(size === 64);
                    
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    
                    SYSCALLS.writeStatFs(buf, FS.statfsStream(stream));
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            const INT53_MAX = 9007199254740992;
            
            const INT53_MIN = -9007199254740992;
            const bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
            
            function ___syscall_ftruncate64(fd, length) {
                length = bigintToI53Checked(length);
                
                try {
                    if (isNaN(length))
                        return 61;
                    
                    FS.ftruncate(fd, length);
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            const stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
                assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
                return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
            };
            
            function ___syscall_getcwd(buf, size) {
                try {
                    if (size === 0)
                        return -28;
                    
                    const cwd = FS.cwd();
                    const cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
                    
                    if (size < cwdLengthInBytes)
                        return -68;
                    
                    stringToUTF8(cwd, buf, size);
                    return cwdLengthInBytes;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_getdents64(fd, dirp, count) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    stream.getdents ||= FS.readdir(stream.path);
                    
                    const struct_size = 280;
                    let pos = 0;
                    const off = FS.llseek(stream, 0, 1);
                    
                    const startIdx = Math.floor(off / struct_size);
                    const endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
                    
                    for (var idx = startIdx; idx < endIdx; idx++) {
                        var id;
                        var type;
                        const name = stream.getdents[idx];
                        
                        if (name === '.') {
                            id = stream.node.id;
                            type = 4; // DT_DIR
                        } else if (name === '..') {
                            const lookup = FS.lookupPath(stream.path, {parent: true});
                            id = lookup.node.id;
                            type = 4; // DT_DIR
                        } else {
                            var child;
                            try {
                                child = FS.lookupNode(stream.node, name);
                            } catch(e) {
                                // If the entry is not a directory, file, or symlink, nodefs
                                // lookupNode will raise EINVAL. Skip these and continue.
                                if (e?.errno === 28) {
                                    continue;
                                }
                                
                                throw e;
                            }
                            id = child.id;
                            type = FS.isChrdev(child.mode) ? 2 // DT_CHR, character device.
                                : FS.isDir(child.mode) ? 4 // DT_DIR, directory.
                                    : FS.isLink(child.mode) ? 10 // DT_LNK, symbolic link.
                                        : 8; // DT_REG, regular file.
                        }
                        
                        assert(id);
                        HEAP64[dirp + pos >> 3] = BigInt(id);
                        HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
                        HEAP16[dirp + pos + 16 >> 1] = 280;
                        HEAP8[dirp + pos + 18] = type;
                        stringToUTF8(name, dirp + pos + 19, 256);
                        pos += struct_size;
                    }
                    
                    FS.llseek(stream, idx * struct_size, 0);
                    return pos;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_ioctl(fd, op, varargs) {
                SYSCALLS.varargs = varargs;
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    switch(op) {
                    case 21509: {
                        if (!stream.tty)
                            return -59;
                        
                        return 0;
                    }
                    case 21505: {
                        if (!stream.tty)
                            return -59;
                        
                        if (stream.tty.ops.ioctl_tcgets) {
                            const termios = stream.tty.ops.ioctl_tcgets(stream);
                            var argp = syscallGetVarargP();
                            
                            HEAP32[argp >> 2] = termios.c_iflag || 0;
                            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
                            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
                            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
                            for (var i = 0; i < 32; i++) {
                                HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
                            }
                            
                            return 0;
                        }
                        
                        return 0;
                    }
                    case 21510:
                    case 21511:
                    case 21512: {
                        if (!stream.tty)
                            return -59;
                        
                        return 0; // no-op, not actually adjusting terminal settings
                    }
                    case 21506:
                    case 21507:
                    case 21508: {
                        if (!stream.tty)
                            return -59;
                        
                        if (stream.tty.ops.ioctl_tcsets) {
                            var argp = syscallGetVarargP();
                            const c_iflag = HEAP32[argp >> 2];
                            const c_oflag = HEAP32[argp + 4 >> 2];
                            const c_cflag = HEAP32[argp + 8 >> 2];
                            const c_lflag = HEAP32[argp + 12 >> 2];
                            const c_cc = [];
                            
                            for (var i = 0; i < 32; i++) {
                                c_cc.push(HEAP8[argp + i + 17]);
                            }
                            
                            return stream.tty.ops.ioctl_tcsets(stream.tty, op, {c_iflag, c_oflag, c_cflag, c_lflag, c_cc});
                        }
                        
                        return 0; // no-op, not actually adjusting terminal settings
                    }
                    case 21519: {
                        if (!stream.tty)
                            return -59;
                        
                        var argp = syscallGetVarargP();
                        HEAP32[argp >> 2] = 0;
                        
                        return 0;
                    }
                    case 21520: {
                        if (!stream.tty)
                            return -59;
                        
                        return -28; // not supported
                    }
                    case 21531: {
                        var argp = syscallGetVarargP();
                        return FS.ioctl(stream, op, argp);
                    }
                    case 21523: {
                        // TODO: in theory we should write to the winsize struct that gets
                        // passed in, but for now musl doesn't read anything on it
                        if (!stream.tty)
                            return -59;
                        
                        if (stream.tty.ops.ioctl_tiocgwinsz) {
                            const winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
                            var argp = syscallGetVarargP();
                            
                            HEAP16[argp >> 1] = winsize[0];
                            HEAP16[argp + 2 >> 1] = winsize[1];
                        }
                        
                        return 0;
                    }
                    case 21524: {
                        // TODO: technically, this ioctl call should change the window size.
                        // but, since emscripten doesn't have any concept of a terminal window
                        // yet, we'll just silently throw it away as we do TIOCGWINSZ
                        if (!stream.tty)
                            return -59;
                        
                        return 0;
                    }
                    case 21515: {
                        if (!stream.tty)
                            return -59;
                        
                        return 0;
                    }
                    default: return -28; // not supported
                    }
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_lstat64(path, buf) {
                try {
                    path = SYSCALLS.getStr(path);
                    return SYSCALLS.writeStat(buf, FS.lstat(path));
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_mkdirat(dirfd, path, mode) {
                try {
                    path = SYSCALLS.getStr(path);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    FS.mkdir(path, mode, 0);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_newfstatat(dirfd, path, buf, flags) {
                try {
                    path = SYSCALLS.getStr(path);
                    const nofollow = flags & 256;
                    const allowEmpty = flags & 4096;
                    
                    flags = flags & ~6400;
                    assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
                    path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
                    
                    return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_openat(dirfd, path, flags, varargs) {
                SYSCALLS.varargs = varargs;
                try {
                    path = SYSCALLS.getStr(path);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    const mode = varargs ? syscallGetVarargI() : 0;
                    
                    return FS.open(path, flags, mode).fd;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            var PIPEFS = {
                BUCKET_BUFFER_SIZE: 8192,
                mount(mount) {
                    // Do not pollute the real root directory or its child nodes with pipes
                    // Looks like it is OK to create another pseudo-root node not linked to the FS.root hierarchy this way
                    return FS.createNode(null, '/', 16384 | 0o777, 0);
                },
                createPipe() {
                    const pipe = {
                        buckets: [],
                        // refcnt 2 because pipe has a read end and a write end. We need to be
                        // able to read from the read end after write end is closed.
                        refcnt: 2,
                        timestamp: new Date(),
                    };
                    
                    pipe.buckets.push({
                        buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
                        offset: 0,
                        roffset: 0,
                    });
                    
                    const rName = PIPEFS.nextname();
                    const wName = PIPEFS.nextname();
                    const rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
                    const wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
                    
                    rNode.pipe = pipe;
                    wNode.pipe = pipe;
                    
                    const readableStream = FS.createStream({
                        path: rName,
                        node: rNode,
                        flags: 0,
                        seekable: false,
                        stream_ops: PIPEFS.stream_ops,
                    });
                    rNode.stream = readableStream;
                    
                    const writableStream = FS.createStream({
                        path: wName,
                        node: wNode,
                        flags: 1,
                        seekable: false,
                        stream_ops: PIPEFS.stream_ops,
                    });
                    wNode.stream = writableStream;
                    
                    return {
                        readable_fd: readableStream.fd,
                        writable_fd: writableStream.fd,
                    };
                },
                stream_ops: {
                    getattr(stream) {
                        const node = stream.node;
                        const timestamp = node.pipe.timestamp;
                        
                        return {
                            dev: 14,
                            ino: node.id,
                            mode: 0o10600,
                            nlink: 1,
                            uid: 0,
                            gid: 0,
                            rdev: 0,
                            size: 0,
                            atime: timestamp,
                            mtime: timestamp,
                            ctime: timestamp,
                            blksize: 4096,
                            blocks: 0,
                        };
                    },
                    poll(stream) {
                        const pipe = stream.node.pipe;
                        
                        if ((stream.flags & 2097155) === 1) {
                            return 256 | 4;
                        }
                        
                        for (const bucket of pipe.buckets) {
                            if (bucket.offset - bucket.roffset > 0) {
                                return 64 | 1;
                            }
                        }
                        
                        return 0;
                    },
                    dup(stream) {
                        stream.node.pipe.refcnt++;
                    },
                    ioctl(stream, request, varargs) {
                        return 28;
                    },
                    fsync(stream) {
                        return 28;
                    },
                    read(stream, buffer, offset, length, position /* ignored */) {
                        const pipe = stream.node.pipe;
                        let currentLength = 0;
                        
                        for (var bucket of pipe.buckets) {
                            currentLength += bucket.offset - bucket.roffset;
                        }
                        
                        assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
                        let data = buffer.subarray(offset, offset + length);
                        
                        if (length <= 0) {
                            return 0;
                        }
                        
                        if (currentLength == 0) {
                            // Behave as if the read end is always non-blocking
                            throw new FS.ErrnoError(6);
                        }
                        
                        let toRead = Math.min(currentLength, length);
                        
                        const totalRead = toRead;
                        let toRemove = 0;
                        
                        for (var bucket of pipe.buckets) {
                            const bucketSize = bucket.offset - bucket.roffset;
                            
                            if (toRead <= bucketSize) {
                                var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
                                
                                if (toRead < bucketSize) {
                                    tmpSlice = tmpSlice.subarray(0, toRead);
                                    bucket.roffset += toRead;
                                } else {
                                    toRemove++;
                                }
                                
                                data.set(tmpSlice);
                                break;
                            } else {
                                var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
                                data.set(tmpSlice);
                                data = data.subarray(tmpSlice.byteLength);
                                toRead -= tmpSlice.byteLength;
                                toRemove++;
                            }
                        }
                        
                        if (toRemove && toRemove == pipe.buckets.length) {
                            // Do not generate excessive garbage in use cases such as
                            // write several bytes, read everything, write several bytes, read everything...
                            toRemove--;
                            pipe.buckets[toRemove].offset = 0;
                            pipe.buckets[toRemove].roffset = 0;
                        }
                        
                        pipe.buckets.splice(0, toRemove);
                        
                        return totalRead;
                    },
                    write(stream, buffer, offset, length, position /* ignored */) {
                        const pipe = stream.node.pipe;
                        
                        assert(buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer));
                        let data = buffer.subarray(offset, offset + length);
                        
                        const dataLen = data.byteLength;
                        
                        if (dataLen <= 0) {
                            return 0;
                        }
                        
                        let currBucket = null;
                        
                        if (pipe.buckets.length == 0) {
                            currBucket = {
                                buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
                                offset: 0,
                                roffset: 0,
                            };
                            pipe.buckets.push(currBucket);
                        } else {
                            currBucket = pipe.buckets[pipe.buckets.length - 1];
                        }
                        
                        assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
                        
                        const freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
                        
                        if (freeBytesInCurrBuffer >= dataLen) {
                            currBucket.buffer.set(data, currBucket.offset);
                            currBucket.offset += dataLen;
                            
                            return dataLen;
                        }
                        
                        if (freeBytesInCurrBuffer > 0) {
                            currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
                            currBucket.offset += freeBytesInCurrBuffer;
                            data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
                        }
                        
                        const numBuckets = data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE | 0;
                        const remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
                        
                        for (let i = 0; i < numBuckets; i++) {
                            var newBucket = {
                                buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
                                offset: PIPEFS.BUCKET_BUFFER_SIZE,
                                roffset: 0,
                            };
                            pipe.buckets.push(newBucket);
                            newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
                            data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
                        }
                        
                        if (remElements > 0) {
                            var newBucket = {
                                buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
                                offset: data.byteLength,
                                roffset: 0,
                            };
                            pipe.buckets.push(newBucket);
                            newBucket.buffer.set(data);
                        }
                        
                        return dataLen;
                    },
                    close(stream) {
                        const pipe = stream.node.pipe;
                        pipe.refcnt--;
                        
                        if (pipe.refcnt === 0) {
                            pipe.buckets = null;
                        }
                    },
                },
                nextname() {
                    if (!PIPEFS.nextname.current) {
                        PIPEFS.nextname.current = 0;
                    }
                    
                    return 'pipe[' + PIPEFS.nextname.current++ + ']';
                },
            };
            
            function ___syscall_pipe(fdPtr) {
                try {
                    if (fdPtr == 0) {
                        throw new FS.ErrnoError(21);
                    }
                    
                    const res = PIPEFS.createPipe();
                    
                    HEAP32[fdPtr >> 2] = res.readable_fd;
                    HEAP32[fdPtr + 4 >> 2] = res.writable_fd;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_poll(fds, nfds, timeout) {
                try {
                    let nonzero = 0;
                    
                    for (let i = 0; i < nfds; i++) {
                        const pollfd = fds + 8 * i;
                        const fd = HEAP32[pollfd >> 2];
                        const events = HEAP16[pollfd + 4 >> 1];
                        let mask = 32;
                        const stream = FS.getStream(fd);
                        
                        if (stream) {
                            mask = SYSCALLS.DEFAULT_POLLMASK;
                            
                            if (stream.stream_ops.poll) {
                                mask = stream.stream_ops.poll(stream, -1);
                            }
                        }
                        
                        mask &= events | 8 | 16;
                        
                        if (mask)
                            nonzero++;
                        
                        HEAP16[pollfd + 6 >> 1] = mask;
                    }
                    
                    return nonzero;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
                try {
                    path = SYSCALLS.getStr(path);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    
                    if (bufsize <= 0)
                        return -28;
                    
                    const ret = FS.readlink(path);
                    
                    const len = Math.min(bufsize, lengthBytesUTF8(ret));
                    const endChar = HEAP8[buf + len];
                    
                    stringToUTF8(ret, buf, bufsize + 1);
                    // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
                    // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
                    HEAP8[buf + len] = endChar;
                    
                    return len;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
                try {
                    oldpath = SYSCALLS.getStr(oldpath);
                    newpath = SYSCALLS.getStr(newpath);
                    oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
                    newpath = SYSCALLS.calculateAt(newdirfd, newpath);
                    FS.rename(oldpath, newpath);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_stat64(path, buf) {
                try {
                    path = SYSCALLS.getStr(path);
                    return SYSCALLS.writeStat(buf, FS.stat(path));
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_statfs64(path, size, buf) {
                try {
                    assert(size === 64);
                    SYSCALLS.writeStatFs(buf, FS.statfs(SYSCALLS.getStr(path)));
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_symlinkat(target, dirfd, linkpath) {
                try {
                    target = SYSCALLS.getStr(target);
                    linkpath = SYSCALLS.getStr(linkpath);
                    linkpath = SYSCALLS.calculateAt(dirfd, linkpath);
                    FS.symlink(target, linkpath);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function ___syscall_unlinkat(dirfd, path, flags) {
                try {
                    path = SYSCALLS.getStr(path);
                    path = SYSCALLS.calculateAt(dirfd, path);
                    
                    if (flags === 0) {
                        FS.unlink(path);
                    } else if (flags === 512) {
                        FS.rmdir(path);
                    } else {
                        abort('Invalid flags passed to unlinkat');
                    }
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            const readI53FromI64 = (ptr) => {
                return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
            };
            
            function ___syscall_utimensat(dirfd, path, times, flags) {
                try {
                    path = SYSCALLS.getStr(path);
                    assert(flags === 0);
                    path = SYSCALLS.calculateAt(dirfd, path, true);
                    let now = Date.now(), atime, mtime;
                    
                    if (!times) {
                        atime = now;
                        mtime = now;
                    } else {
                        let seconds = readI53FromI64(times);
                        let nanoseconds = HEAP32[times + 8 >> 2];
                        
                        if (nanoseconds == 1073741823) {
                            atime = now;
                        } else if (nanoseconds == 1073741822) {
                            atime = null;
                        } else {
                            atime = seconds * 1000 + nanoseconds / (1000 * 1000);
                        }
                        
                        times += 16;
                        seconds = readI53FromI64(times);
                        nanoseconds = HEAP32[times + 8 >> 2];
                        
                        if (nanoseconds == 1073741823) {
                            mtime = now;
                        } else if (nanoseconds == 1073741822) {
                            mtime = null;
                        } else {
                            mtime = seconds * 1000 + nanoseconds / (1000 * 1000);
                        }
                    }
                    
                    // null here means UTIME_OMIT was passed. If both were set to UTIME_OMIT then
                    // we can skip the call completely.
                    if ((mtime ?? atime) !== null) {
                        FS.utime(path, atime, mtime);
                    }
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            const __abort_js = () => abort('native code called abort()');
            
            let runtimeKeepaliveCounter = 0;
            const __emscripten_runtime_keepalive_clear = () => {
                noExitRuntime = false;
                runtimeKeepaliveCounter = 0;
            };
            
            const __emscripten_throw_longjmp = () => {
                throw Infinity;
            };
            
            const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
            
            const MONTH_DAYS_LEAP_CUMULATIVE = [
                0,
                31,
                60,
                91,
                121,
                152,
                182,
                213,
                244,
                274,
                305,
                335,
            ];
            
            const MONTH_DAYS_REGULAR_CUMULATIVE = [
                0,
                31,
                59,
                90,
                120,
                151,
                181,
                212,
                243,
                273,
                304,
                334,
            ];
            const ydayFromDate = (date) => {
                const leap = isLeapYear(date.getFullYear());
                const monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
                const yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
                
                return yday;
            };
            
            function __localtime_js(time, tmPtr) {
                time = bigintToI53Checked(time);
                
                const date = new Date(time * 1000);
                HEAP32[tmPtr >> 2] = date.getSeconds();
                HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
                HEAP32[tmPtr + 8 >> 2] = date.getHours();
                HEAP32[tmPtr + 12 >> 2] = date.getDate();
                HEAP32[tmPtr + 16 >> 2] = date.getMonth();
                HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
                HEAP32[tmPtr + 24 >> 2] = date.getDay();
                
                const yday = ydayFromDate(date) | 0;
                HEAP32[tmPtr + 28 >> 2] = yday;
                HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
                
                // Attention: DST is in December in South, and some regions don't have DST at all.
                const start = new Date(date.getFullYear(), 0, 1);
                const summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
                const winterOffset = start.getTimezoneOffset();
                const dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
                
                HEAP32[tmPtr + 32 >> 2] = dst;
            }
            
            function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
                offset = bigintToI53Checked(offset);
                
                try {
                    if (isNaN(offset))
                        return 61;
                    
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    const res = FS.mmap(stream, len, offset, prot, flags);
                    const ptr = res.ptr;
                    
                    HEAP32[allocated >> 2] = res.allocated;
                    HEAPU32[addr >> 2] = ptr;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function __msync_js(addr, len, prot, flags, fd, offset) {
                offset = bigintToI53Checked(offset);
                
                try {
                    if (isNaN(offset))
                        return 61;
                    
                    SYSCALLS.doMsync(addr, SYSCALLS.getStreamFromFD(fd), len, flags, offset);
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            function __munmap_js(addr, len, prot, flags, fd, offset) {
                offset = bigintToI53Checked(offset);
                
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    
                    if (prot & 2) {
                        SYSCALLS.doMsync(addr, stream, len, flags, offset);
                    }
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return -e.errno;
                }
            }
            
            const timers = {
            };
            
            const handleException = (e) => {
                // Certain exception types we do not treat as errors since they are used for
                // internal control flow.
                // 1. ExitStatus, which is thrown by exit()
                // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
                //    that wish to return to JS event loop.
                if (e instanceof ExitStatus || e == 'unwind') {
                    return EXITSTATUS;
                }
                
                checkStackCookie();
                
                if (e instanceof WebAssembly.RuntimeError) {
                    if (_emscripten_stack_get_current() <= 0) {
                        err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
                    }
                }
                
                quit_(1, e);
            };
            
            const keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
            const _proc_exit = (code) => {
                EXITSTATUS = code;
                
                if (!keepRuntimeAlive()) {
                    Module.onExit?.(code);
                    ABORT = true;
                }
                
                quit_(code, new ExitStatus(code));
            };
            
            /** @suppress {duplicate } */
            /** @param {boolean|number=} implicit */
            const exitJS = (status, implicit) => {
                EXITSTATUS = status;
                
                checkUnflushedContent();
                
                // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
                if (keepRuntimeAlive() && !implicit) {
                    const msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
                    readyPromiseReject(msg);
                    err(msg);
                }
                
                _proc_exit(status);
            };
            const _exit = exitJS;
            
            const maybeExit = () => {
                if (!keepRuntimeAlive()) {
                    try {
                        _exit(EXITSTATUS);
                    } catch(e) {
                        handleException(e);
                    }
                }
            };
            const callUserCallback = (func) => {
                if (ABORT) {
                    err('user callback triggered after runtime exited or application aborted.  Ignoring.');
                    return;
                }
                
                try {
                    func();
                    maybeExit();
                } catch(e) {
                    handleException(e);
                }
            };
            
            const _emscripten_get_now = () => performance.now();
            const __setitimer_js = (which, timeout_ms) => {
                // First, clear any existing timer.
                if (timers[which]) {
                    clearTimeout(timers[which].id);
                    delete timers[which];
                }
                
                // A timeout of zero simply cancels the current timeout so we have nothing
                // more to do.
                if (!timeout_ms)
                    return 0;
                
                const id = setTimeout(() => {
                    assert(which in timers);
                    delete timers[which];
                    callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
                }, timeout_ms);
                timers[which] = {
                    id,
                    timeout_ms,
                };
                
                return 0;
            };
            
            const __tzset_js = (timezone, daylight, std_name, dst_name) => {
                // TODO: Use (malleable) environment variables instead of system settings.
                const currentYear = new Date().getFullYear();
                const winter = new Date(currentYear, 0, 1);
                const summer = new Date(currentYear, 6, 1);
                const winterOffset = winter.getTimezoneOffset();
                const summerOffset = summer.getTimezoneOffset();
                
                // Local standard timezone offset. Local standard time is not adjusted for
                // daylight savings.  This code uses the fact that getTimezoneOffset returns
                // a greater value during Standard Time versus Daylight Saving Time (DST).
                // Thus it determines the expected output during Standard Time, and it
                // compares whether the output of the given date the same (Standard) or less
                // (DST).
                const stdTimezoneOffset = Math.max(winterOffset, summerOffset);
                
                // timezone is specified as seconds west of UTC ("The external variable
                // `timezone` shall be set to the difference, in seconds, between
                // Coordinated Universal Time (UTC) and local standard time."), the same
                // as returned by stdTimezoneOffset.
                // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
                HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
                
                HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
                
                const extractZone = (timezoneOffset) => {
                    // Why inverse sign?
                    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
                    const sign = timezoneOffset >= 0 ? '-' : '+';
                    
                    const absOffset = Math.abs(timezoneOffset);
                    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
                    const minutes = String(absOffset % 60).padStart(2, '0');
                    
                    return `UTC${sign}${hours}${minutes}`;
                };
                
                const winterName = extractZone(winterOffset);
                const summerName = extractZone(summerOffset);
                
                assert(winterName);
                assert(summerName);
                assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
                assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
                
                if (summerOffset < winterOffset) {
                    // Northern hemisphere
                    stringToUTF8(winterName, std_name, 17);
                    stringToUTF8(summerName, dst_name, 17);
                } else {
                    stringToUTF8(winterName, dst_name, 17);
                    stringToUTF8(summerName, std_name, 17);
                }
            };
            
            const _emscripten_get_now_res = () => { // return resolution of get_now, in nanoseconds
                // Modern environment where performance.now() is supported:
                return 1000; // microseconds (1/1000 of a millisecond)
            };
            
            const nowIsMonotonic = 1;
            
            const checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
            const _clock_res_get = (clk_id, pres) => {
                if (!checkWasiClock(clk_id)) {
                    return 28;
                }
                
                let nsec;
                
                // all wasi clocks but realtime are monotonic
                if (clk_id === 0) {
                    nsec = 1000 * 1000; // educated guess that it's milliseconds
                } else if (nowIsMonotonic) {
                    nsec = _emscripten_get_now_res();
                } else {
                    return 52;
                }
                
                HEAP64[pres >> 3] = BigInt(nsec);
                return 0;
            };
            
            const _emscripten_date_now = () => Date.now();
            
            function _clock_time_get(clk_id, ignored_precision, ptime) {
                ignored_precision = bigintToI53Checked(ignored_precision);
                
                if (!checkWasiClock(clk_id)) {
                    return 28;
                }
                
                let now;
                
                // all wasi clocks but realtime are monotonic
                if (clk_id === 0) {
                    now = _emscripten_date_now();
                } else if (nowIsMonotonic) {
                    now = _emscripten_get_now();
                } else {
                    return 52;
                }
                
                // "now" is in ms, and wasi times are in ns.
                const nsec = Math.round(now * 1000 * 1000);
                
                HEAP64[ptime >> 3] = BigInt(nsec);
                
                return 0;
            }
            
            const _emscripten_err = (str) => err(UTF8ToString(str));
            
            const getHeapMax = () =>
            // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
            // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
            // for any code that deals with heap sizes, which would require special
            // casing all heap size related code to treat 0 specially.
                2147483648;
            const _emscripten_get_heap_max = () => getHeapMax();
            
            const growMemory = (size) => {
                const b = wasmMemory.buffer;
                const pages = (size - b.byteLength + 65535) / 65536 | 0;
                try {
                    // round size grow request up to wasm page size (fixed 64KB per spec)
                    wasmMemory.grow(pages); // .grow() takes a delta compared to the previous size
                    updateMemoryViews();
                    
                    return 1 /*success*/;
                } catch(e) {
                    err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
                }
                // implicit 0 return to save code size (caller will cast "undefined" into 0
                // anyhow)
            };
            const _emscripten_resize_heap = (requestedSize) => {
                const oldSize = HEAPU8.length;
                // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
                requestedSize >>>= 0;
                // With multithreaded builds, races can happen (another thread might increase the size
                // in between), so return a failure, and let the caller retry.
                assert(requestedSize > oldSize);
                
                // Memory resize rules:
                // 1.  Always increase heap size to at least the requested size, rounded up
                //     to next page multiple.
                // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
                //     geometrically: increase the heap size according to
                //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
                //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
                // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
                //     linearly: increase the heap size by at least
                //     MEMORY_GROWTH_LINEAR_STEP bytes.
                // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
                //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
                // 4.  If we were unable to allocate as much memory, it may be due to
                //     over-eager decision to excessively reserve due to (3) above.
                //     Hence if an allocation fails, cut down on the amount of excess
                //     growth, in an attempt to succeed to perform a smaller allocation.
                
                // A limit is set for how much we can grow. We should not exceed that
                // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
                const maxHeapSize = getHeapMax();
                
                if (requestedSize > maxHeapSize) {
                    err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
                    return false;
                }
                
                // Loop through potential heap size increases. If we attempt a too eager
                // reservation that fails, cut down on the attempted size and reserve a
                // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
                for (let cutDown = 1; cutDown <= 4; cutDown *= 2) {
                    let overGrownHeapSize = oldSize * (1 + 0.2 / cutDown); // ensure geometric growth
                    // but limit overreserving (default to capping at +96MB overgrowth at most)
                    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
                    
                    var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
                    
                    const replacement = growMemory(newSize);
                    
                    if (replacement) {
                        return true;
                    }
                }
                
                err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
                return false;
            };
            
            const _emscripten_sleep = () => {
                throw 'Please compile your program with async support in order to use asynchronous operations like emscripten_sleep';
            };
            
            const ENV = {
            };
            
            const getExecutableName = () => thisProgram || './this.program';
            const getEnvStrings = () => {
                if (!getEnvStrings.strings) {
                    // Default values.
                    // Browser language detection #8751
                    const lang = (typeof navigator == 'object' && navigator.languages && navigator.languages[0] || 'C').replace('-', '_') + '.UTF-8';
                    const env = {
                        USER: 'web_user',
                        LOGNAME: 'web_user',
                        PATH: '/',
                        PWD: '/',
                        HOME: '/home/web_user',
                        LANG: lang,
                        _: getExecutableName(),
                    };
                    
                    // Apply the user-provided values, if any.
                    for (var x in ENV) {
                        // x is a key in ENV; if ENV[x] is undefined, that means it was
                        // explicitly set to be so. We allow user code to do that to
                        // force variables with default values to remain unset.
                        if (ENV[x] === undefined)
                            delete env[x];
                        else
                            env[x] = ENV[x];
                    }
                    
                    const strings = [];
                    
                    for (var x in env) {
                        strings.push(`${x}=${env[x]}`);
                    }
                    
                    getEnvStrings.strings = strings;
                }
                
                return getEnvStrings.strings;
            };
            
            const _environ_get = (__environ, environ_buf) => {
                let bufSize = 0;
                let envp = 0;
                
                for (const string of getEnvStrings()) {
                    const ptr = environ_buf + bufSize;
                    HEAPU32[__environ + envp >> 2] = ptr;
                    bufSize += stringToUTF8(string, ptr, Infinity) + 1;
                    envp += 4;
                }
                
                return 0;
            };
            
            const _environ_sizes_get = (penviron_count, penviron_buf_size) => {
                const strings = getEnvStrings();
                HEAPU32[penviron_count >> 2] = strings.length;
                let bufSize = 0;
                
                for (const string of strings) {
                    bufSize += lengthBytesUTF8(string) + 1;
                }
                
                HEAPU32[penviron_buf_size >> 2] = bufSize;
                return 0;
            };
            
            function _fd_close(fd) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    FS.close(stream);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            function _fd_fdstat_get(fd, pbuf) {
                try {
                    const rightsBase = 0;
                    const rightsInheriting = 0;
                    const flags = 0;
                    {
                        const stream = SYSCALLS.getStreamFromFD(fd);
                        // All character devices are terminals (other things a Linux system would
                        // assume is a character device, like the mouse, we have special APIs for).
                        var type = stream.tty ? 2
                            : FS.isDir(stream.mode) ? 3
                                : FS.isLink(stream.mode) ? 7
                                    : 4;
                    }
                    HEAP8[pbuf] = type;
                    HEAP16[pbuf + 2 >> 1] = flags;
                    HEAP64[pbuf + 8 >> 3] = BigInt(rightsBase);
                    HEAP64[pbuf + 16 >> 3] = BigInt(rightsInheriting);
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            /** @param {number=} offset */
            const doReadv = (stream, iov, iovcnt, offset) => {
                let ret = 0;
                
                for (let i = 0; i < iovcnt; i++) {
                    const ptr = HEAPU32[iov >> 2];
                    const len = HEAPU32[iov + 4 >> 2];
                    
                    iov += 8;
                    const curr = FS.read(stream, HEAP8, ptr, len, offset);
                    
                    if (curr < 0)
                        return -1;
                    
                    ret += curr;
                    
                    if (curr < len)
                        break; // nothing more to read
                    
                    if (typeof offset != 'undefined') {
                        offset += curr;
                    }
                }
                
                return ret;
            };
            
            function _fd_pread(fd, iov, iovcnt, offset, pnum) {
                offset = bigintToI53Checked(offset);
                
                try {
                    if (isNaN(offset))
                        return 61;
                    
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    const num = doReadv(stream, iov, iovcnt, offset);
                    
                    HEAPU32[pnum >> 2] = num;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            /** @param {number=} offset */
            const doWritev = (stream, iov, iovcnt, offset) => {
                let ret = 0;
                
                for (let i = 0; i < iovcnt; i++) {
                    const ptr = HEAPU32[iov >> 2];
                    const len = HEAPU32[iov + 4 >> 2];
                    
                    iov += 8;
                    const curr = FS.write(stream, HEAP8, ptr, len, offset);
                    
                    if (curr < 0)
                        return -1;
                    
                    ret += curr;
                    
                    if (curr < len) {
                        // No more space to write.
                        break;
                    }
                    
                    if (typeof offset != 'undefined') {
                        offset += curr;
                    }
                }
                
                return ret;
            };
            
            function _fd_pwrite(fd, iov, iovcnt, offset, pnum) {
                offset = bigintToI53Checked(offset);
                
                try {
                    if (isNaN(offset))
                        return 61;
                    
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    const num = doWritev(stream, iov, iovcnt, offset);
                    
                    HEAPU32[pnum >> 2] = num;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            function _fd_read(fd, iov, iovcnt, pnum) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    const num = doReadv(stream, iov, iovcnt);
                    
                    HEAPU32[pnum >> 2] = num;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            function _fd_seek(fd, offset, whence, newOffset) {
                offset = bigintToI53Checked(offset);
                
                try {
                    if (isNaN(offset))
                        return 61;
                    
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    FS.llseek(stream, offset, whence);
                    HEAP64[newOffset >> 3] = BigInt(stream.position);
                    
                    if (stream.getdents && offset === 0 && whence === 0)
                        stream.getdents = null; // reset readdir state
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            function _fd_sync(fd) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    
                    if (stream.stream_ops?.fsync) {
                        return stream.stream_ops.fsync(stream);
                    }
                    
                    return 0; // we can't do anything synchronously; the in-memory FS is already synced to
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            function _fd_write(fd, iov, iovcnt, pnum) {
                try {
                    const stream = SYSCALLS.getStreamFromFD(fd);
                    const num = doWritev(stream, iov, iovcnt);
                    
                    HEAPU32[pnum >> 2] = num;
                    
                    return 0;
                } catch(e) {
                    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError'))
                        throw e;
                    
                    return e.errno;
                }
            }
            
            const stackAlloc = (sz) => __emscripten_stack_alloc(sz);
            const stringToUTF8OnStack = (str) => {
                const size = lengthBytesUTF8(str) + 1;
                const ret = stackAlloc(size);
                
                stringToUTF8(str, ret, size);
                
                return ret;
            };
            
            const stringToNewUTF8 = (str) => {
                const size = lengthBytesUTF8(str) + 1;
                const ret = _malloc(size);
                
                if (ret)
                    stringToUTF8(str, ret, size);
                
                return ret;
            };
            
            const AsciiToString = (ptr) => {
                let str = '';
                
                while (1) {
                    const ch = HEAPU8[ptr++];
                    
                    if (!ch)
                        return str;
                    
                    str += String.fromCharCode(ch);
                }
            };
            
            const uleb128Encode = (n, target) => {
                assert(n < 16384);
                
                if (n < 128) {
                    target.push(n);
                } else {
                    target.push(n % 128 | 128, n >> 7);
                }
            };
            
            const sigToWasmTypes = (sig) => {
                const typeNames = {
                    i: 'i32',
                    j: 'i64',
                    f: 'f32',
                    d: 'f64',
                    e: 'externref',
                    p: 'i32',
                };
                const type = {
                    parameters: [],
                    results: sig[0] == 'v' ? [] : [typeNames[sig[0]]],
                };
                
                for (let i = 1; i < sig.length; ++i) {
                    assert(sig[i] in typeNames, 'invalid signature char: ' + sig[i]);
                    type.parameters.push(typeNames[sig[i]]);
                }
                
                return type;
            };
            
            const generateFuncType = (sig, target) => {
                const sigRet = sig.slice(0, 1);
                const sigParam = sig.slice(1);
                const typeCodes = {
                    i: 0x7f, // i32
                    p: 0x7f, // i32
                    j: 0x7e, // i64
                    f: 0x7d, // f32
                    d: 0x7c, // f64
                    e: 0x6f, // externref
                };
                
                // Parameters, length + signatures
                target.push(0x60 /* form: func */);
                uleb128Encode(sigParam.length, target);
                for (const paramType of sigParam) {
                    assert(paramType in typeCodes, `invalid signature char: ${paramType}`);
                    target.push(typeCodes[paramType]);
                }
                
                // Return values, length + signatures
                // With no multi-return in MVP, either 0 (void) or 1 (anything else)
                if (sigRet == 'v') {
                    target.push(0x00);
                } else {
                    target.push(0x01, typeCodes[sigRet]);
                }
            };
            const convertJsFunctionToWasm = (func, sig) => {
                // If the type reflection proposal is available, use the new
                // "WebAssembly.Function" constructor.
                // Otherwise, construct a minimal wasm module importing the JS function and
                // re-exporting it.
                if (typeof WebAssembly.Function == 'function') {
                    return new WebAssembly.Function(sigToWasmTypes(sig), func);
                }
                
                // The module is static, with the exception of the type section, which is
                // generated based on the signature passed in.
                const typeSectionBody = [
                    0x01, // count: 1
                ];
                
                generateFuncType(sig, typeSectionBody);
                
                // Rest of the module is static
                const bytes = [
                    
                    0x00,
                    0x61,
                    0x73,
                    0x6d,
                    // magic ("\0asm")
                    0x01,
                    0x00,
                    0x00,
                    0x00,
                    // version: 1
                    0x01,
                    // Type section code
                ];
                // Write the overall length of the type section followed by the body
                uleb128Encode(typeSectionBody.length, bytes);
                bytes.push(...typeSectionBody);
                
                // The rest of the module is static
                bytes.push(
                    0x02,
                    0x07, // import section
                    // (import "e" "f" (func 0 (type 0)))
                    0x01,
                    0x01,
                    0x65,
                    0x01,
                    0x66,
                    0x00,
                    0x00,
                    0x07,
                    0x05, // export section
                    // (export "f" (func 0 (type 0)))
                    0x01,
                    0x01,
                    0x66,
                    0x00,
                    0x00,
                );
                
                // We can compile this wasm module synchronously because it is very small.
                // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
                const module = new WebAssembly.Module(new Uint8Array(bytes));
                const instance = new WebAssembly.Instance(module, {e: {f: func}});
                const wrappedFunc = instance.exports.f;
                
                return wrappedFunc;
            };
            
            const updateTableMap = (offset, count) => {
                if (functionsInTableMap) {
                    for (let i = offset; i < offset + count; i++) {
                        const item = getWasmTableEntry(i);
                        
                        // Ignore null values.
                        if (item) {
                            functionsInTableMap.set(item, i);
                        }
                    }
                }
            };
            
            let functionsInTableMap;
            
            const getFunctionAddress = (func) => {
                // First, create the map if this is the first use.
                if (!functionsInTableMap) {
                    functionsInTableMap = new WeakMap();
                    updateTableMap(0, wasmTable.length);
                }
                
                return functionsInTableMap.get(func) || 0;
            };
            
            const freeTableIndexes = [];
            
            const getEmptyTableSlot = () => {
                // Reuse a free index if there is one, otherwise grow.
                if (freeTableIndexes.length) {
                    return freeTableIndexes.pop();
                }
                
                // Grow the table
                try {
                    /** @suppress {checkTypes} */
                    wasmTable.grow(1);
                } catch(err) {
                    if (!(err instanceof RangeError)) {
                        throw err;
                    }
                    
                    throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
                }
                
                return wasmTable.length - 1;
            };
            
            const setWasmTableEntry = (idx, func) => {
                /** @suppress {checkTypes} */
                wasmTable.set(idx, func);
                // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overridden to return wrapped
                // functions so we need to call it here to retrieve the potential wrapper correctly
                // instead of just storing 'func' directly into wasmTableMirror
                /** @suppress {checkTypes} */
                wasmTableMirror[idx] = wasmTable.get(idx);
            };
            /** @param {string=} sig */
            const addFunction = (func, sig) => {
                assert(typeof func != 'undefined');
                // Check if the function is already in the table, to ensure each function
                // gets a unique index.
                const rtn = getFunctionAddress(func);
                
                if (rtn) {
                    return rtn;
                }
                
                // It's not in the table, add it now.
                
                const ret = getEmptyTableSlot();
                
                // Set the new value.
                try {
                    // Attempting to call this with JS function will cause of table.set() to fail
                    setWasmTableEntry(ret, func);
                } catch(err) {
                    if (!(err instanceof TypeError)) {
                        throw err;
                    }
                    
                    assert(typeof sig != 'undefined', 'Missing signature argument to addFunction: ' + func);
                    const wrapped = convertJsFunctionToWasm(func, sig);
                    
                    setWasmTableEntry(ret, wrapped);
                }
                
                functionsInTableMap.set(func, ret);
                
                return ret;
            };
            
            FS.createPreloadedFile = FS_createPreloadedFile;
            FS.staticInit();
            // End JS library code
            
            // include: postlibrary.js
            // This file is included after the automatically-generated JS library code
            // but before the wasm module is created.
            
            {
                // Begin ATMODULES hooks
                if (Module.noExitRuntime)
                    noExitRuntime = Module.noExitRuntime;
                
                if (Module.preloadPlugins)
                    preloadPlugins = Module.preloadPlugins;
                
                if (Module.print)
                    out = Module.print;
                
                if (Module.printErr)
                    err = Module.printErr;
                
                if (Module.wasmBinary)
                    wasmBinary = Module.wasmBinary;
                // End ATMODULES hooks
                
                checkIncomingModuleAPI();
                
                if (Module.arguments)
                    arguments_ = Module.arguments;
                
                if (Module.thisProgram)
                    thisProgram = Module.thisProgram;
                
                // Assertions on removed incoming Module JS APIs.
                assert(typeof Module.memoryInitializerPrefixURL == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
                assert(typeof Module.pthreadMainPrefixURL == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
                assert(typeof Module.cdInitializerPrefixURL == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
                assert(typeof Module.filePackagePrefixURL == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
                assert(typeof Module.read == 'undefined', 'Module.read option was removed');
                assert(typeof Module.readAsync == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
                assert(typeof Module.readBinary == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
                assert(typeof Module.setWindowTitle == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
                assert(typeof Module.TOTAL_MEMORY == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
                assert(typeof Module.ENVIRONMENT == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
                assert(typeof Module.STACK_SIZE == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time');
                // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
                assert(typeof Module.wasmMemory == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
                assert(typeof Module.INITIAL_MEMORY == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');
            }
            
            // Begin runtime exports
            Module.callMain = callMain;
            Module.wasmExports = wasmExports;
            Module.addFunction = addFunction;
            Module.UTF8ToString = UTF8ToString;
            Module.AsciiToString = AsciiToString;
            Module.stringToNewUTF8 = stringToNewUTF8;
            Module.FS = FS;
            const missingLibrarySymbols = [
                'writeI53ToI64',
                'writeI53ToI64Clamped',
                'writeI53ToI64Signaling',
                'writeI53ToU64Clamped',
                'writeI53ToU64Signaling',
                'readI53FromU64',
                'convertI32PairToI53',
                'convertI32PairToI53Checked',
                'convertU32PairToI53',
                'getTempRet0',
                'setTempRet0',
                'inetPton4',
                'inetNtop4',
                'inetPton6',
                'inetNtop6',
                'readSockaddr',
                'writeSockaddr',
                'emscriptenLog',
                'readEmAsmArgs',
                'jstoi_q',
                'listenOnce',
                'autoResumeAudioContext',
                'getDynCaller',
                'dynCall',
                'runtimeKeepalivePush',
                'runtimeKeepalivePop',
                'asmjsMangle',
                'HandleAllocator',
                'getNativeTypeSize',
                'addOnInit',
                'addOnPostCtor',
                'addOnPreMain',
                'addOnExit',
                'STACK_SIZE',
                'STACK_ALIGN',
                'POINTER_SIZE',
                'ASSERTIONS',
                'getCFunc',
                'ccall',
                'cwrap',
                'removeFunction',
                'reallyNegative',
                'unSign',
                'strLen',
                'reSign',
                'formatString',
                'intArrayToString',
                'stringToAscii',
                'UTF16ToString',
                'stringToUTF16',
                'lengthBytesUTF16',
                'UTF32ToString',
                'stringToUTF32',
                'lengthBytesUTF32',
                'writeArrayToMemory',
                'registerKeyEventCallback',
                'maybeCStringToJsString',
                'findEventTarget',
                'getBoundingClientRect',
                'fillMouseEventData',
                'registerMouseEventCallback',
                'registerWheelEventCallback',
                'registerUiEventCallback',
                'registerFocusEventCallback',
                'fillDeviceOrientationEventData',
                'registerDeviceOrientationEventCallback',
                'fillDeviceMotionEventData',
                'registerDeviceMotionEventCallback',
                'screenOrientation',
                'fillOrientationChangeEventData',
                'registerOrientationChangeEventCallback',
                'fillFullscreenChangeEventData',
                'registerFullscreenChangeEventCallback',
                'JSEvents_requestFullscreen',
                'JSEvents_resizeCanvasForFullscreen',
                'registerRestoreOldStyle',
                'hideEverythingExceptGivenElement',
                'restoreHiddenElements',
                'setLetterbox',
                'softFullscreenResizeWebGLRenderTarget',
                'doRequestFullscreen',
                'fillPointerlockChangeEventData',
                'registerPointerlockChangeEventCallback',
                'registerPointerlockErrorEventCallback',
                'requestPointerLock',
                'fillVisibilityChangeEventData',
                'registerVisibilityChangeEventCallback',
                'registerTouchEventCallback',
                'fillGamepadEventData',
                'registerGamepadEventCallback',
                'registerBeforeUnloadEventCallback',
                'fillBatteryEventData',
                'battery',
                'registerBatteryEventCallback',
                'setCanvasElementSize',
                'getCanvasElementSize',
                'jsStackTrace',
                'getCallstack',
                'convertPCtoSourceLocation',
                'wasiRightsToMuslOFlags',
                'wasiOFlagsToMuslOFlags',
                'safeSetTimeout',
                'setImmediateWrapped',
                'safeRequestAnimationFrame',
                'clearImmediateWrapped',
                'registerPostMainLoop',
                'registerPreMainLoop',
                'getPromise',
                'makePromise',
                'idsToPromises',
                'makePromiseCallback',
                'ExceptionInfo',
                'findMatchingCatch',
                'Browser_asyncPrepareDataCounter',
                'arraySum',
                'addDays',
                'getSocketFromFD',
                'getSocketAddress',
                'FS_mkdirTree',
                '_setNetworkCallback',
                'heapObjectForWebGLType',
                'toTypedArrayIndex',
                'webgl_enable_ANGLE_instanced_arrays',
                'webgl_enable_OES_vertex_array_object',
                'webgl_enable_WEBGL_draw_buffers',
                'webgl_enable_WEBGL_multi_draw',
                'webgl_enable_EXT_polygon_offset_clamp',
                'webgl_enable_EXT_clip_control',
                'webgl_enable_WEBGL_polygon_mode',
                'emscriptenWebGLGet',
                'computeUnpackAlignedImageSize',
                'colorChannelsInGlTextureFormat',
                'emscriptenWebGLGetTexPixelData',
                'emscriptenWebGLGetUniform',
                'webglGetUniformLocation',
                'webglPrepareUniformLocationsBeforeFirstUse',
                'webglGetLeftBracePos',
                'emscriptenWebGLGetVertexAttrib',
                '__glGetActiveAttribOrUniform',
                'writeGLArray',
                'registerWebGlEventCallback',
                'runAndAbortIfError',
                'ALLOC_NORMAL',
                'ALLOC_STACK',
                'allocate',
                'writeStringToMemory',
                'writeAsciiToMemory',
                'demangle',
                'stackTrace',
            ];
            
            missingLibrarySymbols.forEach(missingLibrarySymbol);
            
            const unexportedSymbols = [
                'run',
                'addRunDependency',
                'removeRunDependency',
                'out',
                'err',
                'abort',
                'wasmMemory',
                'HEAPF32',
                'HEAPF64',
                'HEAP8',
                'HEAPU8',
                'HEAP16',
                'HEAPU16',
                'HEAP32',
                'HEAPU32',
                'HEAP64',
                'HEAPU64',
                'writeStackCookie',
                'checkStackCookie',
                'readI53FromI64',
                'INT53_MAX',
                'INT53_MIN',
                'bigintToI53Checked',
                'stackSave',
                'stackRestore',
                'stackAlloc',
                'ptrToString',
                'zeroMemory',
                'exitJS',
                'getHeapMax',
                'growMemory',
                'ENV',
                'ERRNO_CODES',
                'strError',
                'DNS',
                'Protocols',
                'Sockets',
                'timers',
                'warnOnce',
                'readEmAsmArgsArray',
                'getExecutableName',
                'handleException',
                'keepRuntimeAlive',
                'callUserCallback',
                'maybeExit',
                'asyncLoad',
                'alignMemory',
                'mmapAlloc',
                'wasmTable',
                'noExitRuntime',
                'addOnPreRun',
                'addOnPostRun',
                'uleb128Encode',
                'sigToWasmTypes',
                'generateFuncType',
                'convertJsFunctionToWasm',
                'freeTableIndexes',
                'functionsInTableMap',
                'getEmptyTableSlot',
                'updateTableMap',
                'getFunctionAddress',
                'setValue',
                'getValue',
                'PATH',
                'PATH_FS',
                'UTF8Decoder',
                'UTF8ArrayToString',
                'stringToUTF8Array',
                'stringToUTF8',
                'lengthBytesUTF8',
                'intArrayFromString',
                'UTF16Decoder',
                'stringToUTF8OnStack',
                'JSEvents',
                'specialHTMLTargets',
                'findCanvasEventTarget',
                'currentFullscreenStrategy',
                'restoreOldWindowedStyle',
                'UNWIND_CACHE',
                'ExitStatus',
                'getEnvStrings',
                'checkWasiClock',
                'doReadv',
                'doWritev',
                'initRandomFill',
                'randomFill',
                'emSetImmediate',
                'emClearImmediate_deps',
                'emClearImmediate',
                'promiseMap',
                'uncaughtExceptionCount',
                'exceptionLast',
                'exceptionCaught',
                'Browser',
                'getPreloadedImageData__data',
                'wget',
                'MONTH_DAYS_REGULAR',
                'MONTH_DAYS_LEAP',
                'MONTH_DAYS_REGULAR_CUMULATIVE',
                'MONTH_DAYS_LEAP_CUMULATIVE',
                'isLeapYear',
                'ydayFromDate',
                'SYSCALLS',
                'preloadPlugins',
                'FS_createPreloadedFile',
                'FS_modeStringToFlags',
                'FS_getMode',
                'FS_stdin_getChar_buffer',
                'FS_stdin_getChar',
                'FS_unlink',
                'FS_createPath',
                'FS_createDevice',
                'FS_readFile',
                'FS_root',
                'FS_mounts',
                'FS_devices',
                'FS_streams',
                'FS_nextInode',
                'FS_nameTable',
                'FS_currentPath',
                'FS_initialized',
                'FS_ignorePermissions',
                'FS_filesystems',
                'FS_syncFSRequests',
                'FS_readFiles',
                'FS_lookupPath',
                'FS_getPath',
                'FS_hashName',
                'FS_hashAddNode',
                'FS_hashRemoveNode',
                'FS_lookupNode',
                'FS_createNode',
                'FS_destroyNode',
                'FS_isRoot',
                'FS_isMountpoint',
                'FS_isFile',
                'FS_isDir',
                'FS_isLink',
                'FS_isChrdev',
                'FS_isBlkdev',
                'FS_isFIFO',
                'FS_isSocket',
                'FS_flagsToPermissionString',
                'FS_nodePermissions',
                'FS_mayLookup',
                'FS_mayCreate',
                'FS_mayDelete',
                'FS_mayOpen',
                'FS_checkOpExists',
                'FS_nextfd',
                'FS_getStreamChecked',
                'FS_getStream',
                'FS_createStream',
                'FS_closeStream',
                'FS_dupStream',
                'FS_doSetAttr',
                'FS_chrdev_stream_ops',
                'FS_major',
                'FS_minor',
                'FS_makedev',
                'FS_registerDevice',
                'FS_getDevice',
                'FS_getMounts',
                'FS_syncfs',
                'FS_mount',
                'FS_unmount',
                'FS_lookup',
                'FS_mknod',
                'FS_statfs',
                'FS_statfsStream',
                'FS_statfsNode',
                'FS_create',
                'FS_mkdir',
                'FS_mkdev',
                'FS_symlink',
                'FS_rename',
                'FS_rmdir',
                'FS_readdir',
                'FS_readlink',
                'FS_stat',
                'FS_fstat',
                'FS_lstat',
                'FS_doChmod',
                'FS_chmod',
                'FS_lchmod',
                'FS_fchmod',
                'FS_doChown',
                'FS_chown',
                'FS_lchown',
                'FS_fchown',
                'FS_doTruncate',
                'FS_truncate',
                'FS_ftruncate',
                'FS_utime',
                'FS_open',
                'FS_close',
                'FS_isClosed',
                'FS_llseek',
                'FS_read',
                'FS_write',
                'FS_mmap',
                'FS_msync',
                'FS_ioctl',
                'FS_writeFile',
                'FS_cwd',
                'FS_chdir',
                'FS_createDefaultDirectories',
                'FS_createDefaultDevices',
                'FS_createSpecialDirectories',
                'FS_createStandardStreams',
                'FS_staticInit',
                'FS_init',
                'FS_quit',
                'FS_findObject',
                'FS_analyzePath',
                'FS_createFile',
                'FS_createDataFile',
                'FS_forceLoadFile',
                'FS_createLazyFile',
                'FS_absolutePath',
                'FS_createFolder',
                'FS_createLink',
                'FS_joinPath',
                'FS_mmapAlloc',
                'FS_standardizePath',
                'MEMFS',
                'TTY',
                'PIPEFS',
                'SOCKFS',
                'tempFixedLengthArray',
                'miniTempWebGLFloatBuffers',
                'miniTempWebGLIntBuffers',
                'GL',
                'AL',
                'GLUT',
                'EGL',
                'GLEW',
                'IDBStore',
                'SDL',
                'SDL_gfx',
                'allocateUTF8',
                'allocateUTF8OnStack',
                'print',
                'printErr',
                'jstoi_s',
            ];
            unexportedSymbols.forEach(unexportedRuntimeSymbol);
            
            // End runtime exports
            // Begin JS library exports
            // End JS library exports
            
            // end include: postlibrary.js
            
            function checkIncomingModuleAPI() {
                ignoredModuleProp('fetchSettings');
            }
            var wasmImports = {
                /** @export */
                __call_sighandler: ___call_sighandler,
                /** @export */
                __syscall_chdir: ___syscall_chdir,
                /** @export */
                __syscall_chmod: ___syscall_chmod,
                /** @export */
                __syscall_dup: ___syscall_dup,
                /** @export */
                __syscall_dup3: ___syscall_dup3,
                /** @export */
                __syscall_faccessat: ___syscall_faccessat,
                /** @export */
                __syscall_fchdir: ___syscall_fchdir,
                /** @export */
                __syscall_fchmod: ___syscall_fchmod,
                /** @export */
                __syscall_fchmodat2: ___syscall_fchmodat2,
                /** @export */
                __syscall_fchown32: ___syscall_fchown32,
                /** @export */
                __syscall_fchownat: ___syscall_fchownat,
                /** @export */
                __syscall_fcntl64: ___syscall_fcntl64,
                /** @export */
                __syscall_fdatasync: ___syscall_fdatasync,
                /** @export */
                __syscall_fstat64: ___syscall_fstat64,
                /** @export */
                __syscall_fstatfs64: ___syscall_fstatfs64,
                /** @export */
                __syscall_ftruncate64: ___syscall_ftruncate64,
                /** @export */
                __syscall_getcwd: ___syscall_getcwd,
                /** @export */
                __syscall_getdents64: ___syscall_getdents64,
                /** @export */
                __syscall_ioctl: ___syscall_ioctl,
                /** @export */
                __syscall_lstat64: ___syscall_lstat64,
                /** @export */
                __syscall_mkdirat: ___syscall_mkdirat,
                /** @export */
                __syscall_newfstatat: ___syscall_newfstatat,
                /** @export */
                __syscall_openat: ___syscall_openat,
                /** @export */
                __syscall_pipe: ___syscall_pipe,
                /** @export */
                __syscall_poll: ___syscall_poll,
                /** @export */
                __syscall_readlinkat: ___syscall_readlinkat,
                /** @export */
                __syscall_renameat: ___syscall_renameat,
                /** @export */
                __syscall_stat64: ___syscall_stat64,
                /** @export */
                __syscall_statfs64: ___syscall_statfs64,
                /** @export */
                __syscall_symlinkat: ___syscall_symlinkat,
                /** @export */
                __syscall_unlinkat: ___syscall_unlinkat,
                /** @export */
                __syscall_utimensat: ___syscall_utimensat,
                /** @export */
                _abort_js: __abort_js,
                /** @export */
                _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
                /** @export */
                _emscripten_throw_longjmp: __emscripten_throw_longjmp,
                /** @export */
                _localtime_js: __localtime_js,
                /** @export */
                _mmap_js: __mmap_js,
                /** @export */
                _msync_js: __msync_js,
                /** @export */
                _munmap_js: __munmap_js,
                /** @export */
                _setitimer_js: __setitimer_js,
                /** @export */
                _tzset_js: __tzset_js,
                /** @export */
                clock_res_get: _clock_res_get,
                /** @export */
                clock_time_get: _clock_time_get,
                /** @export */
                emscripten_date_now: _emscripten_date_now,
                /** @export */
                emscripten_err: _emscripten_err,
                /** @export */
                emscripten_get_heap_max: _emscripten_get_heap_max,
                /** @export */
                emscripten_get_now: _emscripten_get_now,
                /** @export */
                emscripten_resize_heap: _emscripten_resize_heap,
                /** @export */
                emscripten_sleep: _emscripten_sleep,
                /** @export */
                environ_get: _environ_get,
                /** @export */
                environ_sizes_get: _environ_sizes_get,
                /** @export */
                exit: _exit,
                /** @export */
                fd_close: _fd_close,
                /** @export */
                fd_fdstat_get: _fd_fdstat_get,
                /** @export */
                fd_pread: _fd_pread,
                /** @export */
                fd_pwrite: _fd_pwrite,
                /** @export */
                fd_read: _fd_read,
                /** @export */
                fd_seek: _fd_seek,
                /** @export */
                fd_sync: _fd_sync,
                /** @export */
                fd_write: _fd_write,
                /** @export */
                invoke_ji,
                /** @export */
                invoke_vi,
                /** @export */
                invoke_vii,
                /** @export */
                invoke_vij,
                /** @export */
                proc_exit: _proc_exit,
            };
            var wasmExports = await createWasm();
            const ___wasm_call_ctors = createExportWrapper('__wasm_call_ctors', 0);
            const _blinkenlib_run_fast = Module._blinkenlib_run_fast = createExportWrapper('blinkenlib_run_fast', 0);
            const _blinkenlib_run = Module._blinkenlib_run = createExportWrapper('blinkenlib_run', 0);
            const _blinkenlib_starti = Module._blinkenlib_starti = createExportWrapper('blinkenlib_starti', 0);
            const _blinkenlib_start = Module._blinkenlib_start = createExportWrapper('blinkenlib_start', 0);
            const _blinkenlib_stepi = Module._blinkenlib_stepi = createExportWrapper('blinkenlib_stepi', 0);
            const _blinkenlib_continue = Module._blinkenlib_continue = createExportWrapper('blinkenlib_continue', 0);
            const _blinkenlib_get_clstruct = Module._blinkenlib_get_clstruct = createExportWrapper('blinkenlib_get_clstruct', 0);
            const _blinkenlib_get_argc_string = Module._blinkenlib_get_argc_string = createExportWrapper('blinkenlib_get_argc_string', 0);
            const _blinkenlib_get_argv_string = Module._blinkenlib_get_argv_string = createExportWrapper('blinkenlib_get_argv_string', 0);
            const _blinkenlib_get_progname_string = Module._blinkenlib_get_progname_string = createExportWrapper('blinkenlib_get_progname_string', 0);
            const _blinkenlib_spy_address = Module._blinkenlib_spy_address = createExportWrapper('blinkenlib_spy_address', 1);
            const _main = Module._main = createExportWrapper('__main_argc_argv', 2);
            var _malloc = createExportWrapper('malloc', 1);
            var _strerror = createExportWrapper('strerror', 1);
            var _fflush = createExportWrapper('fflush', 1);
            var _emscripten_stack_get_end = wasmExports.emscripten_stack_get_end;
            const _emscripten_stack_get_base = wasmExports.emscripten_stack_get_base;
            var _emscripten_builtin_memalign = createExportWrapper('emscripten_builtin_memalign', 2);
            var __emscripten_timeout = createExportWrapper('_emscripten_timeout', 2);
            const _setThrew = createExportWrapper('setThrew', 2);
            const _emscripten_stack_init = wasmExports.emscripten_stack_init;
            const _emscripten_stack_get_free = wasmExports.emscripten_stack_get_free;
            var __emscripten_stack_restore = wasmExports._emscripten_stack_restore;
            var __emscripten_stack_alloc = wasmExports._emscripten_stack_alloc;
            var _emscripten_stack_get_current = wasmExports.emscripten_stack_get_current;
            
            function invoke_ji(index, a1) {
                const sp = stackSave();
                try {
                    return getWasmTableEntry(index)(a1);
                } catch(e) {
                    stackRestore(sp);
                    
                    if (e !== e + 0)
                        throw e;
                    
                    _setThrew(1, 0);
                    return 0n;
                }
            }
            
            function invoke_vij(index, a1, a2) {
                const sp = stackSave();
                try {
                    getWasmTableEntry(index)(a1, a2);
                } catch(e) {
                    stackRestore(sp);
                    
                    if (e !== e + 0)
                        throw e;
                    
                    _setThrew(1, 0);
                }
            }
            
            function invoke_vi(index, a1) {
                const sp = stackSave();
                try {
                    getWasmTableEntry(index)(a1);
                } catch(e) {
                    stackRestore(sp);
                    
                    if (e !== e + 0)
                        throw e;
                    
                    _setThrew(1, 0);
                }
            }
            
            function invoke_vii(index, a1, a2) {
                const sp = stackSave();
                try {
                    getWasmTableEntry(index)(a1, a2);
                } catch(e) {
                    stackRestore(sp);
                    
                    if (e !== e + 0)
                        throw e;
                    
                    _setThrew(1, 0);
                }
            }
            
            // include: postamble.js
            // === Auto-generated postamble setup entry stuff ===
            
            let calledRun;
            
            function callMain(args = []) {
                assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
                assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');
                
                const entryFunction = _main;
                
                args.unshift(thisProgram);
                
                const argc = args.length;
                const argv = stackAlloc((argc + 1) * 4);
                let argv_ptr = argv;
                
                args.forEach((arg) => {
                    HEAPU32[argv_ptr >> 2] = stringToUTF8OnStack(arg);
                    argv_ptr += 4;
                });
                HEAPU32[argv_ptr >> 2] = 0;
                
                try {
                    const ret = entryFunction(argc, argv);
                    
                    // if we're not running an evented main loop, it's time to exit
                    exitJS(ret, /* implicit = */ true);
                    
                    return ret;
                } catch(e) {
                    return handleException(e);
                }
            }
            
            function stackCheckInit() {
                // This is normally called automatically during __wasm_call_ctors but need to
                // get these values before even running any of the ctors so we call it redundantly
                // here.
                _emscripten_stack_init();
                // TODO(sbc): Move writeStackCookie to native to to avoid this.
                writeStackCookie();
            }
            
            function run(args = arguments_) {
                if (runDependencies > 0) {
                    dependenciesFulfilled = run;
                    return;
                }
                
                stackCheckInit();
                
                preRun();
                
                // a preRun added a dependency, run will be called later
                if (runDependencies > 0) {
                    dependenciesFulfilled = run;
                    return;
                }
                
                function doRun() {
                    // run may have just been called through dependencies being fulfilled just in this very frame,
                    // or while the async setStatus time below was happening
                    assert(!calledRun);
                    calledRun = true;
                    Module.calledRun = true;
                    
                    if (ABORT)
                        return;
                    
                    initRuntime();
                    
                    preMain();
                    
                    readyPromiseResolve(Module);
                    Module.onRuntimeInitialized?.();
                    consumedModuleProp('onRuntimeInitialized');
                    
                    const noInitialRun = Module.noInitialRun || false;
                    
                    if (!noInitialRun)
                        callMain(args);
                    
                    postRun();
                }
                
                if (Module.setStatus) {
                    Module.setStatus('Running...');
                    setTimeout(() => {
                        setTimeout(() => Module.setStatus(''), 1);
                        doRun();
                    }, 1);
                } else {
                    doRun();
                }
                
                checkStackCookie();
            }
            
            function checkUnflushedContent() {
                // Compiler settings do not allow exiting the runtime, so flushing
                // the streams is not possible. but in ASSERTIONS mode we check
                // if there was something to flush, and if so tell the user they
                // should request that the runtime be exitable.
                // Normally we would not even include flush() at all, but in ASSERTIONS
                // builds we do so just for this check, and here we see if there is any
                // content to flush, that is, we check if there would have been
                // something a non-ASSERTIONS build would have not seen.
                // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
                // mode (which has its own special function for this; otherwise, all
                // the code is inside libc)
                const oldOut = out;
                const oldErr = err;
                let has = false;
                
                out = err = (x) => {
                    has = true;
                };
                try { // it doesn't matter if it fails
                    _fflush(0);
                    // also flush in the JS FS layer
                    ['stdout', 'stderr'].forEach((name) => {
                        const info = FS.analyzePath('/dev/' + name);
                        
                        if (!info)
                            return;
                        
                        const stream = info.object;
                        const rdev = stream.rdev;
                        const tty = TTY.ttys[rdev];
                        
                        if (tty?.output?.length) {
                            has = true;
                        }
                    });
                } catch(e) {}
                out = oldOut;
                err = oldErr;
                
                if (has) {
                    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
                }
            }
            
            function preInit() {
                if (Module.preInit) {
                    if (typeof Module.preInit == 'function')
                        Module.preInit = [Module.preInit];
                    
                    while (Module.preInit.length > 0) {
                        Module.preInit.shift()();
                    }
                }
                
                consumedModuleProp('preInit');
            }
            
            preInit();
            run();
            
            // end include: postamble.js
            
            // include: postamble_modularize.js
            // In MODULARIZE mode we wrap the generated code in a factory function
            // and return either the Module itself, or a promise of the module.
            //
            // We assign to the `moduleRtn` global here and configure closure to see
            // this as and extern so it won't get minified.
            
            moduleRtn = readyPromise;
            
            // Assertion for attempting to access module properties on the incoming
            // moduleArg.  In the past we used this object as the prototype of the module
            // and assigned properties to it, but now we return a distinct object.  This
            // keeps the instance private until it is ready (i.e the promise has been
            // resolved).
            for (const prop of Object.keys(Module)) {
                if (!(prop in moduleArg)) {
                    Object.defineProperty(moduleArg, prop, {
                        configurable: true,
                        get() {
                            abort(`Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);
                        },
                    });
                }
            }
            // end include: postamble_modularize.js
            
            return moduleRtn;
        }
    );
})();

export default blinkenlib_web;

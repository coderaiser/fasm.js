# Fasm.js [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

[NPMURL]: https://npmjs.org/package/fasm.js "npm"
[NPMIMGURL]: https://img.shields.io/npm/v/fasm.js.svg?style=flat
[BuildStatusURL]: https://github.com/coderaiser/fasm.js/actions?query=workflow%3A%22Node+CI%22 "Build Status"
[BuildStatusIMGURL]: https://github.com/coderaiser/fasm.js/workflows/Node%20CI/badge.svg
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageURL]: https://coveralls.io/github/coderaiser/fasm.js?branch=master
[CoverageIMGURL]: https://coveralls.io/repos/coderaiser/fasm.js/badge.svg?branch=master&service=github

CLI tool to run multiple npm-scripts in a madly comfortable way. Can be used together with [redrun](https://github.com/coderaiser/redrun).

## Install

```
npm i fasm.js -g
```

## Usage

```
fasm hello.asm
```

## API

```js
import {translate} from 'fasm.js';
const source = `
    format ELF64 executable 3
    segment readable executable
    entry $

    _start:
      ; Set up arguments for print function
      mov rdi, 1
      lea rsi, [msg]
      mov rdx, msg_size
      call print

      ; Set up arguments for exit function
      xor rdi, rdi
      call exit

    ; Print function
    ; Arguments:
    ;   rdi - File descriptor (1 for stdout)
    ;   rsi - Pointer to the string to print
    ;   rdx - Length of the string
    ; Return:
    ;   None
    print:
      push rbp
      mov rbp, rsp
      mov rax, 1
      syscall
      pop rbp
      ret

    ; Exit function
    ; Arguments:
    ;   rdi - Exit code
    ; Return:
    ;   None
    exit:
      push rbp
      mov rbp, rsp
      mov rax, 60
      syscall
      pop rbp
      ret


    segment readable writeable
    msg db 'Hello 64-bit world!',0xA
    msg_size = $-msg
`;

const [places, buffer, output] = await translate(source);
```

## License

MIT

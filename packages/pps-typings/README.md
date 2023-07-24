# Typings of PPS

## Namespaces:
 - **PPS** - contains all other namespaces
 - **Printer** - typings of printer
 - **Terminal** - typings of terminal
 - **WSClient** - typings of WebSocket client

## Examples of possible imports:
 - **Main namespace**
    ```ts
    import PPS from '@winstrike/pps-typings';
    ```
 - **Nested namespaces**
    ```ts
    import { Terminal, Printer, WSClient } from '@winstrike/pps-typings';
    import Terminal from '@winstrike/pps-typings/terminal';
    import Printer from '@winstrike/pps-typings/printer';
    import WSClient from '@winstrike/pps-typings/ws-client';
    ```
 - **Types from nested namespaces**
    ```ts
    import { TCurrency } from '@winstrike/pps-typings/terminal';
    import { TSubjectSign } from '@winstrike/pps-typings/printer';
    import { TServerMessage } from '@winstrike/pps-typings/ws-client';
    ```

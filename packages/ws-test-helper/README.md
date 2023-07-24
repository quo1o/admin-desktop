# WebSocket testing helper

## Usage

**See tests [in PPS](https://github.com/winstrike/admin-desktop/tree/master/packages/proxy-payment-service/src/__tests__) and [in PS](https://github.com/winstrike/payment-service/tree/master/src/__tests__) for example**

### Importing server or client
```ts
import { WSServer, WSClient } from '@winstrike/ws-test-helper';
```

### Using jest matchers
Waiting and checking for availability of one specific message
```ts
await expect(server).toReceiveMessage({ type: 'print-check', status: 'success' });
```

Checking for availability of messages in messages array
```ts
expect(server).toHaveReceivedMessages([{ type: 'init', body: { ppsId } }, { type: 'print-check', status: 'success' }]);
```

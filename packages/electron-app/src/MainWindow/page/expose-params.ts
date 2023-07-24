import getGlobal from './get-global';

const { config } = getGlobal();

const paramTypeToConfigValue = {
  'pps-id': config.PPS_ID,
  'endpoint-id': config.ENDPOINT_ID,
};

function exposePpsId (ppsIdConsumerOrigin: string) {
  exposeParameter('pps-id', ppsIdConsumerOrigin);
}

function exposeEndpointId (endpointIdConsumerOrigin: string) {
  exposeParameter('endpoint-id', endpointIdConsumerOrigin);
}

function exposeParameter (type: 'pps-id' | 'endpoint-id', consumerOrigin: string) {
  window.addEventListener('message', ({ data, origin, source }) => {
    if (data.type === `request-${type}` && origin === consumerOrigin) {
      (source as Window).postMessage({
        type: `response-${type}`,
        message: paramTypeToConfigValue[type],
      }, consumerOrigin);
    }
  });
}

export { exposePpsId, exposeEndpointId };

import { useState, useCallback, useMemo } from 'preact/hooks';
import Axios from 'axios';
import { TCorrectionParams } from '@winstrike/pps-typings/printer';

import { getRequestMethod } from '../helpers';
import getGlobal from '../get-global';

const { config } = getGlobal();

const axios = Axios.create({ baseURL: config.PS_HTTP_URL });

type TCorrectionBody = TCorrectionParams;

function usePaymentService () {
  const [isLoading, setIsLoading] = useState(false);

  const ppsId = useMemo(() => config.PPS_ID, []);
  const request = useMemo(() => getRequestMethod(axios, null, setIsLoading), []);

  const postCorrection = useCallback((data: TCorrectionBody) => {
    return request<void>('post', '/correction', { ppsId, ...data });
  }, [ppsId, request]);

  return { postCorrection, isLoading };
}

export default usePaymentService;

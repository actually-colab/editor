import type { WebSocketRequestContext } from './connection';

import { ApiGatewayManagementApi } from 'aws-sdk';

export const getManagementApi = (
  context: WebSocketRequestContext
): ApiGatewayManagementApi => {
  const endpoint =
    process.env.IS_OFFLINE == null
      ? context.domainName + '/' + context.stage
      : 'http://localhost:3001';
  return new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint,
  });
};

export const forceDisconnect = async (
  context: WebSocketRequestContext
): Promise<void> => {
  const apigApi = getManagementApi(context);

  await apigApi.deleteConnection({ ConnectionId: context.connectionId }).promise();
};

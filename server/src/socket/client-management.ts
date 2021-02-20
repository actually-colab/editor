import type { WebSocketRequestContext } from './connection';

import { ApiGatewayManagementApi } from 'aws-sdk';

export const forceDisconnect = async (
  context: WebSocketRequestContext
): Promise<void> => {
  const endpoint =
    process.env.IS_OFFLINE == null
      ? context.domainName + '/' + context.stage
      : 'http://localhost:3001';
  const apigApi = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint,
  });

  await apigApi.deleteConnection({ ConnectionId: context.connectionId }).promise();
};

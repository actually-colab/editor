import type {
  DNotebook,
  Json,
  DUser,
  DActiveSession,
} from '@actually-colab/editor-types';
import type { WebSocketRequestContext } from './connection';

import { ApiGatewayManagementApi } from 'aws-sdk';

import { getActiveSessions } from '../db/pgsql/models/ActiveSession';

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

interface ACSocketEventData extends Json {
  action: string;
  triggered_by: DUser['uid'];
  data: Json;
}

export const broadcastToNotebook = async (
  context: WebSocketRequestContext,
  nb_id: DNotebook['nb_id'],
  data: ACSocketEventData
): Promise<void> => {
  const eventBody = JSON.stringify(data);

  const connectionIds = await getActiveSessions(nb_id);

  const apigApi = getManagementApi(context);
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await apigApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: eventBody,
          })
          .promise();
      } catch (err) {
        console.error('Could not reach', connectionId);
      }
    })
  );
};

export const emitToUser = async (
  context: WebSocketRequestContext,
  data: ACSocketEventData
): Promise<void> => {
  const eventBody = JSON.stringify(data);
  const apigApi = getManagementApi(context);
  try {
    await apigApi
      .postToConnection({
        ConnectionId: context.connectionId,
        Data: eventBody,
      })
      .promise();
  } catch (err) {
    console.error('Could not reach', context.connectionId);
    throw new Error(err);
  }
};

export const emitToConnections = async (
  context: WebSocketRequestContext,
  connectionIds: DActiveSession['connectionId'][],
  data: ACSocketEventData
): Promise<void> => {
  const eventBody = JSON.stringify(data);

  const apigApi = getManagementApi(context);
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await apigApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: eventBody,
          })
          .promise();
      } catch (err) {
        console.error('Could not reach', connectionId);
      }
    })
  );
};

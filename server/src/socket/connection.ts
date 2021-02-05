import { Handler, APIGatewayEvent } from 'aws-lambda';

const SocketEventTypes = Object.freeze({
  Connect: 'Connect',
  Disconnect: 'Disconnect',
});

const success = {
  statusCode: 200,
};

const error = {
  statusCode: 400,
};

export const handler: Handler = async (event: APIGatewayEvent) => {
  switch (event.requestContext.eventType) {
    case SocketEventTypes.Connect:
      return success;
    case SocketEventTypes.Disconnect:
      return success;
    default:
      return error;
  }
};

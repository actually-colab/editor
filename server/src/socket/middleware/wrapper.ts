import { ShallotAWSHttpErrorHandler } from '@shallot/http-error-handler';
import { TShallotErrorHandlerOptions } from '@shallot/http-error-handler/dist/aws';
import { ShallotAWSHttpJsonBodyParser } from '@shallot/http-json-body-parser';
import { TShallotJSONBodyParserOptions } from '@shallot/http-json-body-parser/dist/aws';
import type { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import type { DUser } from '../../db/pgsql/models/User';

import { ShallotAWS } from 'shallot';
import ShallotSocketAuthorizer from './custom/authorizer';

export type WebSocketRequestContext = APIGatewayProxyEvent['requestContext'] & {
  connectionId: string;
  authorizer: DUser;
};

export type APIGatewayWebSocketEvent = APIGatewayProxyEvent & {
  requestContext: WebSocketRequestContext;
};

type ParsedJSON = Record<string | number | symbol, unknown>;
export type RequestDataBase = ParsedJSON | unknown;
export type ResultDataBase = ParsedJSON | Array<ParsedJSON> | unknown;

export type ShallotRawHandler<
  TEvent extends TShallotSocketEvent = TShallotSocketEvent
> = Handler<TEvent, void>;

export type TShallotSocketEvent<
  TQueryStringParameters extends RequestDataBase = unknown,
  TPathParameters extends RequestDataBase = unknown,
  THeaders extends RequestDataBase = unknown,
  TBody extends RequestDataBase = unknown
> = Omit<
  Omit<
    Omit<Omit<APIGatewayWebSocketEvent, 'body'>, 'queryStringParameters'>,
    'pathParameters'
  >,
  'headers'
> & {
  queryStringParameters?: TQueryStringParameters;
  pathParameters?: TPathParameters;
  headers?: THeaders;
  body?: TBody;
};

type TShallotSocketHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: ShallotRawHandler<any>,
  parseJsonBody?: boolean,
  successStatusCode?: number,
  middlewareOpts?: {
    HttpErrorHandlerOpts?: TShallotErrorHandlerOptions;
    HttpJsonBodyParserOpts?: TShallotJSONBodyParserOptions;
  }
) => ShallotRawHandler<TShallotSocketEvent>;

const ShallotSocketWrapper: TShallotSocketHandler = (
  handler,
  parseJsonBody = true,
  successStatusCode = 200,
  middlewareOpts = {}
) => {
  const wrappedResponseHandler: Handler = async (...args) => {
    const res = await handler(...args);
    return {
      statusCode: successStatusCode,
      body: JSON.stringify(res),
    };
  };

  const wrapper = ShallotAWS(wrappedResponseHandler)
    .use(ShallotSocketAuthorizer())
    .use(ShallotAWSHttpErrorHandler(middlewareOpts.HttpErrorHandlerOpts));

  if (parseJsonBody) {
    wrapper.use(ShallotAWSHttpJsonBodyParser(middlewareOpts.HttpJsonBodyParserOpts));
  }

  return wrapper;
};

export default ShallotSocketWrapper;

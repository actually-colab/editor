import { ShallotAWSHttpErrorHandler } from '@shallot/http-error-handler';
import { TShallotErrorHandlerOptions } from '@shallot/http-error-handler/dist/aws';
import { ShallotAWSHttpJsonBodyParser } from '@shallot/http-json-body-parser';
import { TShallotJSONBodyParserOptions } from '@shallot/http-json-body-parser/dist/aws';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import type { DUser } from 'db/pgsql/models/User';

import { ShallotAWS } from 'shallot';

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
> = Handler<TEvent, APIGatewayProxyResult>;

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
  successStatusCode?: number,
  middlewareOpts?: {
    HttpErrorHandlerOpts?: TShallotErrorHandlerOptions;
    HttpJsonBodyParserOpts?: TShallotJSONBodyParserOptions;
  }
) => ShallotRawHandler<TShallotSocketEvent>;

const ShallotSocketWrapper: TShallotSocketHandler = (
  handler,
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

  return ShallotAWS(wrappedResponseHandler)
    .use(ShallotAWSHttpJsonBodyParser(middlewareOpts.HttpJsonBodyParserOpts))
    .use(ShallotAWSHttpErrorHandler(middlewareOpts.HttpErrorHandlerOpts));
};

export default ShallotSocketWrapper;

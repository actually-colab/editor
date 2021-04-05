/**
 * TypeScript + promises port of middy http-json-body-parser
 * https://github.com/middyjs/middy/tree/master/packages/http-json-body-parser
 */

import type { ShallotMiddlewareWithOptions } from 'shallot/dist/aws/core';
import type { APIGatewayEvent } from 'aws-lambda';

import HttpError from 'http-errors';

export interface TShallotJSONBodyParserOptions extends Record<string, unknown> {
  /** A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is. */
  reviver?: (key: string, value: unknown) => unknown;
}

/**
 * Shallot middleware that parses and replaces the JSON body of HTTP request bodies.
 * Requires the Content-Type header to be properly set.
 *
 * @param config optional object to pass config options
 */
const ShallotAWSSocketJsonBodyParser: ShallotMiddlewareWithOptions<
  APIGatewayEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  TShallotJSONBodyParserOptions
> = (config) => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  before: async (request) => {
    try {
      if (request.event.body == null) throw new Error();
      const bodyString = request.event.isBase64Encoded
        ? Buffer.from(request.event.body, 'base64').toString()
        : request.event.body;

      request.event.body = JSON.parse(bodyString, config?.reviver);
    } catch (_) {
      throw new HttpError.UnprocessableEntity('Invalid JSON content');
    }
  },
});

export default ShallotAWSSocketJsonBodyParser;

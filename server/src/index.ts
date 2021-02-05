import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

type TEvent = TShallotHttpEvent<{ username: string }>;

const _handler: ShallotRawHandler<TEvent, { username: string }> = async ({
  queryStringParameters,
}) => {
  if (queryStringParameters?.username == null) {
    throw new createHTTPError.BadRequest('Must specify username!');
  }

  return { message: 'success', data: { username: queryStringParameters.username } };
};

export const handler = ShallotAWSRestWrapper(_handler);

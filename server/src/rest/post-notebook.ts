import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { v4 as uuid } from 'uuid';

import { grantAccess } from '../db/models/Notebook';

interface RNotebook {
  name: string;
}

type TEvent = TShallotHttpEvent<{ uid: string }, unknown, unknown, RNotebook>;

const _handler: ShallotRawHandler<TEvent, never> = async ({
  queryStringParameters,
  body,
}) => {
  if (queryStringParameters?.uid == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.uid');
  }

  if (body?.name == null) {
    throw new createHTTPError.BadRequest('Must specify body.name');
  }

  const nbId = uuid();
  await grantAccess(
    nbId,
    queryStringParameters.uid,
    'Full Access',
    body?.name ?? 'New Notebook'
  );

  return { message: 'success' };
};

export const handler = ShallotAWSRestWrapper(_handler);

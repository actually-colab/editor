import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { v4 as uuid } from 'uuid';

import db from '../db/connection';
import tablenames from '../db/tablenames';

interface RNotebook {
  name: string;
}

type TEvent = TShallotHttpEvent<{ username: string }, unknown, unknown, RNotebook>;

const _handler: ShallotRawHandler<TEvent, never> = async ({
  queryStringParameters,
  body,
}) => {
  if (queryStringParameters?.username == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.username');
  }

  if (body?.name == null) {
    throw new createHTTPError.BadRequest('Must specify body.name');
  }

  await db.docClient
    .put({
      Item: {
        nb_id: uuid(),
        uid: queryStringParameters.username,
        name: body?.name ?? '',
        access_level: 'Full Access',
      },
      TableName: tablenames.notebooksTableName,
    })
    .promise();

  return { message: 'success' };
};

export const handler = ShallotAWSRestWrapper(_handler);

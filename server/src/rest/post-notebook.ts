import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import { v4 as uuid } from 'uuid';

import db from '../db/connection';
import tablenames from '../db/tables';

interface DNotebook {
  uid?: string;
  nb_id?: string;
  name: string;
}

type TEvent = TShallotHttpEvent<{ username: string }, unknown, unknown, DNotebook>;

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
      },
      TableName: tablenames.notebooksTableName,
    })
    .promise();

  return { message: 'success' };
};

export const handler = ShallotAWSRestWrapper(_handler);

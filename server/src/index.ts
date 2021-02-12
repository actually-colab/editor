import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import db from './db/connection';
import tablenames from './db/tables';

import { v4 as uuid } from 'uuid';

type TEvent = TShallotHttpEvent<{ username: string }>;

const _handler: ShallotRawHandler<TEvent, { username: string }> = async ({
  queryStringParameters,
}) => {
  if (queryStringParameters?.username == null) {
    throw new createHTTPError.BadRequest('Must specify username!');
  }

  const result = await db.docClient
    .put({
      Item: { nb_id: uuid(), uid: queryStringParameters.username },
      TableName: tablenames.notebooksTableName,
    })
    .promise();

  console.log(result);

  const result2 = await db.docClient
    .scan({ TableName: tablenames.notebooksTableName })
    .promise();

  console.log(result, result2);

  return { message: 'success', data: { username: queryStringParameters.username } };
};

export const handler = ShallotAWSRestWrapper(_handler);

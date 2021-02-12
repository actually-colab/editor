import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import db from './db/connection';
import tablenames from './db/tables';

type TEvent = TShallotHttpEvent<{ username: string }>;

const _handler: ShallotRawHandler<TEvent, { username: string }> = async ({
  queryStringParameters,
}) => {
  const result = await db.docClient
    .put({ Item: { uid: 'test' }, TableName: tablenames.usersTableName })
    .promise();

  console.log(result);

  const result2 = await db.docClient
    .scan({ TableName: tablenames.usersTableName })
    .promise();

  console.log(result, result2);

  if (queryStringParameters?.username == null) {
    throw new createHTTPError.BadRequest('Must specify username!');
  }

  return { message: 'success', data: { username: queryStringParameters.username } };
};

export const handler = ShallotAWSRestWrapper(_handler);

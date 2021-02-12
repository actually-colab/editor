import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import db from '../db/connection';
import tablenames from '../db/tables';

type TEvent = TShallotHttpEvent<{ username: string }>;

interface DNotebook {
  uid: string;
  nb_id: string;
}

const _handler: ShallotRawHandler<TEvent, DNotebook[]> = async ({
  queryStringParameters,
}) => {
  if (queryStringParameters?.username == null) {
    throw new createHTTPError.BadRequest('Must specify username!');
  }

  const notebooks = (
    await db.docClient
      .query({
        TableName: tablenames.notebooksTableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'uid = :uid',
        ExpressionAttributeValues: {
          ':uid': queryStringParameters.username,
        },
      })
      .promise()
  ).Items as DNotebook[];

  return { message: 'success', data: notebooks };
};

export const handler = ShallotAWSRestWrapper(_handler);

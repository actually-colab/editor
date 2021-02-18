import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { DNotebook } from '../db/dynamo/models/Notebook';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import dynamodb from '../db/dynamo/connection';
import tablenames from '../db/dynamo/tablenames';

type TEvent = TShallotHttpEvent<{ uid: string }>;

const _handler: ShallotRawHandler<TEvent, DNotebook[]> = async ({
  queryStringParameters,
}) => {
  if (queryStringParameters?.uid == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.uid');
  }

  const notebooks = (
    await dynamodb.docClient
      .query({
        TableName: tablenames.notebooksTableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'uid = :uid',
        ExpressionAttributeValues: {
          ':uid': queryStringParameters.uid,
        },
      })
      .promise()
  ).Items as DNotebook[];

  return { message: 'success', data: notebooks };
};

export const handler = ShallotAWSRestWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});

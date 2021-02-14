import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import type { NotebookAccessLevel, DNotebook } from '../db/models/Notebook';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';
import createHTTPError from 'http-errors';

import db from '../db/connection';
import tablenames from '../db/tablenames';
import { grantAccess } from '../db/models/Notebook';

interface RShareNotebook {
  uid: string;
  access_level: NotebookAccessLevel;
}

type TEvent = TShallotHttpEvent<
  { uid: string },
  { nb_id: string },
  unknown,
  RShareNotebook
>;

const _handler: ShallotRawHandler<TEvent, never> = async ({
  queryStringParameters,
  pathParameters,
  body,
}) => {
  if (queryStringParameters?.uid == null) {
    throw new createHTTPError.BadRequest('Must specify queryStringParameters.uid');
  }

  if (pathParameters?.nb_id == null) {
    throw new createHTTPError.BadRequest('Must specify body.nb_id');
  }

  if (body?.uid == null) {
    throw new createHTTPError.BadRequest('Must specify body.uid');
  }

  if (body?.access_level == null) {
    throw new createHTTPError.BadRequest('Must specify body.access_level');
  }

  // Assert that the request user has full access
  const requestingUserNotebook = (
    await db.docClient
      .get({
        Key: {
          uid: queryStringParameters.uid,
          nb_id: pathParameters.nb_id,
        },
        TableName: tablenames.notebooksTableName,
      })
      .promise()
  ).Item as DNotebook | null;

  if (requestingUserNotebook?.access_level !== 'Full Access') {
    throw new createHTTPError.Forbidden('Must have Full Access to share a notebook');
  }

  await grantAccess(
    pathParameters.nb_id,
    body.uid,
    body.access_level,
    requestingUserNotebook.name
  );

  // TODO: Send an email to the user

  return { message: 'success' };
};

export const handler = ShallotAWSRestWrapper(_handler);

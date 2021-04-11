import type {
  DUser,
  NotebookAccessLevelType,
  DWorkshopAccessLevel,
} from '@actually-colab/editor-types';

import createHttpError from 'http-errors';

import ShallotSocketWrapper, {
  ShallotRawHandler,
  TShallotSocketEvent,
} from '../middleware/wrapper';

import {
  getWorkshopAccessLevel,
  grantWorkshopAccessByEmails,
} from '../../db/pgsql/models/WorkshopAccessLevel';

import { broadcastToNotebook } from '../client-management';

interface TShareNotebookEventBody {
  data: {
    ws_id: DWorkshopAccessLevel['ws_id'];
    emails: DUser['email'][];
    access_level: DWorkshopAccessLevel['access_level'];
  };
}

type TShareNotebookEvent = TShallotSocketEvent<
  undefined,
  undefined,
  undefined,
  TShareNotebookEventBody
>;

const _handler: ShallotRawHandler<TShareNotebookEvent> = async ({
  requestContext,
  body,
}) => {
  const user = requestContext.authorizer as DUser | null;
  if (user?.uid == null) {
    throw new createHttpError.Unauthorized();
  }

  const data = body?.data;
  if (data?.ws_id == null) {
    throw new createHttpError.BadRequest('Must specify body.ws_id');
  }

  if (data?.emails == null) {
    throw new createHttpError.BadRequest('Must specify body.emails');
  }

  if (data?.access_level == null) {
    throw new createHttpError.BadRequest('Must specify body.access_level');
  }

  if (data.emails.includes(user.email)) {
    throw new createHttpError.BadRequest('Cannot grant access to yourself!');
  }

  // Assert that the request user has full access
  const requestingUserAccessLevel = await getWorkshopAccessLevel(user.uid, data.ws_id);
  if (requestingUserAccessLevel !== 'Instructor') {
    throw new createHttpError.Forbidden(
      'Must have Instructor Access to share a notebook'
    );
  }

  let nb_access_level: NotebookAccessLevelType;
  if (data.access_level === 'Instructor') {
    nb_access_level = 'Full Access';
  } else if (data.access_level === 'Attendee') {
    nb_access_level = 'Read Only';
  } else {
    throw new createHttpError.BadRequest('Invalid access_level');
  }
  const ual = await grantWorkshopAccessByEmails(
    data.emails,
    data.ws_id,
    data.access_level,
    nb_access_level
  );

  await Promise.all([
    broadcastToNotebook(requestContext, ual.notebook.nb_id, {
      action: 'notebook_shared',
      triggered_by: user.uid,
      data: ual.notebook,
    }),
    broadcastToNotebook(requestContext, ual.notebook.nb_id, {
      action: 'workshop_shared',
      triggered_by: user.uid,
      data: {
        ws_id: ual.workshop.ws_id,
        attendees: data.access_level === 'Attendee' ? ual.workshop.users : [],
        instructors: data.access_level === 'Instructor' ? ual.workshop.users : [],
      },
    }),
  ]);
};

export const handler = ShallotSocketWrapper(_handler, undefined, {
  HttpErrorHandlerOpts: { catchAllErrors: true },
});
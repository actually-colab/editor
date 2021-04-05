# Actually Colab Editor Client

The REST and WebSocket API Client for Actually Colab

## Setup

```bash
yarn install
yarn build
```

## Usage

```typescript
import types { RequestContext } from '@actually-colab/editor-client';

import {
  ActuallyColabSocketClient
  createNotebook,
  getNotebooksForUser,
  loginWithGoogleIdToken,
} from '@actually-colab/editor-client';

const main = async () => {
  const requestContext: RequestContext = { baseURL: "<api URI>" };

  const { user, sessionToken } = await loginWithGoogleIdToken(idToken, requestContext);
  requestContext['sessionToken'] = sessionToken;

  const myNewNotebook = await createNotebook('My Cool Notebook', 'python', requestContext);
  const allNotebooks = await getNotebooksForUser(requestContext);

  // Socket endpoints
  const socketClient = new ActuallyColabSocketClient(requestContext);

  socketClient.on('connect', () => { ... });
  socketClient.on('error', () => { ... });
  socketClient.on('notebook_opened', () => { ... });
  socketClient.on('cell_locked', () => { ... });
  // etc.

  socketClient.openNotebook(myNewNotebook.nb_id);
  // wait for notebook_opened ack...

  socketClient.lockCell(myNewNotebook.nb_id, someCellId);
  // wait for cell_locked ack...

  socketClient.editCell(myNewNotebook.nb_id, someCellId, 'exit(1)');
  // wait for cell_edited ack...
};
```

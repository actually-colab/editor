import type {
  ShallotRawHandler,
  TShallotHttpEvent,
} from '@shallot/rest-wrapper/dist/aws';

import { ShallotAWSRestWrapper } from '@shallot/rest-wrapper';

type TEvent = TShallotHttpEvent;

const _handler: ShallotRawHandler<TEvent, never> = async () => ({
  message: 'success',
});

export const handler = ShallotAWSRestWrapper(_handler);

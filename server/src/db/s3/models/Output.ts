/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
import type { OOutput, DActiveSession } from '@actually-colab/editor-types';

import { WebSocketRequestContext } from '../../../socket/connection';

/**
 * Replaces the stored output for the current cell + user pair
 * @param output the new output object to replace with
 */
export const updateOutput = async (
  _requestContext: WebSocketRequestContext,
  _session: DActiveSession,
  _output: OOutput
): Promise<void> => {};

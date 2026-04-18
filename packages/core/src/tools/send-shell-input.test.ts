/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
} from 'vitest';

const mockWriteToPty = vi.hoisted(() => vi.fn());
const mockIsPtyActive = vi.hoisted(() => vi.fn());

vi.mock('../services/shellExecutionService.js', () => ({
  ShellExecutionService: {
    writeToPty: mockWriteToPty,
    isPtyActive: mockIsPtyActive,
  },
}));

import { SendShellInputTool } from './shell.js';
import { createMockMessageBus } from '../test-utils/mock-message-bus.js';
import { ToolErrorType } from './tool-error.js';

describe('SendShellInputTool', () => {
  let sendInputTool: SendShellInputTool;
  const bus = createMockMessageBus();

  beforeEach(() => {
    vi.clearAllMocks();
    sendInputTool = new SendShellInputTool(bus);
  });

  it('should successfully send input to an active PTY', async () => {
    mockIsPtyActive.mockReturnValue(true);
    
    const invocation = sendInputTool.build({
      pid: 1234,
      input: 'y\r'
    });

    const result = await invocation.execute({
      abortSignal: new AbortController().signal
    });

    expect(mockIsPtyActive).toHaveBeenCalledWith(1234);
    expect(mockWriteToPty).toHaveBeenCalledWith(1234, 'y\r');
    expect(result.llmContent).toContain('Successfully sent input to process 1234');
  });

  it('should return an error if the process is not active', async () => {
    mockIsPtyActive.mockReturnValue(false);
    
    const invocation = sendInputTool.build({
      pid: 9999,
      input: 'test'
    });

    const result = await invocation.execute({
      abortSignal: new AbortController().signal
    });

    expect(mockIsPtyActive).toHaveBeenCalledWith(9999);
    expect(mockWriteToPty).not.toHaveBeenCalled();
    expect(result.error?.type).toBe(ToolErrorType.EXECUTION_FAILED);
    expect(result.llmContent).toContain('Error: Shell process with PID 9999 is not active');
  });

  it('should handle errors thrown by the execution service', async () => {
    mockIsPtyActive.mockReturnValue(true);
    mockWriteToPty.mockImplementation(() => {
      throw new Error('PTY write failed');
    });

    const invocation = sendInputTool.build({
      pid: 1234,
      input: 'fail'
    });

    const result = await invocation.execute({
      abortSignal: new AbortController().signal
    });

    expect(result.error?.message).toBe('PTY write failed');
    expect(result.llmContent).toContain('Error sending input to process 1234');
  });

  it('should validate that PID is a positive integer', () => {
    // @ts-expect-error - testing invalid param
    expect(() => sendInputTool.build({ pid: -1, input: 'test' })).toThrow('PID must be a positive integer.');
  });
});

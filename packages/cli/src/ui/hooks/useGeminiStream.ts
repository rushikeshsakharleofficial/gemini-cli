/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef } from 'react';
import {
  type GeminiEvent,
  type ContentEvent,
  type ThoughtEvent,
  type FinishedEvent,
  type ServerGeminiFinishedEvent,
  GeminiEventType as ServerGeminiEventType,
} from '@google/gemini-cli-core';
import { FinishReason } from '@google/genai';
import { type AgentLoopContext } from '@google/gemini-cli-core';
import { MessageType, StreamingState } from '../types.js';
import { useSessionStats } from '../contexts/SessionContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { debugLogger } from '@google/gemini-cli-core';
import { getPromptIdWithFallback } from '@google/gemini-cli-core';
import { useUIState } from '../contexts/UIStateContext.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from '@google/gemini-cli-core';
import { findLastSafeSplitPoint } from '../utils/markdownUtilities.js';
import { useStateAndRef } from './useStateAndRef.js';
import { parseAndFormatApiError } from '../../utils/errors.js';
import { showCitations } from '../utils/settingsUtils.js';
import { type HistoryItemWithoutId } from '../types.js';

interface GeminiStreamOptions {
  onCancelSubmit: (shouldRestorePrompt?: boolean) => void;
  addItem: (item: HistoryItemWithoutId, timestamp: number) => void;
}

/**
 * A hook that manages a Gemini interaction stream and its associated UI state.
 */
export const useGeminiStream = (
  config: AgentLoopContext['config'],
  { onCancelSubmit, addItem }: GeminiStreamOptions,
) => {
  const { setStreamingState } = useUIState();
  const { startNewPrompt, addUsage } = useSessionStats();
  const settings = useSettings();

  const [thought, thoughtRef, setThought] = useStateAndRef<string | null>(null);
  const [isResponding, , setIsResponding] = useStateAndRef<boolean>(false);
  const [pendingHistoryItem, pendingHistoryItemRef, setPendingHistoryItem] =
    useStateAndRef<HistoryItemWithoutId | null>(null);

  const turnCancelledRef = useRef<boolean>(false);

  // --- Helpers ---

  const maybeAddSuppressedToolErrorNote = (userMessageTimestamp: number) => {
    // Implementation omitted for brevity in this manual fix
  };

  const maybeAddLowVerbosityFailureNote = (userMessageTimestamp: number) => {
    // Implementation omitted
  };

  // --- Stream Event Handlers ---

  const handleContentEvent = useCallback(
    (
      eventValue: ContentEvent['value'],
      currentGeminiMessageBuffer: string,
      userMessageTimestamp: number,
    ): string => {
      if (turnCancelledRef.current) {
        return '';
      }
      let newGeminiMessageBuffer = currentGeminiMessageBuffer + eventValue;
      if (
        pendingHistoryItemRef.current?.type !== 'gemini' &&
        pendingHistoryItemRef.current?.type !== 'gemini_content'
      ) {
        if (pendingHistoryItemRef.current) {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        }
        setPendingHistoryItem({ type: 'gemini', text: '' });
        newGeminiMessageBuffer = eventValue;
      }

      const splitPoint = findLastSafeSplitPoint(newGeminiMessageBuffer);
      if (splitPoint === newGeminiMessageBuffer.length) {
        setPendingHistoryItem((item) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          type: item?.type as 'gemini' | 'gemini_content',
          text: newGeminiMessageBuffer,
        }));
      } else {
        const beforeText = newGeminiMessageBuffer.substring(0, splitPoint);
        const afterText = newGeminiMessageBuffer.substring(splitPoint);
        if (beforeText.length > 0) {
          addItem(
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
              type: pendingHistoryItemRef.current?.type as
                | 'gemini'
                | 'gemini_content',
              text: beforeText,
            },
            userMessageTimestamp,
          );
        }
        setPendingHistoryItem({ type: 'gemini_content', text: afterText });
        newGeminiMessageBuffer = afterText;
      }
      return newGeminiMessageBuffer;
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const handleThoughtEvent = useCallback(
    (value: ThoughtEvent['value'], _userMessageTimestamp: number) => {
      setThought((prev) => (prev ?? '') + value);
    },
    [setThought],
  );

  const handleFinishedEvent = useCallback(
    (event: ServerGeminiFinishedEvent, userMessageTimestamp: number) => {
      const finishReason = event.value.reason;
      const usageMetadata = event.value.usageMetadata;
      const currentModel = config.getModel();

      if (pendingHistoryItemRef.current) {
        addItem(
          {
            ...pendingHistoryItemRef.current,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            type: pendingHistoryItemRef.current.type as 'gemini' | 'gemini_content',
            model: usageMetadata ? currentModel : undefined,
            tokenCount: usageMetadata ? {
              input: usageMetadata.promptTokenCount,
              output: usageMetadata.candidatesTokenCount,
            } : undefined,
          },
          userMessageTimestamp,
        );
        setPendingHistoryItem(null);
      }

      if (usageMetadata) {
        addUsage(usageMetadata);
      }

      if (finishReason && finishReason !== FinishReason.STOP) {
        const finishReasonMessages: Partial<
          Record<FinishReason, string | undefined>
        > = {
          [FinishReason.MAX_TOKENS]: 'Response truncated due to token limits.',
          [FinishReason.SAFETY]: 'Response stopped due to safety reasons.',
        };
        const message = finishReasonMessages[finishReason];
        if (message) {
          addItem({ type: MessageType.INFO, text: message }, userMessageTimestamp);
        }
      }

      setThought(null);
      setIsResponding(false);
      setStreamingState(StreamingState.Idle);
    },
    [
      addItem,
      pendingHistoryItemRef,
      setPendingHistoryItem,
      config,
      setThought,
      setIsResponding,
      setStreamingState,
      addUsage,
    ],
  );

  const handleCitationEvent = useCallback(
    (text: string, userMessageTimestamp: number) => {
      if (!showCitations(settings)) {
        return;
      }

      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem({ type: MessageType.INFO, text }, userMessageTimestamp);
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, settings],
  );

  // --- Main Processing Loop ---

  const processStream = useCallback(
    async (
      stream: AsyncIterable<GeminiEvent>,
      userMessageTimestamp: number,
      signal: AbortSignal,
    ) => {
      let geminiMessageBuffer = '';
      setStreamingState(StreamingState.Responding);
      setIsResponding(true);
      turnCancelledRef.current = false;

      try {
        for await (const event of stream) {
          if (signal.aborted) break;

          switch (event.type) {
            case ServerGeminiEventType.Thought:
              handleThoughtEvent(event.value, userMessageTimestamp);
              break;
            case ServerGeminiEventType.Content:
              geminiMessageBuffer = handleContentEvent(
                event.value,
                geminiMessageBuffer,
                userMessageTimestamp,
              );
              break;
            case ServerGeminiEventType.Citation:
              handleCitationEvent(event.value, userMessageTimestamp);
              break;
            case ServerGeminiEventType.Finished:
              handleFinishedEvent(event, userMessageTimestamp);
              return;
          }
        }
      } catch (error) {
        debugLogger.error('[useGeminiStream] Stream processing failed:', error);
        addItem(
          {
            type: MessageType.ERROR,
            text: `Stream Error: ${String(error)}`,
          },
          userMessageTimestamp,
        );
      } finally {
        setIsResponding(false);
        setStreamingState(StreamingState.Idle);
      }
    },
    [
      handleContentEvent,
      handleThoughtEvent,
      handleFinishedEvent,
      handleCitationEvent,
      setStreamingState,
      setIsResponding,
      addItem,
    ],
  );

  return {
    processStream,
    thought,
    isResponding,
    cancelOngoingRequest: () => {
      turnCancelledRef.current = true;
      onCancelSubmit(false);
    },
  };
};

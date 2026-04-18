/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { useUIState } from '../../contexts/UIStateContext.js';

interface GeminiMessageContentProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
  model?: string;
  tokenCount?: { input?: number; output?: number };
}

/*
 * Gemini message content is a semi-hacked component. The intention is to represent a partial
 * of GeminiMessage and is only used when a response gets too long. In that instance messages
 * are split into multiple GeminiMessageContent's to enable the root <Static> component in
 * App.tsx to be as performant as humanly possible.
 */
export const GeminiMessageContent: React.FC<GeminiMessageContentProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
  model,
  tokenCount,
}) => {
  const { renderMarkdown } = useUIState();
  const originalPrefix = '✦ ';
  const prefixWidth = originalPrefix.length;

  let statsString = '';
  if (model || tokenCount) {
    const stats: string[] = [];
    if (model) stats.push(`[${model}]`);
    if (tokenCount?.input !== undefined || tokenCount?.output !== undefined) {
      const inTokens = tokenCount.input?.toLocaleString() ?? '?';
      const outTokens = tokenCount.output?.toLocaleString() ?? '?';
      stats.push(`(In: ${inTokens} | Out: ${outTokens})`);
    }
    if (stats.length > 0) {
      statsString = ` ${stats.join(' ')}\n`;
    }
  }

  const fullText = statsString ? `${statsString}${text}` : text;

  return (
    <Box flexDirection="column" paddingLeft={prefixWidth}>
      <MarkdownDisplay
        text={fullText}
        isPending={isPending}
        availableTerminalHeight={
          availableTerminalHeight === undefined
            ? undefined
            : Math.max(availableTerminalHeight - 1, 1)
        }
        terminalWidth={Math.max(terminalWidth - prefixWidth, 0)}
        renderMarkdown={renderMarkdown}
      />
    </Box>
  );
};

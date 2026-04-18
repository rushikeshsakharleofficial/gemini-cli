/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, Box } from 'ink';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { theme } from '../../semantic-colors.js';
import { SCREEN_READER_MODEL_PREFIX } from '../../textConstants.js';
import { useUIState } from '../../contexts/UIStateContext.js';

interface GeminiMessageProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
  model?: string;
  tokenCount?: { input?: number; output?: number };
}

export const GeminiMessage: React.FC<GeminiMessageProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth,
  model,
  tokenCount,
}) => {
  const { renderMarkdown } = useUIState();
  const prefix = '✦ ';
  
  let statsString = '';
  if (model || tokenCount) {
    const stats: string[] = [];
    if (model) stats.push(`[${model}]`);
    if (tokenCount?.input !== undefined || tokenCount?.output !== undefined) {
      const inTokens = tokenCount.input?.toLocaleString() ?? '?';
      const outTokens = tokenCount.output?.toLocaleString() ?? '?';
      stats.push(`(In: +${inTokens} | Out: +${outTokens})`);
    }
    if (stats.length > 0) {
      statsString = ` ${stats.join(' ')}\n`;
    }
  }

  const fullText = statsString ? `${statsString}${text}` : text;
  const prefixWidth = prefix.length;

  return (
    <Box flexDirection="row">
      <Box width={prefixWidth}>
        <Text color={theme.text.accent} aria-label={SCREEN_READER_MODEL_PREFIX}>
          {prefix}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column">
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
    </Box>
  );
};

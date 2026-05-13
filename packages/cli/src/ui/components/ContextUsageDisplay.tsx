/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { getContextUsagePercentage } from '../utils/contextUsage.js';
import { useSettings } from '../contexts/SettingsContext.js';
import {
  MIN_TERMINAL_WIDTH_FOR_FULL_LABEL,
  DEFAULT_COMPRESSION_THRESHOLD,
} from '../constants.js';

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export const ContextUsageDisplay = ({
  promptTokenCount,
  outputTokenCount,
  model,
  terminalWidth,
}: {
  promptTokenCount: number;
  outputTokenCount?: number;
  model: string | undefined;
  terminalWidth: number;
}) => {
  const settings = useSettings();
  const percentage = getContextUsagePercentage(promptTokenCount, model);
  const percentageUsed = (percentage * 100).toFixed(0);

  const threshold =
    settings.merged.model?.compressionThreshold ??
    DEFAULT_COMPRESSION_THRESHOLD;

  let textColor = theme.text.secondary;
  if (percentage >= 1.0) {
    textColor = theme.status.error;
  } else if (percentage >= threshold) {
    textColor = theme.status.warning;
  }

  const showTokenCounts =
    terminalWidth >= MIN_TERMINAL_WIDTH_FOR_FULL_LABEL &&
    (promptTokenCount > 0 || (outputTokenCount ?? 0) > 0);

  const label =
    terminalWidth < MIN_TERMINAL_WIDTH_FOR_FULL_LABEL ? '%' : '% used';

  return (
    <Box flexDirection="row" gap={1}>
      {showTokenCounts && (
        <Box flexDirection="row" gap={1}>
          <Text color={theme.text.secondary}>
            ↑{formatTokenCount(promptTokenCount)}
          </Text>
          {(outputTokenCount ?? 0) > 0 && (
            <Text color={theme.text.secondary}>
              ↓{formatTokenCount(outputTokenCount!)}
            </Text>
          )}
        </Box>
      )}
      <Text color={textColor}>
        {percentageUsed}
        {label}
      </Text>
    </Box>
  );
};

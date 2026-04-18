/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SettingsContextValue } from '../contexts/SettingsContext.js';

/**
 * Returns true if citations should be displayed in the UI.
 */
export function showCitations(settings: SettingsContextValue): boolean {
  return settings.merged.ui?.showCitations ?? false;
}

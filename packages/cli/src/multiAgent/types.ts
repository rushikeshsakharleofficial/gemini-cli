/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type MultiAgentRole =
  | 'planner'
  | 'researcher'
  | 'coder'
  | 'tester'
  | 'reviewer';

export const DEFAULT_MULTI_AGENT_ROLES: readonly MultiAgentRole[] = [
  'planner',
  'researcher',
  'coder',
  'tester',
  'reviewer',
] as const;

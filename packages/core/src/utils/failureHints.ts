/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A registry of common shell failure patterns and their remediation hints.
 */
export interface FailureHint {
  pattern: string | RegExp;
  hint: string;
}

export const COMMON_FAILURE_HINTS: FailureHint[] = [
  {
    pattern: /permission denied|access is denied/i,
    hint: 'This appears to be a permissions issue. Try running with elevated privileges (sudo/admin) or check file/folder ownership.',
  },
  {
    pattern: /not found|is not recognized|no such file/i,
    hint: 'A required executable or file was not found. Verify your PATH or the existence of the file/directory.',
  },
  {
    pattern: /address already in use|EADDRINUSE/i,
    hint: 'The network port is already being used by another process. Kill the existing process or use a different port.',
  },
  {
    pattern: /connection refused|ECONNREFUSED/i,
    hint: 'The target service is not responding. Verify the service is running and the port/address are correct.',
  },
  {
    pattern: /npm ERR!/i,
    hint: 'NPM execution failed. Check package.json dependencies, lockfile consistency, or try running "npm install".',
  },
  {
    pattern: /git:.*is not a git repository/i,
    hint: 'You are attempting a git command outside of a repository. Use "git init" or navigate to the correct directory.',
  },
  {
    pattern: /disk full|no space left on device/i,
    hint: 'The system has run out of disk space. Clean up temporary files or increase disk capacity.',
  },
];

/**
 * Analyzes a command error output and returns a helpful hint if a pattern matches.
 */
export function getRemediationHint(output: string): string | null {
  for (const item of COMMON_FAILURE_HINTS) {
    const isMatch = typeof item.pattern === 'string' 
      ? output.includes(item.pattern) 
      : item.pattern.test(output);
      
    if (isMatch) {
      return item.hint;
    }
  }
  return null;
}

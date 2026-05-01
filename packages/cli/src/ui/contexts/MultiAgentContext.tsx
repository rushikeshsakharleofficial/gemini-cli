/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  MultiAgentController,
  type MultiAgentSnapshot,
} from '../../multiAgent/MultiAgentController.js';
import { DEFAULT_MULTI_AGENT_ROLES } from '../../multiAgent/types.js';

interface MultiAgentContextValue {
  controller: MultiAgentController;
  snapshot: MultiAgentSnapshot;
}

const MultiAgentContext = createContext<MultiAgentContextValue | undefined>(
  undefined,
);

export function MultiAgentProvider({ children }: { children: React.ReactNode }) {
  const controller = useMemo(
    () => new MultiAgentController({ roles: DEFAULT_MULTI_AGENT_ROLES }),
    [],
  );
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  React.useEffect(
    () => controller.subscribe((event) => setSnapshot(event.snapshot)),
    [controller],
  );

  return (
    <MultiAgentContext.Provider value={{ controller, snapshot }}>
      {children}
    </MultiAgentContext.Provider>
  );
}

export function useMultiAgent() {
  const value = useContext(MultiAgentContext);
  if (!value) {
    throw new Error('useMultiAgent must be used within MultiAgentProvider');
  }
  return value;
}

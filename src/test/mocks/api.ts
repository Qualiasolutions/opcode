import { vi } from 'vitest';
import type {
  Checkpoint,
  CheckpointResult,
  CheckpointDiff,
  SessionTimeline,
  CheckpointStrategy,
} from '@/lib/api';

// Mock checkpoint data factory
export const createMockCheckpoint = (overrides: Partial<Checkpoint> = {}): Checkpoint => ({
  id: `checkpoint-${Math.random().toString(36).slice(2, 10)}`,
  sessionId: 'test-session-id',
  projectId: 'test-project-id',
  messageIndex: 0,
  timestamp: new Date().toISOString(),
  description: 'Test checkpoint',
  parentCheckpointId: undefined,
  metadata: {
    totalTokens: 1000,
    modelUsed: 'claude-3-opus',
    userPrompt: 'Test prompt',
    fileChanges: 5,
    snapshotSize: 1024,
  },
  ...overrides,
});

export const createMockCheckpointResult = (overrides: Partial<CheckpointResult> = {}): CheckpointResult => ({
  checkpoint: createMockCheckpoint(),
  filesProcessed: 10,
  warnings: [],
  ...overrides,
});

export const createMockSessionTimeline = (overrides: Partial<SessionTimeline> = {}): SessionTimeline => ({
  sessionId: 'test-session-id',
  rootNode: {
    checkpoint: createMockCheckpoint({ id: 'root-checkpoint' }),
    children: [],
    fileSnapshotIds: ['snapshot-1', 'snapshot-2'],
  },
  currentCheckpointId: 'root-checkpoint',
  autoCheckpointEnabled: true,
  checkpointStrategy: 'smart',
  totalCheckpoints: 1,
  ...overrides,
});

export const createMockCheckpointDiff = (overrides: Partial<CheckpointDiff> = {}): CheckpointDiff => ({
  fromCheckpointId: 'checkpoint-1',
  toCheckpointId: 'checkpoint-2',
  modifiedFiles: [
    { path: 'src/index.ts', additions: 10, deletions: 5 },
  ],
  addedFiles: ['src/new-file.ts'],
  deletedFiles: ['src/old-file.ts'],
  tokenDelta: 500,
  ...overrides,
});

// Mock API implementation
export const createMockApi = () => ({
  createCheckpoint: vi.fn().mockResolvedValue(createMockCheckpointResult()),
  restoreCheckpoint: vi.fn().mockResolvedValue(createMockCheckpointResult()),
  listCheckpoints: vi.fn().mockResolvedValue([createMockCheckpoint()]),
  forkFromCheckpoint: vi.fn().mockResolvedValue(createMockCheckpointResult()),
  getSessionTimeline: vi.fn().mockResolvedValue(createMockSessionTimeline()),
  updateCheckpointSettings: vi.fn().mockResolvedValue(undefined),
  getCheckpointDiff: vi.fn().mockResolvedValue(createMockCheckpointDiff()),
  trackCheckpointMessage: vi.fn().mockResolvedValue(undefined),
  checkAutoCheckpoint: vi.fn().mockResolvedValue(false),
  cleanupOldCheckpoints: vi.fn().mockResolvedValue(5),
  getCheckpointSettings: vi.fn().mockResolvedValue({
    auto_checkpoint_enabled: true,
    checkpoint_strategy: 'smart' as CheckpointStrategy,
    total_checkpoints: 10,
    current_checkpoint_id: 'current-checkpoint',
  }),
  clearCheckpointManager: vi.fn().mockResolvedValue(undefined),
  trackSessionMessages: vi.fn().mockResolvedValue(undefined),
});

// Helper to setup API mock
export const setupApiMock = () => {
  const mockApi = createMockApi();
  vi.doMock('@/lib/api', () => ({
    api: mockApi,
  }));
  return mockApi;
};

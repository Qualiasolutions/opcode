import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any provider props here if needed
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Utility to wait for effects to complete
export const waitForEffects = () => new Promise(resolve => setTimeout(resolve, 0));

// Utility to flush promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock toast function factory
export const createMockToast = () => vi.fn();

// Utility to create a mock for useTrackEvent hook
export const createMockTrackEvent = () => ({
  checkpointCreated: vi.fn(),
  checkpointRestored: vi.fn(),
  sessionStarted: vi.fn(),
  sessionEnded: vi.fn(),
});

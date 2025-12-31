import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VoiceControlPanel } from '@/components/audio/VoiceControlPanel';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('VoiceControlPanel', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    projectId: 'test-project-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the panel header', () => {
    render(<VoiceControlPanel {...defaultProps} />);

    expect(screen.getByText('Voice Profiles')).toBeInTheDocument();
  });

  it('should display the Clone button', () => {
    render(<VoiceControlPanel {...defaultProps} />);

    expect(screen.getByText('Clone')).toBeInTheDocument();
  });

  it('should show voice count badge', () => {
    render(<VoiceControlPanel {...defaultProps} />);

    // Mock data has 2 voices
    expect(screen.getByText('2 voices')).toBeInTheDocument();
  });

  it('should display voice profiles', async () => {
    render(<VoiceControlPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Hero Voice')).toBeInTheDocument();
      expect(screen.getByText('Narrator')).toBeInTheDocument();
    });
  });

  it('should show character name for voices', async () => {
    render(<VoiceControlPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Character: Hero')).toBeInTheDocument();
      expect(screen.getByText('Character: Narrator')).toBeInTheDocument();
    });
  });

  it('should show category badges for voices', async () => {
    render(<VoiceControlPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('cloned')).toBeInTheDocument();
      expect(screen.getByText('premade')).toBeInTheDocument();
    });
  });
});

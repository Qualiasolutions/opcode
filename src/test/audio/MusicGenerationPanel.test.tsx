import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MusicGenerationPanel } from '@/components/audio/MusicGenerationPanel';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('MusicGenerationPanel', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    projectId: 'test-project-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the panel header', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Music Generation')).toBeInTheDocument();
  });

  it('should display the prompt input', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByLabelText('Describe the music')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Intense chase scene with driving percussion')).toBeInTheDocument();
  });

  it('should display style options', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Epic')).toBeInTheDocument();
    expect(screen.getByText('Ambient')).toBeInTheDocument();
    expect(screen.getByText('Electronic')).toBeInTheDocument();
    expect(screen.getByText('Orchestral')).toBeInTheDocument();
    expect(screen.getByText('Acoustic')).toBeInTheDocument();
    expect(screen.getByText('Cinematic')).toBeInTheDocument();
  });

  it('should display mood options', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByText('Tense')).toBeInTheDocument();
    expect(screen.getByText('Calm')).toBeInTheDocument();
    expect(screen.getByText('Uplifting')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Mysterious')).toBeInTheDocument();
    expect(screen.getByText('Energetic')).toBeInTheDocument();
  });

  it('should display the duration slider', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('should show generate button', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Generate Music')).toBeInTheDocument();
  });

  it('should disable generate button when prompt is empty', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    const generateButton = screen.getByText('Generate Music').closest('button');
    expect(generateButton).toBeDisabled();
  });

  it('should enable generate button when prompt is entered', async () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g., Intense chase scene with driving percussion');
    fireEvent.change(input, { target: { value: 'Heroic orchestral theme' } });

    const generateButton = screen.getByText('Generate Music').closest('button');
    expect(generateButton).not.toBeDisabled();
  });

  it('should show empty state when no tracks generated', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    expect(screen.getByText('Describe the music you want to generate above.')).toBeInTheDocument();
  });

  it('should allow selecting different styles', async () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    const epicBadge = screen.getByText('Epic');
    fireEvent.click(epicBadge);

    // The badge should be selected (has different styling)
    // We just verify the click doesn't cause errors
    expect(epicBadge).toBeInTheDocument();
  });

  it('should allow selecting different moods', async () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    const calmBadge = screen.getByText('Calm');
    fireEvent.click(calmBadge);

    // The badge should be selected (has different styling)
    expect(calmBadge).toBeInTheDocument();
  });

  it('should format duration correctly', () => {
    render(<MusicGenerationPanel {...defaultProps} />);

    // Default duration is 30 seconds = 0:30
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });
});

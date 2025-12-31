import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SoundEffectsPanel } from '@/components/audio/SoundEffectsPanel';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('SoundEffectsPanel', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    projectId: 'test-project-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the panel header', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
  });

  it('should display the prompt input', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByLabelText('Describe the sound')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., Thunder rolling in the distance')).toBeInTheDocument();
  });

  it('should display the category selector', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('should display the duration slider', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('should show generate button', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByText('Generate Sound')).toBeInTheDocument();
  });

  it('should disable generate button when prompt is empty', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    const generateButton = screen.getByText('Generate Sound').closest('button');
    expect(generateButton).toBeDisabled();
  });

  it('should enable generate button when prompt is entered', async () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g., Thunder rolling in the distance');
    fireEvent.change(input, { target: { value: 'Footsteps on gravel' } });

    const generateButton = screen.getByText('Generate Sound').closest('button');
    expect(generateButton).not.toBeDisabled();
  });

  it('should show empty state when no sounds generated', () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    expect(screen.getByText('Describe a sound effect above to generate it.')).toBeInTheDocument();
  });

  it('should update duration display when slider changes', async () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    // Initial duration is 3s
    expect(screen.getByText('3s')).toBeInTheDocument();
  });

  it('should generate sound when Enter is pressed in input', async () => {
    render(<SoundEffectsPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g., Thunder rolling in the distance');
    fireEvent.change(input, { target: { value: 'Rain on window' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      // After generation, the input should be cleared
      expect(input).toHaveValue('');
    });
  });
});

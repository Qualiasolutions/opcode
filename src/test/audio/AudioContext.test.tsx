import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AudioProvider, useAudio, useAudioPlayer } from '@/contexts/AudioContext';

// Mock HTMLAudioElement
class MockAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  duration = 0;
  paused = true;

  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

vi.stubGlobal('Audio', MockAudio);

describe('AudioContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAudio', () => {
    it('should throw when used outside AudioProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAudio());
      }).toThrow('useAudio must be used within an AudioProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useAudio(), {
        wrapper: AudioProvider,
      });

      expect(result.current.currentlyPlayingId).toBeNull();
      expect(result.current.currentlyPlayingUrl).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.volume).toBe(0.7);
    });

    it('should play audio', async () => {
      const { result } = renderHook(() => useAudio(), {
        wrapper: AudioProvider,
      });

      await act(async () => {
        result.current.playAudio('test-id', 'http://example.com/audio.mp3');
      });

      expect(result.current.currentlyPlayingId).toBe('test-id');
      expect(result.current.currentlyPlayingUrl).toBe('http://example.com/audio.mp3');
    });

    it('should set volume', () => {
      const { result } = renderHook(() => useAudio(), {
        wrapper: AudioProvider,
      });

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.volume).toBe(0.5);
    });

    it('should clamp volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudio(), {
        wrapper: AudioProvider,
      });

      act(() => {
        result.current.setVolume(1.5);
      });

      expect(result.current.volume).toBe(1);

      act(() => {
        result.current.setVolume(-0.5);
      });

      expect(result.current.volume).toBe(0);
    });

    it('should check if audio is currently playing', async () => {
      const { result } = renderHook(() => useAudio(), {
        wrapper: AudioProvider,
      });

      expect(result.current.isCurrentlyPlaying('test-id')).toBe(false);

      await act(async () => {
        result.current.playAudio('test-id', 'http://example.com/audio.mp3');
      });

      expect(result.current.isCurrentlyPlaying('test-id')).toBe(true);
      expect(result.current.isCurrentlyPlaying('other-id')).toBe(false);
    });
  });

  describe('useAudioPlayer', () => {
    it('should provide player controls', () => {
      const { result } = renderHook(
        () => useAudioPlayer('test-id', 'http://example.com/audio.mp3'),
        { wrapper: AudioProvider }
      );

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isActive).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });
  });
});

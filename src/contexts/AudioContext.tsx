import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

interface AudioState {
  currentlyPlayingId: string | null;
  currentlyPlayingUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

interface AudioContextValue extends AudioState {
  playAudio: (id: string, url: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  togglePlayPause: (id: string, url: string) => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  isCurrentlyPlaying: (id: string) => boolean;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    currentlyPlayingId: null,
    currentlyPlayingUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = state.volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration || 0 }));
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentlyPlayingId: null,
        currentlyPlayingUrl: null,
      }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const playAudio = useCallback((id: string, url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If different audio, load new source
    if (state.currentlyPlayingUrl !== url) {
      audio.src = url;
      audio.load();
    }

    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
    });

    setState(prev => ({
      ...prev,
      currentlyPlayingId: id,
      currentlyPlayingUrl: url,
      isPlaying: true,
    }));
  }, [state.currentlyPlayingUrl]);

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      currentlyPlayingId: null,
      currentlyPlayingUrl: null,
    }));
  }, []);

  const togglePlayPause = useCallback((id: string, url: string) => {
    if (state.currentlyPlayingId === id && state.isPlaying) {
      pauseAudio();
    } else {
      playAudio(id, url);
    }
  }, [state.currentlyPlayingId, state.isPlaying, pauseAudio, playAudio]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const isCurrentlyPlaying = useCallback((id: string) => {
    return state.currentlyPlayingId === id && state.isPlaying;
  }, [state.currentlyPlayingId, state.isPlaying]);

  const value: AudioContextValue = {
    ...state,
    playAudio,
    pauseAudio,
    stopAudio,
    togglePlayPause,
    seekTo,
    setVolume,
    isCurrentlyPlaying,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

export function useAudioPlayer(id: string, url?: string) {
  const audio = useAudio();

  const play = useCallback(() => {
    if (url) {
      audio.playAudio(id, url);
    }
  }, [audio, id, url]);

  const pause = useCallback(() => {
    audio.pauseAudio();
  }, [audio]);

  const toggle = useCallback(() => {
    if (url) {
      audio.togglePlayPause(id, url);
    }
  }, [audio, id, url]);

  const isPlaying = audio.isCurrentlyPlaying(id);
  const isActive = audio.currentlyPlayingId === id;

  return {
    play,
    pause,
    toggle,
    isPlaying,
    isActive,
    currentTime: isActive ? audio.currentTime : 0,
    duration: isActive ? audio.duration : 0,
    seekTo: audio.seekTo,
  };
}

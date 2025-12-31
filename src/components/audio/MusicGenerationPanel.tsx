import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Wand2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GeneratedTrack {
  id: string;
  prompt: string;
  style: string;
  mood: string;
  duration: number;
  audioUrl?: string;
  createdAt: string;
}

interface MusicGenerationPanelProps {
  sessionId: string;
  projectId: string;
}

const styleOptions = [
  { id: "epic", label: "Epic" },
  { id: "ambient", label: "Ambient" },
  { id: "electronic", label: "Electronic" },
  { id: "orchestral", label: "Orchestral" },
  { id: "acoustic", label: "Acoustic" },
  { id: "cinematic", label: "Cinematic" },
];

const moodOptions = [
  { id: "tense", label: "Tense" },
  { id: "calm", label: "Calm" },
  { id: "uplifting", label: "Uplifting" },
  { id: "dark", label: "Dark" },
  { id: "mysterious", label: "Mysterious" },
  { id: "energetic", label: "Energetic" },
];

export const MusicGenerationPanel: React.FC<MusicGenerationPanelProps> = ({
  sessionId: _sessionId,
  projectId: _projectId,
}) => {
  // TODO: Use sessionId and projectId when implementing API calls
  void _sessionId;
  void _projectId;
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("cinematic");
  const [selectedMood, setSelectedMood] = useState("tense");
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<GeneratedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update current time during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const result = await api.elevenLabsGenerateMusic(prompt, duration, selectedStyle);

      // Mock: Add generated track
      const newTrack: GeneratedTrack = {
        id: `track-${Date.now()}`,
        prompt: prompt,
        style: selectedStyle,
        mood: selectedMood,
        duration: duration,
        audioUrl: undefined, // Would be set from API response
        createdAt: new Date().toISOString(),
      };
      setTracks((prev) => [newTrack, ...prev]);
      setPrompt("");
    } catch (err) {
      console.error("Failed to generate music:", err);
      setError("Failed to generate music");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayTrack = (track: GeneratedTrack) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (track.audioUrl && audioRef.current) {
      if (currentTrack?.id !== track.id) {
        audioRef.current.src = track.audioUrl;
        setCurrentTime(0);
      }
      setCurrentTrack(track);
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    if (currentTrack?.id === trackId) {
      audioRef.current?.pause();
      setCurrentTrack(null);
      setIsPlaying(false);
    }
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium">Music Generation</h3>
      </div>

      {/* Generator */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="music-prompt">Describe the music</Label>
            <Input
              id="music-prompt"
              placeholder="e.g., Intense chase scene with driving percussion"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Style selection */}
          <div className="space-y-2">
            <Label>Style</Label>
            <div className="flex flex-wrap gap-2">
              {styleOptions.map((style) => (
                <Badge
                  key={style.id}
                  variant={selectedStyle === style.id ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedStyle === style.id && "bg-primary"
                  )}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  {style.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mood selection */}
          <div className="space-y-2">
            <Label>Mood</Label>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((mood) => (
                <Badge
                  key={mood.id}
                  variant={selectedMood === mood.id ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedMood === mood.id && "bg-primary"
                  )}
                  onClick={() => setSelectedMood(mood.id)}
                >
                  {mood.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Music
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Now Playing */}
      {currentTrack && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentTrack.prompt}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {currentTrack.style}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentTrack.mood}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={currentTrack.duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10"
                onClick={() => handlePlayTrack(currentTrack)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Generated Tracks
          </h4>
          {tracks.map((track) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={cn(
                  "hover:shadow-md transition-shadow cursor-pointer",
                  currentTrack?.id === track.id && "border-primary"
                )}
                onClick={() => handlePlayTrack(track)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {track.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {track.style}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(track.duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(track);
                        }}
                        disabled={!track.audioUrl}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!track.audioUrl}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrack(track.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tracks.length === 0 && !isGenerating && !currentTrack && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Describe the music you want to generate above.
        </div>
      )}
    </div>
  );
};

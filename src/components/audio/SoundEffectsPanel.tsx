import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Volume2,
  Wand2,
  Play,
  Pause,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectComponent, type SelectOption } from "@/components/ui/select";

interface GeneratedSound {
  id: string;
  prompt: string;
  category: string;
  duration: number;
  audioUrl?: string;
  createdAt: string;
}

interface SoundEffectsPanelProps {
  sessionId: string;
  projectId: string;
}

const categoryOptions: SelectOption[] = [
  { value: "nature", label: "Nature" },
  { value: "technology", label: "Technology" },
  { value: "ambient", label: "Ambient" },
  { value: "action", label: "Action" },
  { value: "ui", label: "UI Sounds" },
  { value: "foley", label: "Foley" },
  { value: "other", label: "Other" },
];

export const SoundEffectsPanel: React.FC<SoundEffectsPanelProps> = ({
  sessionId: _sessionId,
  projectId: _projectId,
}) => {
  // TODO: Use sessionId and projectId when implementing API calls
  void _sessionId;
  void _projectId;
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("nature");
  const [duration, setDuration] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sounds, setSounds] = useState<GeneratedSound[]>([]);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const result = await api.elevenLabsGenerateSFX(prompt, duration, 0.5);

      // Mock: Add generated sound
      const newSound: GeneratedSound = {
        id: `sfx-${Date.now()}`,
        prompt: prompt,
        category: category,
        duration: duration,
        audioUrl: undefined, // Would be set from API response
        createdAt: new Date().toISOString(),
      };
      setSounds((prev) => [newSound, ...prev]);
      setPrompt("");
    } catch (err) {
      console.error("Failed to generate sound effect:", err);
      setError("Failed to generate sound effect");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlaySound = (sound: GeneratedSound) => {
    if (playingSoundId === sound.id) {
      audioRef.current?.pause();
      setPlayingSoundId(null);
      return;
    }

    if (sound.audioUrl && audioRef.current) {
      audioRef.current.src = sound.audioUrl;
      audioRef.current.play();
      setPlayingSoundId(sound.id);
    }
  };

  const handleDeleteSound = (soundId: string) => {
    setSounds((prev) => prev.filter((s) => s.id !== soundId));
  };

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingSoundId(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium">Sound Effects</h3>
      </div>

      {/* Generator */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sfx-prompt">Describe the sound</Label>
            <Input
              id="sfx-prompt"
              placeholder="e.g., Thunder rolling in the distance"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isGenerating) {
                  handleGenerate();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <SelectComponent
                value={category}
                onValueChange={setCategory}
                options={categoryOptions}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-8">
                  {duration}s
                </span>
              </div>
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
                Generate Sound
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

      {/* Generated sounds */}
      {sounds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Generated Sounds
          </h4>
          {sounds.map((sound) => (
            <motion.div
              key={sound.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sound.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {sound.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(sound.duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handlePlaySound(sound)}
                        disabled={!sound.audioUrl}
                      >
                        {playingSoundId === sound.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!sound.audioUrl}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteSound(sound.id)}
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
      {sounds.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Describe a sound effect above to generate it.
        </div>
      )}
    </div>
  );
};

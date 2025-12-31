import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Plus,
  Play,
  Pause,
  Trash2,
  Upload,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface VoiceProfile {
  id: string;
  name: string;
  characterName?: string;
  description?: string;
  previewUrl?: string;
  category: "cloned" | "premade" | "generated";
  settings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
}

interface VoiceControlPanelProps {
  sessionId: string;
  projectId: string;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  sessionId,
  projectId,
}) => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneCharacter, setCloneCharacter] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load voices on mount
  useEffect(() => {
    loadVoices();
  }, [sessionId, projectId]);

  const loadVoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const result = await api.elevenLabsListVoices();
      // setVoices(result);

      // Mock data for now
      setVoices([
        {
          id: "voice-1",
          name: "Hero Voice",
          characterName: "Hero",
          description: "Deep, confident male voice",
          category: "cloned",
          previewUrl: undefined,
          settings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0,
            useSpeakerBoost: true,
          },
        },
        {
          id: "voice-2",
          name: "Narrator",
          characterName: "Narrator",
          description: "Warm, storytelling voice",
          category: "premade",
          previewUrl: undefined,
          settings: {
            stability: 0.7,
            similarityBoost: 0.8,
            style: 0.2,
            useSpeakerBoost: false,
          },
        },
      ]);
    } catch (err) {
      console.error("Failed to load voices:", err);
      setError("Failed to load voice profiles");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPreview = async (voice: VoiceProfile) => {
    if (playingVoiceId === voice.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (voice.previewUrl) {
      if (audioRef.current) {
        audioRef.current.src = voice.previewUrl;
        audioRef.current.play();
        setPlayingVoiceId(voice.id);
      }
    }
  };

  const handleCloneVoice = async () => {
    if (!cloneName.trim()) return;

    setIsCloning(true);
    try {
      // TODO: Replace with actual API call
      // await api.elevenLabsCloneVoice(cloneName, audioFiles, description);

      // Mock: Add new voice
      const newVoice: VoiceProfile = {
        id: `voice-${Date.now()}`,
        name: cloneName,
        characterName: cloneCharacter || undefined,
        category: "cloned",
        settings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0,
          useSpeakerBoost: true,
        },
      };
      setVoices((prev) => [...prev, newVoice]);
      setShowCloneDialog(false);
      setCloneName("");
      setCloneCharacter("");
    } catch (err) {
      console.error("Failed to clone voice:", err);
      setError("Failed to clone voice");
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm("Delete this voice profile?")) return;

    try {
      // TODO: Replace with actual API call
      // await api.elevenLabsDeleteVoice(voiceId);
      setVoices((prev) => prev.filter((v) => v.id !== voiceId));
    } catch (err) {
      console.error("Failed to delete voice:", err);
      setError("Failed to delete voice");
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingVoiceId(null)}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Voice Profiles</h3>
          <Badge variant="outline" className="text-xs">
            {voices.length} voices
          </Badge>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={() => setShowCloneDialog(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Clone
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Voice list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : voices.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No voice profiles yet. Clone a voice to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {voices.map((voice) => (
            <motion.div
              key={voice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {voice.name}
                        </span>
                        <Badge
                          variant={
                            voice.category === "cloned"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {voice.category}
                        </Badge>
                      </div>
                      {voice.characterName && (
                        <p className="text-xs text-muted-foreground">
                          Character: {voice.characterName}
                        </p>
                      )}
                      {voice.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {voice.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handlePlayPreview(voice)}
                        disabled={!voice.previewUrl}
                      >
                        {playingVoiceId === voice.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteVoice(voice.id)}
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

      {/* Clone Voice Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Voice</DialogTitle>
            <DialogDescription>
              Upload audio samples to create a voice clone for consistent
              character voices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input
                id="voice-name"
                placeholder="e.g., Hero Voice"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name (optional)</Label>
              <Input
                id="character-name"
                placeholder="e.g., Hero"
                value={cloneCharacter}
                onChange={(e) => setCloneCharacter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Audio Samples</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop audio files or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP3, WAV, or M4A (max 10MB each)
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Upload className="h-3 w-3 mr-1" />
                  Browse Files
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloneDialog(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloneVoice}
              disabled={isCloning || !cloneName.trim()}
            >
              {isCloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Clone Voice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

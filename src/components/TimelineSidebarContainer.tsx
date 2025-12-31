import React, { useState } from "react";
import { X, GitBranch, Mic, Volume2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineNavigator } from "@/components/TimelineNavigator";
import { VoiceControlPanel } from "@/components/audio/VoiceControlPanel";
import { SoundEffectsPanel } from "@/components/audio/SoundEffectsPanel";
import { MusicGenerationPanel } from "@/components/audio/MusicGenerationPanel";
import type { Checkpoint } from "@/lib/api";

interface TimelineSidebarContainerProps {
  sessionId: string;
  projectId: string;
  projectPath: string;
  currentMessageIndex: number;
  onCheckpointSelect: (checkpoint: Checkpoint) => void;
  onFork: (checkpointId: string) => void;
  onCheckpointCreated?: () => void;
  refreshVersion?: number;
  onClose: () => void;
}

export const TimelineSidebarContainer: React.FC<TimelineSidebarContainerProps> = ({
  sessionId,
  projectId,
  projectPath,
  currentMessageIndex,
  onCheckpointSelect,
  onFork,
  onCheckpointCreated,
  refreshVersion,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("checkpoints");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Session Timeline</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid grid-cols-4 gap-1">
          <TabsTrigger value="checkpoints" className="text-xs px-2">
            <GitBranch className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Checkpoints</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="text-xs px-2">
            <Mic className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="soundfx" className="text-xs px-2">
            <Volume2 className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">SFX</span>
          </TabsTrigger>
          <TabsTrigger value="music" className="text-xs px-2">
            <Music className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Music</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="checkpoints" className="p-4 m-0 h-full">
            <TimelineNavigator
              sessionId={sessionId}
              projectId={projectId}
              projectPath={projectPath}
              currentMessageIndex={currentMessageIndex}
              onCheckpointSelect={onCheckpointSelect}
              onFork={onFork}
              onCheckpointCreated={onCheckpointCreated}
              refreshVersion={refreshVersion}
            />
          </TabsContent>

          <TabsContent value="voice" className="p-4 m-0 h-full">
            <VoiceControlPanel
              sessionId={sessionId}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="soundfx" className="p-4 m-0 h-full">
            <SoundEffectsPanel
              sessionId={sessionId}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="music" className="p-4 m-0 h-full">
            <MusicGenerationPanel
              sessionId={sessionId}
              projectId={projectId}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

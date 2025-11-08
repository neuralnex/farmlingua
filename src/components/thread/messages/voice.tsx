import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceMessageProps {
  audioUrl: string;
  isUser?: boolean;
  duration?: number;
}

export function VoiceMessage({
  audioUrl,
  isUser = false,
  duration,
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      setIsPlaying(false);
      console.error("Error playing audio:", e);
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Preload the audio metadata
    audio.load();

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      // Clean up the audio element
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-2",
        isUser
          ? "bg-blue-500 text-white ml-auto max-w-xs"
          : "bg-gray-100 text-gray-900 mr-auto max-w-xs",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full",
          isUser
            ? "hover:bg-blue-600 text-white"
            : "hover:bg-gray-200 text-gray-900",
        )}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute top-0 left-0 h-full transition-all",
              isUser ? "bg-white" : "bg-blue-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      <Volume2 className="h-4 w-4 flex-shrink-0 opacity-70" />
    </div>
  );
}


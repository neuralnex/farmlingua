import { v4 as uuidv4 } from "uuid";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { AssistantMessageLoading } from "./messages/ai";
import {
  ArrowDown,
  LoaderCircle,
  Mic,
} from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { useVoiceRecording, type Language } from "@/hooks/use-voice-recording";
import { sendTextMessage, sendVoiceMessage } from "@/lib/voice-api";
import { VoiceMessage } from "./messages/voice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="h-4 w-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}


interface VoiceMessageData {
  id: string;
  type: "voice";
  isUser: boolean;
  audioUrl: string;
  timestamp: number;
}

interface TextMessageData {
  id: string;
  type: "text";
  isUser: boolean;
  content: string;
  timestamp: number;
}

export function Thread() {
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessageData[]>([]);
  const [textMessages, setTextMessages] = useState<TextMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const handleVoiceRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsProcessingVoice(true);
      
      // Create audio URL for user's voice message
      const userAudioUrl = URL.createObjectURL(audioBlob);
      const userVoiceMessage: VoiceMessageData = {
        id: uuidv4(),
        type: "voice",
        isUser: true,
        audioUrl: userAudioUrl,
        timestamp: Date.now(),
      };
      setVoiceMessages((prev) => [...prev, userVoiceMessage]);

      // Send voice message to API
      const response = await sendVoiceMessage(audioBlob, language);

      // If the API returns an audio URL, create a voice message; otherwise, use text
      if (response.audioUrl) {
        const aiVoiceMessage: VoiceMessageData = {
          id: uuidv4(),
          type: "voice",
          isUser: false,
          audioUrl: response.audioUrl,
          timestamp: Date.now(),
        };
        setVoiceMessages((prev) => [...prev, aiVoiceMessage]);
      } else {
        // If no audio URL, add as text message
        const aiTextMessage: TextMessageData = {
          id: uuidv4(),
          type: "text",
          isUser: false,
          content: response.text,
          timestamp: Date.now(),
        };
        setTextMessages((prev) => [...prev, aiTextMessage]);
      }
    } catch (error) {
      toast.error("Failed to send voice message", {
        description: error instanceof Error ? error.message : "Unknown error",
        richColors: true,
        closeButton: true,
      });
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const { isRecording, recordingTime, startRecording, stopRecording } =
    useVoiceRecording({
      onRecordingComplete: handleVoiceRecordingComplete,
      onError: (error) => {
        toast.error("Recording error", {
          description: error.message,
          richColors: true,
          closeButton: true,
        });
      },
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 || isLoading || isProcessingVoice) return;

    try {
      setIsLoading(true);

      // Add user message immediately
      const userMessage: TextMessageData = {
        id: uuidv4(),
        type: "text",
        isUser: true,
        content: input.trim(),
        timestamp: Date.now(),
      };
      setTextMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Send text message to /ask endpoint
      const responseText = await sendTextMessage(userMessage.content);

      // Add AI response
      const aiMessage: TextMessageData = {
        id: uuidv4(),
        type: "text",
        isUser: false,
        content: responseText,
        timestamp: Date.now(),
      };
      setTextMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Unknown error",
        richColors: true,
        closeButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <StickToBottom className="relative flex-1 overflow-hidden">
            <StickyToBottomContent
              className={cn(
                "absolute inset-0 overflow-y-scroll px-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
                "grid grid-rows-[1fr_auto]",
              )}
              contentClassName="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full"
              content={
                <>
                  {/* Render voice messages */}
                  {voiceMessages.map((voiceMsg) => (
                    <div
                      key={voiceMsg.id}
                      className={cn(
                        "flex",
                        voiceMsg.isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      <VoiceMessage
                        audioUrl={voiceMsg.audioUrl}
                        isUser={voiceMsg.isUser}
                      />
                    </div>
                  ))}
                  {/* Render text messages */}
                  {textMessages.map((textMsg) => (
                    <div
                      key={textMsg.id}
                      className={cn(
                        "flex",
                        textMsg.isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 max-w-xs",
                          textMsg.isUser
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{textMsg.content}</p>
                      </div>
                    </div>
                  ))}
                  {(isLoading || isProcessingVoice) && (
                    <AssistantMessageLoading />
                  )}
                </>
              }
              footer={
                <div className="sticky bottom-0 flex flex-col items-center gap-8 bg-white">
                  <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 mb-4 -translate-x-1/2" />

                  <div className="bg-muted relative z-10 mx-auto mb-8 w-full max-w-3xl rounded-2xl shadow-xs border border-solid">
                    <form
                      onSubmit={handleSubmit}
                      className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2"
                    >
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.metaKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            const el = e.target as HTMLElement | undefined;
                            const form = el?.closest("form");
                            form?.requestSubmit();
                          }
                        }}
                        placeholder="Type your message..."
                        className="field-sizing-content resize-none border-none bg-transparent p-3.5 pb-0 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none"
                      />

                      <div className="flex items-center gap-3 p-2 pt-4">
                        {/* Language Selector */}
                        <Select
                          value={language}
                          onValueChange={(value) => setLanguage(value as Language)}
                        >
                          <SelectTrigger className="w-24 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ig">Igbo</SelectItem>
                            <SelectItem value="yo">Yoruba</SelectItem>
                            <SelectItem value="ha">Hausa</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Voice Recording Button - Hold to Record */}
                        <Button
                          type="button"
                          variant={isRecording ? "destructive" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-9 w-9 rounded-full",
                            isRecording && "animate-pulse",
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!isRecording && !isProcessingVoice) {
                              startRecording();
                            }
                          }}
                          onMouseUp={(e) => {
                            e.preventDefault();
                            if (isRecording) {
                              stopRecording();
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isRecording) {
                              stopRecording();
                            }
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            if (!isRecording && !isProcessingVoice) {
                              startRecording();
                            }
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            if (isRecording) {
                              stopRecording();
                            }
                          }}
                          disabled={isProcessingVoice || isLoading}
                        >
                          <Mic className="h-5 w-5" />
                        </Button>
                        {isRecording && (
                          <span className="text-sm text-gray-600">
                            {recordingTime}s
                          </span>
                        )}

                        <div className="flex-1" />

                        {(isLoading || isProcessingVoice) ? (
                          <Button
                            key="stop"
                            onClick={() => {
                              setIsLoading(false);
                              setIsProcessingVoice(false);
                            }}
                            className="ml-auto"
                          >
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            className="ml-auto shadow-md transition-all"
                            disabled={
                              isLoading ||
                              isProcessingVoice ||
                              !input.trim()
                            }
                          >
                            Send
                          </Button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              }
            />
        </StickToBottom>
      </div>
    </div>
  );
}

# Audio Response Processing Overview

This document explains how the chat UI records a voice note, sends it to the FarmLingua voice endpoint, and plays back the assistant's audio reply in a WhatsApp-style conversation.

## Request Flow

1. **Hold to record** – The `useVoiceRecording` hook starts a `MediaRecorder` when the mic button is pressed and stops when it is released.
2. **Send to voice endpoint** – The recorded blob is posted to the Hugging Face Space:
   - Endpoint: `https://remostart-farmlingua-voice-system.hf.space/speak-ai`
   - Method: `POST`
   - Body: `multipart/form-data`
     - `audio_file`: the captured audio blob (sent as `recording.webm`)
     - `language`: one of `en`, `ig`, `yo`, or `ha`
3. **Receive binary audio** – The server returns an audio file (e.g., `audio/wav`). We convert it into a blob URL for immediate playback.

```ts
// src/lib/voice-api.ts
export async function sendVoiceMessage(
  audioFile: Blob,
  language: Language,
): Promise<{ text: string; audioUrl?: string; audioBlob?: Blob }> {
  const formData = new FormData();
  formData.append("audio_file", audioFile, "recording.webm");
  formData.append("language", language);

  const response = await fetch(`${API_BASE_URL}/speak-ai`, {
    method: "POST",
    body: formData,
  });

  const contentType = response.headers.get("content-type");

  if (contentType?.startsWith("audio/")) {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    return { text: "", audioUrl, audioBlob };
  }

  const result = await response.json();
  return { text: JSON.stringify(result) };
}
```

## Rendering WhatsApp-style Voice Bubbles

- Every message (text or voice) is pushed into a single `messages` array with a timestamp.
- The array is sorted chronologically so the UI mirrors a typical chat flow.
- Voice entries render with the `VoiceMessage` component, which wraps an `<audio>` element.

```tsx
// src/components/thread/index.tsx (excerpt)
setMessages((prev) =>
  [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp),
);
```

```tsx
// src/components/thread/messages/voice.tsx (excerpt)
const audio = new Audio(audioUrl);
audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
audio.addEventListener("loadedmetadata", () => setAudioDuration(audio.duration));
```

- Users can tap the play button to stream the assistant's reply immediately.
- Time labels and a progress bar mimic the WhatsApp experience.

## Error Handling

- If recording fails or playback throws an error (`MediaRecorder`, `Audio`), the app surfaces a toast notification.
- Network errors during upload or download also bubble up through toasts.

This flow keeps audio interactions lightweight, responsive, and familiar to users who are accustomed to WhatsApp voice notes.

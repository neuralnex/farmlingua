const API_BASE_URL = "https://remostart-farmlingua-voice-system.hf.space";

export type Language = "en" | "ig" | "yo" | "ha";

export async function sendTextMessage(query: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("query", query);

  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  // Extract only the answer field from the response
  if (typeof result === "object" && result !== null && "answer" in result) {
    return result.answer as string;
  }
  
  // Fallback for other response formats
  return typeof result === "string" ? result : JSON.stringify(result);
}

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

  if (!response.ok) {
    // Try to get error message, but handle case where response might be audio
    try {
      const error = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    } catch (jsonError) {
      // If JSON parsing fails, it might be because response is audio
      if (response.headers.get("content-type")?.startsWith("audio/")) {
        // This shouldn't happen if response.ok is false, but handle it anyway
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  const contentType = response.headers.get("content-type");
  
  // Check if response is binary audio (like audio/wav, audio/mpeg, etc.)
  if (contentType?.startsWith("audio/")) {
    // Download the audio file as a blob (like WhatsApp)
    const audioBlob = await response.blob();
    // Create a blob URL that can be used to play the audio
    const audioUrl = URL.createObjectURL(audioBlob);
    return { text: "", audioUrl, audioBlob };
  }

  // Fallback: try to parse as JSON (shouldn't happen based on API docs, but handle it)
  try {
    const result = await response.json();
    const responseText = typeof result === "string" ? result : JSON.stringify(result);
    
    // Check if the response contains an audio URL
    let audioUrl: string | undefined;
    if (responseText.startsWith("data:audio")) {
      audioUrl = responseText;
    } else if (responseText.startsWith("http://") || responseText.startsWith("https://")) {
      audioUrl = responseText;
    } else if (typeof result === "object" && result !== null) {
      // Check for common audio URL fields in JSON response
      audioUrl = (result as any).audio_url || (result as any).url || (result as any).audioUrl;
    }

    return { text: responseText, audioUrl };
  } catch {
    // If JSON parsing fails, return empty response
    return { text: "" };
  }
}


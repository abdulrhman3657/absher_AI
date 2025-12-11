// API utility for backend communication

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ChatRequest {
  user_id: string;
  message: string;
}

export interface ProposedAction {
  id: string;
  type: string;
  description: string;
  data: Record<string, any>;
}

export interface ChatResponse {
  reply: string;
  proposed_action?: ProposedAction;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  name: string;
}

export interface UploadMediaResponse {
  media_id: string;
  kind: string;
}

// Auto-login with demo user and return user_id
export async function autoLogin(): Promise<string> {
  // Check if we already have a user_id in localStorage
  const storedUserId = localStorage.getItem("absher_user_id");
  if (storedUserId) {
    return storedUserId;
  }

  // Auto-login with demo user
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "abdullah",
        password: "123456",
      }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data: LoginResponse = await response.json();
    localStorage.setItem("absher_user_id", data.user_id);
    localStorage.setItem("absher_user_name", data.name);
    return data.user_id;
  } catch (error) {
    console.error("Auto-login failed:", error);
    // Fallback: generate a temporary user_id (won't work with backend, but prevents crashes)
    const tempUserId = `temp-${Date.now()}`;
    localStorage.setItem("absher_user_id", tempUserId);
    return tempUserId;
  }
}

// Send chat message to backend
export async function sendChatMessage(
  user_id: string,
  message: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id,
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat request failed: ${errorText}`);
  }

  return response.json();
}

// Upload ID photo with background removal
export async function uploadIdPhoto(
  user_id: string,
  file: File
): Promise<UploadMediaResponse> {
  const formData = new FormData();
  formData.append("user_id", user_id);
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload/id-photo`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  return response.json();
}

// Get uploaded image URL
export function getUploadedImageUrl(filename: string): string {
  return `${API_BASE_URL}/uploads/${filename}`;
}

// Check backend health
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}


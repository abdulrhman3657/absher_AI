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

// Login with username and password
export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Login failed");
  }

  const data: LoginResponse = await response.json();
  localStorage.setItem("absher_user_id", data.user_id);
  localStorage.setItem("absher_user_name", data.name);
  return data;
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return !!localStorage.getItem("absher_user_id");
}

// Get current user info
export function getCurrentUser(): { user_id: string; name: string } | null {
  const user_id = localStorage.getItem("absher_user_id");
  const name = localStorage.getItem("absher_user_name");
  if (user_id && name) {
    return { user_id, name };
  }
  return null;
}

// Logout
export function logout(): void {
  localStorage.removeItem("absher_user_id");
  localStorage.removeItem("absher_user_name");
}

// Get user_id (for backward compatibility)
export function getUserId(): string | null {
  return localStorage.getItem("absher_user_id");
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


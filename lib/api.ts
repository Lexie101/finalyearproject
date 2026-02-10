const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || "API Request failed");
    } catch (e) {
      throw new Error(`API Request failed: ${response.statusText}`);
    }
  }

  return response.json();
}

export const api = {
  sendOtp: (email: string) =>
    apiRequest("/otp/send", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, otp: string) =>
    apiRequest("/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  updateLocation: (data: {
    bus_id?: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
  }) =>
    apiRequest("/location/update", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getLocations: () => apiRequest("/location/update", { method: "GET" }),
};

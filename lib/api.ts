const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    // Ensure cookies (session) are included and accepted by the browser
    credentials: 'include',
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      console.error(`[API Error] ${endpoint}: ${error.error || error.message}`, error);
      throw new Error(error.error || error.message || "API Request failed");
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("[API Error]")) {
        throw e;
      }
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

  driverLogin: (email: string, password: string) =>
    apiRequest("/auth/driver-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Super admin management functions (using admin-login endpoint)
  createDriver: (email: string, password: string, name: string, phone?: string) =>
    apiRequest("/admin/manage", {
      method: "POST",
      body: JSON.stringify({ action: "create", email, password, role: "driver", name, phone }),
    }),

  listDrivers: () =>
    apiRequest("/admin/manage", {
      method: "POST",
      body: JSON.stringify({ action: "list" }),
    }),

  deleteDriver: (email: string) =>
    apiRequest("/admin/manage", {
      method: "POST",
      body: JSON.stringify({ action: "delete", email }),
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

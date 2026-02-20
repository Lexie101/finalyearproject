import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
// Super Admin Dashboard Component - Unified Dashboard
import { Users, Plus, Trash2, LogOut, RefreshCw, Shield, Car, Bus, BarChart3, Settings, Search, MapPin, Navigation, Activity, Lock, X, MoreVertical, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { User } from "./AuthProvider";
import { createClient } from "@supabase/supabase-js";

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import("./MapComponent").then(mod => ({ default: mod.MapComponent })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-800 flex items-center justify-center">Loading map...</div>
});

// Lazy-load Supabase client to avoid blocking compilation
let supabaseClientInstance: ReturnType<typeof createClient> | null = null;
const getSupabaseClient = () => {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }
  return supabaseClientInstance;
};

interface BusData {
  id: string;
  lat: number;
  lng: number;
  busNumber: string;
  driverName: string;
  lastUpdate: string;
}

interface AdminUser {
  id: string;
  email: string;
  role: "driver" | "super_admin" | "super-admin";
  name: string;
  phone: string;
  created_at: string;
}

interface DashboardSuperAdminProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardSuperAdmin({ user, onLogout }: DashboardSuperAdminProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState("fleet");
  
  // Fleet & Drivers
  const [drivers, setDrivers] = useState<AdminUser[]>([]);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [liveBuses, setLiveBuses] = useState<BusData[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  
  // Forms
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  
  const [passwordForm, setPasswordForm] = useState({ 
    oldPassword: "", 
    newPassword: "", 
    confirmPassword: "" 
  });

  // Fetch Drivers and Bus Locations
  const fetchDrivers = async () => {
    try {
      console.log("[Dashboard] Fetching drivers...");
      const data = await api.listDrivers();
      console.log("[Dashboard] Drivers fetched:", data.drivers?.length || 0);
      setDrivers(data.drivers || []);
    } catch (error: unknown) {
      console.error("Failed to fetch drivers:", error);
      setDrivers([]);
      // Don't throw - allow dashboard to render even if drivers fail
      toast.error("Failed to load drivers list");
    }
  };

  const fetchLatest = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await getSupabaseClient()
        .from("bus-locations")
        .select("id,user_id,lat,lng,speed,heading,bus_id,created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      clearTimeout(timeout);

      if (error) {
        // Table might not exist yet - this is expected in development
        console.warn("[Dashboard] Bus locations table not available:", error.message);
        setLiveBuses([]);
        return;
      }

      if (!error && data) {
        const grouped = new Map<string, BusData>();
        const rows = data as any[];
        for (const row of rows) {
          const key = String(row.bus_id || row.user_id);
          if (!grouped.has(key)) {
            grouped.set(key, {
              id: key,
              lat: Number(row.lat || 0),
              lng: Number(row.lng || 0),
              busNumber: String(row.bus_id || key),
              driverName: String(row.user_id || "Unknown"),
              lastUpdate: String(row.created_at || ""),
            });
          }
        }
        setLiveBuses(Array.from(grouped.values()));
      }
    } catch (e) {
      console.error("Failed to fetch locations:", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and setup real-time subscriptions
  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;

    // Initialize data with error handling
    const initializeData = async () => {
      try {
        console.log("[Dashboard] Initializing dashboard data...");
        await Promise.all([fetchLatest(), fetchDrivers()]);
        console.log("[Dashboard] Dashboard data loaded successfully");
      } catch (e) {
        console.error("[Dashboard] Error during initialization:", e);
        // Continue anyway - allow dashboard to render with empty data
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeData();

    // Setup real-time subscription
    let channel: ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null = null;
    
    const setupRealtime = () => {
      try {
        const client = getSupabaseClient();
        channel = client
          .channel("realtime_locations")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "bus-locations",
            },
            (payload) => {
              if (!mounted) return;
              const row = payload.new as Record<string, unknown>;
              const key = String(row.bus_id || row.user_id);
              setLiveBuses((prev) => {
                const copy = prev.filter((b) => b.id !== key);
                copy.unshift({
                  id: key,
                  lat: Number(row.lat || 0),
                  lng: Number(row.lng || 0),
                  busNumber: String(row.bus_id || key),
                  driverName: String(row.user_id || "Unknown"),
                  lastUpdate: String(row.created_at || ""),
                });
                return copy.slice(0, 200);
              });
            }
          )
          .subscribe();
      } catch (e) {
        console.warn("Real-time subscription failed:", e);
      }
    };

    setTimeout(setupRealtime, 500);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (channel) {
        try {
          getSupabaseClient().removeChannel(channel);
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Driver Management Functions
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast.error("Email, password, and name are required");
      return;
    }

    setAddingUser(true);
    try {
      console.log("[Driver] Creating driver with:", {
        email: formData.email,
        password: formData.password ? `${formData.password.length} chars` : "MISSING",
        name: formData.name,
        phone: formData.phone,
      });
      
      await api.createDriver(
        formData.email,
        formData.password,
        formData.name,
        formData.phone
      );
      
      toast.success("Driver created successfully");
      setFormData({ email: "", password: "", name: "", phone: "" });
      setShowAddForm(false);
      await fetchDrivers();
    } catch (error: unknown) {
      console.error("Failed to create driver:", error);
      const message = error instanceof Error ? error.message : "Failed to create driver";
      toast.error(message);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteDriver = async (email: string) => {
    if (email === user.email) {
      toast.error("You cannot delete your own account");
      return;
    }

    if (confirm(`Are you sure you want to delete ${email}?`)) {
      try {
        await api.deleteDriver(email);
        toast.success("Driver deleted successfully");
        await fetchDrivers();
      } catch (error: unknown) {
        console.error("Failed to delete driver:", error);
        const message = error instanceof Error ? error.message : "Failed to delete driver";
        toast.error(message);
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Password changed successfully");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Error changing password");
      console.error(error);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="adminbg relative flex h-screen text-white overflow-hidden">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white text-sm">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <nav className="w-24 bg-white/5 border-r border-white/10 flex flex-col items-center py-8 gap-10">
        <img src="/logo%20(1).png" alt="CUZ Logo" className="w-12 h-12 object-cover rounded-lg shadow-lg" />

        <div className="flex flex-col gap-6">
          {[
            { id: "fleet", icon: Bus },
            { id: "map", icon: MapIcon },
            { id: "analytics", icon: BarChart3 },
            { id: "drivers", icon: Users },
            { id: "settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-4 rounded-2xl transition-all ${
                activeTab === item.id
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-white/40 hover:bg-white/10 hover:text-white"
              }`}
              title={item.id}
            >
              <item.icon size={24} />
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="mt-auto p-4 text-white/40 hover:text-red-400 transition-colors"
          title="Logout"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Super Admin Control Panel
            </h1>
            <p className="text-white/40">
              Managing Cavendish University Transportation System
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 w-64 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <button onClick={() => setShowAddForm(true)} className="bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20">
              <Plus size={18} /> Add Driver
            </button>
          </div>
        </header>

        {/* Fleet Tab */}
        {activeTab === "fleet" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Active Buses ({liveBuses.length})</h3>
              <div className="space-y-3">
                {liveBuses.length === 0 ? (
                  <p className="text-white/40">No active buses at the moment</p>
                ) : (
                  liveBuses.map((bus) => (
                    <div key={bus.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold">{bus.busNumber}</p>
                          <p className="text-white/60 text-sm">Driver: {bus.driverName}</p>
                          <p className="text-white/40 text-xs mt-1">Lat: {bus.lat.toFixed(4)}, Lng: {bus.lng.toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">Online</span>
                          <p className="text-white/40 text-xs mt-2">{new Date(bus.lastUpdate).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="flex-1 min-h-[500px]">
            <MapComponent buses={liveBuses} />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Active Buses", value: liveBuses.length.toString(), trend: "Real-time", icon: Bus },
                { label: "Online Drivers", value: liveBuses.length.toString(), trend: "Broadcasting", icon: Users },
                { label: "Avg Latitude", value: (liveBuses.length > 0 ? (liveBuses.reduce((a, b) => a + b.lat, 0) / liveBuses.length).toFixed(2) : "0"), trend: "Lusaka", icon: MapPin },
                { label: "Avg Longitude", value: (liveBuses.length > 0 ? (liveBuses.reduce((a, b) => a + b.lng, 0) / liveBuses.length).toFixed(2) : "0"), trend: "Lusaka", icon: Navigation },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-purple-600/20 p-2 rounded-lg text-purple-400">
                      <stat.icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-green-400">{stat.trend}</span>
                  </div>
                  <p className="text-white/40 text-xs font-bold uppercase">{stat.label}</p>
                  <p className="text-3xl font-black mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">System Health</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">Database Connection</span>
                    <span className="text-green-400 text-xs font-bold">Connected</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div></div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">Real-time Subscriptions</span>
                    <span className="text-green-400 text-xs font-bold">Active</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div></div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">API Response Time</span>
                    <span className="text-green-400 text-xs font-bold">&lt;500ms</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === "drivers" && (
          <div className="space-y-6">
            {showAddForm && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Add New Driver</h3>
                <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder="Email (firstname.lastname@cavendish.co.zm)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-3 rounded-xl font-semibold transition-all"
                  >
                    {addingUser ? "Creating..." : "Create Driver"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Drivers Management ({drivers.length})</h3>
                <button
                  onClick={fetchDrivers}
                  className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20 bg-white/5">
                      <th className="text-left py-4 px-6 text-white/70 font-semibold uppercase text-xs">Name</th>
                      <th className="text-left py-4 px-6 text-white/70 font-semibold uppercase text-xs">Email</th>
                      <th className="text-left py-4 px-6 text-white/70 font-semibold uppercase text-xs">Phone</th>
                      <th className="text-left py-4 px-6 text-white/70 font-semibold uppercase text-xs">Created</th>
                      <th className="text-right py-4 px-6 text-white/70 font-semibold uppercase text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-white/50">No drivers found</td>
                      </tr>
                    ) : (
                      drivers.map((driver) => (
                        <tr key={driver.id} className="border-b border-white/10 hover:bg-white/10 transition-all">
                          <td className="py-4 px-6 text-white font-medium">{driver.name}</td>
                          <td className="py-4 px-6 text-white/60 font-mono text-xs">{driver.email}</td>
                          <td className="py-4 px-6 text-white/60">{driver.phone || "—"}</td>
                          <td className="py-4 px-6 text-white/50 text-xs">
                            {new Date(driver.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {driver.email !== user.email && (
                              <button
                                onClick={() => handleDeleteDriver(driver.email)}
                                className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-all"
                                title="Delete driver"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-white/60 text-sm mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-6 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} /> {changingPassword ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6">System Settings</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-white/10">
                  <div>
                    <p className="text-white font-semibold">Bus Tracking Interval</p>
                    <p className="text-white/40 text-sm">How often buses broadcast their location</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue="5" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white w-24" />
                    <span className="text-white/40">seconds</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-4 border-b border-white/10">
                  <div>
                    <p className="text-white font-semibold">Max Route History</p>
                    <p className="text-white/40 text-sm">Keep location history for the last N hours</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue="24" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white w-24" />
                    <span className="text-white/40">hours</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-4">
                  <div>
                    <p className="text-white font-semibold">Enable Alerts</p>
                    <p className="text-white/40 text-sm">Notify staff of route deviations</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-6 h-6 rounded" title="Enable alerts" />
                </div>
              </div>
              
              <button className="mt-6 bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg font-bold transition-all">Save Settings</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

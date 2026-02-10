import React, { useState, useEffect } from "react";
import {
  Users,
  Bus,
  BarChart3,
  Settings,
  Plus,
  Search,
  MoreVertical,
  LogOut,
  Map as MapIcon,
  Activity,
  MapPin,
  Navigation,
  X,
  Trash2,
  Lock,
} from "lucide-react";
import { MapComponent } from "./MapComponent";
import { User } from "./AuthProvider";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  role: string;
  name: string;
  phone?: string;
  created_at?: string;
}

interface DashboardAdminProps {
  user: User;
  onLogout: () => void;
}

const bgStyle = {
  backgroundImage:
    "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
};

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

export default function DashboardAdmin({ user, onLogout }: DashboardAdminProps) {
  const [activeTab, setActiveTab] = useState("fleet");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [buses, setBuses] = useState<BusData[]>([
    {
      id: "1",
      lat: -15.4214,
      lng: 28.2871,
      busNumber: "CU-01",
      driverName: "John Phiri",
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "2",
      lat: -15.435,
      lng: 28.3,
      busNumber: "CU-02",
      driverName: "Alice Banda",
      lastUpdate: new Date().toISOString(),
    },
  ]);

  const [liveBuses, setLiveBuses] = useState<BusData[]>(buses);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", phone: "", role: "driver" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;

    async function fetchAdmins() {
      try {
        const response = await fetch("/api/admin/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list" }),
        });
        const data = await response.json();
        if (mounted && data.admins) {
          setAdmins(data.admins);
        }
      } catch (error) {
        console.error("Failed to fetch admins:", error);
      }
    }

    async function fetchLatest() {
      try {
        // Add 5 second timeout to prevent hanging
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 5000);

        const { data, error } = await getSupabaseClient()
          .from("locations")
          .select("id,user_id,lat,lng,speed,heading,bus_id,created_at")
          .order("created_at", { ascending: false })
          .limit(200);

        clearTimeout(timeout);

        if (!error && data && mounted) {
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
        if (mounted) setLoading(false);
      }
    }

    fetchLatest();
    fetchAdmins();

    // Optional: Setup real-time subscription after initial load
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
              table: "locations",
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

    // Defer real-time setup to not block initial render
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setAddingUser(true);
    try {
      const response = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: formData.email,
          password: formData.password,
          role: formData.role,
          name: formData.name,
          phone: formData.phone || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`${formData.role} created successfully`);
        setFormData({ email: "", password: "", name: "", phone: "", role: "driver" });
        setShowAddModal(false);
        
        // Refresh admin list
        const listResponse = await fetch("/api/admin/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list" }),
        });
        const listData = await listResponse.json();
        if (listData.admins) setAdmins(listData.admins);
      } else {
        toast.error(data.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("Error creating user");
      console.error(error);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    
    try {
      const response = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", email }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("User deleted successfully");
        setAdmins(admins.filter((a) => a.email !== email));
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Error deleting user");
      console.error(error);
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
    <div className="relative flex h-screen text-white overflow-hidden" style={bgStyle}>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white text-sm">Loading admin dashboard...</p>
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
            { id: "users", icon: Users },
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
            >
              <item.icon size={24} />
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="mt-auto p-4 text-white/40 hover:text-red-400 transition-colors"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              System Administration
            </h1>
            <p className="text-white/40">
              Managing Cavendish University Transportation Fleet
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
            <button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20">
              <Plus size={18} /> Add New
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
                { label: "Avg Lat", value: (liveBuses.length > 0 ? (liveBuses.reduce((a, b) => a + b.lat, 0) / liveBuses.length).toFixed(2) : "0"), trend: "Lusaka", icon: MapPin },
                { label: "Avg Lng", value: (liveBuses.length > 0 ? (liveBuses.reduce((a, b) => a + b.lng, 0) / liveBuses.length).toFixed(2) : "0"), trend: "Lusaka", icon: Navigation },
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

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">System Users ({admins.length})</h3>
                <button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Plus size={16} /> Add User
                </button>
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {admins.length === 0 ? (
                  <p className="text-white/40">No admins or drivers yet</p>
                ) : (
                  admins.map((admin) => (
                    <div key={admin.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-start hover:bg-white/10 transition-all">
                      <div className="flex-1">
                        <p className="text-white font-bold">{admin.name}</p>
                        <p className="text-white/60 text-sm">{admin.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            admin.role === "admin"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {admin.role}
                          </span>
                          {admin.phone && <span className="text-white/40 text-xs">{admin.phone}</span>}
                        </div>
                      </div>
                      {user.email !== admin.email && (
                        <button
                          onClick={() => handleDeleteUser(admin.email)}
                          className="text-red-400 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))
                )}
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
                  <input type="number" defaultValue="5" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white w-24" /> <span className="text-white/40 ml-2">seconds</span>
                </div>
                
                <div className="flex justify-between items-center py-4 border-b border-white/10">
                  <div>
                    <p className="text-white font-semibold">Max Route History</p>
                    <p className="text-white/40 text-sm">Keep location history for the last N hours</p>
                  </div>
                  <input type="number" defaultValue="24" className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white w-24" /> <span className="text-white/40 ml-2">hours</span>
                </div>

                <div className="flex justify-between items-center py-4">
                  <div>
                    <p className="text-white font-semibold">Enable Alerts</p>
                    <p className="text-white/40 text-sm">Notify admins of route deviations</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-6 h-6 rounded" />
                </div>
              </div>
              
              <button className="mt-6 bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg font-bold transition-all">Save Settings</button>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0c29] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New {formData.role === "admin" ? "Admin" : "Driver"}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., John Phiri"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., john@cavendish.co.zm"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="driver" className="bg-[#0f0c29]">Driver</option>
                  <option value="admin" className="bg-[#0f0c29]">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  {addingUser ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// Component refresh

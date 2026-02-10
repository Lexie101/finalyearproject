import React, { useState, useEffect } from "react";
// Super Admin Dashboard Component
import { Users, Plus, Trash2, LogOut, RefreshCw, Shield, Car } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { User } from "./AuthProvider";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "driver" | "super_admin";
  name: string;
  phone: string;
  created_at: string;
}

interface DashboardSuperAdminProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardSuperAdmin({ user, onLogout }: DashboardSuperAdminProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin" as "admin" | "driver",
    name: "",
    phone: "",
  });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.listAdmins();
      setAdmins(data.admins);
    } catch (error: unknown) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to load admins list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast.error("Email, password, and name are required");
      return;
    }

    try {
      await api.createAdmin(
        formData.email,
        formData.password,
        formData.role,
        formData.name,
        formData.phone
      );
      toast.success(`${formData.role} created successfully`);
      setFormData({ email: "", password: "", role: "admin", name: "", phone: "" });
      setShowAddForm(false);
      await fetchAdmins();
    } catch (error: unknown) {
      console.error("Failed to create admin:", error);
      const message = error instanceof Error ? error.message : "Failed to create admin";
      toast.error(message);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (email === user.email) {
      toast.error("You cannot delete your own account");
      return;
    }

    if (confirm(`Are you sure you want to delete ${email}?`)) {
      try {
        await api.deleteAdmin(email);
        toast.success("Admin deleted successfully");
        await fetchAdmins();
      } catch (error: unknown) {
        console.error("Failed to delete admin:", error);
        const message = error instanceof Error ? error.message : "Failed to delete admin";
        toast.error(message);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0c29]">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 p-2 rounded-lg">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold leading-none">Super Admin Panel</h1>
            <p className="text-white/40 text-xs">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
        >
          <LogOut size={18} /> Exit
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Add New Admin Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={24} /> Manage Staff
              </h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <Plus size={18} /> Add New
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
                <input
                  type="email"
                  placeholder="Email (firstname.lastname@cavendish.co.zm)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "driver" })}
                  className="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="admin">Admin</option>
                  <option value="driver">Driver</option>
                </select>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  Create
                </button>
              </form>
            )}
          </motion.div>

          {/* Admins & Drivers List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Staff Directory</h2>
              <button
                onClick={fetchAdmins}
                className="text-white/60 hover:text-white transition-colors"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {loading ? (
              <div className="text-center text-white/40 py-8">Loading...</div>
            ) : admins.length === 0 ? (
              <div className="text-center text-white/40 py-8">No admins found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-white/60 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-white/60 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 text-white/60 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 text-white/60 font-semibold">Created</th>
                      <th className="text-right py-3 px-4 text-white/60 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 px-4 text-white">{admin.name}</td>
                        <td className="py-3 px-4 text-white/60">{admin.email}</td>
                        <td className="py-3 px-4 text-white/60">{admin.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              admin.role === "super_admin"
                                ? "bg-amber-500/20 text-amber-400"
                                : admin.role === "admin"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {admin.role === "super_admin" && <Shield className="inline mr-1" size={12} />}
                            {admin.role === "driver" && <Car className="inline mr-1" size={12} />}
                            {admin.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/40 text-xs">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {admin.email !== user.email && (
                            <button
                              onClick={() => handleDeleteAdmin(admin.email)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

"use client";

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
} from "lucide-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import supabaseClient from "@/lib/supabaseClient";
const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });
import LogoutButton from "./LogoutButton";
import { User } from "./AuthProvider";

interface DashboardAdminProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardAdmin({ user, onLogout }: DashboardAdminProps) {
  const [activeTab, setActiveTab] = useState("fleet");

  const bgStyle = {
    backgroundImage: "url('/adminbg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  const [buses] = useState([
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

  // Override initial buses with live data from Supabase (locations table)
  const [liveBuses, setLiveBuses] = useState(buses);

  useEffect(() => {
    let mounted = true;

    async function fetchLatest() {
      try {
        const { data, error } = await supabaseClient
          .from("locations")
          .select("id,user_id,lat,lng,speed,heading,bus_id,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!error && data && mounted) {
          // map to bus entries grouped by bus_id (take latest per bus)
          const grouped = new Map();
          for (const row of data) {
            const key = row.bus_id || row.user_id;
            if (!grouped.has(key)) {
              grouped.set(key, {
                id: key,
                lat: row.lat,
                lng: row.lng,
                busNumber: row.bus_id || key,
                driverName: row.user_id,
                lastUpdate: row.created_at,
              });
            }
          }
          setLiveBuses(Array.from(grouped.values()));
        }
      } catch (e) {
        console.error("Failed to fetch locations:", e);
      }
    }

    fetchLatest();

    const channel = supabaseClient
      .channel("realtime_locations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "locations" }, (payload) => {
        const row = payload.new;
        const key = row.bus_id || row.user_id;
        setLiveBuses((prev) => {
          const copy = prev.filter((b) => b.id !== key);
          copy.unshift({ id: key, lat: row.lat, lng: row.lng, busNumber: row.bus_id || key, driverName: row.user_id, lastUpdate: row.created_at });
          return copy.slice(0, 200);
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      try { supabaseClient.removeChannel(channel); } catch (e) {}
    };
  }, []);

  return (
    <div className="flex h-screen text-white overflow-hidden" style={bgStyle}>
      {/* Sidebar Navigation */}
      <nav className="w-24 bg-white/5 border-r border-white/10 flex flex-col items-center py-8 gap-10">
        <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-600/30">
          <Bus size={32} />
        </div>

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
            <button className="bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20">
              <Plus size={18} /> Add New
            </button>
          </div>
        </header>

        {activeTab === "map" ? (
          <div className="flex-1 min-h-[500px]">
            <MapComponent buses={buses} />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Quick Stats */}
            <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  label: "Active Buses",
                  value: "12",
                  trend: "+2 this week",
                  icon: Bus,
                },
                {
                  label: "Total Students",
                  value: "2,400",
                  trend: "+12% growth",
                  icon: Users,
                },
                {
                  label: "Avg Speed",
                  value: "34 km/h",
                  trend: "Within limits",
                  icon: Activity,
                },
                {
                  label: "System Uptime",
                  value: "99.9%",
                  trend: "Stable",
                  icon: Activity,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-purple-600/20 p-2 rounded-lg text-purple-400">
                      <stat.icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs font-bold uppercase">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Main Data Table */}
            <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Fleet Status</h3>
                <button className="text-white/40 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-4 text-white/30 text-xs font-bold uppercase tracking-widest px-4">
                  <span>Bus ID</span>
                  <span>Driver</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="grid grid-cols-4 items-center bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-purple-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                        {bus.busNumber.split("-")[1]}
                      </div>
                      <span className="font-bold">{bus.busNumber}</span>
                    </div>
                    <span className="text-white/60 text-sm">{bus.driverName}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-xs text-green-400 font-bold uppercase">
                        Online
                      </span>
                    </div>
                    <div className="text-right">
                      <button className="text-white/40 hover:text-white p-2">
                        <Settings size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Alerts */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
              <h3 className="text-xl font-bold mb-8">System Notifications</h3>
              <div className="space-y-6">
                {[
                  {
                    title: "Bus CU-03 Maintenance",
                    time: "2h ago",
                    type: "warning",
                  },
                  {
                    title: "Driver John clocked in",
                    time: "3h ago",
                    type: "info",
                  },
                  {
                    title: "OTP System Alert",
                    time: "5h ago",
                    type: "error",
                  },
                  {
                    title: "New route added",
                    time: "1d ago",
                    type: "success",
                  },
                ].map((alert, i) => (
                  <div key={i} className="flex gap-4 group cursor-pointer">
                    <div
                      className={`w-1 h-12 rounded-full transition-all group-hover:w-2 ${
                        alert.type === "warning"
                          ? "bg-orange-500"
                          : alert.type === "error"
                            ? "bg-red-500"
                            : alert.type === "success"
                              ? "bg-green-500"
                              : "bg-blue-500"
                      }`}
                    ></div>
                    <div>
                      <h4 className="font-bold text-sm">{alert.title}</h4>
                      <p className="text-white/30 text-xs">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

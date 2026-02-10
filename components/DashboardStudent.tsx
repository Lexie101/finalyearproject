"use client";

import React, { useState } from "react";
import { MapComponent } from "./MapComponent";
import { Clock, MapPin, AlertCircle, Bell } from "lucide-react";
import LogoutButton from "./LogoutButton";
import { User } from "./AuthProvider";

interface DashboardStudentProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardStudent({ user, onLogout }: DashboardStudentProps) {
  const [upcoming] = useState([
    { id: "1", bus: "CU-01", arrival: "5 mins", route: "South Campus", passengers: "34/50" },
    { id: "2", bus: "CU-03", arrival: "12 mins", route: "Main Gate", passengers: "28/50" },
  ]);

  return (
    <div className="min-h-screen bg-[#0f0c29] text-white">
      {/* Header */}
      <header className="bg-white/5 border-b border-white/10 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bus Tracker</h1>
          <p className="text-white/40 text-sm mt-1">Real-time tracking for your commute</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
            <Bell size={20} />
          </button>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
        {/* Map */}
        <div className="lg:col-span-2 h-[500px] rounded-2xl overflow-hidden border border-purple-500/20">
          <MapComponent buses={[{ id: "1", lat: -15.4214, lng: 28.2871, busNumber: "CU-01", driverName: "John", lastUpdate: new Date().toISOString() }]} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Upcoming Buses */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Arriving Soon</h3>
            <div className="space-y-3">
              {upcoming.map((bus) => (
                <div key={bus.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                  <p className="font-bold text-purple-400">{bus.bus}</p>
                  <p className="text-sm text-white/60 mt-1">{bus.route}</p>
                  <div className="flex justify-between items-center mt-3 text-xs">
                    <span className="text-green-400 font-bold">↓ {bus.arrival}</span>
                    <span className="text-white/40">{bus.passengers}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/60 text-xs font-bold uppercase">Your Location</p>
              <p className="text-sm mt-1">
                <MapPin size={14} className="inline mr-2" />
                Engineering Block
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/60 text-xs font-bold uppercase">Last Updated</p>
              <p className="text-sm mt-1">
                <Clock size={14} className="inline mr-2" />
                Just now
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { MapComponent } from './MapComponent';
import { Bus, MapPin, Clock, Search, Bell, LogOut, Navigation } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStudentProps {
  user: { email: string };
  onLogout: () => void;
}

export const DashboardStudent: React.FC<DashboardStudentProps> = ({ user, onLogout }) => {
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const data = await api.getLocations();
      
      if (Array.isArray(data)) {
        const formattedBuses = data.map((loc: any) => ({
          id: loc.bus_id,
          lat: loc.latitude,
          lng: loc.longitude,
          busNumber: loc.bus_id.replace('bus-', '').toUpperCase(),
          driverName: 'Live Driver', // In a real app, fetch this from profile
          lastUpdate: loc.updated_at,
          speed: loc.speed
        }));
        setBuses(formattedBuses);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0f0c29]">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Bus className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold leading-none">CU Bus Tracker</h1>
            <p className="text-white/40 text-xs">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-white/60 hover:text-white relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
          >
            <LogOut size={18} /> Exit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Info */}
        <aside className="w-80 bg-white/5 border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Search route or bus..."
              className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider">Active Buses</h3>
            {buses.map((bus) => (
              <div key={bus.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md text-xs font-bold">
                      {bus.busNumber}
                    </span>
                    <span className="text-white font-medium text-sm">{bus.driverName}</span>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <MapPin size={12} /> 
                    <span>Main Campus → Town Center</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Clock size={12} /> 
                    <span>Last seen 2 mins ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 bg-purple-600/20 border border-purple-500/30 rounded-2xl">
            <p className="text-purple-200 text-xs leading-relaxed">
              <strong>Tip:</strong> You can click on bus icons on the map to see specific arrival estimates.
            </p>
          </div>
        </aside>

        {/* Map View */}
        <section className="flex-1 relative p-4">
          <MapComponent buses={buses} />
          
          {/* Quick Actions overlay */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-20">
            <button className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full text-white font-semibold text-sm hover:bg-white/20 transition-all flex items-center gap-2">
              <Navigation size={18} /> Show Near Me
            </button>
            <button className="bg-purple-600 border border-purple-400 px-6 py-3 rounded-full text-white font-semibold text-sm hover:bg-purple-500 shadow-lg shadow-purple-600/40 transition-all">
              Refresh Map
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

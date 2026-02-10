import React, { useState, useEffect } from 'react';
import { MapComponent } from './MapComponent';
import { Bus, MapPin, Clock, Search, Bell, LogOut, Navigation } from 'lucide-react';
import { api } from '@/lib/api';

interface BusLocation {
  id: string;
  lat: number;
  lng: number;
  busNumber: string;
  driverName: string;
  lastUpdate: string;
  speed: number;
}

interface DashboardStudentProps {
  user: { email: string };
  onLogout: () => void;
}

export default function DashboardStudent({ user, onLogout }: DashboardStudentProps) {
  const [buses, setBuses] = useState<BusLocation[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await api.getLocations();
        
        if (Array.isArray(data)) {
          const formattedBuses = data.map((loc: Record<string, unknown>) => ({
            id: String(loc.bus_id),
            lat: Number(loc.lat || loc.latitude),
            lng: Number(loc.lng || loc.longitude),
            busNumber: String(loc.bus_id).replace('bus-', '').toUpperCase(),
            driverName: 'Live Driver',
            lastUpdate: String(loc.created_at || loc.updated_at),
            speed: Number(loc.speed) || 0
          }));
          setBuses(formattedBuses);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0f0c29]">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo%20(1).png" alt="Cavendish Logo" className="w-10 h-10 object-cover rounded-lg" />
          <div>
            <h1 className="text-white font-bold leading-none">CUZ Bus Tracking System</h1>
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
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider">Active Buses & Actions</h3>
            
            {/* Quick Actions Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-xl text-white font-semibold text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <Navigation size={16} /> Show Near
              </button>
              <button className="bg-purple-600 border border-purple-400 px-4 py-3 rounded-xl text-white font-semibold text-xs hover:bg-purple-500 shadow-lg shadow-purple-600/40 transition-all">
                Refresh
              </button>
            </div>

            {/* Active Buses */}
            <div className="space-y-3">
              {buses.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-white/40 text-sm">
                  Loading buses...
                </div>
              ) : (
                buses.map((bus) => (
                  <div key={bus.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
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
                ))
              )}
            </div>
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
        </section>
      </main>
    </div>
  );
}

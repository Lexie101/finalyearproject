"use client";

import React, { useState, useEffect } from "react";
import { MapComponent } from "./MapComponent";
import { Bus, MapPin, Power, Users, AlertTriangle, LogOut, CheckCircle2, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import LogoutButton from "./LogoutButton";
import { User } from "./AuthProvider";

interface DashboardDriverProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardDriver({
  user,
  onLogout,
}: DashboardDriverProps) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [location, setLocation] = useState<[number, number]>([-15.4214, 28.2871]);
  const [stats, setStats] = useState({
    speed: 0,
    heading: "North",
    passengers: 12,
  });

  const bgStyle = {
    backgroundImage: "url('/driverbg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  const toggleBroadcast = () => {
    if (!isBroadcasting) {
      toast.success("Live GPS broadcasting started");
      setIsBroadcasting(true);
    } else {
      toast.info("GPS broadcasting stopped");
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    let watchId: number;

    if (isBroadcasting && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, speed, heading } = position.coords;
          setLocation([latitude, longitude]);
          const currentSpeed = speed ? Math.round(speed * 3.6) : 0; // m/s to km/h
          
          setStats((prev) => ({
            ...prev,
            speed: currentSpeed,
            heading: heading ? `${Math.round(heading)}°` : "N/A",
          }));

          // Send location to backend
          // send with retry/backoff
          const postWithRetry = async (url: string, body: any, retries = 3, backoff = 500) => {
            for (let attempt = 0; attempt <= retries; attempt++) {
              try {
                const res = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return await res.json();
              } catch (err) {
                if (attempt === retries) throw err;
                await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
              }
            }
          };

          try {
            await postWithRetry("/api/location/update", {
              latitude,
              longitude,
              speed: currentSpeed,
              heading: heading || 0,
              busId: "CU-01",
            }, 3, 500);
          } catch (error) {
            console.error("Failed to update location after retries:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Location access denied");
          setIsBroadcasting(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isBroadcasting]);

  return (
    <div className="flex h-screen text-white overflow-hidden" style={bgStyle}>
      {/* Header */}
      <header className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isBroadcasting ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-white/10"}`}>
            <Bus className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Driver Terminal</h1>
            <p className="text-white/40 text-xs">Bus: CU-01 | Driver: {user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Status */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            className={`rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center gap-8 border transition-all duration-700 ${
              isBroadcasting 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-white/5 border-white/10"
            } backdrop-blur-2xl`}
          >
            <button 
              onClick={toggleBroadcast}
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500 shadow-2xl ${
                isBroadcasting 
                  ? "bg-green-500 text-white scale-110" 
                  : "bg-white/10 text-white/40 hover:bg-white/20"
              }`}
            >
              <Power size={48} />
              <span className="font-bold text-sm">{isBroadcasting ? "STOP" : "START"}</span>
            </button>

            <div>
              <h2 className="text-4xl font-black mb-2">{isBroadcasting ? "LIVE BROADCASTING" : "OFFLINE"}</h2>
              <p className="text-white/60">{isBroadcasting ? "Location being shared with students." : "Start your trip to begin sharing location."}</p>
            </div>
          </motion.div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Speed", value: `${stats.speed} km/h`, icon: Navigation, color: "text-blue-400" },
              { label: "Passengers", value: stats.passengers, icon: Users, color: "text-purple-400" },
              { label: "Heading", value: stats.heading, icon: MapPin, color: "text-orange-400" },
            ].map((metric, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <metric.icon className={`${metric.color} mb-4`} size={24} />
                <p className="text-white/40 text-xs font-bold uppercase mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 size={20} /> Pre-Trip Checklist
            </h3>
            <div className="space-y-4">
              {["Fuel Level", "Safety", "Radio", "Cleaned"].map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-white/60">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-[2rem] hover:bg-red-500/20 transition-all">
            <AlertTriangle size={32} className="mx-auto mb-2" />
            <span className="font-bold block">EMERGENCY ALERT</span>
          </button>
        </div>
      </main>
    </div>
  );
}

  const toggleBroadcast = () => {
    if (!isBroadcasting) {
      toast.success('Live GPS broadcasting started');
      setIsBroadcasting(true);
    } else {
      toast.info('GPS broadcasting stopped');
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    let watchId: number;
    
    if (isBroadcasting) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude, speed } = position.coords;
            const currentSpeed = speed ? Math.round(speed * 3.6) : 0; // m/s to km/h
            
            setStats(prev => ({ ...prev, speed: currentSpeed }));

            try {
              await api.updateLocation({
                bus_id: `bus-${user.email.split('@')[0]}`,
                latitude,
                longitude,
                speed: currentSpeed
              });
            } catch (err) {
              console.error('Failed to send location:', err);
            }
          },
          (err) => {
            console.error('Geolocation error:', err);
            toast.error('Location access denied or unavailable');
            setIsBroadcasting(false);
          },
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      } else {
        toast.error('Geolocation not supported');
        setIsBroadcasting(false);
      }
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isBroadcasting, user.email]);

  return (
    <div className="min-h-screen bg-[#0f0c29] text-white">
      {/* Header */}
      <header className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${isBroadcasting ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-white/10'}`}>
            <Bus className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Driver Terminal</h1>
            <p className="text-white/40 text-xs">Bus: CU-01 | Driver: {user.email.split('@')[0]}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all"
        >
          <LogOut className="text-white/60" size={20} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Status Card */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            className={`rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center gap-8 border transition-all duration-700 ${
              isBroadcasting 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-white/5 border-white/10'
            } backdrop-blur-2xl`}
          >
            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${isBroadcasting ? 'bg-green-500/20' : 'bg-transparent'}`}></div>
              <button 
                onClick={toggleBroadcast}
                className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500 shadow-2xl ${
                  isBroadcasting 
                    ? 'bg-green-500 text-white scale-110' 
                    : 'bg-white/10 text-white/40 hover:bg-white/20'
                }`}
              >
                <Power size={48} />
                <span className="font-bold text-sm">{isBroadcasting ? 'STOP' : 'START'}</span>
              </button>
            </div>

            <div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">
                {isBroadcasting ? 'LIVE BROADCASTING' : 'OFFLINE'}
              </h2>
              <p className="text-white/60">
                {isBroadcasting 
                  ? 'Your location is currently being shared with students.' 
                  : 'Start your trip to begin sharing location.'}
              </p>
            </div>

            {isBroadcasting && (
              <div className="flex gap-4">
                <span className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Real-time GPS Active
                </span>
              </div>
            )}
          </motion.div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Speed', value: `${stats.speed} km/h`, icon: Navigation, color: 'text-blue-400' },
              { label: 'Passengers', value: stats.passengers, icon: Users, color: 'text-purple-400' },
              { label: 'Next Stop', value: 'Main Gate', icon: MapPin, color: 'text-orange-400' },
            ].map((metric, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <metric.icon className={`${metric.color} mb-4`} size={24} />
                <p className="text-white/40 text-xs font-bold uppercase mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-purple-400" /> Pre-Trip Checklist
            </h3>
            <div className="space-y-4">
              {['Fuel Level Checked', 'Safety Gear Present', 'Radio Functioning', 'Vehicle Cleaned'].map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-6 h-6 rounded-lg border-2 border-white/20 flex items-center justify-center group-hover:border-purple-500 transition-colors">
                    <div className="w-3 h-3 rounded-sm bg-purple-500 opacity-0 group-has-[:checked]:opacity-100 transition-opacity"></div>
                  </div>
                  <input type="checkbox" className="hidden" />
                  <span className="text-white/60 group-has-[:checked]:text-white transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-red-500/20 transition-all">
            <AlertTriangle size={32} />
            <span className="font-bold">EMERGENCY ALERT</span>
            <span className="text-xs opacity-60">Notifies admin immediately</span>
          </button>
        </div>
      </main>
    </div>
  );
};

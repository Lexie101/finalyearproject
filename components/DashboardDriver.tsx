"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Power,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
    distance: 0,
    startTime: new Date(),
  });
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [preTripChecks, setPreTripChecks] = useState<Record<string, boolean>>({
    "Fuel Level": false,
    "Safety": false,
    "Radio": false,
    "Cleaned": false,
  });

  const togglePreTrip = (key: string) => {
    setPreTripChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
          }));

          // Calculate distance (simple approximation)
          const dy = latitude - location[0];
          const dx = longitude - location[1];
          const distance = Math.sqrt(dy * dy + dx * dx) * 111; // rough km conversion
          setStats((prev) => ({
            ...prev,
            distance: prev.distance + Math.max(0, distance),
          }));

          // Send location to backend with retry/backoff
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
              busId: "CUZ-01",
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
          <div className={`p-2 rounded-2xl transition-all duration-500 ${isBroadcasting ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-white/10"}`}>
            <img src="/logo%20(1).png" alt="CUZ Logo" className="w-10 h-10 object-cover rounded-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Driver Terminal</h1>
            <p className="text-white/40 text-xs">Bus: CUZ-01 | Driver: {user.email.split('@')[0]}</p>
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
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "Speed", value: `${stats.speed} km/h`, icon: Navigation, color: "text-blue-400" },
              { label: "Distance Traveled", value: `${stats.distance.toFixed(2)} km`, icon: MapPin, color: "text-orange-400" },
            ].map((metric, i) => (
              <div key={i} className="bg-gray-700/50 text-white border border-white/10 rounded-3xl p-6">
                <metric.icon className={`${metric.color} mb-4`} size={24} />
                <p className="text-white/80 text-xs font-bold uppercase mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>

          {/* (Pre-Trip moved back to sidebar) */}
        </div>

        {/* Sidebar: Pre-Trip checklist (moved back here) + Emergency button */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} /> Pre-Trip Checklist
            </h4>
            <div className="space-y-3">
              {Object.keys(preTripChecks).map((k) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!preTripChecks[k]}
                    onChange={() => togglePreTrip(k)}
                    className="w-5 h-5"
                  />
                  <span className="text-white/60">{k}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-full flex items-start">
            <button 
              onClick={async () => {
                try {
                  const response = await fetch("/api/emergency", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      driverEmail: user.email,
                      busId: "CUZ-01",
                      location: { latitude: location[0], longitude: location[1] },
                    }),
                  });
                  if (!response.ok) throw new Error("Failed to send emergency alert");
                  setEmergencyActive(true);
                  toast.error("🚨 Emergency Alert Sent to Admin", { duration: 5000 });
                  setTimeout(() => setEmergencyActive(false), 5000);
                } catch (err) {
                  toast.error("Failed to send emergency alert");
                  console.error("Emergency alert error:", err);
                }
              }}
              className={`w-full p-6 rounded-[2rem] transition-all font-bold block ${
                emergencyActive 
                  ? "bg-red-500 text-white border border-red-500" 
                  : "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
              }`}
            >
              <AlertTriangle size={32} className="mx-auto mb-2" />
              <span>{emergencyActive ? "ALERT SENT" : "EMERGENCY ALERT"}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

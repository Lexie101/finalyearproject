'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Navigation } from 'lucide-react';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: String(icon),
  shadowUrl: String(iconShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Bus Icon
const busIcon = L.divIcon({
  html: `<div class="bg-purple-600 p-2 rounded-full border-2 border-white shadow-lg text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>
        </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface BusLocation {
  id: string;
  lat: number;
  lng: number;
  busNumber: string;
  driverName: string;
  lastUpdate: string;
}

interface MapProps {
  buses: BusLocation[];
  center?: [number, number];
  interactive?: boolean;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export const MapComponent: React.FC<MapProps> = ({ buses, center = [-15.4214, 28.2871], interactive = true }) => {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={interactive}
        className="w-full h-full"
        style={{ background: '#1a1a2e' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        {buses.map((bus) => (
          <Marker 
            key={bus.id} 
            position={[bus.lat, bus.lng]} 
            icon={busIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2">
                <h3 className="font-bold text-purple-900">Bus {bus.busNumber}</h3>
                <p className="text-sm">Driver: {bus.driverName}</p>
                <p className="text-xs text-gray-500">Last updated: {new Date(bus.lastUpdate).toLocaleTimeString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <RecenterMap center={center} />
      </MapContainer>
    </div>
  );
};

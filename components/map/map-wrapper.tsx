"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(() => import("./map-container"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <p className="text-gray-500">Chargement de la carte...</p>
    </div>
  ),
});

export default function MapWrapper() {
  return <MapContainer />;
}

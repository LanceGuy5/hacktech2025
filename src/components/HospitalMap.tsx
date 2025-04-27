"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { getLocation } from "../utils/utils";
import { MoveRight } from "lucide-react";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "0.5rem",
};

const libraries: any = ["places"];

function HospitalMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);

  const [userLoc, setUserLoc] = useState({ lat: 0, lng: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: libraries,
  });

  const getLocations = async () => {
    setIsLoading(true);
    try {
      const { latitude, longitude, error } = await getLocation();
      if (error) throw new Error("Unable to get location");

      setUserLoc({ lat: latitude, lng: longitude });

      const response = await fetch(`/api/getNearbyHospitals?lat=${latitude}&lng=${longitude}`);
      if (!response.ok) throw new Error("Error fetching hospitals");

      let data = await response.json();
      data = data.map((hospital: any, index: number) => ({
        id: index,
        name: hospital.displayName.text,
        position: { lat: hospital.location.latitude, lng: hospital.location.longitude },
        status: hospital.businessStatus,
      }));

      setHospitals(data);
      setIsConnected(true);
    } catch (err) {
      console.error(err);
      setHospitals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerClick = (hospital: any) => {
    setSelectedHospital(hospital);
  };

  const handleViewHospital = (hospitalId: number) => {
    const hospital = hospitals.find((h) => h.id === hospitalId);
    if (hospital && mapRef.current) {
      mapRef.current.panTo(hospital.position);
      mapRef.current.setZoom(15);
      setSelectedHospital(hospital);
    }
  };

  const handleBack = () => {
    if (location.state?.from === "textSelection") {
      navigate("/", { state: { returnTo: "textSelection" } });
    } else {
      navigate("/");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-lg font-semibold text-slate-700">Loading Google Maps...</h2>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-lg font-semibold text-red-500">Error Loading Google Maps</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-lg font-semibold text-slate-700">Loading hospitals...</h2>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <h2 className="text-2xl font-semibold text-slate-800">Hospital Map</h2>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition cursor-pointer"
          onClick={getLocations}
        >
          Find hospitals near me <MoveRight className="inline-block ml-2" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 space-y-6">
      <div className="w-full max-w-4xl shadow-lg rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLoc}
          zoom={13}
          onLoad={onMapLoad}
        >
          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={hospital.position}
              onClick={() => handleMarkerClick(hospital)}
            />
          ))}

          {selectedHospital && (
            <InfoWindow
              position={selectedHospital.position}
              onCloseClick={() => setSelectedHospital(null)}
            >
              <div className="p-2">
                <h3 className="text-md font-semibold">{selectedHospital.name}</h3>
                <p className="text-sm text-slate-600">Tap for directions</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Hospital options */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
        {hospitals.map((hospital) => (
          <button
            key={hospital.id}
            className="p-4 bg-slate-100 hover:bg-slate-200 rounded-md text-center transition"
            onClick={() => handleViewHospital(hospital.id)}
          >
            {hospital.name}
          </button>
        ))}
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-slate-700 rounded-md transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default HospitalMap;

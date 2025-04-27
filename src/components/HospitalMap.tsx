"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { getLocation } from "@/utils/utils";
import { MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "calc(100vh - 2rem)",
};

const libraries: any = ["places"];

export default function HospitalLocatorPage() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries,
  });

  const [userLoc, setUserLoc] = useState({ lat: 0, lng: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const fetchHospitals = async () => {
    setIsLoading(true);
    try {
      const { latitude, longitude, error } = await getLocation();
      if (error) throw new Error("Unable to get location");

      setUserLoc({ lat: latitude, lng: longitude });
      
      // Get patient needs from localStorage
      const storedNeeds = localStorage.getItem('patientNeeds');
      console.log("DEBUG - Retrieved from localStorage:", storedNeeds);
      
      let url = `/api/getNearbyHospitals?lat=${latitude}&lng=${longitude}`;
      
      // Add patient needs as query param if available
      if (storedNeeds) {
        url += `&patientNeeds=${encodeURIComponent(storedNeeds)}`;
        console.log("DEBUG - URL with patient needs:", url);
      } else {
        console.log("DEBUG - No patient needs found in localStorage");
      }

      console.log("DEBUG - Fetching hospitals from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        console.error("DEBUG - Error response:", await response.text());
        throw new Error("Error fetching hospitals");
      }

      let data = await response.json();
      console.log("DEBUG - Hospital API response:", data);

      // Check for ranking data
      if (data.places && data.places.length > 0) {
        console.log("DEBUG - First hospital score:", data.places[0].score);
        console.log("DEBUG - First hospital wait time:", data.places[0].estimated_wait);
      }

      data = data.places.map((hospital: any, index: number) => ({
        id: String(index),
        name: hospital.displayName.text,
        position: {
          lat: hospital.location.latitude,
          lng: hospital.location.longitude,
        },
        address: hospital.formattedAddress || "Address not available",
        phone: hospital.nationalPhoneNumber || "Phone not available",
        hours: "Open 24/7", // Could be smarter if API gives real hours
        specialties: ["General Healthcare"], // Placeholder, unless API returns specialties
        websiteUri: hospital.websiteUri || null,
        has_ct: hospital.internal_data.has_ct || false,
        has_mri: hospital.internal_data.has_mri || false,
        has_ultrasound: hospital.internal_data.has_ultrasound || false,
        has_pet_ct: hospital.internal_data.has_pet_ct || false,
        total_beds: hospital.internal_data.total_beds || 0,
        total_beds_load: hospital.internal_data.total_beds_load || 0,
        score: hospital.score || null,
        estimated_wait: hospital.estimated_wait || null,
      }));
      
      console.log("Mapped hospital data:", data[0]); // Let's look at the first hospital's exact structure
      
        // Add any other properties from the ranked hospitals


      setHospitals(data);
      setIsConnected(true);
    } catch (err) {
      console.error("DEBUG - Error in fetchHospitals:", err);
      setHospitals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHospitalSelect = (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    const hospital = hospitals.find((h) => h.id === hospitalId);

    if (hospital && mapRef.current) {
      mapRef.current.panTo(hospital.position);
      mapRef.current.setZoom(15);
      setActiveInfoWindow(hospitalId);
    }
  };

  const google = typeof window !== "undefined" && window.google;

  useEffect(() => {
    if (isLoaded && !isConnected) {
      fetchHospitals();
    }
  }, [isLoaded, isConnected]);

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <p className="text-lg text-slate-700">Loading Map and Hospitals...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 p-4">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl">
        {/* Map Section */}
        <Card className="md:col-span-2 overflow-hidden">
          <CardHeader className="p-4 border-b">
            <CardTitle>Nearby Hospitals</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100vh-10rem)]">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userLoc}
              zoom={13}
              onLoad={onMapLoad}
              options={{
                fullscreenControl: false,
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {hospitals.map((hospital) => (
                <Marker
                  key={hospital.id}
                  position={hospital.position}
                  onClick={() => {
                    setActiveInfoWindow(hospital.id);
                    setSelectedHospital(hospital.id);
                  }}
                  animation={google?.maps.Animation.DROP}
                  icon={{
                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    scaledSize: new google.maps.Size(40, 40),
                  }}
                >
                  {activeInfoWindow === hospital.id && (
                    <InfoWindow
                      position={hospital.position}
                      onCloseClick={() => setActiveInfoWindow(null)}
                    >
                      <div className="p-2 max-w-xs">
                        <h3 className="font-semibold text-lg">{hospital.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-1" />
                          {hospital.phone}
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {hospital.hours}
                        </div>
                        {hospital.websiteUri && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => window.open(hospital.websiteUri, "_blank")}
                          >
                            Visit Website
                          </Button>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              ))}
            </GoogleMap>
          </CardContent>
        </Card>

        {/* Hospital List Section */}
        <Card className="h-[calc(100vh-2rem)]">
          <CardHeader className="p-4 border-b">
            <CardTitle>Hospitals List</CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto h-[calc(100vh-10rem)]">
            <Accordion
              type="single"
              collapsible
              value={selectedHospital || undefined}
              onValueChange={(value) => value && handleHospitalSelect(value)}
              className="space-y-2"
            >
              {hospitals.map((hospital) => (
                <AccordionItem
                  key={hospital.id}
                  value={hospital.id}
                  className={cn(
                    "border rounded-lg overflow-hidden",
                    selectedHospital === hospital.id ? "border-primary shadow-sm" : "border-slate-200",
                  )}
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <h3 className="font-medium">{hospital.name}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{hospital.address}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-0">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-slate-500 mr-2" />
                        <span>{hospital.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-slate-500 mr-2" />
                        <span>{hospital.hours}</span>
                      </div>
                      <div className="pt-2">
                        <h4 className="font-medium mb-1">Specialties</h4>
                        <ul className="list-disc list-inside text-slate-600 space-y-1">
                          {hospital.specialties.map((specialty: string, index: number) => (
                            <li key={index}>{specialty}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-2">
                        <h4 className="font-medium mb-1">Capacity</h4>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-600 text-sm">
                          <div>CT Scan: {hospital.has_ct ? '✅' : '❌'}</div>
                          <div>MRI: {hospital.has_mri ? '✅' : '❌'}</div>
                          <div>Ultrasound: {hospital.has_ultrasound ? '✅' : '❌'}</div>
                          <div>PET/CT: {hospital.has_pet_ct ? '✅' : '❌'}</div>
                          <div>Beds: {Math.max(0, (hospital.total_beds || 0) - (hospital.total_beds_load || 0))}</div>
                        </div>
                      </div>
                      {hospital.websiteUri && (
                        <Button
                          className="w-full mt-2"
                          onClick={() =>
                            window.open(hospital.websiteUri, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

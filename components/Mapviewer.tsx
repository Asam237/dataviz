"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, MapPin, AlertCircle, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import "leaflet/dist/leaflet.css";

interface LocationRow {
  id: string;
  label: string;
  lat: number;
  lng: number;
  extra: Record<string, string | number>;
}

interface ColumnMapping {
  lat: string;
  lng: string;
  label: string;
}

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const LOCAL_STORAGE_KEYS = {
  RAW_DATA: "geodata_viewer_raw_data",
  COLUMNS: "geodata_viewer_columns",
  MAPPING: "geodata_viewer_mapping",
  LOCATIONS: "geodata_viewer_locations",
};

export default function MapViewer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [rawData, setRawData] = useState<Record<string, string | number>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    lat: "",
    lng: "",
    label: "",
  });
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // 1. Hydratation initiale depuis le localStorage (côté client uniquement)
  useEffect(() => {
    try {
      const storedRawData = localStorage.getItem(LOCAL_STORAGE_KEYS.RAW_DATA);
      const storedColumns = localStorage.getItem(LOCAL_STORAGE_KEYS.COLUMNS);
      const storedMapping = localStorage.getItem(LOCAL_STORAGE_KEYS.MAPPING);
      const storedLocations = localStorage.getItem(
        LOCAL_STORAGE_KEYS.LOCATIONS,
      );

      if (storedRawData) setRawData(JSON.parse(storedRawData));
      if (storedColumns) setColumns(JSON.parse(storedColumns));
      if (storedMapping) setMapping(JSON.parse(storedMapping));
      if (storedLocations) setLocations(JSON.parse(storedLocations));
    } catch (e) {
      console.error("Erreur lors de la récupération du localStorage", e);
    }
  }, []);

  // 2. Sauvegarde automatique dans le localStorage lors des changements d'état
  useEffect(() => {
    if (rawData.length > 0) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.RAW_DATA,
        JSON.stringify(rawData),
      );
    }
  }, [rawData]);

  useEffect(() => {
    if (columns.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.COLUMNS, JSON.stringify(columns));
    }
  }, [columns]);

  useEffect(() => {
    if (mapping.lat || mapping.lng || mapping.label) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.MAPPING, JSON.stringify(mapping));
    }
  }, [mapping]);

  useEffect(() => {
    if (locations.length > 0) {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.LOCATIONS,
        JSON.stringify(locations),
      );
    }
  }, [locations]);

  // Initialisation sécurisée de Leaflet
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || leafletMapRef.current) return;

      if (mapRef.current && (mapRef.current as any)._leaflet_id) {
        return;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      LRef.current = L;

      if (!mapRef.current) return;
      const map = L.map(mapRef.current).setView([7.3697, 12.3547], 6);

      L.tileLayer(TILE_URL, {
        attribution: ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;

      // Forcer le rendu initial des marqueurs si des données persistées étaient déjà chargées
      triggerMarkerUpdate();
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Fonction partagée pour mettre à jour les marqueurs
  const triggerMarkerUpdate = () => {
    if (!leafletMapRef.current || !markersLayerRef.current || !LRef.current)
      return;

    const L = LRef.current;
    markersLayerRef.current.clearLayers();

    if (locations.length === 0) return;

    const bounds = L.latLngBounds([]);

    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng]).bindPopup(`
          <div class="text-slate-900 p-1">
            <strong class="font-semibold">${loc.label}</strong><br/>
            <span class="text-xs text-slate-500">Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}</span>
          </div>
        `);

      markersLayerRef.current.addLayer(marker);
      bounds.extend([loc.lat, loc.lng]);
    });

    leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  // Mise à jour des marqueurs quand la liste change
  useEffect(() => {
    triggerMarkerUpdate();
  }, [locations]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Record<
          string,
          string | number
        >[];

        if (data.length === 0) {
          setError("Le fichier semble vide.");
          return;
        }

        const cols = Object.keys(data[0]);
        setColumns(cols);
        setRawData(data);
        setError(null);

        const autoMap: ColumnMapping = { lat: "", lng: "", label: "" };
        cols.forEach((c) => {
          const low = c.toLowerCase();
          if (["lat", "latitude", "y"].includes(low)) autoMap.lat = c;
          if (["lng", "lon", "longitude", "x"].includes(low)) autoMap.lng = c;
          if (["name", "nom", "label", "ville"].includes(low) && !autoMap.label)
            autoMap.label = c;
        });
        setMapping(autoMap);
      } catch (err) {
        setError("Erreur lors de la lecture du fichier.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const applyMapping = () => {
    if (!mapping.lat || !mapping.lng || !mapping.label) {
      setError("Veuillez mapper les colonnes obligatoires.");
      return;
    }

    const processed = rawData
      .map((row, index) => {
        const lat = parseFloat(String(row[mapping.lat]));
        const lng = parseFloat(String(row[mapping.lng]));
        const label = String(row[mapping.label]);

        if (isNaN(lat) || isNaN(lng)) return null;

        const extra: Record<string, string | number> = {};
        Object.keys(row).forEach((k) => {
          if (k !== mapping.lat && k !== mapping.lng && k !== mapping.label) {
            extra[k] = row[k];
          }
        });

        return { id: `loc-${index}`, label, lat, lng, extra };
      })
      .filter(Boolean) as LocationRow[];

    setLocations(processed);
    setError(null);
  };

  // Fonction optionnelle pour vider le cache et réinitialiser l'interface
  const clearStoredData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.RAW_DATA);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COLUMNS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MAPPING);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOCATIONS);
    setRawData([]);
    setColumns([]);
    setMapping({ lat: "", lng: "", label: "" });
    setLocations([]);
    setSelectedLocation(null);
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }
  };

  const centerOnLocation = (loc: LocationRow) => {
    setSelectedLocation(loc);
    if (leafletMapRef.current && LRef.current) {
      leafletMapRef.current.setView([loc.lat, loc.lng], 14, { animate: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 flex flex-col gap-6 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white border border-gray-200 rounded-2xl gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <MapPin className="text-blue-600 h-6 w-6" /> GeoData Viewer Pro
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Importez, visualisez et analysez vos données géographiques.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {locations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearStoredData}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Réinitialiser
            </Button>
          )}
          {locations.length > 0 && (
            <Badge className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 text-sm rounded-full">
              {locations.length} points chargés
            </Badge>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/60">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-gray-500 flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-600" /> Source des Données
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 rounded-xl p-6 cursor-pointer transition-all group">
                <Upload className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  Choisir un fichier Excel ou CSV
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {columns.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 block">
                      Colonne Label / Nom
                    </label>
                    <Select
                      value={mapping.label}
                      onValueChange={(v: any) =>
                        setMapping({ ...mapping, label: v })
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        {columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Latitude</label>
                      <Select
                        value={mapping.lat}
                        onValueChange={(v: any) =>
                          setMapping({ ...mapping, lat: v })
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                          <SelectValue placeholder="Lat" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-800">
                          {columns.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Longitude</label>
                      <Select
                        value={mapping.lng}
                        onValueChange={(v: any) =>
                          setMapping({ ...mapping, lng: v })
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                          <SelectValue placeholder="Lng" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-800">
                          {columns.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={applyMapping}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium mt-2"
                  >
                    Générer la carte
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {locations.length > 0 && (
            <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col max-h-[400px]">
              <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => centerOnLocation(loc)}
                    className={`w-full text-left p-3 flex items-start gap-3 hover:bg-blue-50 transition-all ${selectedLocation?.id === loc.id ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}
                  >
                    <MapPin
                      className={`h-4 w-4 shrink-0 mt-0.5 ${selectedLocation?.id === loc.id ? "text-blue-500" : "text-gray-400"}`}
                    />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {loc.label}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-auto min-h-[550px]">
          <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col relative">
            <div ref={mapRef} className="w-full h-full z-0" />

            {locations.length === 0 && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                <div className="p-4 rounded-full bg-gray-100 border border-gray-200 mb-4 shadow-sm">
                  <MapPin className="h-10 w-10 text-gray-400 animate-pulse" />
                </div>
                <h3 className="text-lg font-medium text-gray-700">
                  En attente de coordonnées
                </h3>
                <p className="text-sm text-gray-400 max-w-sm mt-1">
                  Importez un dataset structuré pour tracer vos marqueurs.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Database,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/contexts/DataContext";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export default function DataImport() {
  const { setData, setColumns, setFilteredData } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const processExcelData = useCallback(
    (file: File) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 100);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[];

          // Convert array of arrays to array of objects
          if (json.length > 1) {
            const headers = json[0];
            const processedData = json.slice(1).map((row) => {
              let obj: { [key: string]: any } = {};
              headers.forEach((header: string, index: number) => {
                obj[header] = row[index];
              });
              return obj;
            });

            clearInterval(progressInterval);
            setUploadProgress(100);
            setColumns(headers);
            setData(processedData);
            setFilteredData(processedData);
            setSuccess(
              `✨ ${processedData.length} lignes importées avec succès`
            );
          } else {
            throw new Error("Le fichier Excel est vide ou n'a pas de données.");
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Erreur lors du traitement du fichier Excel."
          );
        } finally {
          setIsLoading(false);
          setTimeout(() => setUploadProgress(0), 1000);
        }
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setError("Erreur lors de la lecture du fichier.");
        setIsLoading(false);
        setUploadProgress(0);
      };

      reader.readAsBinaryString(file);
    },
    [setData, setColumns, setFilteredData]
  );

  const processCSVData = useCallback(
    (file: File) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (results.errors.length > 0) {
              throw new Error("Erreur lors de la lecture du fichier CSV");
            }

            const processedData = results.data as any[];
            const headers = Object.keys(processedData[0] || {});

            if (headers.length === 0) {
              throw new Error("Aucune colonne détectée dans le fichier");
            }

            setColumns(headers);
            setData(processedData);
            setFilteredData(processedData);
            setSuccess(
              `✨ ${processedData.length} lignes importées avec succès`
            );

            setTimeout(() => {
              setUploadProgress(0);
            }, 2000);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Erreur lors du traitement des données"
            );
            setUploadProgress(0);
          } finally {
            setTimeout(() => {
              setIsLoading(false);
            }, 1000);
          }
        },
        error: () => {
          clearInterval(progressInterval);
          setError("Erreur lors de la lecture du fichier");
          setIsLoading(false);
          setUploadProgress(0);
        },
      });
    },
    [setData, setColumns, setFilteredData]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        processCSVData(file);
      } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
        processExcelData(file);
      } else {
        setError(
          "Format de fichier non supporté. Veuillez utiliser un fichier CSV ou Excel."
        );
      }
    },
    [processCSVData, processExcelData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-white to-slate-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            Importer vos données
          </CardTitle>
          <CardDescription className="text-lg">
            Glissez-déposez votre fichier CSV/Excel ou cliquez pour sélectionner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`p-12 text-center rounded-xl cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "bg-blue-50 border-2 border-blue-400 border-dashed scale-105 shadow-lg"
                : "bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 border-dashed hover:scale-102 hover:shadow-md"
            }`}
          >
            <input {...getInputProps()} />
            <div
              className={`transition-all duration-300 ${
                isDragActive ? "scale-110" : ""
              }`}
            >
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-6 text-slate-400" />
              {isDragActive ? (
                <p className="text-blue-600 font-semibold text-xl mb-3">
                  Relâchez pour importer le fichier
                </p>
              ) : (
                <div>
                  <p className="text-slate-700 font-semibold text-xl mb-3">
                    Cliquez pour sélectionner ou glissez votre fichier ici
                  </p>
                  <p className="text-slate-500 text-lg">
                    Formats supportés: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-slate-700 font-medium">
                  Traitement en cours...
                </span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 animate-in fade-in-50 duration-300"
        >
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base font-medium">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 animate-in fade-in-50 duration-300">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800 text-base font-medium">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 opacity-90" />
              <CardTitle className="text-lg font-semibold opacity-95">
                Import Intelligent
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">CSV, Excel</div>
            <p className="text-blue-100 leading-relaxed">
              Détection automatique des types de données et validation en temps
              réel
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 opacity-90" />
              <CardTitle className="text-lg font-semibold opacity-95">
                Analytics Avancées
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">Analytics Pro</div>
            <p className="text-green-100 leading-relaxed">
              Corrélations, tendances, prédictions et insights automatiques
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 opacity-90" />
              <CardTitle className="text-lg font-semibold opacity-95">
                Export Premium
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">HD Quality</div>
            <p className="text-orange-100 leading-relaxed">
              SVG haute résolution
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

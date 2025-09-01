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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Helper function to detect and suggest corrections for data inconsistencies
const detectAndSuggestCorrections = (data: any[]) => {
  const inconsistencies: { [key: string]: any[] } = {};

  if (!data || data.length === 0) return inconsistencies;

  // Example 1: Detect and correct inconsistent date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dateColumns = Object.keys(data[0] || {}).filter((key) =>
    key.toLowerCase().includes("date")
  );

  dateColumns.forEach((col) => {
    inconsistencies[col] = [];
    data.forEach((row, index) => {
      if (
        row[col] &&
        typeof row[col] === "string" &&
        !dateRegex.test(row[col])
      ) {
        const date = new Date(row[col]);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split("T")[0];
          inconsistencies[col].push({
            row: index + 1,
            original: row[col],
            suggestion: formattedDate,
            type: "Format de Date",
          });
        }
      }
    });
  });

  // Example 2: Detect and suggest corrections for inconsistent number formats
  const numberColumns = Object.keys(data[0] || {}).filter((key) =>
    data.some(
      (row) =>
        typeof row[key] === "string" &&
        !isNaN(parseFloat(row[key])) &&
        !key.toLowerCase().includes("id")
    )
  );

  numberColumns.forEach((col) => {
    inconsistencies[col] = [];
    data.forEach((row, index) => {
      const value = row[col];
      if (typeof value === "string") {
        const cleanedValue = value.replace(/,/g, ".");
        const num = parseFloat(cleanedValue);
        if (!isNaN(num) && num.toString() !== value) {
          inconsistencies[col].push({
            row: index + 1,
            original: value,
            suggestion: num,
            type: "Format de Nombre",
          });
        }
      }
    });
  });

  return inconsistencies;
};

// Helper function to apply the suggested corrections
const applyCorrections = (data: any[], corrections: any) => {
  if (!corrections) return data;

  const correctedData = data.map((row) => ({ ...row }));

  Object.keys(corrections).forEach((col) => {
    corrections[col].forEach((correction: { row: number; suggestion: any }) => {
      if (correctedData[correction.row - 1]) {
        correctedData[correction.row - 1][col] = correction.suggestion;
      }
    });
  });

  return correctedData;
};

export default function DataImport() {
  const { setData, setColumns, setFilteredData } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inconsistencies, setInconsistencies] = useState<{
    [key: string]: any[];
  }>({});
  const [correctedData, setCorrectedData] = useState<any[] | null>(null);
  const [fileToProcess, setFileToProcess] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const processData = useCallback(
    (processedData: any[], headers: string[]) => {
      const detectedInconsistencies =
        detectAndSuggestCorrections(processedData);
      setInconsistencies(detectedInconsistencies);

      const hasInconsistencies = Object.values(detectedInconsistencies).some(
        (arr) => arr.length > 0
      );

      if (hasInconsistencies) {
        setSuccess(
          "Inconsistances détectées! Vérifiez et appliquez les corrections."
        );
        setCorrectedData(
          applyCorrections(processedData, detectedInconsistencies)
        );
      } else {
        setSuccess(`✨ ${processedData.length} lignes importées avec succès`);
        setInconsistencies({});
        setCorrectedData(null);
      }
      setData(processedData);
      setColumns(headers);
      setFilteredData(processedData);
    },
    [setData, setColumns, setFilteredData]
  );

  const processSelectedExcelSheet = useCallback(() => {
    if (!fileToProcess || !selectedSheet) {
      setError("Veuillez sélectionner une feuille de calcul.");
      return;
    }

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
        const worksheet = workbook.Sheets[selectedSheet];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        }) as any[];

        if (json.length > 1) {
          const headers = json[0] as string[];
          const processedData = json.slice(1).map((row) => {
            let obj: { [key: string]: any } = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj;
          });

          clearInterval(progressInterval);
          setUploadProgress(100);
          processData(processedData, headers);
        } else {
          throw new Error(`La feuille de calcul "${selectedSheet}" est vide.`);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du traitement de la feuille Excel."
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

    reader.readAsBinaryString(fileToProcess);
  }, [fileToProcess, selectedSheet, processData]);

  const processCSVData = useCallback(
    (file: File) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);
      setSheetNames([]);
      setSelectedSheet(null);

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

            processData(processedData, headers);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Erreur lors du traitement des données"
            );
          } finally {
            setTimeout(() => {
              setIsLoading(false);
              setUploadProgress(0);
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
    [processData]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      setInconsistencies({});
      setCorrectedData(null);
      setFileToProcess(file);
      setSheetNames([]);
      setSelectedSheet(null);

      if (fileName.endsWith(".csv")) {
        processCSVData(file);
      } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            setSheetNames(workbook.SheetNames);
            if (workbook.SheetNames.length > 0) {
              setSelectedSheet(workbook.SheetNames[0]);
            }
          } catch (err) {
            setError("Erreur lors de la lecture du fichier Excel.");
          }
        };
        reader.readAsBinaryString(file);
      } else {
        setError(
          "Format de fichier non supporté. Veuillez utiliser un fichier CSV ou Excel."
        );
      }
    },
    [processCSVData]
  );

  const handleApplyCorrections = () => {
    if (correctedData) {
      setData(correctedData);
      setFilteredData(correctedData);
      setInconsistencies({});
      setCorrectedData(null);
      setSuccess("Toutes les corrections ont été appliquées avec succès!");
    }
  };

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

  const totalInconsistencies = Object.values(inconsistencies).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

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

          {sheetNames.length > 0 && (
            <div className="mt-6 space-y-4">
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                    <Database className="h-5 w-5" />
                    Sélectionner un tableau
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Votre fichier contient plusieurs feuilles de calcul.
                    Veuillez en choisir une à importer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                  <Select
                    onValueChange={setSelectedSheet}
                    value={selectedSheet || ""}
                  >
                    <SelectTrigger className="w-full sm:w-[250px]">
                      <SelectValue placeholder="Choisir une feuille..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={processSelectedExcelSheet}
                    disabled={!selectedSheet || isLoading}
                    className="w-full sm:w-auto"
                  >
                    Importer le tableau
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

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

      {/* Inconsistency Detection & Correction */}
      {totalInconsistencies > 0 && (
        <Card className="border-2 border-orange-200 bg-orange-50 animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xl">
                Inconsistances détectées dans vos données
              </span>
            </CardTitle>
            <CardDescription className="text-orange-700">
              {totalInconsistencies} problème(s) potentiel(s) détecté(s).
              Cliquez ci-dessous pour les corriger automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside text-orange-800">
              {Object.keys(inconsistencies).map((col) =>
                inconsistencies[col].map((inc, index) => (
                  <li key={`${col}-${index}`}>
                    Dans la colonne `&quot;`
                    <span className="font-semibold">{col}</span>`&quot;` (ligne{" "}
                    {inc.row}): Valeur `&quot;{inc.original}`&quot;`
                    <TrendingUp className="inline h-4 w-4 text-orange-500 mx-1" />
                    Suggestion: `&quot;`{inc.suggestion}`&quot;` ({inc.type})
                  </li>
                ))
              )}
            </ul>
            <Button
              onClick={handleApplyCorrections}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Appliquer les corrections intelligentes
            </Button>
          </CardContent>
        </Card>
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

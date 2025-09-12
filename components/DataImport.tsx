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
  Settings,
  X,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // New state variables for data cleaning and transformation tools
  const [showCleaningTools, setShowCleaningTools] = useState(false);
  const [cleanedData, setCleanedData] = useState<any[] | null>(null);
  const [columnToSplit, setColumnToSplit] = useState<string | null>(null);
  const [splitDelimiter, setSplitDelimiter] = useState("");
  const [newColumnNames, setNewColumnNames] = useState<string[]>([]);
  const [renameMapping, setRenameMapping] = useState<{ [key: string]: string }>(
    {}
  );
  const [missingValueColumn, setMissingValueColumn] = useState<string | null>(
    null
  );
  const [missingValueMethod, setMissingValueMethod] = useState<string | null>(
    null
  );
  const [missingValueFill, setMissingValueFill] = useState<string>("");

  const processData = useCallback(
    (processedData: any[], headers: string[]) => {
      const detectedInconsistencies =
        detectAndSuggestCorrections(processedData);
      setInconsistencies(detectedInconsistencies);
      setCleanedData(processedData); // Store raw data for cleaning tools

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
      setShowCleaningTools(true); // Show cleaning tools after successful import
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
      setShowCleaningTools(false);
      setCleanedData(null);

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

  const handleMissingValues = () => {
    if (!missingValueColumn || !missingValueMethod || !cleanedData) {
      setError("Veuillez choisir une colonne et une méthode.");
      return;
    }

    const updatedData = [...cleanedData];
    let fillValue: any;

    if (missingValueMethod === "fill_value" && missingValueFill.trim() === "") {
      setError(
        "Veuillez spécifier une valeur pour la méthode 'Remplacer par une valeur'."
      );
      return;
    }

    if (missingValueMethod.startsWith("fill_")) {
      const numericData = updatedData
        .map((row) => parseFloat(row[missingValueColumn]))
        .filter((val) => !isNaN(val));

      switch (missingValueMethod) {
        case "fill_mean":
          fillValue =
            numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
          break;
        case "fill_median":
          const sorted = [...numericData].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          fillValue =
            sorted.length % 2 !== 0
              ? sorted[mid]
              : (sorted[mid - 1] + sorted[mid]) / 2;
          break;
        case "fill_mode":
          const modeMap: { [key: string]: number } = {};
          numericData.forEach((val) => {
            modeMap[val] = (modeMap[val] || 0) + 1;
          });
          fillValue = Object.keys(modeMap).reduce((a, b) =>
            modeMap[a] > modeMap[b] ? a : b
          );
          break;
        case "fill_value":
          fillValue = missingValueFill;
          break;
        default:
          fillValue = null;
      }
    }

    const finalData = updatedData.filter((row) => {
      if (missingValueMethod === "remove_rows") {
        return (
          row[missingValueColumn] !== null &&
          row[missingValueColumn] !== undefined &&
          row[missingValueColumn] !== ""
        );
      }
      if (
        row[missingValueColumn] === null ||
        row[missingValueColumn] === undefined ||
        row[missingValueColumn] === ""
      ) {
        row[missingValueColumn] = fillValue;
      }
      return true;
    });

    setData(finalData);
    setFilteredData(finalData);
    setCleanedData(finalData);
    setSuccess(`Données nettoyées. ${missingValueColumn} a été mis à jour.`);
  };

  const handleSplitColumn = () => {
    if (!columnToSplit || !splitDelimiter || !cleanedData) {
      setError("Veuillez choisir une colonne et un délimiteur.");
      return;
    }

    const newHeaders = [...Object.keys(cleanedData[0])];
    const columnIndex = newHeaders.indexOf(columnToSplit);
    if (columnIndex === -1) {
      setError("Colonne introuvable.");
      return;
    }

    const newColumns =
      newColumnNames.length > 0 ? newColumnNames : ["Part 1", "Part 2"];

    const updatedData = cleanedData.map((row) => {
      const originalValue = row[columnToSplit];
      if (typeof originalValue === "string") {
        const parts = originalValue.split(splitDelimiter);
        let newRow = { ...row };
        newColumns.forEach((newCol, index) => {
          newRow[newCol] = parts[index] || null;
        });
        delete newRow[columnToSplit];
        return newRow;
      }
      return row;
    });

    const finalHeaders = newHeaders
      .filter((h) => h !== columnToSplit)
      .concat(newColumns);

    setData(updatedData);
    setFilteredData(updatedData);
    setCleanedData(updatedData);
    setColumns(finalHeaders);
    setSuccess(`La colonne ${columnToSplit} a été divisée avec succès.`);
    setColumnToSplit(null);
    setSplitDelimiter("");
    setNewColumnNames([]);
  };

  const handleRenameColumns = () => {
    if (!cleanedData) return;

    const updatedData = cleanedData.map((row) => {
      const newRow: { [key: string]: any } = {};
      Object.keys(row).forEach((key) => {
        newRow[renameMapping[key] || key] = row[key];
      });
      return newRow;
    });

    const updatedHeaders = Object.keys(cleanedData[0]).map(
      (h) => renameMapping[h] || h
    );
    setData(updatedData);
    setFilteredData(updatedData);
    setCleanedData(updatedData);
    setColumns(updatedHeaders);
    setSuccess(`Les colonnes ont été renommées avec succès.`);
    setRenameMapping({});
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

      {/* Data Cleaning and Transformation Tools */}
      {showCleaningTools && cleanedData && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-purple-800">
              <Settings className="h-6 w-6" />
              Outils de Nettoyage et Transformation
            </CardTitle>
            <CardDescription className="text-purple-700">
              Nettoyez, transformez et structurez vos données avant la
              visualisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quality" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="quality">Qualité des Données</TabsTrigger>
                <TabsTrigger value="missing-values">
                  Valeurs Manquantes
                </TabsTrigger>
                <TabsTrigger value="split-columns">
                  Diviser Colonnes
                </TabsTrigger>
                <TabsTrigger value="rename-columns">
                  Renommer Colonnes
                </TabsTrigger>
              </TabsList>

              {/* Data Quality Tab */}
              <TabsContent value="quality" className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Aperçu Qualité
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colonne</TableHead>
                      <TableHead>Problème</TableHead>
                      <TableHead>Détection</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(inconsistencies).map((col) =>
                      inconsistencies[col].map((issue, index) => (
                        <TableRow key={`${col}-${index}`}>
                          <TableCell className="font-medium">{col}</TableCell>
                          <TableCell className="text-red-500">
                            {issue.type}
                          </TableCell>
                          <TableCell>
                            Ligne {issue.row}: `&quot;`{issue.original}`&quot;`
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newInconsistencies = {
                                  ...inconsistencies,
                                };
                                if (newInconsistencies[col]) {
                                  newInconsistencies[col] = newInconsistencies[
                                    col
                                  ].filter((_, i) => i !== index);
                                }
                                setInconsistencies(newInconsistencies);
                                const newCorrectedData = applyCorrections(
                                  cleanedData || [],
                                  { [col]: [issue] }
                                );
                                setData(newCorrectedData);
                                setFilteredData(newCorrectedData);
                                setCleanedData(newCorrectedData);
                                setSuccess(
                                  `Correction appliquée à la colonne ${col}, ligne ${issue.row}.`
                                );
                              }}
                            >
                              Appliquer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {totalInconsistencies === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-slate-500"
                        >
                          Aucun problème de qualité détecté.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Missing Values Tab */}
              <TabsContent value="missing-values" className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Gérer les Valeurs Manquantes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="missing-col">
                      Sélectionner une colonne
                    </Label>
                    <Select
                      onValueChange={setMissingValueColumn}
                      value={missingValueColumn || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une colonne..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(cleanedData[0] || {}).map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="missing-method">Méthode</Label>
                    <Select
                      onValueChange={setMissingValueMethod}
                      value={missingValueMethod || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une méthode..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remove_rows">
                          Supprimer les lignes
                        </SelectItem>
                        <SelectItem value="fill_mean">
                          Remplacer par la moyenne
                        </SelectItem>
                        <SelectItem value="fill_median">
                          Remplacer par la médiane
                        </SelectItem>
                        <SelectItem value="fill_mode">
                          Remplacer par le mode
                        </SelectItem>
                        <SelectItem value="fill_value">
                          Remplacer par une valeur spécifique
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {missingValueMethod === "fill_value" && (
                    <div>
                      <Label htmlFor="fill-value">Valeur de remplacement</Label>
                      <Input
                        id="fill-value"
                        placeholder="Ex: 0, 'N/A'"
                        value={missingValueFill}
                        onChange={(e) => setMissingValueFill(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <Button onClick={handleMissingValues} className="w-full mt-4">
                  Appliquer la méthode de gestion
                </Button>
              </TabsContent>

              {/* Split Columns Tab */}
              <TabsContent value="split-columns" className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Diviser une Colonne
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="split-col">Sélectionner une colonne</Label>
                    <Select
                      onValueChange={setColumnToSplit}
                      value={columnToSplit || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une colonne..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(cleanedData[0] || {}).map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="delimiter">Délimiteur</Label>
                    <Input
                      id="delimiter"
                      placeholder="Ex: ',', ' ', ';'"
                      value={splitDelimiter}
                      onChange={(e) => setSplitDelimiter(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleSplitColumn} className="w-full mt-4">
                  Diviser la colonne
                </Button>
              </TabsContent>

              {/* Rename Columns Tab */}
              <TabsContent value="rename-columns" className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  Renommer les Colonnes
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom Actuel</TableHead>
                      <TableHead>Nouveau Nom</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(cleanedData[0] || {}).map((col) => (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell>
                          <Input
                            placeholder={col}
                            value={renameMapping[col] || ""}
                            onChange={(e) =>
                              setRenameMapping({
                                ...renameMapping,
                                [col]: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button onClick={handleRenameColumns} className="w-full mt-4">
                  Appliquer le renommage
                </Button>
              </TabsContent>
            </Tabs>
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

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  DollarSign,
  Target,
  Sparkles,
  Activity,
  Download,
  AlertCircle,
  GitGraph,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { useData } from "../contexts/DataContext";
import * as htmlToImage from "html-to-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type DataRow = { [key: string]: string | number | null | undefined };

type Stat = {
  column: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  trendPercent: number;
  isPositiveTrend: boolean;
  stdDev: number;
  variance: number;
};

export default function Dashboard() {
  const { data, columns, isLoading, error } = useData();

  // State for selected columns, initialized as empty arrays.
  const [selectedLineChartColumns, setSelectedLineChartColumns] = useState<
    string[]
  >([]);
  const [selectedBarChartColumns, setSelectedBarChartColumns] = useState<
    string[]
  >([]);
  const [selectedAreaChartColumns, setSelectedAreaChartColumns] = useState<
    string[]
  >([]);
  const [selectedScatterX, setSelectedScatterX] = useState<string>("");
  const [selectedScatterY, setSelectedScatterY] = useState<string>("");

  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const areaChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const scatterChartRef = useRef<HTMLDivElement>(null);

  // Memoize numeric columns calculation
  const numericColumns = useMemo(() => {
    if (!data || !columns) return [];
    const firstRow = data[0] || {};
    return columns.filter((col) => {
      const value = firstRow[col];
      return (
        typeof value === "number" ||
        (typeof value === "string" &&
          !isNaN(Number(value)) &&
          value.trim() !== "")
      );
    });
  }, [data, columns]);

  // Use useEffect to set default columns once data and numericColumns are available.
  useEffect(() => {
    if (numericColumns.length > 0) {
      if (selectedLineChartColumns.length === 0) {
        setSelectedLineChartColumns(numericColumns.slice(0, 3));
      }
      if (selectedBarChartColumns.length === 0) {
        setSelectedBarChartColumns(numericColumns.slice(0, 2));
      }
      if (selectedAreaChartColumns.length === 0) {
        setSelectedAreaChartColumns(numericColumns.slice(0, 2));
      }
      if (!selectedScatterX) {
        setSelectedScatterX(numericColumns[0]);
      }
      if (!selectedScatterY && numericColumns.length > 1) {
        setSelectedScatterY(numericColumns[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericColumns]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    if (!data || data.length === 0 || numericColumns.length === 0) {
      return null;
    }

    try {
      const calculations: Stat[] = numericColumns.slice(0, 8).map((col) => {
        const values = data
          .map((row) => {
            const value = (row as DataRow)[col];
            if (value === null || value === undefined || value === "") {
              return NaN;
            }
            return Number(value);
          })
          .filter((val) => !isNaN(val) && isFinite(val));

        if (values.length === 0) {
          return {
            column: col,
            sum: 0,
            avg: 0,
            min: 0,
            max: 0,
            count: 0,
            trendPercent: 0,
            isPositiveTrend: false,
            stdDev: 0,
            variance: 0,
          };
        }

        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Calculate variance and standard deviation
        const variance =
          values.reduce((s, val) => s + Math.pow(val - avg, 2), 0) /
          values.length;
        const stdDev = Math.sqrt(variance);

        let trendPercent = 0;
        let isPositiveTrend = false;
        if (values.length >= 4) {
          const midPoint = Math.floor(values.length / 2);
          const firstHalf = values.slice(0, midPoint);
          const secondHalf = values.slice(midPoint);
          if (firstHalf.length > 0 && secondHalf.length > 0) {
            const firstAvg =
              firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg =
              secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            if (firstAvg !== 0) {
              trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100;
              isPositiveTrend = trendPercent > 0;
            }
          }
        }

        return {
          column: col,
          sum: Number(sum.toFixed(2)),
          avg: Number(avg.toFixed(2)),
          min: Number(min.toFixed(2)),
          max: Number(max.toFixed(2)),
          count: values.length,
          trendPercent: Number(trendPercent.toFixed(2)),
          isPositiveTrend,
          stdDev: Number(stdDev.toFixed(2)),
          variance: Number(variance.toFixed(2)),
        };
      });

      return calculations.filter((calc) => calc.count > 0);
    } catch (err) {
      console.error("Erreur lors du calcul des statistiques:", err);
      return null;
    }
  }, [data, numericColumns]);

  // Memoize chart data preparation
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    try {
      const validData = data
        .filter((row) => row && typeof row === "object")
        .slice(0, 50)
        .map((row, index) => {
          const cleanedRow: { [key: string]: any } = { index: index + 1 };
          columns.forEach((col) => {
            if (col && typeof col === "string") {
              const value = (row as DataRow)[col];
              if (value === null || value === undefined) {
                cleanedRow[col] = 0;
              } else if (typeof value === "string") {
                const numValue = Number(value.trim());
                cleanedRow[col] =
                  !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
              } else {
                cleanedRow[col] = value;
              }
            }
          });
          return cleanedRow;
        });
      return validData;
    } catch (err) {
      console.error(
        "Erreur lors de la préparation des données graphiques:",
        err
      );
      return [];
    }
  }, [data, columns]);

  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#F97316",
    "#84CC16",
  ];

  const handleExport = async (
    ref: React.RefObject<HTMLDivElement>,
    fileName: string,
    format: "png" | "svg"
  ) => {
    if (ref.current) {
      const node = ref.current;
      try {
        let dataUrl: string;
        if (format === "png") {
          dataUrl = await htmlToImage.toPng(node, {
            backgroundColor: "white",
            pixelRatio: 2,
          });
        } else {
          dataUrl = await htmlToImage.toSvg(node, {
            backgroundColor: "white",
          });
        }
        const link = document.createElement("a");
        link.download = `${fileName}.${format}`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error("Erreur lors de l'exportation du graphique:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Traitement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Erreur de données
          </h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Badge variant="destructive">Données invalides</Badge>
        </div>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <BarChart3 className="relative h-20 w-20 mx-auto text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Tableau de Bord Analytics
          </h3>
          <p className="text-slate-600 text-lg mb-6">
            Importez des données pour voir vos métriques et analyses
          </p>
          <Badge variant="outline" className="text-base px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Prêt pour l&apos;analyse
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">
            Tableau de Bord
          </h3>
          <p className="text-slate-600 text-lg">
            Vue d&apos;ensemble de vos données et métriques clés
          </p>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-base px-4 py-2">
          <Activity className="h-4 w-4 mr-2" />
          {data.length} entrées
        </Badge>
      </div>

      {/* Key Metrics */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.slice(0, 4).map((stat, index) => (
            <Card
              key={`${stat.column}-${index}`}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 truncate">
                  {stat.column}
                </CardTitle>
                <div className="p-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 flex-shrink-0">
                  {index === 0 && (
                    <DollarSign className="h-5 w-5 text-green-600" />
                  )}
                  {index === 1 && (
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  )}
                  {index === 2 && <Users className="h-5 w-5 text-purple-600" />}
                  {index === 3 && (
                    <Target className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-slate-900">
                  {stat.sum.toLocaleString()}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Moy: {stat.avg.toFixed(1)} | Écart-type:{" "}
                    {stat.stdDev.toFixed(1)}
                  </p>
                  <div className="flex items-center gap-1">
                    {stat.isPositiveTrend ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.isPositiveTrend ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {Math.abs(stat.trendPercent).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Trend Chart */}
        {selectedLineChartColumns.length > 0 && chartData.length > 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Évolution Temporelle
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleExport(lineChartRef, "evolution-temporelle", "png")
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Analyse des tendances et patterns dans le temps
              </CardDescription>
              <div className="flex space-x-2">
                <Select
                  value={selectedLineChartColumns[0]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedLineChartColumns];
                    newColumns[0] = value;
                    setSelectedLineChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedLineChartColumns[1]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedLineChartColumns];
                    newColumns[1] = value;
                    setSelectedLineChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedLineChartColumns[2]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedLineChartColumns];
                    newColumns[2] = value;
                    setSelectedLineChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={lineChartRef} className="bg-white p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="index"
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    {selectedLineChartColumns.map((col, index) => (
                      <Line
                        key={`line-${col}-${index}`}
                        type="monotone"
                        dataKey={col}
                        stroke={colors[index % colors.length]}
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Chart */}
        {selectedBarChartColumns.length > 0 && chartData.length > 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  Performance Comparative
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleExport(
                        barChartRef,
                        "performance-comparative",
                        "png"
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Comparaison des métriques principales
              </CardDescription>
              <div className="flex space-x-2">
                <Select
                  value={selectedBarChartColumns[0]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedBarChartColumns];
                    newColumns[0] = value;
                    setSelectedBarChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedBarChartColumns[1]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedBarChartColumns];
                    newColumns[1] = value;
                    setSelectedBarChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={barChartRef} className="bg-white p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="index"
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    {selectedBarChartColumns.map((col, index) => (
                      <Bar
                        key={`bar-${col}-${index}`}
                        dataKey={col}
                        fill={colors[index % colors.length]}
                        radius={[6, 6, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Area Chart */}
        {selectedAreaChartColumns.length > 0 && chartData.length > 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  Analyse Cumulative
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleExport(areaChartRef, "analyse-cumulative", "png")
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Visualisation des volumes et accumulations
              </CardDescription>
              <div className="flex space-x-2">
                <Select
                  value={selectedAreaChartColumns[0]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedAreaChartColumns];
                    newColumns[0] = value;
                    setSelectedAreaChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedAreaChartColumns[1]}
                  onValueChange={(value) => {
                    const newColumns = [...selectedAreaChartColumns];
                    newColumns[1] = value;
                    setSelectedAreaChartColumns(newColumns);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sélectionner une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={areaChartRef} className="bg-white p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="index"
                      stroke="#64748b"
                      fontSize={12}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    {selectedAreaChartColumns.map((col, index) => (
                      <Area
                        key={`area-${col}-${index}`}
                        type="monotone"
                        dataKey={col}
                        stackId="1"
                        stroke={colors[index % colors.length]}
                        fill={colors[index % colors.length]}
                        fillOpacity={0.7}
                        connectNulls={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scatter Chart (new) */}
        {selectedScatterX && selectedScatterY && chartData.length > 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <GitGraph className="h-5 w-5 text-white" />
                  </div>
                  Corrélation et Anomalies
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleExport(
                        scatterChartRef,
                        "correlation-anomalies",
                        "png"
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Visualisation de la relation entre deux variables.
              </CardDescription>
              <div className="flex space-x-2">
                <Select
                  value={selectedScatterX}
                  onValueChange={setSelectedScatterX}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Axe X" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedScatterY}
                  onValueChange={setSelectedScatterY}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Axe Y" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={scatterChartRef} className="bg-white p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey={selectedScatterX}
                      name={selectedScatterX}
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis
                      type="number"
                      dataKey={selectedScatterY}
                      name={selectedScatterY}
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Scatter
                      name="Corrélation"
                      data={chartData}
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Distribution Chart */}
        {stats && stats.length > 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Répartition des Valeurs
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleExport(pieChartRef, "repartition-valeurs", "png")
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Distribution et proportions des données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={pieChartRef} className="bg-white p-4 rounded-xl">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={stats.slice(0, 6).map((stat) => ({
                        name: stat.column,
                        value: Math.abs(stat.sum),
                        column: stat.column,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent! * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.slice(0, 6).map((entry, index) => (
                        <Cell
                          key={`cell-${entry.column}-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Data Quality Info */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Qualité des données: {data.length} lignes, {columns.length}{" "}
                colonnes
              </p>
              <p className="text-xs text-slate-600">
                Colonnes numériques détectées: {numericColumns.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

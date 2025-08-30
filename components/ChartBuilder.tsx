"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  Edit,
  Sparkles,
  LineChart,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart as ReLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/contexts/DataContext";
import type { ChartConfig } from "@/contexts/DataContext";
import html2canvas from "html2canvas";

export default function ChartBuilder() {
  const { data, columns, charts, addChart, removeChart } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    title: "",
    type: "line",
    xAxis: "",
    yAxis: [],
  });

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

  const chartTypes = [
    {
      value: "line",
      label: "Ligne",
      icon: LineChart,
      description: "Idéal pour les tendances",
    },
    {
      value: "bar",
      label: "Barres",
      icon: BarChart3,
      description: "Parfait pour les comparaisons",
    },
    {
      value: "area",
      label: "Aires",
      icon: LineChart,
      description: "Volumes cumulés",
    },
    {
      value: "pie",
      label: "Secteurs",
      icon: PieChart,
      description: "Répartitions",
    },
    {
      value: "radar",
      label: "Radar",
      icon: Sparkles,
      description: "Analyses multivariées",
    },
  ];

  const handleCreateChart = () => {
    if (!newChart.title || !newChart.xAxis || !newChart.yAxis?.length) {
      return;
    }

    const chart: ChartConfig = {
      id: Date.now().toString(),
      title: newChart.title,
      type: newChart.type as ChartConfig["type"],
      xAxis: newChart.xAxis,
      yAxis: newChart.yAxis,
      colors,
    };

    addChart(chart);
    setNewChart({ title: "", type: "line", xAxis: "", yAxis: [] });
    setIsDialogOpen(false);
  };

  const exportChart = async (chartId: string) => {
    const element = document.getElementById(`chart-${chartId}`);
    if (element) {
      const canvas = await html2canvas(element, {
        backgroundColor: "white",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `chart-${chartId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const renderChart = (chart: ChartConfig) => {
    const chartData = data.slice(0, 20);

    const chartProps = {
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chart.type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={chartData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={chart.xAxis} stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              {chart.yAxis.map((col, index) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: "white" }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              ))}
            </ReLineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={chart.xAxis} stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              {chart.yAxis.map((col, index) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={colors[index % colors.length]}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={chart.xAxis} stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              {chart.yAxis.map((col, index) => (
                <Area
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.8}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        const pieData = chart.yAxis.map((col, index) => ({
          name: col,
          value: data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0),
          fill: colors[index % colors.length],
        }));

        return (
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        );

      case "radar":
        const radarData = chartData.slice(0, 6);
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} {...chartProps}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey={chart.xAxis} className="text-xs" />
              <PolarRadiusAxis className="text-xs" />
              {chart.yAxis.map((col, index) => (
                <Radar
                  key={col}
                  name={col}
                  dataKey={col}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              ))}
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <BarChart3 className="relative h-20 w-20 mx-auto text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Constructeur de Graphiques
          </h3>
          <p className="text-slate-600 text-lg">
            Importez des données pour créer des visualisations personnalisées
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold text-slate-900 mb-2">
            Constructeur de Graphiques
          </h3>
          <p className="text-slate-600 text-lg">
            Créez des visualisations personnalisées et interactives
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 text-base px-6 py-3">
              <Plus className="h-5 w-5 mr-2" />
              Créer un graphique
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-blue-600" />
                Nouveau Graphique
              </DialogTitle>
              <DialogDescription className="text-base">
                Configurez votre visualisation personnalisée
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Titre du graphique
                </Label>
                <Input
                  id="title"
                  value={newChart.title || ""}
                  onChange={(e) =>
                    setNewChart({ ...newChart, title: e.target.value })
                  }
                  placeholder="Entrez un titre descriptif"
                  className="mt-2 text-base"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-base font-medium">
                  Type de graphique
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {chartTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <Card
                        key={type.value}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          newChart.type === type.value
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() =>
                          setNewChart({
                            ...newChart,
                            type: type.value as ChartConfig["type"],
                          })
                        }
                      >
                        <CardContent className="p-4 text-center">
                          <Icon
                            className={`h-8 w-8 mx-auto mb-2 ${
                              newChart.type === type.value
                                ? "text-blue-600"
                                : "text-slate-400"
                            }`}
                          />
                          <div
                            className={`font-medium ${
                              newChart.type === type.value
                                ? "text-blue-900"
                                : "text-slate-700"
                            }`}
                          >
                            {type.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {type.description}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="xAxis" className="text-base font-medium">
                    Axe X (horizontal)
                  </Label>
                  <Select
                    value={newChart.xAxis}
                    onValueChange={(value) =>
                      setNewChart({ ...newChart, xAxis: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionnez la colonne X" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="yAxis" className="text-base font-medium">
                    Axe Y (vertical)
                  </Label>
                  <Select
                    value={newChart.yAxis?.[0]}
                    onValueChange={(value) =>
                      setNewChart({ ...newChart, yAxis: [value] })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionnez la colonne Y" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns
                        .filter((col) => col !== newChart.xAxis)
                        .map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCreateChart}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-base py-3"
                disabled={
                  !newChart.title || !newChart.xAxis || !newChart.yAxis?.length
                }
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Créer le graphique
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Charts List */}
      {charts.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50">
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <Plus className="relative h-20 w-20 mx-auto text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Aucun graphique créé
              </h3>
              <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
                Commencez par créer votre premier graphique pour visualiser vos
                données
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="text-base px-6 py-3 hover:bg-blue-50 hover:border-blue-300"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Créer mon premier graphique
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {charts.map((chart) => (
            <Card
              key={chart.id}
              className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{chart.title}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {chart.type}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {chart.xAxis} vs {chart.yAxis.join(", ")}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportChart(chart.id)}
                    className="hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeChart(chart.id)}
                    className="hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  id={`chart-${chart.id}`}
                  className="bg-white rounded-lg p-4"
                >
                  {renderChart(chart)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

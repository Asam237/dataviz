"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Calculator,
  Target,
  Zap,
  Brain,
  BarChart2,
  Activity,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useData } from "@/contexts/DataContext";

interface AnalyticsResult {
  correlation: number;
  trend: "increasing" | "decreasing" | "stable";
  volatility: number;
  prediction: number;
  significance: "high" | "medium" | "low";
}

export default function AdvancedAnalytics() {
  const { data, columns } = useData();
  const [selectedXColumn, setSelectedXColumn] = useState<string>("");
  const [selectedYColumn, setSelectedYColumn] = useState<string>("");

  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      return data.some((row) => !isNaN(Number(row[col])) && row[col] !== "");
    });
  }, [columns, data]);

  const analytics = useMemo((): AnalyticsResult | null => {
    if (!selectedXColumn || !selectedYColumn || data.length < 2) return null;

    const xValues = data
      .map((row) => Number(row[selectedXColumn]))
      .filter((val) => !isNaN(val));
    const yValues = data
      .map((row) => Number(row[selectedYColumn]))
      .filter((val) => !isNaN(val));

    if (xValues.length < 2 || yValues.length < 2) return null;

    // Calcul de corrélation de Pearson
    const n = Math.min(xValues.length, yValues.length);
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const correlation = numerator / Math.sqrt(xDenominator * yDenominator);

    // Calcul de tendance
    const firstHalf = yValues.slice(0, Math.floor(n / 2));
    const secondHalf = yValues.slice(Math.floor(n / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (secondAvg > firstAvg * 1.05) trend = "increasing";
    else if (secondAvg < firstAvg * 0.95) trend = "decreasing";

    // Calcul de volatilité (coefficient de variation)
    const yStdDev = Math.sqrt(
      yValues.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0) / n
    );
    const volatility = (yStdDev / yMean) * 100;

    // Prédiction simple basée sur la tendance
    const prediction =
      trend === "increasing"
        ? secondAvg * 1.1
        : trend === "decreasing"
        ? secondAvg * 0.9
        : secondAvg;

    // Significance basée sur la corrélation
    const significance =
      Math.abs(correlation) > 0.7
        ? "high"
        : Math.abs(correlation) > 0.4
        ? "medium"
        : "low";

    return {
      correlation,
      trend,
      volatility,
      prediction,
      significance,
    };
  }, [data, selectedXColumn, selectedYColumn]);

  const scatterData = useMemo(() => {
    if (!selectedXColumn || !selectedYColumn) return [];

    return data
      .map((row, index) => ({
        x: Number(row[selectedXColumn]) || 0,
        y: Number(row[selectedYColumn]) || 0,
        index,
      }))
      .filter((point) => !isNaN(point.x) && !isNaN(point.y));
  }, [data, selectedXColumn, selectedYColumn]);

  const statisticsData = useMemo(() => {
    return numericColumns
      .map((col) => {
        const values = data
          .map((row) => Number(row[col]))
          .filter((val) => !isNaN(val));
        if (values.length === 0) return null;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const median = values.sort((a, b) => a - b)[
          Math.floor(values.length / 2)
        ];

        return {
          column: col,
          mean,
          median,
          stdDev,
          min,
          max,
          count: values.length,
          variance,
        };
      })
      .filter(Boolean);
  }, [data, numericColumns]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-16 w-16 mx-auto text-slate-400 mb-6" />
          <h3 className="text-2xl font-medium text-slate-900 mb-3">
            Analytics Avancées
          </h3>
          <p className="text-slate-600 text-lg">
            Importez des données pour accéder aux analyses avancées
          </p>
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
            Analytics Avancées
          </h3>
          <p className="text-slate-600 text-lg">
            Analyses statistiques et prédictives de vos données
          </p>
        </div>
      </div>

      {/* Correlation Analysis */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            Analyse de Corrélation
          </CardTitle>
          <CardDescription className="text-base">
            Découvrez les relations entre vos variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variable X
              </label>
              <Select
                value={selectedXColumn}
                onValueChange={setSelectedXColumn}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Sélectionnez la variable X" />
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variable Y
              </label>
              <Select
                value={selectedYColumn}
                onValueChange={setSelectedYColumn}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Sélectionnez la variable Y" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns
                    .filter((col) => col !== selectedXColumn)
                    .map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-600 mb-1">
                      Corrélation
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {analytics.correlation.toFixed(3)}
                    </div>
                    <Badge
                      variant={
                        analytics.significance === "high"
                          ? "default"
                          : analytics.significance === "medium"
                          ? "secondary"
                          : "outline"
                      }
                      className="mt-2"
                    >
                      {analytics.significance === "high"
                        ? "Forte"
                        : analytics.significance === "medium"
                        ? "Modérée"
                        : "Faible"}
                    </Badge>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-sm text-slate-600 mb-1">Tendance</div>
                    <div className="flex items-center gap-2">
                      {analytics.trend === "increasing" && (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      )}
                      {analytics.trend === "decreasing" && (
                        <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                      )}
                      {analytics.trend === "stable" && (
                        <Target className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="font-semibold text-slate-900 capitalize">
                        {analytics.trend === "increasing"
                          ? "Croissante"
                          : analytics.trend === "decreasing"
                          ? "Décroissante"
                          : "Stable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-sm text-slate-600 mb-1">Volatilité</div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={Math.min(analytics.volatility, 100)}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {analytics.volatility.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      Prédiction IA
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {analytics.prediction.toFixed(2)}
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    Valeur prédite suivante
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900 mb-4">
                  Graphique de Corrélation
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart data={scatterData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={selectedXColumn}
                      stroke="#64748b"
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={selectedYColumn}
                      stroke="#64748b"
                    />
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      labelFormatter={() => ""}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Scatter
                      dataKey="y"
                      fill="#3b82f6"
                      fillOpacity={0.7}
                      stroke="#1d4ed8"
                      strokeWidth={1}
                    />
                    {analytics.correlation > 0.5 && (
                      <ReferenceLine
                        segment={[
                          {
                            x: Math.min(...scatterData.map((d) => d.x)),
                            y: Math.min(...scatterData.map((d) => d.y)),
                          },
                          {
                            x: Math.max(...scatterData.map((d) => d.x)),
                            y: Math.max(...scatterData.map((d) => d.y)),
                          },
                        ]}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistical Summary */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            Résumé Statistique
          </CardTitle>
          <CardDescription className="text-base">
            Statistiques descriptives pour chaque variable numérique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {statisticsData.map((stat: any) => (
              <Card
                key={stat.column}
                className="border border-slate-200 hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{stat.column}</span>
                    <BarChart2 className="h-5 w-5 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Moyenne:</span>
                      <div className="font-semibold text-slate-900">
                        {stat.mean.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600">Médiane:</span>
                      <div className="font-semibold text-slate-900">
                        {stat.median.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600">Min:</span>
                      <div className="font-semibold text-slate-900">
                        {stat.min.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600">Max:</span>
                      <div className="font-semibold text-slate-900">
                        {stat.max.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-sm text-slate-600 mb-2">
                      Écart-type
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={Math.min((stat.stdDev / stat.mean) * 100, 100)}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-slate-900">
                        {stat.stdDev.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Échantillons: {stat.count}
                    </span>
                    <Badge variant="outline" size="sm">
                      CV: {((stat.stdDev / stat.mean) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            Insights et Recommandations
          </CardTitle>
          <CardDescription className="text-base">
            Analyses automatiques basées sur vos données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 text-lg">
                🔍 Observations Clés
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Données détectées:
                    </span>
                    <span className="text-slate-600 ml-2">
                      {data.length} lignes, {columns.length} colonnes
                    </span>
                  </div>
                </li>
                {numericColumns.length > 0 && (
                  <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <span className="font-medium text-slate-900">
                        Variables numériques:
                      </span>
                      <span className="text-slate-600 ml-2">
                        {numericColumns.length} colonnes analysables
                      </span>
                    </div>
                  </li>
                )}
                {analytics && (
                  <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <span className="font-medium text-slate-900">
                        Corrélation {selectedXColumn} - {selectedYColumn}:
                      </span>
                      <span className="text-slate-600 ml-2">
                        {Math.abs(analytics.correlation) > 0.7
                          ? "Forte relation"
                          : Math.abs(analytics.correlation) > 0.4
                          ? "Relation modérée"
                          : "Relation faible"}
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 text-lg">
                💡 Recommandations
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <span className="font-medium text-slate-900">
                      Visualisation:
                    </span>
                    <span className="text-slate-600 ml-2">
                      Utilisez des graphiques en ligne pour les tendances
                      temporelles
                    </span>
                  </div>
                </li>
                {analytics?.volatility && analytics.volatility > 30 && (
                  <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <span className="font-medium text-slate-900">
                        Attention:
                      </span>
                      <span className="text-slate-600 ml-2">
                        Forte volatilité détectée, analysez les outliers
                      </span>
                    </div>
                  </li>
                )}
                <li className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                  <div>
                    <span className="font-medium text-slate-900">Analyse:</span>
                    <span className="text-slate-600 ml-2">
                      Créez des segments pour une analyse plus granulaire
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Total des lignes
                </p>
                <p className="text-3xl font-bold">
                  {data.length.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Variables numériques
                </p>
                <p className="text-3xl font-bold">{numericColumns.length}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Calculator className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Analyses possibles
                </p>
                <p className="text-3xl font-bold">
                  {(numericColumns.length * (numericColumns.length - 1)) / 2}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Brain className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Qualité des données
                </p>
                <p className="text-3xl font-bold">
                  {data.length > 100
                    ? "Excellent"
                    : data.length > 50
                    ? "Bon"
                    : "Moyen"}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

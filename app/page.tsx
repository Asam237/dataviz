"use client";

import React, { useState } from "react";
import {
  Upload,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Download,
  Plus,
  FileText,
  Sparkles,
  Heart,
  Linkedin,
  Github,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataImport from "@/components/DataImport";
import ChartBuilder from "@/components/ChartBuilder";
import Dashboard from "@/components/Dashboard";
import DataTable from "@/components/DataTable";
import { DataProvider } from "@/contexts/DataContext";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";

export default function Home() {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <DataProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dataviz</h1>
                  <p className="text-sm text-gray-500">
                    Plateforme d&apos;analyse et de visualisation avancée
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden sm:flex items-center space-x-2 text-lg font-medium text-gray-700">
                  <Star className="h-6 w-6 text-yellow-500" />
                  <span>Free & Unlimited</span>
                </div>
                <a
                  href="https://github.com/Asam237"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-8 w-8 text-gray-700 hover:text-gray-900 transition-colors duration-200" />
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg animate-pulse">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Transformez vos données en insights
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Créez des visualisations professionnelles, analysez vos données en
              profondeur et prenez des décisions éclairées avec notre plateforme
              d&apos;analyse avancée
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">
                  Import Intelligent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 leading-relaxed">
                  Importez vos fichiers Excel, CSV avec détection automatique
                  des colonnes et validation des données
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">
                  Visualisations Avancées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 leading-relaxed">
                  Plus de 8 types de graphiques interactifs avec
                  personnalisation complète et animations fluides
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-900">
                  Analytics Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 leading-relaxed">
                  Analyses statistiques avancées, corrélations, tendances et
                  prédictions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-5 lg:w-fit bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-lg rounded-xl p-1">
                <TabsTrigger
                  value="import"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 rounded-lg"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 rounded-lg"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Tableau de bord</span>
                </TabsTrigger>
                <TabsTrigger
                  value="charts"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 rounded-lg"
                >
                  <LineChart className="h-4 w-4" />
                  <span className="hidden sm:inline">Graphiques</span>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 rounded-lg"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 rounded-lg"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Données</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-8">
              <TabsContent
                value="import"
                className="space-y-6 animate-in fade-in-50 duration-500"
              >
                <DataImport />
              </TabsContent>

              <TabsContent
                value="dashboard"
                className="space-y-6 animate-in fade-in-50 duration-500"
              >
                <Dashboard />
              </TabsContent>

              <TabsContent
                value="charts"
                className="space-y-6 animate-in fade-in-50 duration-500"
              >
                <ChartBuilder />
              </TabsContent>

              <TabsContent
                value="analytics"
                className="space-y-6 animate-in fade-in-50 duration-500"
              >
                <AdvancedAnalytics />
              </TabsContent>

              <TabsContent
                value="data"
                className="space-y-6 animate-in fade-in-50 duration-500"
              >
                <DataTable />
              </TabsContent>
            </div>
          </Tabs>
        </section>
      </div>
      {/* Footer */}
      <footer className="w-full py-8">
        <div className="container w-full mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex space-x-4 mb-4 md:mb-0 w-full">
            <a
              href="https://www.linkedin.com/in/abba-sali-aboubakar-mamate/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abba Sali"
              className="text-gray-400 hover:text-blue-600 transition-colors duration-300"
            >
              <Linkedin className="h-6 w-6" />
            </a>
            <a
              href="https://github.com/Asam237/dataviz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dataviz"
              className="text-gray-400 hover:text-gray-800 transition-colors duration-300"
            >
              <Github className="h-6 w-6" />
            </a>
          </div>
          <div className="flex items-center justify-end space-x-2 text-base text-gray-500 text-center w-full">
            <span>Réalisé avec</span>
            <Heart className="h-4 w-4 text-red-500 animate-pulse" />
            <span>par</span>
            <a
              className="text-gray-700 font-medium hover:underline hover:text-blue-600 transition-colors duration-300"
              href="https://abbasali.cm"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abba Sali
            </a>
          </div>
        </div>
      </footer>
    </DataProvider>
  );
}

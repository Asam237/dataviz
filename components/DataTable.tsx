"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Database,
  Eye,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData } from "@/contexts/DataContext";

export default function DataTable() {
  const { data, columns, filteredData, setFilteredData } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredData(data);
    } else {
      const filtered = data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(term.toLowerCase())
        )
      );
      setFilteredData(filtered);
    }
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    const direction =
      sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
    setSortColumn(column);
    setSortDirection(direction);

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === "asc") {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

    setFilteredData(sorted);
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const exportToCSV = () => {
    const csvContent = [
      columns.join(","),
      ...filteredData.map((row) =>
        columns.map((col) => `"${row[col] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "chartflow-export.csv";
    link.click();
  };

  const getColumnType = (column: string) => {
    const sampleValue = data.find((row) => row[column] != null)?.[column];
    if (sampleValue == null) return "text";
    return !isNaN(Number(sampleValue)) ? "number" : "text";
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <Database className="relative h-20 w-20 mx-auto text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Explorateur de Données
          </h3>
          <p className="text-slate-600 text-lg">
            Importez des données pour explorer et analyser vos datasets
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
            Explorateur de Données
          </h3>
          <p className="text-slate-600 text-lg">
            Explorez, filtrez et analysez vos données en détail
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-base px-4 py-2">
          <Eye className="h-4 w-4 mr-2" />
          Vue interactive
        </Badge>
      </div>

      {/* Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-slate-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-slate-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                Dataset Actuel
              </CardTitle>
              <CardDescription className="text-base">
                {filteredData.length.toLocaleString()} lignes • {columns.length}{" "}
                colonnes
                {searchTerm && ` • Filtré par "${searchTerm}"`}
              </CardDescription>
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="hover:bg-green-50 hover:border-green-300 transition-colors text-base px-6 py-3"
            >
              <Download className="h-5 w-5 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Rechercher dans toutes les colonnes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-11 text-base py-3"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-base text-slate-600 font-medium">
                {filteredData.length.toLocaleString()} résultat(s)
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearch("")}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Effacer
                </Button>
              )}
            </div>
          </div>

          {/* Column Types */}
          <div className="mt-4 flex flex-wrap gap-2">
            {columns.map((column) => (
              <Badge
                key={column}
                variant="outline"
                className={`${
                  getColumnType(column) === "number"
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                {column} (
                {getColumnType(column) === "number" ? "Numérique" : "Texte"})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-0 shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      className="cursor-pointer hover:bg-slate-100 transition-colors text-base font-semibold text-slate-700 py-4"
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column}</span>
                        <ArrowUpDown className="h-4 w-4 text-slate-400" />
                        {sortColumn === column && (
                          <span className="text-blue-600 font-bold">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column}
                        className="font-medium text-slate-700 py-4 text-base"
                      >
                        {getColumnType(column) === "number" &&
                        !isNaN(Number(row[column]))
                          ? Number(row[column]).toLocaleString()
                          : row[column]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-6 border-t border-slate-200 bg-slate-50/50">
              <div className="text-base text-slate-600 font-medium">
                Page {currentPage} sur {totalPages} • Affichage de{" "}
                {paginatedData.length} sur {filteredData.length} lignes
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

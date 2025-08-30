"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface DataRow {
  [key: string]: any;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: "line" | "bar" | "pie" | "area" | "radar";
  xAxis: string;
  yAxis: string[];
  colors?: string[];
}

interface DataContextType {
  data: DataRow[];
  isLoading: boolean;
  error: string | null;
  setData: (data: DataRow[]) => void;
  columns: string[];
  setColumns: (columns: string[]) => void;
  charts: ChartConfig[];
  setCharts: (charts: ChartConfig[]) => void;
  addChart: (chart: ChartConfig) => void;
  removeChart: (id: string) => void;
  filteredData: DataRow[];
  setFilteredData: (data: DataRow[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const addChart = (chart: ChartConfig) => {
    setCharts((prev) => [...prev, chart]);
  };

  const removeChart = (id: string) => {
    setCharts((prev) => prev.filter((chart) => chart.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        data,
        setData,
        columns,
        setColumns,
        charts,
        setCharts,
        addChart,
        removeChart,
        filteredData,
        setFilteredData,
        isLoading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

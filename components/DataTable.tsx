"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Search,
  Download,
  ArrowUpDown,
  Database,
  Eye,
  FileText,
  Sparkles,
  Pin,
  PinOff,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Clock,
  BarChart2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Columns,
  RefreshCw,
  Copy,
  Hash,
  Type,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useData } from "@/contexts/DataContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type ColType = "number" | "text" | "date" | "boolean";
type FilterOperator = "contains" | "equals" | "gt" | "lt" | "empty" | "notempty";

interface ColumnFilter {
  column: string;
  operator: FilterOperator;
  value: string;
}

interface SavedView {
  id: string;
  name: string;
  filters: ColumnFilter[];
  hiddenCols: string[];
  sortColumn: string | null;
  sortDir: "asc" | "desc";
  pinnedCols: string[];
  createdAt: string;
}

interface ColStats {
  type: ColType;
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  avg?: number;
  trend?: "up" | "down" | "flat";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectType(col: string, data: Record<string, unknown>[]): ColType {
  const sample = data.find((r) => r[col] != null)?.[col];
  if (sample == null) return "text";
  const s = String(sample).trim();
  if (!isNaN(Number(s)) && s !== "") return "number";
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return "date";
  if (["true", "false", "oui", "non", "yes", "no"].includes(s.toLowerCase())) return "boolean";
  return "text";
}

function computeColStats(col: string, type: ColType, data: Record<string, unknown>[]): ColStats {
  const nullCount = data.filter((r) => r[col] == null || r[col] === "").length;
  const unique = new Set(data.map((r) => r[col])).size;

  if (type !== "number") return { type, nullCount, uniqueCount: unique };

  const nums = data.map((r) => Number(r[col])).filter((n) => !isNaN(n) && isFinite(n));
  if (!nums.length) return { type, nullCount, uniqueCount: unique };

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const half = Math.floor(nums.length / 2);
  const firstAvg = nums.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
  const secondAvg = nums.slice(half).reduce((a, b) => a + b, 0) / (nums.length - half || 1);
  const trend: "up" | "down" | "flat" =
    secondAvg > firstAvg * 1.03 ? "up" : secondAvg < firstAvg * 0.97 ? "down" : "flat";

  return {
    type,
    nullCount,
    uniqueCount: unique,
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: Number(avg.toFixed(2)),
    trend,
  };
}

function applyFilter(row: Record<string, unknown>, f: ColumnFilter): boolean {
  const cellRaw = row[f.column];
  const cell = String(cellRaw ?? "").toLowerCase();
  const v = f.value.toLowerCase();
  switch (f.operator) {
    case "contains": return cell.includes(v);
    case "equals": return cell === v;
    case "gt": return !isNaN(Number(cellRaw)) && Number(cellRaw) > Number(v);
    case "lt": return !isNaN(Number(cellRaw)) && Number(cellRaw) < Number(v);
    case "empty": return cellRaw == null || cellRaw === "";
    case "notempty": return cellRaw != null && cellRaw !== "";
    default: return true;
  }
}

function formatCell(value: unknown, type: ColType): string {
  if (value == null || value === "") return "—";
  if (type === "number") {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  return String(value);
}

function qualityColor(pct: number) {
  if (pct >= 95) return "text-emerald-600";
  if (pct >= 80) return "text-amber-500";
  return "text-red-500";
}

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100, 200];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataTable() {
  const { data, columns, filteredData, setFilteredData } = useData();

  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [pinnedCols, setPinnedCols] = useState<string[]>([]);
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [highlightedCol, setHighlightedCol] = useState<string | null>(null);
  const [showQuality, setShowQuality] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{
    col: string;
    op: FilterOperator;
    val: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Column metadata ──────────────────────────────────────────────────────
  const colTypes = useMemo(
    () => Object.fromEntries(columns.map((c) => [c, detectType(c, data)])),
    [columns, data]
  );

  const colStats = useMemo(
    () => Object.fromEntries(columns.map((c) => [c, computeColStats(c, colTypes[c], data)])),
    [columns, colTypes, data]
  );

  const visibleCols = useMemo(
    () => [
      ...columns.filter((c) => pinnedCols.includes(c) && !hiddenCols.includes(c)),
      ...columns.filter((c) => !pinnedCols.includes(c) && !hiddenCols.includes(c)),
    ],
    [columns, pinnedCols, hiddenCols]
  );

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const processed = useMemo(() => {
    let rows = [...data];

    // global search
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        visibleCols.some((c) => String(row[c] ?? "").toLowerCase().includes(t))
      );
    }

    // column filters
    columnFilters.forEach((f) => {
      rows = rows.filter((row) => applyFilter(row, f));
    });

    // sort
    if (sortColumn) {
      const dir = sortDirection;
      rows.sort((a, b) => {
        const av = a[sortColumn];
        const bv = b[sortColumn];
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) return dir === "asc" ? an - bn : bn - an;
        const as = String(av ?? "").toLowerCase();
        const bs = String(bv ?? "").toLowerCase();
        return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }

    return rows;
  }, [data, searchTerm, columnFilters, sortColumn, sortDirection, visibleCols]);

  // sync to context
  React.useEffect(() => { setFilteredData(processed); }, [processed, setFilteredData]);

  const totalPages = Math.max(1, Math.ceil(processed.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return processed.slice(start, start + itemsPerPage);
  }, [processed, safePage, itemsPerPage]);

  // ── Quality score ──────────────────────────────────────────────────────
  const qualityScore = useMemo(() => {
    if (!data.length || !columns.length) return 100;
    const totalCells = data.length * columns.length;
    const nullCells = columns.reduce((acc, c) => acc + (colStats[c]?.nullCount ?? 0), 0);
    return Math.round(((totalCells - nullCells) / totalCells) * 100);
  }, [data, columns, colStats]);

  // ── Duplicate detection ────────────────────────────────────────────────
  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let dups = 0;
    data.forEach((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) dups++;
      else seen.add(key);
    });
    return dups;
  }, [data]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleSort = useCallback((col: string) => {
    setSortColumn((prev) => {
      if (prev === col) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDirection("asc");
      return col;
    });
    setCurrentPage(1);
  }, []);

  const togglePin = (col: string) =>
    setPinnedCols((p) => (p.includes(col) ? p.filter((c) => c !== col) : [...p, col]));

  const addFilter = () => {
    if (!activeFilter || !activeFilter.col) return;
    setColumnFilters((prev) => [
      ...prev.filter((f) => f.column !== activeFilter.col),
      { column: activeFilter.col, operator: activeFilter.op, value: activeFilter.val },
    ]);
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const removeFilter = (col: string) =>
    setColumnFilters((prev) => prev.filter((f) => f.column !== col));

  const saveView = () => {
    if (!viewName.trim()) return;
    setSavedViews((v) => [
      ...v,
      {
        id: Date.now().toString(),
        name: viewName,
        filters: columnFilters,
        hiddenCols,
        sortColumn,
        sortDir: sortDirection,
        pinnedCols,
        createdAt: new Date().toLocaleTimeString("fr-FR"),
      },
    ]);
    setViewName("");
  };

  const loadView = (v: SavedView) => {
    setColumnFilters(v.filters);
    setHiddenCols(v.hiddenCols);
    setSortColumn(v.sortColumn);
    setSortDirection(v.sortDir);
    setPinnedCols(v.pinnedCols);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const csv = [
      visibleCols.join(","),
      ...processed.map((row) => visibleCols.map((c) => `"${row[c] ?? ""}"`).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const copySelection = () => {
    const rows = paginatedData.filter((_, i) => selectedRows.has(i));
    const text = rows.map((r) => visibleCols.map((c) => r[c] ?? "").join("\t")).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRowSelect = (i: number) =>
    setSelectedRows((s) => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const selectAll = () =>
    setSelectedRows((s) =>
      s.size === paginatedData.length ? new Set() : new Set(paginatedData.map((_, i) => i))
    );

  // ── Type icon ──────────────────────────────────────────────────────────
  const TypeIcon = ({ type }: { type: ColType }) => {
    if (type === "number") return <Hash className="h-3 w-3" />;
    if (type === "date") return <Calendar className="h-3 w-3" />;
    return <Type className="h-3 w-3" />;
  };

  const TrendIcon = ({ trend }: { trend?: "up" | "down" | "flat" }) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-slate-400" />;
  };

  // ─── Empty State ─────────────────────────────────────────────────────────
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-500 rounded-full blur-2xl opacity-20 animate-pulse" />
            <Database className="relative h-20 w-20 mx-auto text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Explorateur de Données</h3>
          <p className="text-slate-500">Importez un fichier pour commencer l'exploration</p>
        </div>
      </div>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-5">

        {/* ── Top bar: title + quality badges ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Eye className="h-6 w-6 text-violet-500" />
              Explorateur de Données
            </h3>
            <p className="text-slate-500 text-sm mt-0.5">
              {data.length.toLocaleString("fr-FR")} lignes · {columns.length} colonnes ·{" "}
              {processed.length.toLocaleString("fr-FR")} résultats
            </p>
          </div>

          {/* Data quality pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuality((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition text-sm font-medium"
            >
              {qualityScore >= 95 ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : qualityScore >= 80 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={qualityColor(qualityScore)}>
                Qualité {qualityScore}%
              </span>
            </button>

            {duplicateCount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {duplicateCount} doublon{duplicateCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Quality breakdown panel ── */}
        {showQuality && (
          <Card className="border border-slate-100 shadow-sm bg-gradient-to-br from-slate-50 to-white">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-violet-500" />
                Qualité par colonne
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {columns.map((col) => {
                  const s = colStats[col];
                  const pct = Math.round(((data.length - s.nullCount) / data.length) * 100);
                  return (
                    <div key={col} className="bg-white rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{col}</span>
                        <span className={`text-xs font-bold ${qualityColor(pct)}`}>{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <TypeIcon type={s.type} />{" "}
                          {s.type === "number" ? "Num." : s.type === "date" ? "Date" : "Texte"}
                        </span>
                        <span>{s.uniqueCount} val.</span>
                        {s.trend && <TrendIcon trend={s.trend} />}
                      </div>
                      {s.type === "number" && s.min != null && (
                        <div className="text-xs text-slate-400 mt-1">
                          moy {s.avg?.toLocaleString("fr-FR")} · [{s.min?.toLocaleString("fr-FR")} – {s.max?.toLocaleString("fr-FR")}]
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Recherche globale…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Column filter builder */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {columnFilters.length > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-xs bg-violet-600 text-white">{columnFilters.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-3" align="start">
              <DropdownMenuLabel className="text-xs text-slate-500 font-medium mb-2">Ajouter un filtre</DropdownMenuLabel>
              <div className="space-y-2">
                <select
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                  value={activeFilter?.col ?? ""}
                  onChange={(e) => setActiveFilter({ col: e.target.value, op: "contains", val: "" })}
                >
                  <option value="">Colonne…</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {activeFilter?.col && (
                  <>
                    <select
                      className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                      value={activeFilter.op}
                      onChange={(e) => setActiveFilter({ ...activeFilter, op: e.target.value as FilterOperator })}
                    >
                      <option value="contains">Contient</option>
                      <option value="equals">Égal à</option>
                      <option value="gt">Supérieur à</option>
                      <option value="lt">Inférieur à</option>
                      <option value="empty">Est vide</option>
                      <option value="notempty">N'est pas vide</option>
                    </select>
                    {!["empty", "notempty"].includes(activeFilter.op) && (
                      <Input
                        className="h-8 text-sm"
                        placeholder="Valeur…"
                        value={activeFilter.val}
                        onChange={(e) => setActiveFilter({ ...activeFilter, val: e.target.value })}
                      />
                    )}
                    <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white h-8" onClick={addFilter}>
                      <Zap className="h-3.5 w-3.5 mr-1" /> Appliquer
                    </Button>
                  </>
                )}
              </div>
              {columnFilters.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <div className="space-y-1">
                    {columnFilters.map((f) => (
                      <div key={f.column} className="flex items-center justify-between text-xs bg-violet-50 rounded px-2 py-1.5">
                        <span className="text-violet-700 font-medium">{f.column}</span>
                        <span className="text-slate-500">{f.operator} {f.value}</span>
                        <button onClick={() => removeFilter(f.column)} className="text-slate-400 hover:text-red-500">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setColumnFilters([])}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Tout effacer
                    </button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Columns className="h-4 w-4" />
                Colonnes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel className="text-xs text-slate-500">Afficher / masquer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={!hiddenCols.includes(col)}
                  onCheckedChange={(c) =>
                    setHiddenCols((h) => c ? h.filter((x) => x !== col) : [...h, col])
                  }
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Bookmark className="h-4 w-4" />
                Vues
                {savedViews.length > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-xs bg-slate-600 text-white">{savedViews.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-3" align="start">
              <DropdownMenuLabel className="text-xs text-slate-500 mb-2">Sauvegarder la vue actuelle</DropdownMenuLabel>
              <div className="flex gap-1.5 mb-3">
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="Nom de la vue…"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveView()}
                />
                <Button size="sm" className="h-8 bg-slate-800 text-white hover:bg-slate-700" onClick={saveView}>
                  +
                </Button>
              </div>
              {savedViews.length > 0 && (
                <>
                  <DropdownMenuSeparator className="mb-2" />
                  <div className="space-y-1">
                    {savedViews.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => loadView(v)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{v.name}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{v.createdAt}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {v.filters.length} filtre{v.filters.length > 1 ? "s" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={copySelection}
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié!" : `Copier (${selectedRows.size})`}
              </Button>
            )}

            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                setSearchTerm("");
                setColumnFilters([]);
                setSortColumn(null);
                setCurrentPage(1);
              }}
              title="Réinitialiser"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {(columnFilters.length > 0 || searchTerm) && (
          <div className="flex flex-wrap gap-1.5">
            {searchTerm && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Search className="h-2.5 w-2.5" />
                "{searchTerm}"
                <button onClick={() => setSearchTerm("")} className="ml-1 text-slate-400 hover:text-red-500">×</button>
              </Badge>
            )}
            {columnFilters.map((f) => (
              <Badge key={f.column} variant="outline" className="gap-1 text-xs bg-violet-50 border-violet-200 text-violet-700">
                <SlidersHorizontal className="h-2.5 w-2.5" />
                {f.column} {f.operator} {f.value}
                <button onClick={() => removeFilter(f.column)} className="ml-1 hover:text-red-500">×</button>
              </Badge>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        <Card className="border border-slate-100 shadow-md overflow-hidden">
          <div ref={tableRef} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  {/* select-all checkbox */}
                  <TableHead className="w-10 px-3">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 accent-violet-600"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={selectAll}
                    />
                  </TableHead>
                  {/* row index */}
                  <TableHead className="w-12 text-xs text-slate-400 font-normal px-2">#</TableHead>

                  {visibleCols.map((col) => {
                    const s = colStats[col];
                    const isPinned = pinnedCols.includes(col);
                    const isHighlighted = highlightedCol === col;
                    return (
                      <TableHead
                        key={col}
                        className={`group cursor-pointer select-none transition-colors text-sm px-3 py-3 ${
                          isPinned ? "bg-violet-50/60" : ""
                        } ${isHighlighted ? "bg-amber-50" : "hover:bg-slate-100"}`}
                        onClick={() => handleSort(col)}
                        onMouseEnter={() => setHighlightedCol(col)}
                        onMouseLeave={() => setHighlightedCol(null)}
                      >
                        <div className="flex items-center gap-1.5 min-w-max">
                          <span className="text-slate-400">
                            <TypeIcon type={s.type} />
                          </span>
                          <span className="font-semibold text-slate-700">{col}</span>
                          {isPinned && <Pin className="h-2.5 w-2.5 text-violet-500" />}
                          <span className="text-slate-300">
                            {sortColumn === col ? (
                              sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-violet-500" /> : <ChevronDown className="h-3.5 w-3.5 text-violet-500" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                            )}
                          </span>
                          {/* Pin button on hover */}
                          <button
                            className="opacity-0 group-hover:opacity-100 transition ml-0.5"
                            onClick={(e) => { e.stopPropagation(); togglePin(col); }}
                            title={isPinned ? "Désépingler" : "Épingler"}
                          >
                            {isPinned ? (
                              <PinOff className="h-3 w-3 text-violet-400 hover:text-violet-600" />
                            ) : (
                              <Pin className="h-3 w-3 text-slate-300 hover:text-violet-500" />
                            )}
                          </button>
                          {/* Trend for numeric */}
                          {s.type === "number" && s.trend && (
                            <TrendIcon trend={s.trend} />
                          )}
                        </div>
                        {/* mini column stats bar */}
                        {s.type === "number" && s.min != null && s.max != null && s.avg != null && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-1 h-0.5 w-full bg-slate-200 rounded overflow-hidden">
                                <div
                                  className="h-full bg-violet-400 rounded"
                                  style={{
                                    width: `${((s.avg - s.min) / (s.max - s.min || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              min {s.min?.toLocaleString("fr-FR")} · moy {s.avg?.toLocaleString("fr-FR")} · max {s.max?.toLocaleString("fr-FR")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length + 2} className="text-center py-16 text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Aucun résultat pour cette recherche
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, rowIdx) => {
                    const globalIdx = (safePage - 1) * itemsPerPage + rowIdx;
                    const isSelected = selectedRows.has(rowIdx);
                    return (
                      <TableRow
                        key={rowIdx}
                        className={`border-b border-slate-50 transition-colors cursor-pointer ${
                          isSelected ? "bg-violet-50 hover:bg-violet-50" : "hover:bg-slate-50/80"
                        }`}
                        onClick={() => toggleRowSelect(rowIdx)}
                      >
                        <TableCell className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 accent-violet-600"
                            checked={isSelected}
                            onChange={() => toggleRowSelect(rowIdx)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-xs text-slate-300 font-mono">
                          {globalIdx + 1}
                        </TableCell>
                        {visibleCols.map((col) => {
                          const type = colTypes[col];
                          const raw = row[col];
                          const isEmpty = raw == null || raw === "";
                          const isHighlighted = highlightedCol === col;

                          return (
                            <TableCell
                              key={col}
                              className={`px-3 py-2.5 text-sm transition-colors ${
                                pinnedCols.includes(col) ? "bg-violet-50/40" : ""
                              } ${isHighlighted ? "bg-amber-50/60" : ""} ${
                                isEmpty ? "text-slate-300 italic" : "text-slate-700"
                              }`}
                            >
                              {isEmpty ? (
                                <span className="text-xs">vide</span>
                              ) : type === "boolean" ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    ["true", "oui", "yes"].includes(String(raw).toLowerCase())
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                      : "bg-red-50 border-red-200 text-red-700"
                                  }
                                >
                                  {String(raw)}
                                </Badge>
                              ) : (
                                formatCell(raw, type)
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>
                {selectedRows.size > 0
                  ? `${selectedRows.size} sélectionné(s) · `
                  : ""}
                {processed.length.toLocaleString("fr-FR")} ligne{processed.length > 1 ? "s" : ""}
              </span>
              <select
                className="text-sm border border-slate-200 rounded px-1.5 py-0.5 bg-white ml-2"
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(1)} disabled={safePage === 1}>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {/* page pills */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, safePage - 2)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 w-7 rounded text-xs font-medium transition ${
                          page === safePage
                            ? "bg-violet-600 text-white"
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}>
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* ── Inline summary bar ── */}
        <div className="flex flex-wrap gap-3">
          {columns
            .filter((c) => colTypes[c] === "number")
            .slice(0, 5)
            .map((col) => {
              const s = colStats[col];
              return (
                <div key={col} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg shadow-sm text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wide">{col}</span>
                  <span className="text-slate-700">moy <strong>{s.avg?.toLocaleString("fr-FR")}</strong></span>
                  {s.trend && <TrendIcon trend={s.trend} />}
                </div>
              );
            })}
        </div>
      </div>
    </TooltipProvider>
  );
}

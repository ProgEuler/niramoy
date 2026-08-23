"use client";

/**
 * `<AgTable>` — the single source of truth for every tabular view in the
 * Niramoy app. Built on `ag-grid-community` + `ag-grid-react` v36.
 *
 * Donated from another project; theme tokens swapped to this codebase's
 * `client/constants/colors.ts` and primitives re-pointed to shadcn/ui.
 *
 * Key deviations from the donor (see `unified-baking-zephyr.md`):
 *   - `disableExportDialogOnCellClick` prop to suppress the donor's
 *     auto-opened export dialog when `onRowClicked` is used for navigation.
 *   - `bulkSelect` prop replaces the donor's row-selection wiring (we drive
 *     it ourselves to keep the header checkbox tri-state honest).
 *   - `mode: "client" | "server"` + `totalRows` / `onPageChange` so pages
 *     that fetch with server pagination work without dragging all rows down.
 */

import * as React from "react";
import { useMemo, useRef, useCallback, useState } from "react";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type CellClickedEvent,
  type ICellRendererParams,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
  type SelectionChangedEvent,
  ModuleRegistry,
} from "ag-grid-community";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, type DateRange } from "@/components/ui/calendar";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AgTableProps } from "./type";

import "./ag-table.css";

// Register once at module load.
ModuleRegistry.registerModules([AllCommunityModule]);

function formatYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const baseTheme = themeQuartz.withParams({
  backgroundColor: "var(--background)",
  foregroundColor: "var(--foreground)",
  textColor: "var(--foreground)",
  headerTextColor: "var(--muted-foreground)",
  headerBackgroundColor: "var(--muted)",
  oddRowBackgroundColor: "var(--background)",
  borderColor: "var(--border)",
  headerColumnResizeHandleColor: "var(--border)",
  borderRadius: 6,
  headerHeight: 36,
  rowHeight: 36,
  wrapperBorderRadius: 6,
  borderWidth: 1,
  selectedRowBackgroundColor: "var(--secondary)",
  accentColor: "var(--primary)",
});

/**
 * Wrap a `{ row }` cell renderer into the ag-grid `ICellRendererParams` shape.
 * Stored in the `components` prop and looked up via `colDef.cellRenderer`.
 *
 * Also forwards `colDef.cellRendererParams` as additional props, so action
 * cells can receive callbacks like `{ onEdit, onDelete }` from the page.
 */
function makeCellRendererAdapter<TData>(
  Component: React.ComponentType<Record<string, unknown> & { row: TData }>,
): React.FC<any> {
  const Adapter: React.FC<any> = (props) => {
    // In ag-grid-react, params are spread directly as props to the component.
    const p = props as ICellRendererParams<TData> & Record<string, unknown>;
    if (!p?.data) return null;
    // Strip ag-grid's own keys before forwarding `cellRendererParams` so the
    // consumer sees only what it explicitly asked for.
    const {
      data: _data,
      node: _node,
      colDef: _colDef,
      column: _column,
      api: _api,
      context: _context,
      value: _value,
      valueFormatted: _vf,
      rowIndex: _ri,
      eGridCell: _e,
      ...rest
    } = p;
    return <Component row={p.data} {...rest} />;
  };
  return Adapter;
}

export function AgTable<TData extends object>({
  rowData,
  columnDefs,
  showRowNumberColumn = true,
  defaultColDef,
  components,
  height = "70vh",
  minHeight = 520,
  pagination = false,
  pageSize = 20,
  mode = "client",
  totalRows,
  onPageChange,
  rowSelection,
  bulkSelect,
  onSelectionChanged,
  onRowClicked,
  disableExportDialogOnCellClick = false,
  loading = false,
  noRowsText = "No records found",
  theme,
  gridOptions,
}: AgTableProps<TData>) {
  const gridApiRef = useRef<GridApi<TData> | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [dateField, setDateField] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const hasExplicitNoColumn = useMemo(() => {
    const isNoHeader = (value: unknown) => {
      const text = typeof value === "string" ? value.trim().toLowerCase() : "";
      return text === "no" || text === "no." || text === "#";
    };
    return columnDefs.some((column) => {
      const field = typeof column.field === "string" ? column.field : "";
      const colId = typeof column.colId === "string" ? column.colId : "";
      const normalizedField = field.trim().toLowerCase();
      const normalizedColId = colId.trim().toLowerCase();
      return (
        normalizedField === "no" ||
        normalizedColId === "no" ||
        isNoHeader(column.headerName)
      );
    });
  }, [columnDefs]);

  const rowNumberColumnDef = useMemo<ColDef<TData>>(
    () => ({
      headerName: "No.",
      colId: "__rowNumber",
      flex: 0,
      minWidth: 60,
      width: 60,
      maxWidth: 70,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: "text-center",
      headerClass: "text-center",
      valueGetter: (params) => {
        const rowIndex = params.node?.rowIndex;
        if (rowIndex === null || rowIndex === undefined) return "";
        return rowIndex + 1;
      },
    }),
    [],
  );

  // Bulk-select checkbox column.
  const bulkSelectColumnDef = useMemo<ColDef<TData> | null>(() => {
    if (!bulkSelect?.enabled) return null;
    return {
      headerName: "",
      colId: "__bulkSelect",
      flex: 0,
      width: 44,
      minWidth: 44,
      maxWidth: 44,
      pinned: "left",
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: "flex items-center justify-center",
      headerClass: "flex items-center justify-center",
      headerComponent: () => {
        const selectable =
          (rowData ?? []).filter((r) =>
            bulkSelect.isRowSelectable ? bulkSelect.isRowSelectable(r) : true,
          ) ?? [];
        const selectedCount = selectable.filter((r) =>
          bulkSelect.selectedIds.has(bulkSelect.getRowId(r)),
        ).length;
        const allChecked =
          selectable.length > 0 && selectedCount === selectable.length;
        const someChecked =
          selectedCount > 0 && selectedCount < selectable.length;
        return (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={() => bulkSelect.onToggleAll()}
            className="size-3.5 cursor-pointer accent-[var(--primary)]"
          />
        );
      },
      cellRenderer: (params: { data?: TData }) => {
        if (!params.data) return null;
        const r = params.data;
        if (
          bulkSelect.isRowSelectable &&
          !bulkSelect.isRowSelectable(r)
        ) {
          return null;
        }
        const id = bulkSelect.getRowId(r);
        const checked = bulkSelect.selectedIds.has(id);
        return (
          <input
            type="checkbox"
            aria-label="Select row"
            checked={checked}
            onChange={() => bulkSelect.onToggle(id)}
            onClick={(e) => e.stopPropagation()}
            className="size-3.5 cursor-pointer accent-[var(--primary)]"
          />
        );
      },
    };
  }, [bulkSelect, rowData]);

  const resolvedColumnDefs = useMemo(() => {
    const base = showRowNumberColumn && !hasExplicitNoColumn
      ? [rowNumberColumnDef, ...columnDefs]
      : columnDefs;
    if (bulkSelectColumnDef) return [bulkSelectColumnDef, ...base];
    return base;
  }, [
    columnDefs,
    hasExplicitNoColumn,
    rowNumberColumnDef,
    showRowNumberColumn,
    bulkSelectColumnDef,
  ]);

  const resolvedTheme = useMemo(() => (theme ?? baseTheme) as never, [theme]);

  const mergedDefaultColDef = useMemo<ColDef<TData>>(
    () => ({
      flex: 1,
      minWidth: 150,
      resizable: true,
      filter: true,
      sortable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      ...defaultColDef,
    }),
    [defaultColDef],
  );

  // Resolve the consumer's `components` map into ag-grid's expected shape
  // (each entry being a component accepting `{ params }`).
  const agGridComponents = useMemo(() => {
    if (!components) return undefined;
    const out: Record<string, React.FC<any>> = {};
    for (const [name, Comp] of Object.entries(components)) {
      out[name] = makeCellRendererAdapter<TData>(
        Comp as React.ComponentType<Record<string, unknown> & { row: TData }>,
      );
    }
    return out;
  }, [components]);

  const exportableColumns = useMemo(
    () => columnDefs.filter((column) => Boolean(column.field) && !column.hide),
    [columnDefs],
  );

  const dateColumns = useMemo(
    () =>
      exportableColumns
        .map((column) => column.field)
        .filter(Boolean)
        .map((field) => String(field))
        .filter((field) => /date|at|updated|created/i.test(field)),
    [exportableColumns],
  );

  const csvEscape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };

  const buildCsv = (rows: TData[]) => {
    const headers = exportableColumns.map((column) =>
      csvEscape(column.headerName || String(column.field || "")),
    );
    const body = rows.map((row) =>
      exportableColumns
        .map((column) => {
          const field = column.field;
          if (!field) return csvEscape("");
          return csvEscape((row as Record<string, unknown>)[String(field)]);
        })
        .join(","),
    );
    return [headers.join(","), ...body].join("\n");
  };

  const downloadCsv = (rows: TData[]) => {
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `table-export-${timestamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const rows = rowData ?? [];
    let exportRows: TData[] = [];
    if (!dateField) {
      setExportMessage("Choose a date field.");
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      setExportMessage("Choose a date range.");
      return;
    }
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setExportMessage("Choose a valid date range.");
      return;
    }
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const fieldName = dateField as string;
    exportRows = rows.filter((row) => {
      const rawValue = (row as Record<string, unknown>)[fieldName];
      if (!rawValue) return false;
      const valueDate = new Date(String(rawValue));
      const valueTime = valueDate.getTime();
      return (
        !Number.isNaN(valueTime) &&
        valueTime >= startTime &&
        valueTime <= endTime
      );
    });
    if (!exportRows.length) {
      setExportMessage("No rows matched the selected filter.");
      return;
    }
    downloadCsv(exportRows);
    setExportMessage(
      `Exported ${exportRows.length} row${exportRows.length === 1 ? "" : "s"}.`,
    );
    setIsExportDialogOpen(false);
  };

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      gridApiRef.current = event.api;
      if (loading) event.api.showLoadingOverlay();
    },
    [loading],
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<TData>) => {
      if (!onSelectionChanged) return;
      const selected = event.api.getSelectedRows();
      onSelectionChanged(selected);
    },
    [onSelectionChanged],
  );

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<TData>) => {
      if (event.data) onRowClicked?.(event.data);
    },
    [onRowClicked],
  );

  const handleCellClicked = useCallback(
    (event: CellClickedEvent<TData>) => {
      if (disableExportDialogOnCellClick) return;

      // Skip when clicking an interactive element (button, checkbox, link).
      const target = event.event?.target;
      if (target instanceof HTMLElement) {
        const interactiveElement = target.closest(
          "button, input, select, textarea, a, label, [role='switch'], [data-cell-click-ignore]",
        );
        if (interactiveElement) return;
      }

      if (dateColumns.length > 0) {
        setDateField(String(dateColumns[0]));
      }
      setExportMessage(null);
      setDateRange(undefined);
      setIsExportDialogOpen(true);
    },
    [dateColumns, disableExportDialogOnCellClick],
  );

  // Server-pagination: total page count derived from totalRows + pageSize.
  const serverPaginationProps = useMemo(() => {
    if (mode !== "server") return null;
    const total = totalRows ?? 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return { total, pages };
  }, [mode, totalRows, pageSize]);

  const isAutoHeight = height === "auto";
  const containerStyle: React.CSSProperties = isAutoHeight
    ? { width: "100%" }
    : {
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        minHeight:
          typeof minHeight === "number" ? `${minHeight}px` : minHeight,
      };

  const useServerPaginator = mode === "server" && serverPaginationProps;

  return (
    <AgGridProvider modules={[AllCommunityModule]}>
      <div style={containerStyle} className="ag-theme-quartz">
        <AgGridReact<TData>
          rowData={rowData}
          columnDefs={resolvedColumnDefs}
          defaultColDef={mergedDefaultColDef}
          theme={resolvedTheme}
          domLayout={isAutoHeight ? "autoHeight" : "normal"}
          components={agGridComponents}
          rowSelection={rowSelection}
          onSelectionChanged={handleSelectionChanged}
          onGridReady={handleGridReady}
          onRowClicked={handleRowClicked}
          onCellClicked={handleCellClicked}
          pagination={useServerPaginator ? false : pagination}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          animateRows
          suppressMovableColumns={false}
          enableCellTextSelection
          noRowsOverlayComponent={() => (
            <span className="text-sm text-slate-400">{noRowsText}</span>
          )}
          {...gridOptions}
        />

        {/* Custom server-mode pagination footer. */}
        {useServerPaginator && (
          <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
              <span className="font-medium text-foreground">{serverPaginationProps.pages}</span>
              {" · "}
              <span className="font-medium text-foreground">{serverPaginationProps.total}</span> total
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => {
                  const next = currentPage - 1;
                  setCurrentPage(next);
                  onPageChange?.(next);
                }}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= serverPaginationProps.pages}
                onClick={() => {
                  const next = currentPage + 1;
                  setCurrentPage(next);
                  onPageChange?.(next);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Export table data</DialogTitle>
            <DialogDescription>
              Choose a date field and date range, then download the matching
              rows as CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-3">
              <Field>
                <FieldLabel>Date field</FieldLabel>
                <FieldContent>
                  <Select value={dateField} onValueChange={setDateField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date field" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateColumns.length > 0 ? (
                        dateColumns.map((field) => (
                          <SelectItem
                            key={String(field)}
                            value={String(field)}
                          >
                            {String(field)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          No date columns available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Date range</FieldLabel>
                <FieldContent>
                  <div className="rounded-md border border-input p-2">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(r) =>
                        setDateRange(
                          r instanceof Date ? { from: r } : (r ?? undefined),
                        )
                      }
                      numberOfMonths={2}
                      captionLayout="dropdown"
                    />
                  </div>
                  {dateRange?.from || dateRange?.to ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {dateRange.from
                        ? `From ${formatYMD(dateRange.from)}`
                        : "From not selected"}{" "}
                      {dateRange.to
                        ? `to ${formatYMD(dateRange.to)}`
                        : "to not selected"}
                    </p>
                  ) : null}
                </FieldContent>
              </Field>
            </div>

            {exportMessage ? (
              <p className="text-xs text-muted-foreground">{exportMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleExport}>
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgGridProvider>
  );
}

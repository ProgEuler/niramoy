"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";

/**
 * Cell renderer signature consumers write against — never touches ag-grid
 * types directly. Internally `AgTable` wraps each entry to call it with
 * `{ row: params.data, ...cellRendererParams }` (so action cells can
 * receive callbacks like `{ onEdit, onDelete }` from the page).
 *
 * The component must accept `{ row: TData }`. Additional props (callbacks,
 * pending flags, etc.) are passed through when `cellRendererParams` is
 * set on the column. To preserve type-safety, cast at the page boundary:
 * `components={{ actions: HospitalActionsCell as AgCellRenderer<Hospital> }}`.
 */
export type AgCellRenderer<TData> = React.ComponentType<
  { row: TData } & Record<string, unknown>
>;

/**
 * Map of renderer name → component. The component type is intentionally
 * loose (accepts any extra props) because action cells typically declare
 * their own narrow callback props.
 */
export type AgCellRendererMap<TData> = Record<
  string,
  React.ComponentType<{ row: TData } & Record<string, unknown>>
>;

/**
 * Tri-state header checkbox for bulk-select columns. `headerChecked`/`headerIndeterminate`
 * are computed by the page based on the row predicate.
 */
export interface AgBulkSelect<TData> {
  /** Show the checkbox column at all (e.g. only when pendingIds > 0). */
  enabled: boolean;
  /** Per-row predicate: returns true if the row is selectable. */
  isRowSelectable?: (row: TData) => boolean;
  /** Stable id accessor (typically `(row) => row.id`). */
  getRowId: (row: TData) => unknown;
  selectedIds: Set<unknown>;
  onToggle: (id: unknown) => void;
  onToggleAll: () => void;
}

export type AgPaginationMode = "client" | "server";

export interface AgTableProps<TData extends object> {
  rowData: TData[] | undefined;
  /**
   * Column definitions. Use `cellRenderer: "rendererName"` to reference a
   * renderer registered in `components`. The `field` is used for sort/filter
   * and (when set) for CSV export.
   */
  columnDefs: ColDef<TData>[];

  /** Pre-styled "No." row-index column; auto-suppressed if your `columnDefs` already declares a "No" column. */
  showRowNumberColumn?: boolean;

  /** Ag-grid `defaultColDef` overrides. */
  defaultColDef?: ColDef<TData>;

  /** Map of renderer name → React component. */
  components?: AgCellRendererMap<TData>;

  /** Container height. `"auto"` switches to `domLayout="autoHeight"`. */
  height?: number | string | "auto";
  minHeight?: number;

  /** Local (client-side) pagination via ag-grid. Ignored when `mode === "server"`. */
  pagination?: boolean;
  pageSize?: number;

  /** Server vs client pagination. Default "client". */
  mode?: AgPaginationMode;
  /** Required when `mode === "server"`; total rows across all pages. */
  totalRows?: number;
  /** Page-change callback when `mode === "server"`. */
  onPageChange?: (page: number) => void;

  /** Ag-grid row selection (multi). */
  rowSelection?: "single" | "multiple";

  /** Bulk-select column. */
  bulkSelect?: AgBulkSelect<TData>;

  /** Fired when ag-grid's selection changes (only if `rowSelection` set). */
  onSelectionChanged?: (selected: TData[]) => void;

  /** Fired when a row body cell is clicked (no buttons/inputs). */
  onRowClicked?: (row: TData) => void;

  /**
   * Suppress the donor's cell-click → export-dialog behavior. Pages that use
   * `onRowClicked` for navigation (e.g. side-panel) must set this to `true`
   * so cell clicks don't open the export dialog.
   */
  disableExportDialogOnCellClick?: boolean;

  /** Loading overlay while data is fetching. */
  loading?: boolean;

  /** Empty state copy. */
  noRowsText?: string;

  /** Theme override (defaults to the niramoy-themed `themeQuartz` instance). */
  theme?: unknown;

  /** Spread last so consumers can override any of the above. */
  gridOptions?: Record<string, unknown>;

  /** Helper for cell-renderer params; not used directly. */
  _cellParams?: never;
}

/** Type helper: extract the typed params passed to a cell renderer. */
export type AgCellParams<TData> = ICellRendererParams<TData>;
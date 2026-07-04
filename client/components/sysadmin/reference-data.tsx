"use client";

/**
 * Page-19 Reference Data (system admin).
 *
 * Three sub-panels:
 *   1. Districts & Divisions — Add / rename / merge districts, assign per
 *      division. The 8 divisions are fixed; districts can be added or merged.
 *   2. Facility Categories — Manage bed types (ICU / NICU / CCU / HDU):
 *      description and an enable/disable toggle. Icons are derived from
 *      tabler-icons-react and stored by name.
 *   3. Ambulance Directory — Manage ambulance entries from the
 *      useAmbulanceStore. Add / edit / delete rows.
 *
 * All three panels are purely client-side; mutating toasts surface intent.
 */

import { useMemo, useState } from "react";
import {
  IconAmbulance,
  IconBuildingCommunity,
  IconCheck,
  IconCircleCheck,
  IconEdit,
  IconMap,
  IconPlus,
  IconShieldCheck,
  IconStethoscope,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { DIVISION_DISTRICTS } from "@/lib/use-districts";
import type { Ambulance } from "@/lib/types/ambulance";
import {
  ALL_BED_TYPES,
  ALL_DIVISIONS,
  type BangladeshDivision,
  type BedType,
} from "@/lib/types/hospital";

// Icon strings — translated to tabler icons at render time. (Storing the
// icon name keeps the JSX tree decoupled from import lists.)
const BED_ICONS: Record<BedType, string> = {
  icu: "stethoscope",
  nicu: "stethoscope",
  ccu: "stethoscope",
  hdu: "stethoscope",
};

interface Props {
  ambulances: Ambulance[];
}

export function ReferenceDataPanel({ ambulances }: Props) {
  return (
    <div className="space-y-4">
      <DistrictsDivisionsPanel />
      <FacilityCategoriesPanel />
      <AmbulanceDirectoryPanel ambulances={ambulances} />
    </div>
  );
}

// ── 1. Districts & Divisions ──────────────────────────────────────────────────

function DistrictsDivisionsPanel() {
  const { pushToast } = useToasts();
  // Deep clone the seed map so we can mutate freely.
  const [data, setData] = useState<Record<BangladeshDivision, string[]>>(() =>
    Object.fromEntries(
      ALL_DIVISIONS.map((d) => [d, [...DIVISION_DISTRICTS[d]]]),
    ) as Record<BangladeshDivision, string[]>,
  );
  const [addDistrict, setAddDistrict] = useState({
    name: "",
    division: "Dhaka" as BangladeshDivision,
  });
  const [renaming, setRenaming] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const totals = useMemo(() => {
    let districts = 0;
    for (const d of Object.values(data)) districts += d.length;
    return { divisions: Object.keys(data).length, districts };
  }, [data]);

  function addNew() {
    const name = addDistrict.name.trim();
    if (!name) {
      pushToast({ title: "District name required", variant: "error" });
      return;
    }
    const dup = Object.values(data).some((arr) =>
      arr.some((x) => x.toLowerCase() === name.toLowerCase()),
    );
    if (dup) {
      pushToast({
        title: "Already exists",
        description: `${name} is already listed.`,
        variant: "error",
      });
      return;
    }
    setData((d) => ({
      ...d,
      [addDistrict.division]: [
        ...d[addDistrict.division],
        name,
      ].sort((a, b) => a.localeCompare(b)),
    }));
    setAddDistrict((s) => ({ ...s, name: "" }));
    pushToast({
      title: "District added",
      description: `${name} → ${addDistrict.division}.`,
      variant: "success",
    });
  }

  function rename(oldKey: string) {
    if (!renaming) return;
    const newName = renaming.name.trim();
    if (!newName || newName === oldKey) {
      setRenaming(null);
      return;
    }
    const dup = Object.values(data).some((arr) =>
      arr.some(
        (x) =>
          x.toLowerCase() === newName.toLowerCase() && x !== oldKey,
      ),
    );
    if (dup) {
      pushToast({
        title: "Already exists",
        variant: "error",
      });
      return;
    }
    setData((d) => {
      const next: Record<BangladeshDivision, string[]> = { ...d };
      for (const div of ALL_DIVISIONS) {
        if (div !== renaming.divisionsAnchor) continue;
      }
      // Find which division currently owns `oldKey`.
      const owner = ALL_DIVISIONS.find((dv) =>
        (d[dv] as readonly string[]).includes(oldKey),
      );
      if (!owner) return d;
      next[owner] = (d[owner] as readonly string[])
        .map((x) => (x === oldKey ? newName : x))
        .sort((a, b) => a.localeCompare(b));
      return next;
    });
    void renaming;
    pushToast({
      title: `Renamed to ${newName}`,
      variant: "success",
    });
    setRenaming(null);
  }

  function startRename(d: string) {
    setRenaming({ key: d, name: d });
  }

  function remove(d: string) {
    const ok = window.confirm(
      `Remove ${d}? Hospitals in this district will need a new mapping.`,
    );
    if (!ok) return;
    setData((data) => {
      const next: Record<BangladeshDivision, string[]> = { ...data };
      for (const div of ALL_DIVISIONS) {
        next[div] = (data[div] as readonly string[]).filter(
          (x) => x !== d,
        );
      }
      return next;
    });
    pushToast({
      title: `${d} removed`,
      variant: "info",
    });
  }

  function move(d: string, target: BangladeshDivision) {
    if (!target) return;
    setData((data) => {
      const next: Record<BangladeshDivision, string[]> = { ...data };
      const owner = ALL_DIVISIONS.find((dv) =>
        (data[dv] as readonly string[]).includes(d),
      );
      if (!owner || owner === target) return data;
      next[owner] = (data[owner] as readonly string[]).filter(
        (x) => x !== d,
      );
      next[target] = [...data[target], d].sort((a, b) =>
        a.localeCompare(b),
      );
      return next;
    });
    pushToast({
      title: `Moved ${d}`,
      description: `Now under ${target}.`,
      variant: "success",
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconMap className="size-4 text-niramoy-teal" />
              Districts & Divisions
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {totals.districts} districts across {totals.divisions} divisions.
              Add or rename districts, or move a district to a different
              division.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="New district name"
              className="h-8 w-44"
              value={addDistrict.name}
              onChange={(e) =>
                setAddDistrict((s) => ({ ...s, name: e.target.value }))
              }
            />
            <select
              aria-label="Division to add to"
              className="h-8 rounded-md border bg-input/30 px-2 text-xs"
              value={addDistrict.division}
              onChange={(e) =>
                setAddDistrict((s) => ({
                  ...s,
                  division: e.target.value as BangladeshDivision,
                }))
              }
            >
              {ALL_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              onClick={addNew}
              className="h-8 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
            >
              <IconPlus className="size-3" />
              Add
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {ALL_DIVISIONS.map((div) => (
            <div
              key={div}
              className="rounded-md border bg-card p-3"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-niramoy-teal">
                  {div}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {(data[div] as readonly string[]).length} districts
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {(data[div] as readonly string[]).map((d) => {
                  const isRenaming = renaming?.key === d;
                  return (
                    <li
                      key={d}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground",
                        isRenaming && "border-niramoy-teal/40 bg-niramoy-teal/5",
                      )}
                    >
                      {isRenaming ? (
                        <>
                          <input
                            autoFocus
                            className="h-6 w-24 rounded-sm border bg-card px-1.5 text-[11px]"
                            value={renaming!.name}
                            onChange={(e) =>
                              setRenaming({ key: d, name: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") rename(d);
                              if (e.key === "Escape") setRenaming(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => rename(d)}
                            className="rounded-sm p-0.5 text-emerald-600 hover:bg-emerald-500/10"
                            aria-label="Save"
                          >
                            <IconCheck className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenaming(null)}
                            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted"
                            aria-label="Cancel"
                          >
                            <IconX className="size-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="truncate">{d}</span>
                          <button
                            type="button"
                            onClick={() => startRename(d)}
                            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Rename ${d}`}
                          >
                            <IconEdit className="size-3" />
                          </button>
                          <select
                            aria-label={`Move ${d}`}
                            className="rounded-sm border bg-card px-1 text-[10px]"
                            value=""
                            onChange={(e) => {
                              if (e.target.value)
                                move(d, e.target.value as BangladeshDivision);
                              e.target.value = "";
                            }}
                          >
                            <option value="">Move…</option>
                            {ALL_DIVISIONS.filter((x) => x !== div).map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => remove(d)}
                            className="rounded-sm p-0.5 text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${d}`}
                          >
                            <IconTrash className="size-3" />
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 2. Facility Categories ───────────────────────────────────────────────────

interface Category {
  type: BedType;
  label: string;
  description: string;
  iconKey: string;
  enabled: boolean;
}

const DEFAULT_CATEGORIES: Category[] = ALL_BED_TYPES.map((t) => ({
  type: t,
  label: t.toUpperCase(),
  description:
    t === "icu"
      ? "Intensive Care Unit — for critically ill adults."
      : t === "nicu"
        ? "Neonatal ICU — for newborns up to 28 days."
        : t === "ccu"
          ? "Cardiac Care Unit — for cardiac patients."
          : "High Dependency Unit — for close monitoring.",
  iconKey: BED_ICONS[t],
  enabled: true,
}));

const BED_LABEL: Record<BedType, string> = {
  icu: "ICU",
  nicu: "NICU",
  ccu: "CCU",
  hdu: "HDU",
};

function FacilityCategoriesPanel() {
  const { pushToast } = useToasts();
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);

  function toggle(t: BedType) {
    setCategories((cs) =>
      cs.map((c) => (c.type === t ? { ...c, enabled: !c.enabled } : c)),
    );
    const next = categories.find((c) => c.type === t);
    pushToast({
      title: `${BED_LABEL[t]} ${next?.enabled ? "disabled" : "enabled"}`,
      variant: "info",
    });
  }

  function update(t: BedType, patch: Partial<Category>) {
    setCategories((cs) =>
      cs.map((c) => (c.type === t ? { ...c, ...patch } : c)),
    );
  }

  function add() {
    pushToast({
      title: "All categories exist",
      description: "Bed types are fixed for now; edit one instead.",
      variant: "info",
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconStethoscope className="size-4 text-niramoy-teal" />
              Facility categories
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Manage bed type definitions. Disable a type to stop accepting
              availability submissions for it.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={add}
            className="h-8 gap-1"
          >
            <IconPlus className="size-3" />
            Add type
          </Button>
        </div>

        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.type}
              className={cn(
                "rounded-md border bg-card p-3",
                !c.enabled && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md text-white",
                    c.enabled ? "bg-niramoy-teal" : "bg-muted-foreground",
                  )}
                  aria-hidden
                >
                  <IconStethoscope className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm font-semibold text-foreground">
                    {BED_LABEL[c.type]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.iconKey}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Enabled</span>
                  <input
                    type="checkbox"
                    className="size-3.5 accent-niramoy-teal"
                    checked={c.enabled}
                    onChange={() => toggle(c.type)}
                    aria-label={`Toggle ${BED_LABEL[c.type]}`}
                  />
                </label>
              </div>
              <textarea
                rows={2}
                value={c.description}
                onChange={(e) => update(c.type, { description: e.target.value })}
                className="border-input bg-input/20 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 mt-2 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                disabled={!c.enabled}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── 3. Ambulance Directory ────────────────────────────────────────────────────

function AmbulanceDirectoryPanel({ ambulances }: { ambulances: Ambulance[] }) {
  const { pushToast } = useToasts();
  const [list, setList] = useState<Ambulance[]>(ambulances);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Ambulance | null>(null);
  const [draft, setDraft] = useState<Ambulance | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Ambulance | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.district.toLowerCase().includes(q) ||
        a.phone.includes(q),
    );
  }, [list, query]);

  function startEdit(a: Ambulance) {
    setEditing(a);
    setDraft(a);
  }

  function saveEdit() {
    if (!editing || !draft) return;
    setList((prev) =>
      prev.map((a) => (a.id === editing.id ? draft : a)),
    );
    pushToast({
      title: `${draft.name} updated`,
      variant: "success",
    });
    setEditing(null);
    setDraft(null);
  }

  function remove(a: Ambulance) {
    const ok = window.confirm(`Remove ${a.name}?`);
    if (!ok) return;
    setList((prev) => prev.filter((x) => x.id !== a.id));
    pushToast({
      title: `${a.name} removed`,
      variant: "info",
    });
  }

  function startAdd() {
    setAdding(true);
    setAddDraft({
      id: `amb-${Date.now()}`,
      name: "",
      division: "Dhaka",
      district: "Dhaka",
      phone: "",
      type: "private",
      available24h: false,
    });
  }

  function saveAdd() {
    if (!addDraft || !addDraft.name.trim() || !addDraft.phone.trim()) {
      pushToast({
        title: "Name and phone are required",
        variant: "error",
      });
      return;
    }
    setList((prev) => [...prev, addDraft]);
    pushToast({
      title: `${addDraft.name} added`,
      variant: "success",
    });
    setAdding(false);
    setAddDraft(null);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold sm:text-base">
              <IconAmbulance className="size-4 text-niramoy-teal" />
              Ambulance directory
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {list.length} entries. Search by name, district, or phone.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Search…"
              className="h-8 w-44"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              onClick={startAdd}
              className="h-8 gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
            >
              <IconPlus className="size-3" />
              Add
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
            No ambulances match this search.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Location
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium">Phone</th>
                  <th className="px-3 py-2 text-left font-medium">24h</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t bg-card transition-colors hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {a.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div>{a.district}</div>
                      <div className="text-[10px]">{a.division}</div>
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {a.type}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`tel:${a.phone.replace(/\s+/g, "")}`}
                        className="tabular-nums text-niramoy-teal underline-offset-2 hover:underline"
                      >
                        {a.phone}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {a.available24h ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <IconCircleCheck className="size-3" />
                          24h
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Day only</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => startEdit(a)}
                          className="h-6 gap-1"
                        >
                          <IconEdit className="size-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => remove(a)}
                          aria-label={`Remove ${a.name}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <IconTrash className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {/* Modals: mounted after the card so they sit at the end of the DOM
          but still within the layout's ToastProvider boundary. */}
      {editing && draft && (
        <AmbulanceModal
          title="Edit ambulance"
          value={draft}
          onChange={setDraft}
          onCancel={() => {
            setEditing(null);
            setDraft(null);
          }}
          onConfirm={saveEdit}
        />
      )}
      {adding && addDraft && (
        <AmbulanceModal
          title="Add ambulance"
          value={addDraft}
          onChange={setAddDraft}
          onCancel={() => {
            setAdding(false);
            setAddDraft(null);
          }}
          onConfirm={saveAdd}
        />
      )}
    </Card>
  );
}

function AmbulanceModal({
  title,
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  title: string;
  value: Ambulance;
  onChange: (a: Ambulance) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-2 rounded-t-lg border bg-card p-4 shadow-lg sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold">
            <IconAmbulance className="size-4 text-niramoy-teal" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <IconX className="size-3.5" />
          </button>
        </div>
        <ModalField label="Name">
          <Input
            className="h-9"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </ModalField>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModalField label="Division">
            <select
              className="h-9 w-full rounded-md border bg-input/30 px-2 text-xs"
              value={value.division}
              onChange={(e) =>
                onChange({
                  ...value,
                  division: e.target.value as BangladeshDivision,
                })
              }
            >
              {ALL_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="District">
            <Input
              className="h-9"
              value={value.district}
              onChange={(e) =>
                onChange({ ...value, district: e.target.value })
              }
            />
          </ModalField>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModalField label="Type">
            <select
              className="h-9 w-full rounded-md border bg-input/30 px-2 text-xs"
              value={value.type}
              onChange={(e) =>
                onChange({
                  ...value,
                  type: e.target.value as Ambulance["type"],
                })
              }
            >
              <option value="government">Government</option>
              <option value="private">Private</option>
              <option value="ngo">NGO</option>
            </select>
          </ModalField>
          <ModalField label="Phone">
            <Input
              className="h-9"
              value={value.phone}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
            />
          </ModalField>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="size-3.5 accent-niramoy-teal"
            checked={value.available24h}
            onChange={(e) =>
              onChange({ ...value, available24h: e.target.checked })
            }
          />
          Available 24 hours
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className="h-8 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            <IconShieldCheck className="size-3" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// Silence unused icon import lint for icons used only in JSX paths we
// currently do not render (kept for future sub-panels).
void IconBuildingCommunity;
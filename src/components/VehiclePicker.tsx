import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, Search } from "lucide-react";
import { fetchMakes } from "@/lib/catalog";
import { decodeVin } from "@/lib/vin";

const sel = "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground";

export function VehiclePicker() {
  const nav = useNavigate();
  const { data: makes = [] } = useQuery({ queryKey: ["makes"], queryFn: fetchMakes });
  const [vin, setVin] = useState("");
  const [vinErr, setVinErr] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const models = makes.find((m) => m.id === make)?.vehicle_models ?? [];
  const m = models.find((x) => x.id === model);
  const years = m
    ? Array.from({ length: m.year_end - m.year_start + 1 }, (_, i) => m.year_end - i)
    : [];

  const onVin = () => {
    const r = decodeVin(vin);
    if (!r.valid) return setVinErr(r.error!);
    const mk = makes.find((x) => x.name_en.toLowerCase() === r.make!.toLowerCase());
    if (!mk) return setVinErr("الشركة غير متوفرة في الكتالوج بعد");
    setVinErr("");
    setMake(mk.id);
    setYear(r.year ? String(r.year) : "");
    setVinErr(`تم التعرف: ${mk.name_ar}${r.year ? " " + r.year : ""} — اختر الموديل لإكمال البحث`);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 text-card-foreground shadow-xl">
      <div>
        <label className="mb-1 block text-sm font-bold">البحث برقم الهيكل (VIN)</label>
        <div className="flex gap-2">
          <input
            dir="ltr"
            maxLength={17}
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="JTEBU5JR0K5123456"
            className={sel + " font-mono tracking-wider"}
          />
          <button
            onClick={onVin}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            <ScanLine className="h-4 w-4" />
            فك
          </button>
        </div>
        {vinErr && <p className="mt-1 text-xs text-muted-foreground">{vinErr}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          className={sel}
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
          }}
        >
          <option value="">الشركة</option>
          {makes.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name_ar}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!make}
        >
          <option value="">الموديل</option>
          {models.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name_ar}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!model}
        >
          <option value="">السنة</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={!model}
        onClick={() =>
          nav({ to: "/catalog", search: { model, year: year ? Number(year) : undefined } })
        }
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary font-bold text-secondary-foreground disabled:opacity-40"
      >
        <Search className="h-4 w-4" />
        اعرض القطع المتوافقة مع سيارتي
      </button>
    </div>
  );
}

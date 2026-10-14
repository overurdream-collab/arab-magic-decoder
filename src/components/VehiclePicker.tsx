import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, Search } from "lucide-react";
import { fetchMakes } from "@/lib/catalog";
import { decodeVin } from "@/lib/vin";
import { decodeVinOfficial } from "@/lib/nhtsa-vin";

const sel = "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground";

export function VehiclePicker() {
  const nav = useNavigate();
  const { data: makes = [] } = useQuery({ queryKey: ["makes"], queryFn: fetchMakes });
  const [vin, setVin] = useState("");
  const [vinErr, setVinErr] = useState("");
  const [vinBusy, setVinBusy] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const models = makes.find((m) => m.id === make)?.vehicle_models ?? [];
  const m = models.find((x) => x.id === model);
  const years = m
    ? Array.from({ length: m.year_end - m.year_start + 1 }, (_, i) => m.year_end - i)
    : [];

  const onVin = async () => {
    const raw = vin.trim().toUpperCase();
    const preliminary = decodeVin(raw);
    if (raw.length !== 17 || /[^A-HJ-NPR-Z0-9]/.test(raw)) {
      setVinErr(preliminary.error ?? "رقم الهيكل غير صالح.");
      return;
    }
    setVinBusy(true);
    setVinErr("");
    try {
      const result = await decodeVinOfficial(raw);
      const mk = makes.find((x) => x.name_en.toLowerCase() === result.make.toLowerCase());
      if (!mk) {
        setVinErr(
          `تم تحديد ${result.make} ${result.model} بواسطة NHTSA، لكنها غير موجودة في كتالوج قِطَع بعد. اختر سيارتك يدويًا.`,
        );
        return;
      }
      setMake(mk.id);
      const matchedModel = mk.vehicle_models.find(
        (x) => x.name_en.toLowerCase() === result.model.toLowerCase(),
      );
      if (
        matchedModel &&
        result.year !== null &&
        result.year >= matchedModel.year_start &&
        result.year <= matchedModel.year_end
      ) {
        setModel(matchedModel.id);
        setYear(String(result.year));
      } else {
        setModel("");
        setYear("");
      }
      setVinErr(
        `NHTSA: ${result.make} ${result.model} ${result.year ?? ""}. ${result.note} راجع الموديل والسنة قبل البحث.`,
      );
    } catch (error) {
      const mk = preliminary.make
        ? makes.find((x) => x.name_en.toLowerCase() === preliminary.make?.toLowerCase())
        : undefined;
      if (mk) {
        setMake(mk.id);
        setModel("");
        setYear("");
      }
      setVinErr(
        `${error instanceof Error ? error.message : "تعذر التحقق من رقم الهيكل."} ${mk ? "تم التعرف مبدئيًا على الشركة فقط؛ اختر الموديل والسنة يدويًا." : ""}`,
      );
    } finally {
      setVinBusy(false);
    }
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
            disabled={vinBusy}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
          >
            <ScanLine className="h-4 w-4" />
            {vinBusy ? "جارٍ التحقق…" : "فك"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          بالضغط على «فك»، يُرسل رقم الهيكل إلى NHTSA الأمريكية للتحقق، ولا نحفظه.
        </p>
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
        اعرض القطع المرشحة لسيارتي
      </button>
    </div>
  );
}

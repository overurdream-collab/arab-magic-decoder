import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseCatalogCsv, type CatalogCsvItem } from "@/lib/catalog-csv";

type PreviewItem = CatalogCsvItem & { action: "insert" | "update" };
type StagedBatch = {
  batch_id: string;
  added: number;
  updated: number;
  preview: PreviewItem[];
};

export function CatalogImport() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<CatalogCsvItem[]>([]);
  const [batch, setBatch] = useState<StagedBatch | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  async function chooseFile(file: File | undefined) {
    setBatch(null);
    setItems([]);
    setDone("");
    setError("");
    if (!file) return;
    setFileName(file.name);
    try {
      if (file.size > 128_000) throw new Error("الملف أكبر من الحد المسموح.");
      setItems(parseCatalogCsv(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ملف CSV غير صالح.");
    }
  }

  async function stage() {
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("admin_stage_catalog", {
      _items: items,
      _source: fileName,
    });
    setBusy(false);
    if (error) {
      setError("تعذّر إنشاء المعاينة الآمنة. ربما لم يتم تطبيق ترحيل الكتالوج في قاعدة البيانات: " + error.message);
      return;
    }
    setBatch(data as unknown as StagedBatch);
  }

  async function apply() {
    if (!batch || !window.confirm("تأكيد تحديث الكتالوج المركزي من الصفوف المعروضة؟")) return;
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("admin_commit_catalog", { _id: batch.batch_id });
    setBusy(false);
    if (error) {
      setError("لم ينجح تطبيق الاستيراد؛ لم يتم اعتماد الصفوف: " + error.message);
      return;
    }
    const result = data as unknown as { added: number; updated: number };
    setDone(`اكتمل الاستيراد: ${result.added} قطعة جديدة و${result.updated} قطعة محدثة.`);
    setBatch(null);
    setItems([]);
    await qc.invalidateQueries({ queryKey: ["admin-catalog"] });
    await qc.invalidateQueries({ queryKey: ["search"] });
    await qc.invalidateQueries({ queryKey: ["featured"] });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-bold">استيراد كتالوج OEM — مراجعة قبل التنفيذ</h2>
      <p className="text-sm text-muted-foreground">
        يتم التحقق من CSV أولًا، ثم رفع الصفوف إلى خادم قاعدة البيانات للمطابقة.
        لا تُغيّر خطوة المعاينة أي قطعة. بعد مراجعة الفروقات تؤكد التحديث يدويًا.
        لا يشمل هذا الاستيراد إثبات التوافق مع السيارات أو إضافة صور قطع.
      </p>
      <p className="text-xs" dir="ltr">oem_number,name_ar,name_en,category_slug,alt_numbers</p>
      <p className="text-xs text-muted-foreground">
        افصل الأرقام البديلة بعلامة |. الحد 200 صف و128 كيلوبايت لكل ملف.
      </p>
      <input type="file" accept=".csv,text/csv" aria-label="اختر ملف CSV" onChange={(e) => chooseFile(e.target.files?.[0])} />
      {items.length > 0 && !batch && (
        <div className="space-y-2">
          <p className="font-semibold">تم فحص {items.length} صفًا محليًا؛ لم تُكتب بيانات الكتالوج بعد.</p>
          <button className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50" disabled={busy} onClick={stage}>معاينة الفروقات على الخادم</button>
        </div>
      )}
      {batch && (
        <div className="space-y-3">
          <p className="font-semibold">جديد: {batch.added} — تحديث: {batch.updated}</p>
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full text-right text-sm">
              <thead><tr className="bg-muted"><th className="p-2">OEM</th><th className="p-2">القطعة</th><th className="p-2">الإجراء</th></tr></thead>
              <tbody>
                {batch.preview.map((item) => (
                  <tr key={item.oem_number} className="border-t">
                    <td className="p-2 font-mono">{item.oem_number}</td>
                    <td className="p-2">{item.name_ar}</td>
                    <td className="p-2">{item.action === "insert" ? "إضافة" : "تحديث"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50" disabled={busy} onClick={apply}>اعتماد الاستيراد</button>
          <button className="mr-2 rounded-lg border px-4 py-2" disabled={busy} onClick={() => setBatch(null)}>إلغاء المعاينة</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {done && <p role="status" className="text-sm font-bold">{done}</p>}
    </section>
  );
}

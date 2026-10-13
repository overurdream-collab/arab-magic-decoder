import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Store, Search, Plus, Pencil, Clock, XCircle, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthBox, useSession } from "@/components/AuthBox";
import { QUALITY, CONDITION, fmtYER } from "@/lib/catalog";
import { SELLER_TYPES } from "@/lib/seller-types";

export const Route = createFileRoute("/seller")({
  head: () => ({
    meta: [
      { title: "لوحة التاجر — قِطَع" },
      { name: "description", content: "أدر عروضك على الكتالوج المركزي: السعر بالريال اليمني والمخزون والجودة والضمان." },
      { property: "og:title", content: "لوحة التاجر — قِطَع" },
      { property: "og:description", content: "انضم كتاجر موثّق وأضف أسعارك على قطع الكتالوج المركزي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellerPage,
});

const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn = "rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";

function SellerPage() {
  const { session, ready } = useSession();
  if (!ready) return <main className="p-10 text-center text-muted-foreground">جارٍ التحميل…</main>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-black"><Store className="h-8 w-8 text-primary" />لوحة التاجر</h1>
        {session && <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /></button>}
      </div>
      {session ? <SellerGate userId={session.user.id} /> : <AuthBox title="سجّل الدخول للوحة التاجر" redirectPath="/seller" />}
    </main>
  );
}

function SellerGate({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["my-seller", userId],
    queryFn: async () => {
      const [s, a] = await Promise.all([
        supabase.from("sellers").select("*").eq("owner_id", userId).limit(1).maybeSingle(),
        supabase.from("seller_applications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (s.error) throw s.error; if (a.error) throw a.error;
      return { seller: s.data, apps: a.data };
    },
  });
  if (isLoading || !data) return <p className="text-muted-foreground">جارٍ التحقق من حساب التاجر…</p>;
  if (data.seller?.is_verified) return <Dashboard seller={data.seller} />;
  const pending = data.apps.find((a) => a.status === "pending");
  const last = data.apps[0];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted p-4 text-sm">هذا الحساب حساب عميل. لإضافة عروض أسعار يجب تقديم طلب انضمام كتاجر وموافقة إدارة المنصة عليه.</div>
      {pending ? (
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-6">
          <Clock className="mt-1 h-6 w-6 text-primary" />
          <div><p className="font-bold">طلبك «{pending.business_name}» قيد المراجعة</p><p className="text-sm text-muted-foreground">ستظهر لوحة التاجر هنا فور موافقة الإدارة. الطلب غير ظاهر للعامة.</p></div>
        </div>
      ) : (
        <>
          {last?.status === "rejected" && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card p-4 text-sm">
              <XCircle className="h-5 w-5 text-destructive" /><div>رُفض طلبك السابق{last.review_note ? `: ${last.review_note}` : ""}. يمكنك تقديم طلب جديد.</div>
            </div>
          )}
          <ApplyForm userId={userId} />
        </>
      )}
    </div>
  );
}

function ApplyForm({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ business_name: "", seller_type: "new_parts", city: "", district: "", phone: "", commercial_register: "", notes: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.from("seller_applications").insert({
      user_id: userId, business_name: f.business_name.trim(), seller_type: f.seller_type, city: f.city.trim(),
      district: f.district.trim() || null, phone: f.phone.trim(), commercial_register: f.commercial_register.trim() || null, notes: f.notes.trim() || null,
    });
    setBusy(false);
    if (error) setErr("تعذّر إرسال الطلب: تحقق من الحقول (الهاتف 6–20 خانة)."); else qc.invalidateQueries({ queryKey: ["my-seller"] });
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-6 sm:grid-cols-2">
      <p className="text-lg font-bold sm:col-span-2">طلب انضمام كتاجر</p>
      <input className={input} required minLength={2} maxLength={120} placeholder="اسم المحل / الشركة" value={f.business_name} onChange={set("business_name")} />
      <select className={input} value={f.seller_type} onChange={set("seller_type")}>
        {Object.entries(SELLER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input className={input} required minLength={2} placeholder="المدينة" value={f.city} onChange={set("city")} />
      <input className={input} placeholder="الحي / الشارع" value={f.district} onChange={set("district")} />
      <input className={input} required minLength={6} maxLength={20} placeholder="رقم الهاتف" dir="ltr" value={f.phone} onChange={set("phone")} />
      <input className={input} placeholder="رقم السجل التجاري (اختياري)" value={f.commercial_register} onChange={set("commercial_register")} />
      <textarea className={`${input} sm:col-span-2`} maxLength={1000} placeholder="ملاحظات (الوكالات التي تمثلها، التخصص…)" value={f.notes} onChange={set("notes")} />
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <button className={`${btn} sm:col-span-2`} disabled={busy}>إرسال الطلب للمراجعة</button>
    </form>
  );
}

type Seller = { id: string; name: string; city: string; seller_type: string };
type OfferForm = { price_yer: string; stock_qty: string; condition: string; quality_grade: string; warranty_months: string; delivery_days: string; origin_country: string; is_active: boolean };
const emptyOffer = (used: boolean): OfferForm => ({ price_yer: "", stock_qty: "1", condition: used ? "used" : "new", quality_grade: used ? "used" : "oem", warranty_months: "0", delivery_days: "1", origin_country: "", is_active: true });

function Dashboard({ seller }: { seller: Seller }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; partId: string; partName: string; form: OfferForm } | null>(null);
  const offers = useQuery({
    queryKey: ["my-offers", seller.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_offers")
        .select("*,catalog_parts(name_ar,oem_number)").eq("seller_id", seller.id).order("updated_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  const used = seller.seller_type === "used_parts";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div className="font-bold">{seller.name}</div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">{SELLER_TYPES[seller.seller_type] ?? seller.seller_type}</span>
        <span className="text-sm text-muted-foreground">{seller.city}</span>
        <span className="ms-auto text-sm">عدد العروض: {offers.data?.length ?? "…"}</span>
      </div>

      <CatalogPicker onPick={(p) => setEditing({ partId: p.id, partName: p.name_ar, form: emptyOffer(used) })} />

      {editing && (
        <OfferEditor key={editing.id ?? editing.partId} sellerId={seller.id} state={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["my-offers", seller.id] }); }} />
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-right"><tr>
            {["القطعة", "OEM", "السعر", "المخزون", "الحالة", "الجودة", "الضمان", "التوصيل", "نشط", ""].map((h) => <th key={h} className="p-3">{h}</th>)}
          </tr></thead>
          <tbody>
            {offers.data?.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 font-semibold">{o.catalog_parts?.name_ar}</td>
                <td className="p-3 font-mono" dir="ltr">{o.catalog_parts?.oem_number}</td>
                <td className="p-3">{fmtYER(Number(o.price_yer))}</td>
                <td className="p-3">{o.stock_qty}</td>
                <td className="p-3">{CONDITION[o.condition] ?? o.condition}</td>
                <td className="p-3">{QUALITY[o.quality_grade] ?? o.quality_grade}</td>
                <td className="p-3">{o.warranty_months} شهر</td>
                <td className="p-3">{o.delivery_days} يوم</td>
                <td className="p-3">{o.is_active ? "نعم" : "موقوف"}</td>
                <td className="p-3">
                  <button className="rounded border p-1.5" aria-label="تعديل" onClick={() => setEditing({
                    id: o.id, partId: o.part_id, partName: o.catalog_parts?.name_ar ?? "",
                    form: { price_yer: String(o.price_yer), stock_qty: String(o.stock_qty), condition: o.condition, quality_grade: o.quality_grade,
                      warranty_months: String(o.warranty_months), delivery_days: String(o.delivery_days), origin_country: o.origin_country ?? "", is_active: o.is_active },
                  })}><Pencil className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {offers.data?.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">لا توجد عروض بعد — ابحث في الكتالوج وأضف سعرك.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogPicker({ onPick }: { onPick: (p: { id: string; name_ar: string }) => void }) {
  const [q, setQ] = useState(""); const [term, setTerm] = useState("");
  const res = useQuery({
    queryKey: ["seller-cat-search", term], enabled: term.length >= 2,
    queryFn: async () => {
      const s = term.replace(/[%,()]/g, " ").trim();
      const { data, error } = await supabase.from("catalog_parts").select("id,name_ar,name_en,oem_number,alt_numbers")
        .or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,oem_number.ilike.%${s}%`).limit(20);
      if (error) throw error; return data;
    },
  });
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-2 font-bold">أضف قطعة من الكتالوج المركزي</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(q); }}>
        <input className={input} placeholder="ابحث بالاسم أو رقم OEM" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={btn}><Search className="h-4 w-4" /></button>
      </form>
      {res.data && (
        <ul className="mt-3 divide-y">
          {res.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span><b>{p.name_ar}</b> <span className="font-mono text-muted-foreground" dir="ltr">{p.oem_number}</span></span>
              <button className="flex items-center gap-1 rounded-lg border px-3 py-1" onClick={() => onPick(p)}><Plus className="h-4 w-4" />أضف سعري</button>
            </li>
          ))}
          {res.data.length === 0 && <li className="py-3 text-sm text-muted-foreground">لا نتائج. القطع الجديدة تُضاف للكتالوج عبر الإدارة فقط.</li>}
        </ul>
      )}
    </div>
  );
}

function OfferEditor({ sellerId, state, onClose, onSaved }: {
  sellerId: string; state: { id?: string; partId: string; partName: string; form: OfferForm }; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState(state.form); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof OfferForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const price = Number(f.price_yer), stock = Number(f.stock_qty), w = Number(f.warranty_months), d = Number(f.delivery_days);
    if (!(price > 0) || stock < 0 || w < 0 || w > 120 || d < 0 || d > 60) { setErr("قيم غير صالحة: السعر > 0، الضمان 0–120 شهر، التوصيل 0–60 يوم."); return; }
    setBusy(true);
    const row = { price_yer: price, stock_qty: Math.floor(stock), condition: f.condition, quality_grade: f.quality_grade,
      warranty_months: Math.floor(w), delivery_days: Math.floor(d), origin_country: f.origin_country.trim() || null, is_active: f.is_active };
    const r = state.id
      ? await supabase.from("seller_offers").update(row).eq("id", state.id).eq("seller_id", sellerId)
      : await supabase.from("seller_offers").insert({ ...row, seller_id: sellerId, part_id: state.partId });
    setBusy(false);
    if (r.error) setErr("تعذّر الحفظ — قد لا تملك صلاحية على هذا العرض."); else onSaved();
  }
  return (
    <form onSubmit={save} className="grid gap-3 rounded-2xl border-2 border-primary bg-card p-5 sm:grid-cols-4">
      <p className="font-bold sm:col-span-4">{state.id ? "تعديل عرض" : "عرض جديد"}: {state.partName}</p>
      <label className="text-xs">السعر (ر.ي)<input className={input} type="number" min={1} required value={f.price_yer} onChange={set("price_yer")} /></label>
      <label className="text-xs">المخزون<input className={input} type="number" min={0} value={f.stock_qty} onChange={set("stock_qty")} /></label>
      <label className="text-xs">الحالة<select className={input} value={f.condition} onChange={set("condition")}>{Object.entries(CONDITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-xs">الجودة<select className={input} value={f.quality_grade} onChange={set("quality_grade")}>{Object.entries(QUALITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-xs">الضمان (شهر)<input className={input} type="number" min={0} max={120} value={f.warranty_months} onChange={set("warranty_months")} /></label>
      <label className="text-xs">التوصيل (يوم)<input className={input} type="number" min={0} max={60} value={f.delivery_days} onChange={set("delivery_days")} /></label>
      <label className="text-xs">بلد المنشأ<input className={input} value={f.origin_country} onChange={set("origin_country")} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />عرض نشط</label>
      {err && <p className="text-sm text-destructive sm:col-span-4">{err}</p>}
      <div className="flex gap-2 sm:col-span-4">
        <button className={btn} disabled={busy}>حفظ</button>
        <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>إلغاء</button>
      </div>
    </form>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Gauge, Droplet, Plus, Star, AlertTriangle, CheckCircle2, Clock, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchMakes } from "@/lib/catalog";
import { decodeVin } from "@/lib/vin";

export const Route = createFileRoute("/garage")({
  head: () => ({
    meta: [
      { title: "سياراتي — قِطَع" },
      { name: "description", content: "احفظ سياراتك وتابع العداد وسجل الصيانة وتذكيرات تغيير الزيت." },
      { property: "og:title", content: "سياراتي — قِطَع" },
      { property: "og:description", content: "كراجك الرقمي: عداد، سجل صيانة وتذكيرات زيت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GaragePage,
});

const SERVICE: Record<string, string> = {
  oil_change: "تغيير زيت وفلتر", filters: "فلاتر", brake_pads: "فحمات فرامل", sparks: "بواجي", other: "أخرى",
};
const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn = "rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";

function GaragePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <main className="p-10 text-center text-muted-foreground">جارٍ التحميل…</main>;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-black"><Car className="h-8 w-8 text-primary" />سياراتي</h1>
      {session ? <Garage userId={session.user.id} /> : <AuthBox />}
    </main>
  );
}

function AuthBox() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/garage` } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === "up" && !r.data.session) setMsg("تم إنشاء الحساب — تحقق من بريدك لتأكيده ثم سجّل الدخول.");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl border bg-card p-6">
      <p className="font-bold">{mode === "in" ? "سجّل الدخول لحفظ سياراتك" : "إنشاء حساب جديد"}</p>
      {mode === "up" && <input className={input} placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />}
      <input className={input} type="email" required placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
      <input className={input} type="password" required minLength={6} placeholder="كلمة المرور" value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" />
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <button className={`${btn} w-full`} disabled={busy}>{mode === "in" ? "دخول" : "تسجيل"}</button>
      <button type="button" className="w-full text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </form>
  );
}

type Status = { level: "good" | "soon" | "over"; kmLeft: number; daysLeft: number | null; pct: number };
function status(mileage: number, log: { current_mileage: number; next_due_mileage: number; next_due_date: string | null }): Status {
  const kmLeft = log.next_due_mileage - mileage;
  const daysLeft = log.next_due_date ? Math.ceil((new Date(log.next_due_date).getTime() - Date.now()) / 86400000) : null;
  const span = Math.max(1, log.next_due_mileage - log.current_mileage);
  const pct = Math.max(0, Math.min(100, Math.round((kmLeft / span) * 100)));
  const level = kmLeft <= 0 || (daysLeft !== null && daysLeft <= 0) ? "over"
    : kmLeft <= 500 || (daysLeft !== null && daysLeft <= 14) ? "soon" : "good";
  return { level, kmLeft, daysLeft, pct };
}

function Garage({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const vehicles = useQuery({
    queryKey: ["garage", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_vehicles")
        .select("*,vehicle_makes(name_ar),vehicle_models(name_ar),vehicle_maintenance_logs(*)")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["garage", userId] });

  async function setActive(id: string) {
    await supabase.from("customer_vehicles").update({ is_active: false }).eq("user_id", userId);
    await supabase.from("customer_vehicles").update({ is_active: true }).eq("id", id);
    refresh();
  }

  const list = vehicles.data ?? [];
  const alerts = list.flatMap((v) => {
    const last = [...v.vehicle_maintenance_logs].sort((a, b) => b.service_date.localeCompare(a.service_date))[0];
    if (!last) return [];
    const s = status(v.current_mileage, last);
    return s.level === "good" ? [] : [{ v, s, last }];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{list.length} سيارة محفوظة</p>
        <div className="flex gap-2">
          <button className={btn} onClick={() => setAdding(!adding)}><Plus className="inline h-4 w-4" /> إضافة سيارة</button>
          <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /></button>
        </div>
      </div>

      {alerts.map(({ v, s, last }) => (
        <div key={v.id} className={`flex items-start gap-3 rounded-xl border p-4 ${s.level === "over" ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"}`}>
          <AlertTriangle className={`mt-0.5 h-5 w-5 ${s.level === "over" ? "text-destructive" : "text-primary"}`} />
          <div>
            <p className="font-bold">{s.level === "over" ? "تجاوزت موعد الصيانة!" : "اقترب موعد الصيانة"} — {v.nickname || v.vehicle_models?.name_ar}</p>
            <p className="text-sm">{SERVICE[last.service_type] ?? last.service_type}: {s.kmLeft > 0 ? `متبقي ${s.kmLeft.toLocaleString("ar")} كم` : `تجاوز بـ ${(-s.kmLeft).toLocaleString("ar")} كم`}
              {s.daysLeft !== null && ` · ${s.daysLeft > 0 ? `${s.daysLeft} يوم متبقٍ` : "انتهت المدة الزمنية"}`}</p>
          </div>
        </div>
      ))}

      {adding && <AddVehicle userId={userId} first={list.length === 0} onDone={() => { setAdding(false); refresh(); }} />}

      {vehicles.isLoading && <p className="text-muted-foreground">جارٍ التحميل…</p>}
      {!vehicles.isLoading && list.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">لم تُضف أي سيارة بعد. أضف سيارتك لتظهر لك القطع المتوافقة وتذكيرات الزيت.</div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {list.map((v) => <VehicleCard key={v.id} v={v} userId={userId} onActive={() => setActive(v.id)} onChange={refresh} />)}
      </div>
    </div>
  );
}

function AddVehicle({ userId, first, onDone }: { userId: string; first: boolean; onDone: () => void }) {
  const makes = useQuery({ queryKey: ["makes"], queryFn: fetchMakes });
  const [f, setF] = useState({ vin: "", make: "", model: "", year: "", nickname: "", plate: "", km: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const models = makes.data?.find((m) => m.id === f.make)?.vehicle_models ?? [];

  function onVin(vin: string) {
    const next = { ...f, vin: vin.toUpperCase() };
    if (vin.length === 17) {
      const r = decodeVin(vin);
      if (r.make) { const m = makes.data?.find((x) => x.name_en === r.make); if (m) next.make = m.id; }
      if (r.year) next.year = String(r.year);
      setErr(r.valid ? "" : r.error ?? "");
    }
    setF(next);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("customer_vehicles").insert({
      user_id: userId, vin: f.vin || null, make_id: f.make || null, model_id: f.model || null,
      year: f.year ? Number(f.year) : null, nickname: f.nickname || null, license_plate: f.plate || null,
      current_mileage: Number(f.km) || 0, is_active: first,
    });
    setBusy(false);
    if (error) setErr(error.message); else onDone();
  }
  return (
    <form onSubmit={save} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
      <input className={`${input} sm:col-span-2`} dir="ltr" maxLength={17} placeholder="رقم الهيكل VIN (17 خانة) — اختياري" value={f.vin} onChange={(e) => onVin(e.target.value)} />
      <select className={input} required value={f.make} onChange={(e) => setF({ ...f, make: e.target.value, model: "" })}>
        <option value="">الشركة المصنّعة</option>
        {makes.data?.map((m) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
      </select>
      <select className={input} required value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })}>
        <option value="">الموديل</option>
        {models.map((m) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
      </select>
      <input className={input} type="number" required min={1980} max={2027} placeholder="سنة الصنع" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} />
      <input className={input} type="number" required min={0} placeholder="العداد الحالي (كم)" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} />
      <input className={input} placeholder="اسم مميز (مثلاً: سيارة البيت)" value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} />
      <input className={input} placeholder="رقم اللوحة" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} />
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <button className={`${btn} sm:col-span-2`} disabled={busy}>حفظ السيارة</button>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V = any;
function VehicleCard({ v, userId, onActive, onChange }: { v: V; userId: string; onActive: () => void; onChange: () => void }) {
  const [km, setKm] = useState(String(v.current_mileage));
  const [logOpen, setLogOpen] = useState(false);
  const logs = [...v.vehicle_maintenance_logs].sort((a, b) => b.service_date.localeCompare(a.service_date));
  const last = logs[0];
  const s = last ? status(v.current_mileage, last) : null;

  async function saveKm() {
    const n = Number(km);
    if (!n || n < v.current_mileage) return alert("القراءة الجديدة يجب أن تكون أكبر من السابقة");
    await supabase.from("customer_vehicles").update({ current_mileage: n }).eq("id", v.id);
    onChange();
  }

  return (
    <div className={`rounded-2xl border bg-card p-5 ${v.is_active ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-black">{v.nickname || `${v.vehicle_makes?.name_ar ?? ""} ${v.vehicle_models?.name_ar ?? ""}`}</p>
          <p className="text-sm text-muted-foreground">{v.vehicle_makes?.name_ar} {v.vehicle_models?.name_ar} · {v.year}{v.license_plate && ` · لوحة ${v.license_plate}`}</p>
          {v.vin && <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">{v.vin}</p>}
        </div>
        {v.is_active
          ? <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground"><Star className="h-3 w-3" />النشطة</span>
          : <button onClick={onActive} className="rounded-full border px-2 py-1 text-xs">تعيين كنشطة</button>}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Gauge className="h-5 w-5 text-primary" />
        <input className={input} type="number" value={km} onChange={(e) => setKm(e.target.value)} />
        <span className="text-sm">كم</span>
        <button className={btn} onClick={saveKm}>تحديث</button>
      </div>

      {s && last ? (
        <div className="mt-4 rounded-xl bg-muted p-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            {s.level === "good" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : s.level === "soon" ? <Clock className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
            {SERVICE[last.service_type]} — {s.level === "good" ? "طبيعي" : s.level === "soon" ? "تذكير مبكر" : "تجاوز المدة"}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className={`h-full ${s.level === "good" ? "bg-green-600" : s.level === "soon" ? "bg-primary" : "bg-destructive"}`} style={{ width: `${s.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            الموعد القادم عند {last.next_due_mileage.toLocaleString("ar")} كم{last.next_due_date && ` أو بتاريخ ${last.next_due_date}`} (أيهما أولًا)
          </p>
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">لا يوجد سجل صيانة بعد.</p>}

      <button className="mt-4 flex items-center gap-1 text-sm font-bold text-primary" onClick={() => setLogOpen(!logOpen)}>
        <Droplet className="h-4 w-4" /> تسجيل صيانة / تغيير زيت
      </button>
      {logOpen && <LogForm vehicleId={v.id} userId={userId} mileage={v.current_mileage} onDone={() => { setLogOpen(false); onChange(); }} />}

      {logs.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-sm font-bold">سجل الصيانة</p>
          <ul className="space-y-2 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span>{SERVICE[l.service_type] ?? l.service_type}{l.product_details?.oil_brand && ` · ${l.product_details.oil_brand} ${l.product_details.viscosity ?? ""}`}</span>
                <span className="text-muted-foreground">{l.service_date} · {l.current_mileage.toLocaleString("ar")} كم</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LogForm({ vehicleId, userId, mileage, onDone }: { vehicleId: string; userId: string; mileage: number; onDone: () => void }) {
  const [f, setF] = useState({ type: "oil_change", km: String(mileage), interval: "5000", months: "6", brand: "", visc: "", cost: "", notes: "" });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const km = Number(f.km);
    const due = new Date(); due.setMonth(due.getMonth() + Number(f.months || 0));
    await supabase.from("vehicle_maintenance_logs").insert({
      vehicle_id: vehicleId, user_id: userId, service_type: f.type, current_mileage: km,
      next_due_mileage: km + Number(f.interval || 0),
      next_due_date: f.months ? due.toISOString().slice(0, 10) : null,
      product_details: { oil_brand: f.brand || undefined, viscosity: f.visc || undefined },
      cost_total: f.cost ? Number(f.cost) : null, notes: f.notes || null,
    });
    if (km > mileage) await supabase.from("customer_vehicles").update({ current_mileage: km }).eq("id", vehicleId);
    setBusy(false); onDone();
  }
  return (
    <form onSubmit={save} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border p-3">
      <select className={`${input} col-span-2`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        {Object.entries(SERVICE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <label className="text-xs">العداد عند الخدمة<input className={input} type="number" required value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></label>
      <label className="text-xs">العمر الافتراضي (كم)<input className={input} type="number" required value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })} /></label>
      <label className="text-xs">المدة الزمنية (أشهر)<input className={input} type="number" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} /></label>
      <label className="text-xs">التكلفة (ر.ي)<input className={input} type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></label>
      <input className={input} placeholder="نوع الزيت (مثلاً: شل)" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
      <input className={input} placeholder="اللزوجة 5W-30" dir="ltr" value={f.visc} onChange={(e) => setF({ ...f, visc: e.target.value })} />
      <button className={`${btn} col-span-2`} disabled={busy}>حفظ السجل</button>
    </form>
  );
}

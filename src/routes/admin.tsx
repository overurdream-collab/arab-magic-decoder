import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Check, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthBox, useSession } from "@/components/AuthBox";
import { SELLER_TYPES } from "@/lib/seller-types";
import { CatalogImport } from "@/components/CatalogImport";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — قِطَع" },
      { name: "description", content: "مراجعة طلبات التجار وإدارة الكتالوج المركزي لمنصة قِطَع." },
      { property: "og:title", content: "لوحة الإدارة — قِطَع" },
      { property: "og:description", content: "لوحة مقيّدة بمسؤولي المنصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, ready } = useSession();
  if (!ready) return <main className="p-10 text-center text-muted-foreground">جارٍ التحميل…</main>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Shield className="h-8 w-8 text-primary" />
          لوحة الإدارة
        </h1>
        {session && (
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
      {session ? (
        <AdminGate userId={session.user.id} />
      ) : (
        <AuthBox title="دخول المسؤولين" redirectPath="/admin" />
      )}
    </main>
  );
}

function AdminGate({ userId }: { userId: string }) {
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const [tab, setTab] = useState<"apps" | "catalog" | "import">("apps");
  if (isLoading) return <p className="text-muted-foreground">جارٍ التحقق من الصلاحية…</p>;
  if (!isAdmin)
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        هذه الصفحة مخصصة لمسؤولي المنصة فقط. صلاحية المسؤول تُمنح من الخادم ولا يمكن طلبها من هنا.
      </div>
    );
  const t = (k: typeof tab, l: string) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-primary text-primary-foreground" : "border"}`}
    >
      {l}
    </button>
  );
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {t("apps", "طلبات التجار")}
        {t("catalog", "الكتالوج والتوافق")}
        {t("import", "استيراد CSV")}
      </div>
      {tab === "apps" && <Applications />}
      {tab === "catalog" && <Catalog />}
      {tab === "import" && <CatalogImport />}
    </div>
  );
}

function Applications() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [msg, setMsg] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-apps", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_applications")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function act(id: string, approve: boolean) {
    // Each RPC has a different return type. Handle separately to keep TS inference correct.
    if (approve) {
      const { error } = await supabase.rpc("approve_seller_application", { _app_id: id });
      if (error) {
        setMsg(`خطأ: ${error.message}`);
        return;
      }
      setMsg("تمت الموافقة وإنشاء متجر موثّق.");
    } else {
      const note = window.prompt("سبب الرفض (اختياري)");
      if (note === null) return; // Cancel means no server-side action.
      const { error } = await supabase.rpc("reject_seller_application", {
        _app_id: id,
        _note: note,
      });
      if (error) {
        setMsg(`خطأ: ${error.message}`);
        return;
      }
      setMsg("تم رفض الطلب.");
    }
    await qc.invalidateQueries({ queryKey: ["admin-apps"] });
  }
  return (
    <div className="space-y-3">
      <select
        className="rounded-lg border bg-background px-3 py-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="pending">قيد المراجعة</option>
        <option value="approved">مقبولة</option>
        <option value="rejected">مرفوضة</option>
      </select>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-right">
            <tr>
              {["المحل", "النوع", "المدينة", "الهاتف", "السجل", "ملاحظات", "التاريخ", ""].map(
                (h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data?.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="p-3 font-semibold">{a.business_name}</td>
                <td className="p-3">{SELLER_TYPES[a.seller_type] ?? a.seller_type}</td>
                <td className="p-3">
                  {a.city}
                  {a.district ? ` — ${a.district}` : ""}
                </td>
                <td className="p-3" dir="ltr">
                  {a.phone}
                </td>
                <td className="p-3">{a.commercial_register ?? "—"}</td>
                <td className="max-w-xs p-3 text-muted-foreground">
                  {a.notes ?? a.review_note ?? "—"}
                </td>
                <td className="p-3">{new Date(a.created_at).toLocaleDateString("ar-YE")}</td>
                <td className="p-3">
                  {a.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        aria-label="موافقة"
                        className="rounded bg-primary p-1.5 text-primary-foreground"
                        onClick={() => act(a.id, true)}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="رفض"
                        className="rounded border p-1.5"
                        onClick={() => act(a.id, false)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  لا توجد طلبات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Catalog() {
  const { data } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_parts")
        .select(
          "id,oem_number,alt_numbers,name_ar,name_en,categories(name_ar),part_fitments(year_from,year_to,vehicle_models(name_ar,vehicle_makes(name_ar))),seller_offers(id)",
        )
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-right">
          <tr>
            {["القطعة", "OEM", "أرقام بديلة", "الفئة", "التوافق (بيانات أولية)", "العروض"].map(
              (h) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id} className="border-t align-top">
              <td className="p-3 font-semibold">
                {p.name_ar}
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {p.name_en}
                </div>
              </td>
              <td className="p-3 font-mono" dir="ltr">
                {p.oem_number}
              </td>
              <td className="p-3 font-mono text-xs" dir="ltr">
                {p.alt_numbers.join(", ") || "—"}
              </td>
              <td className="p-3">{p.categories?.name_ar}</td>
              <td className="p-3 text-xs">
                {p.part_fitments.map((f, i) => (
                  <div key={i}>
                    {f.vehicle_models?.vehicle_makes?.name_ar} {f.vehicle_models?.name_ar}{" "}
                    {f.year_from}–{f.year_to}
                  </div>
                ))}
                {p.part_fitments.length === 0 && "—"}
              </td>
              <td className="p-3">{p.seller_offers.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-3 text-xs text-muted-foreground">
        بيانات التوافق الحالية بيانات تجريبية أولية غير مُتحقق منها من مزود خارجي.
      </p>
    </div>
  );
}

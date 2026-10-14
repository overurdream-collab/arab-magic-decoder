import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthBox, useSession } from "@/components/AuthBox";
import { fmtYER } from "@/lib/catalog";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلباتي — قِطَع" }, { name: "robots", content: "noindex" }] }),
  component: MyOrders,
});

type Request = {
  id: string;
  qty: number;
  price_yer: number;
  status: string;
  created_at: string;
  part_name: string;
  seller_name: string;
  review_note: string | null;
};
const STATUS: Record<string, string> = {
  requested: "بانتظار موافقة التاجر",
  accepted: "وافق التاجر وحجز الكمية",
  rejected: "رفض التاجر",
  cancelled: "أُلغي الطلب",
  fulfilled: "التاجر أكد التجهيز/التسليم",
};

function MyOrders() {
  const { session, ready } = useSession();
  if (!ready) return <main className="p-8">جارٍ التحميل…</main>;
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-black">طلباتي</h1>
      <p className="text-sm text-muted-foreground">
        هذه طلبات مباشرة إلى التجار وليست عمليات دفع إلكتروني. توفر القطعة والسعر النهائي والتسليم
        يخضع لتأكيد التاجر. لا توجد بوابة مدفوعات مفعلة.
      </p>
      {session ? (
        <RequestList userId={session.user.id} />
      ) : (
        <AuthBox title="سجّل الدخول لمتابعة طلباتك" redirectPath="/orders" />
      )}
    </main>
  );
}

function RequestList({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["my-requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_purchase_requests");
      if (error) throw error;
      return data as unknown as Request[];
    },
  });
  async function cancel(id: string) {
    if (!window.confirm("إلغاء الطلب؟ إذا كان التاجر وافق سابقًا فستُعاد الكمية للمخزون.")) return;
    setPending(id);
    setError("");
    const { error } = await supabase.rpc("buyer_cancel_request", { _request_id: id });
    setPending("");
    if (error) setError("تعذر إلغاء الطلب: " + error.message);
    else await qc.invalidateQueries({ queryKey: ["my-requests", userId] });
  }
  if (isLoading) return <p>جارٍ تحميل طلباتك…</p>;
  if (isError)
    return (
      <p role="alert" className="text-destructive">
        تعذر تحميل الطلبات. تحقق من اتصال الخدمة.
      </p>
    );
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {data.map((req) => (
        <article key={req.id} className="space-y-2 rounded-xl border bg-card p-5">
          <h2 className="font-bold">
            {req.part_name} — {req.seller_name}
          </h2>
          <p className="text-sm">
            الكمية: {req.qty} — المبلغ المعروض وقت الطلب: {fmtYER(Number(req.price_yer) * req.qty)}
          </p>
          <p className="text-sm">
            الحالة: <b>{STATUS[req.status] ?? req.status}</b>
          </p>
          {req.review_note && (
            <p className="text-sm text-muted-foreground">ملاحظة: {req.review_note}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(req.created_at).toLocaleString("ar-YE")}
          </p>
          {["requested", "accepted"].includes(req.status) && (
            <button
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!!pending}
              onClick={() => cancel(req.id)}
            >
              إلغاء الطلب
            </button>
          )}
        </article>
      ))}
      {data.length === 0 && (
        <p className="rounded-lg border p-5 text-muted-foreground">
          لا توجد طلبات حتى الآن. اختر عرض قطعة من الكتالوج لبدء طلبك.
        </p>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtYER } from "@/lib/catalog";
import { PurchaseRequestHistory } from "@/components/PurchaseRequestHistory";

type AdminRequest = {
  id: string;
  buyer_name: string;
  part_name: string;
  seller_name: string;
  qty: number;
  price_yer: number;
  status: string;
  review_note: string | null;
  created_at: string;
  accepted_at: string | null;
  closed_at: string | null;
};

const STATUS: Record<string, string> = {
  requested: "بانتظار موافقة التاجر",
  accepted: "وافق التاجر وحجز الكمية",
  rejected: "رفض التاجر",
  cancelled: "أُلغي الطلب",
  fulfilled: "أكد التاجر التجهيز/التسليم",
};

export function AdminOrders() {
  const [status, setStatus] = useState("all");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["admin-purchase-requests", status],
    queryFn: async () => {
      const result =
        status === "all"
          ? await supabase.rpc("list_admin_purchase_requests")
          : await supabase.rpc("list_admin_purchase_requests", { _status: status });
      if (result.error) throw result.error;
      return result.data as unknown as AdminRequest[];
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">طلبات توفر القطع</h2>
          <p className="text-sm text-muted-foreground">
            عرض إداري للمتابعة فقط. هذه الطلبات ليست مدفوعات ولا تثبت التسليم.
          </p>
        </div>
        <label className="text-sm">
          الحالة
          <select
            className="ms-2 rounded-lg border bg-background px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="requested">بانتظار التاجر</option>
            <option value="accepted">مقبولة</option>
            <option value="rejected">مرفوضة</option>
            <option value="cancelled">ملغاة</option>
            <option value="fulfilled">مجهزة/مُسلمة</option>
          </select>
        </label>
      </div>
      {isLoading && <p>جارٍ تحميل الطلبات…</p>}
      {isError && (
        <p role="alert" className="text-destructive">
          تعذر تحميل الطلبات الإدارية.
        </p>
      )}
      {!isLoading && !isError && data.length === 0 && (
        <p className="rounded-xl border p-6 text-muted-foreground">لا توجد طلبات بهذه الحالة.</p>
      )}
      {data.map((request) => (
        <article key={request.id} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold">{request.part_name}</h3>
              <p className="text-sm text-muted-foreground">
                المشتري: {request.buyer_name} · التاجر: {request.seller_name}
              </p>
              <p className="text-sm">
                الكمية: {request.qty} · القيمة المعروضة:{" "}
                {fmtYER(Number(request.price_yer) * request.qty)}
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {STATUS[request.status] ?? request.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            أُنشئ: {new Date(request.created_at).toLocaleString("ar-YE")}
            {request.accepted_at &&
              " · قُبل: " + new Date(request.accepted_at).toLocaleString("ar-YE")}
            {request.closed_at &&
              " · أُغلق: " + new Date(request.closed_at).toLocaleString("ar-YE")}
          </p>
          {request.review_note && (
            <p className="text-sm text-muted-foreground">ملاحظة: {request.review_note}</p>
          )}
          <PurchaseRequestHistory requestId={request.id} />
        </article>
      ))}
    </section>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtYER } from "@/lib/catalog";

type Request = {
  id: string;
  qty: number;
  price_yer: number;
  status: string;
  created_at: string;
  part_name: string;
};

const STATUS: Record<string, string> = {
  requested: "طلب جديد",
  accepted: "محجوز",
  rejected: "مرفوض",
  cancelled: "أُلغي",
  fulfilled: "مُجهز/مُسلم",
};

export function SellerRequests({ sellerId }: { sellerId: string }) {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState("");
  const [message, setMessage] = useState("");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["seller-requests", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_seller_purchase_requests");
      if (error) throw error;
      return data as unknown as Request[];
    },
  });

  async function respond(id: string, action: "accept" | "reject" | "fulfill") {
    let note: string | undefined;
    if (action === "reject") {
      const reply = window.prompt("سبب رفض الطلب (اختياري)");
      if (reply === null) return;
      note = reply;
    }
    if (action === "fulfill" && !window.confirm("هل تم تجهيز أو تسليم القطعة؟")) return;
    setProcessing(id);
    setMessage("");
    const { error } = await supabase.rpc("seller_respond_to_request", {
      _request_id: id,
      _action: action,
      _note: note ?? "",
    });
    setProcessing("");
    if (error) {
      setMessage("تعذر تغيير الحالة: " + error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["seller-requests", sellerId] });
    await qc.invalidateQueries({ queryKey: ["my-offers", sellerId] });
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-black">طلبات العملاء</h2>
      <p className="text-sm text-muted-foreground">
        عند الموافقة تُحجز الكمية في المخزون. يجب تأكيد التوافر والسعر والتوافق قبل تجهيز القطعة.
        لا يستلم النظام مدفوعات في هذه المرحلة.
      </p>
      {message && <p role="alert" className="text-destructive">{message}</p>}
      {isLoading && <p>جارٍ تحميل الطلبات…</p>}
      {isError && <p role="alert" className="text-destructive">تعذر تحميل طلبات المتجر.</p>}
      {data.map((request) => (
        <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <div className="min-w-48 flex-1">
            <p className="font-semibold">{request.part_name}</p>
            <p className="text-sm text-muted-foreground">
              {request.qty} قطعة — {fmtYER(Number(request.price_yer) * request.qty)}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm">
            {STATUS[request.status] ?? request.status}
          </span>
          {request.status === "requested" && (
            <>
              <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!!processing} onClick={() => respond(request.id, "accept")}>تأكيد التوفر</button>
              <button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={!!processing} onClick={() => respond(request.id, "reject")}>رفض</button>
            </>
          )}
          {request.status === "accepted" && (
            <button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" disabled={!!processing} onClick={() => respond(request.id, "fulfill")}>تم التجهيز/التسليم</button>
          )}
        </div>
      ))}
      {data.length === 0 && !isLoading && !isError && <p className="text-muted-foreground">لا توجد طلبات من العملاء حتى الآن.</p>}
    </section>
  );
}

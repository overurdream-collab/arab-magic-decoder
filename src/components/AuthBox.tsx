import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn =
  "rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export function AuthBox({
  title = "سجّل الدخول للمتابعة",
  redirectPath = "/",
}: {
  title?: string;
  redirectPath?: string;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password: pw })
        : await supabase.auth.signUp({
            email,
            password: pw,
            options: {
              data: { full_name: name },
              emailRedirectTo: `${window.location.origin}${redirectPath}`,
            },
          });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === "up" && !r.data.session)
      setMsg("تم إنشاء الحساب — تحقق من بريدك لتأكيده ثم سجّل الدخول.");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl border bg-card p-6">
      <p className="font-bold">{mode === "in" ? title : "إنشاء حساب جديد"}</p>
      {mode === "up" && (
        <input
          className={input}
          placeholder="الاسم"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <input
        className={input}
        type="email"
        required
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        dir="ltr"
      />
      <input
        className={input}
        type="password"
        required
        minLength={6}
        placeholder="كلمة المرور"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        dir="ltr"
      />
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <button className={`${btn} w-full`} disabled={busy}>
        {mode === "in" ? "دخول" : "تسجيل"}
      </button>
      <button
        type="button"
        className="w-full text-sm text-primary"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
      </button>
    </form>
  );
}

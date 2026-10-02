import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STATUS_LABEL: Record<string, string> = {
  trial: "Trial", active: "Active", overdue: "Overdue", paused: "Paused", suspended: "Suspended",
};
export const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trial: "secondary", active: "default", overdue: "outline", paused: "outline", suspended: "destructive",
};

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function usePlatformData() {
  return useQuery({
    queryKey: ["platform"],
    queryFn: async () => {
      const [schools, plans, subs, pays, members, settings] = await Promise.all([
        supabase.from("schools").select("*").order("created_at", { ascending: false }),
        supabase.from("subscription_plans").select("*").order("price"),
        supabase.from("school_subscriptions").select("*").order("starts_on", { ascending: false }),
        supabase.from("subscription_payments").select("*").order("paid_on", { ascending: false }),
        supabase.from("school_members").select("*"),
        supabase.from("platform_settings").select("*").eq("id", 1).single(),
      ]);
      for (const r of [schools, plans, subs, pays, members]) if (r.error) throw r.error;
      const today = new Date().toISOString().slice(0, 10);
      const billing = (schools.data ?? []).map((s) => {
        const mySubs = (subs.data ?? []).filter((x) => x.school_id === s.id);
        const myPays = (pays.data ?? []).filter((x) => x.school_id === s.id);
        const due = mySubs.reduce((a, x) => a + Number(x.amount_due), 0);
        const verified = myPays.filter((p) => p.verification === "verified");
        const paid = verified.reduce((a, x) => a + Number(x.amount), 0);
        const current = mySubs[0];
        return {
          school: s,
          current,
          due, paid, outstanding: Math.max(0, due - paid),
          pending: myPays.filter((p) => p.verification === "pending").length,
          lastPayment: verified[0]?.paid_on ?? null,
          expired: current ? current.ends_on < today : false,
          members: (members.data ?? []).filter((m) => m.school_id === s.id).length,
        };
      });
      return {
        schools: schools.data ?? [], plans: plans.data ?? [], subs: subs.data ?? [],
        pays: pays.data ?? [], settings: settings.data, billing,
      };
    },
  });
}

export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "super_admin" });
      return !!data;
    },
  });
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string; claims: any };

/** Verifies the caller is a platform super admin and returns a privileged client. */
async function asSuperAdmin(context: Ctx) {
  const { data: ok, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error || !ok) throw new Error("Forbidden: Super Admin access required.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (context.claims?.email as string | undefined) ?? null;
  const log = async (
    action: string,
    entity: string,
    entityId: string | null,
    school: { id: string; name: string } | null,
    details: Record<string, unknown> = {},
  ) => {
    await supabaseAdmin.from("platform_audit_logs").insert({
      actor_id: context.userId,
      actor_email: email,
      action,
      entity,
      entity_id: entityId,
      school_id: school?.id ?? null,
      school_name: school?.name ?? null,
      details: details as never,
    });
  };
  return { admin: supabaseAdmin, log };
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "#7";
}

const text = (max: number) => z.string().trim().max(max);

// ---------- Schools ----------
const createSchoolSchema = z.object({
  name: text(160).min(3),
  code: text(20).regex(/^[A-Z0-9-]{2,20}$/, "Use 2-20 capital letters, digits or dashes"),
  email: z.string().trim().email().max(255),
  phone: text(30).optional().default(""),
  address: text(300).optional().default(""),
  state: text(60).optional().default(""),
  schoolType: text(40).default("Secondary"),
  planId: z.string().uuid(),
  adminName: text(120).min(2),
  adminEmail: z.string().trim().toLowerCase().email().max(255),
});

export const createSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchoolSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);

    const { data: plan, error: pErr } = await admin
      .from("subscription_plans").select("*").eq("id", data.planId).single();
    if (pErr || !plan) throw new Error("Plan not found.");

    const { data: dup } = await admin.from("schools").select("id").eq("code", data.code).maybeSingle();
    if (dup) throw new Error("A school with this code already exists.");

    const { data: school, error: sErr } = await admin
      .from("schools")
      .insert({
        name: data.name, code: data.code, email: data.email, phone: data.phone,
        address: data.address, state: data.state, school_type: data.schoolType,
        status: plan.billing_cycle === "trial" ? "trial" : "active",
        plan_id: plan.id, created_by: context.userId,
      })
      .select().single();
    if (sErr || !school) throw new Error(sErr?.message ?? "Could not create school.");

    // Administrator account: reuse an existing account or create one with a one-time password.
    let adminUserId: string;
    let issuedPassword: string | null = null;
    const { data: existing } = await admin.from("profiles").select("id").eq("email", data.adminEmail).maybeSingle();
    if (existing) {
      adminUserId = existing.id;
    } else {
      issuedPassword = tempPassword();
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email: data.adminEmail,
        password: issuedPassword,
        email_confirm: true,
        user_metadata: { full_name: data.adminName },
      });
      if (uErr || !created.user) {
        await admin.from("schools").delete().eq("id", school.id);
        throw new Error(uErr?.message ?? "Could not create the administrator account.");
      }
      adminUserId = created.user.id;
    }
    await admin.from("school_members").insert({ school_id: school.id, user_id: adminUserId, role: "school_admin" });

    const today = new Date().toISOString().slice(0, 10);
    await admin.from("school_subscriptions").insert({
      school_id: school.id, plan_id: plan.id, plan_name: plan.name, billing_cycle: plan.billing_cycle,
      starts_on: today, ends_on: addDays(today, plan.duration_days), amount_due: plan.price,
      created_by: context.userId,
    });

    await log("SCHOOL_CREATED", "School", school.id, school, {
      code: school.code, plan: plan.name, adminEmail: data.adminEmail, newAccount: !!issuedPassword,
    });
    return { schoolId: school.id, adminEmail: data.adminEmail, temporaryPassword: issuedPassword };
  });

export const updateSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      name: text(160).min(3), email: z.string().trim().email().max(255),
      phone: text(30), address: text(300), state: text(60), schoolType: text(40),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const { data: school, error } = await admin.from("schools").update({
      name: data.name, email: data.email, phone: data.phone, address: data.address,
      state: data.state, school_type: data.schoolType,
    }).eq("id", data.schoolId).select().single();
    if (error || !school) throw new Error(error?.message ?? "School not found.");
    await log("SCHOOL_UPDATED", "School", school.id, school);
    return { ok: true };
  });

export const setSchoolStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      status: z.enum(["trial", "active", "overdue", "paused", "suspended"]),
      reason: text(500).optional().default(""),
    }).refine((v) => !["paused", "suspended"].includes(v.status) || v.reason.length >= 3, {
      message: "A reason is required to pause or suspend a school.", path: ["reason"],
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const { data: before } = await admin.from("schools").select("status").eq("id", data.schoolId).single();
    const { data: school, error } = await admin.from("schools").update({
      status: data.status, status_reason: data.reason || null, status_changed_at: new Date().toISOString(),
    }).eq("id", data.schoolId).select().single();
    if (error || !school) throw new Error(error?.message ?? "School not found.");
    const action = data.status === "suspended" ? "SCHOOL_SUSPENDED"
      : data.status === "paused" ? "SCHOOL_PAUSED"
      : ["paused", "suspended"].includes(before?.status ?? "") ? "SCHOOL_REACTIVATED" : "SCHOOL_STATUS_CHANGED";
    await log(action, "School", school.id, school, { from: before?.status, to: data.status, reason: data.reason });
    return { ok: true };
  });

async function collectSchoolData(admin: any, schoolId: string) {
  const [school, members, subs, pays] = await Promise.all([
    admin.from("schools").select("*").eq("id", schoolId).single(),
    admin.from("school_members").select("*, profiles:user_id(email, full_name)").eq("school_id", schoolId),
    admin.from("school_subscriptions").select("*").eq("school_id", schoolId),
    admin.from("subscription_payments").select("*").eq("school_id", schoolId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    school: school.data, members: members.data ?? [],
    subscriptions: subs.data ?? [], payments: pays.data ?? [],
  };
}

export const exportSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const dump = await collectSchoolData(admin, data.schoolId);
    if (!dump.school) throw new Error("School not found.");
    await log("SCHOOL_EXPORTED", "School", data.schoolId, dump.school);
    return JSON.stringify(dump, null, 2);
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ schoolId: z.string().uuid(), confirmName: text(160), acknowledgeDebt: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const dump = await collectSchoolData(admin, data.schoolId);
    const school = dump.school;
    if (!school) throw new Error("School not found.");
    if (school.name.trim() !== data.confirmName.trim()) throw new Error("The school name you typed does not match.");
    const due = dump.subscriptions.reduce((s: number, x: any) => s + Number(x.amount_due), 0);
    const paid = dump.payments.filter((p: any) => p.verification === "verified")
      .reduce((s: number, x: any) => s + Number(x.amount), 0);
    const outstanding = Math.max(0, due - paid);
    if (outstanding > 0 && !data.acknowledgeDebt) {
      throw new Error("This school has an outstanding balance. Acknowledge it to continue.");
    }
    // Record before deleting so the authorization survives the cascade.
    await log("SCHOOL_DELETED", "School", school.id, school, {
      code: school.code, outstanding, members: dump.members.length, payments: dump.payments.length,
    });
    const { error } = await admin.from("schools").delete().eq("id", school.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Subscriptions & payments ----------
export const assignSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(), planId: z.string().uuid(),
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amountDue: z.number().min(0).max(1e10).optional(),
      notes: text(500).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const [{ data: plan }, { data: school }] = await Promise.all([
      admin.from("subscription_plans").select("*").eq("id", data.planId).single(),
      admin.from("schools").select("*").eq("id", data.schoolId).single(),
    ]);
    if (!plan || !school) throw new Error("School or plan not found.");
    const amount = data.amountDue ?? Number(plan.price);
    const { error } = await admin.from("school_subscriptions").insert({
      school_id: school.id, plan_id: plan.id, plan_name: plan.name, billing_cycle: plan.billing_cycle,
      starts_on: data.startsOn, ends_on: addDays(data.startsOn, plan.duration_days),
      amount_due: amount, notes: data.notes || null, created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await admin.from("schools").update({ plan_id: plan.id }).eq("id", school.id);
    await log("SUBSCRIPTION_ASSIGNED", "Subscription", null, school, { plan: plan.name, amount, startsOn: data.startsOn });
    return { ok: true };
  });

export const recordSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      amount: z.number().positive().max(1e10),
      paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      method: text(40).min(2),
      reference: text(80).min(3),
      verified: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const { data: school } = await admin.from("schools").select("*").eq("id", data.schoolId).single();
    if (!school) throw new Error("School not found.");
    const { data: dupRef } = await admin.from("subscription_payments").select("id")
      .eq("school_id", school.id).eq("reference", data.reference).maybeSingle();
    if (dupRef) throw new Error("A payment with this reference already exists for this school.");
    const { data: latest } = await admin.from("school_subscriptions").select("id")
      .eq("school_id", school.id).order("starts_on", { ascending: false }).limit(1).maybeSingle();
    const { data: pay, error } = await admin.from("subscription_payments").insert({
      school_id: school.id, subscription_id: latest?.id ?? null, amount: data.amount, paid_on: data.paidOn,
      method: data.method, reference: data.reference,
      verification: data.verified ? "verified" : "pending",
      verified_by: data.verified ? context.userId : null,
      verified_at: data.verified ? new Date().toISOString() : null,
      recorded_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    await log("PAYMENT_RECORDED", "SubscriptionPayment", pay.id, school, {
      amount: data.amount, reference: data.reference, verified: data.verified,
    });
    return { ok: true };
  });

export const setPaymentVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ paymentId: z.string().uuid(), verification: z.enum(["pending", "verified", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const { data: pay, error } = await admin.from("subscription_payments").update({
      verification: data.verification,
      verified_by: data.verification === "pending" ? null : context.userId,
      verified_at: data.verification === "pending" ? null : new Date().toISOString(),
    }).eq("id", data.paymentId).select("*, schools(id, name)").single();
    if (error || !pay) throw new Error(error?.message ?? "Payment not found.");
    await log(`PAYMENT_${data.verification.toUpperCase()}`, "SubscriptionPayment", pay.id, pay.schools, {
      amount: pay.amount, reference: pay.reference,
    });
    return { ok: true };
  });

// ---------- Plans & settings ----------
export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      name: text(80).min(2),
      billingCycle: z.enum(["trial", "monthly", "termly", "annual", "custom"]),
      price: z.number().min(0).max(1e10),
      durationDays: z.number().int().min(1).max(3650),
      studentLimit: z.number().int().min(1).max(100000),
      features: z.array(text(60).min(1)).max(30),
      isActive: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const row = {
      name: data.name, billing_cycle: data.billingCycle, price: data.price,
      duration_days: data.durationDays, student_limit: data.studentLimit,
      features: data.features, is_active: data.isActive,
    };
    const res = data.id
      ? await admin.from("subscription_plans").update(row).eq("id", data.id).select().single()
      : await admin.from("subscription_plans").insert(row).select().single();
    if (res.error) throw new Error(res.error.message);
    await log(data.id ? "PLAN_UPDATED" : "PLAN_CREATED", "Plan", res.data.id, null, row);
    return { ok: true };
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      gracePeriodDays: z.number().int().min(0).max(365),
      autoMarkOverdue: z.boolean(),
      autoSuspendAfterGrace: z.boolean(),
      suspendBlocksResultChecker: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const row = {
      grace_period_days: data.gracePeriodDays, auto_mark_overdue: data.autoMarkOverdue,
      auto_suspend_after_grace: data.autoSuspendAfterGrace,
      suspend_blocks_result_checker: data.suspendBlocksResultChecker, updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("platform_settings").update(row).eq("id", 1);
    if (error) throw new Error(error.message);
    await log("SETTINGS_UPDATED", "PlatformSettings", "1", null, row);
    return { ok: true };
  });

/**
 * Applies the billing policy: schools past their end date become overdue; after the grace
 * period they are suspended only if auto-suspend is on AND no payment is awaiting verification.
 */
export const runBillingCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, log } = await asSuperAdmin(context as Ctx);
    const { data: settings } = await admin.from("platform_settings").select("*").eq("id", 1).single();
    const [{ data: schools }, { data: subs }, { data: pays }] = await Promise.all([
      admin.from("schools").select("*"),
      admin.from("school_subscriptions").select("*"),
      admin.from("subscription_payments").select("*"),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    let overdue = 0, suspended = 0;
    for (const s of schools ?? []) {
      if (["paused", "suspended"].includes(s.status)) continue;
      const mine = (subs ?? []).filter((x: any) => x.school_id === s.id);
      const due = mine.reduce((a: number, x: any) => a + Number(x.amount_due), 0);
      const myPays = (pays ?? []).filter((p: any) => p.school_id === s.id);
      const paid = myPays.filter((p: any) => p.verification === "verified").reduce((a: number, p: any) => a + Number(p.amount), 0);
      const pending = myPays.some((p: any) => p.verification === "pending");
      const latestEnd = mine.map((x: any) => x.ends_on).sort().pop();
      const owing = due - paid > 0;
      if (!latestEnd || !owing || latestEnd >= today) continue;
      const graceEnd = addDays(latestEnd, settings?.grace_period_days ?? 14);
      if (settings?.auto_suspend_after_grace && today > graceEnd && !pending) {
        await admin.from("schools").update({ status: "suspended", status_reason: "Subscription unpaid after grace period", status_changed_at: new Date().toISOString() }).eq("id", s.id);
        await log("SCHOOL_SUSPENDED", "School", s.id, s, { automatic: true, outstanding: due - paid });
        suspended++;
      } else if (settings?.auto_mark_overdue && s.status !== "overdue") {
        await admin.from("schools").update({ status: "overdue", status_changed_at: new Date().toISOString() }).eq("id", s.id);
        await log("SCHOOL_MARKED_OVERDUE", "School", s.id, s, { automatic: true, outstanding: due - paid });
        overdue++;
      }
    }
    return { overdue, suspended };
  });

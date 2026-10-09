# Scholareer production upgrade

## Phase 1 — Foundation + Super Admin (in progress)
- [x] Confirm Lovable Cloud is the target; no external project handoff needed
- [x] Move to Lovable Cloud; platform database (schools, plans, subscriptions, payments, settings, audit)
- [x] Secure server actions for all Super Admin operations
- [ ] Platform sign-in + owner setup (restricted to verified imohtalit@gmail.com)
- [ ] Super Admin panel: overview, schools, school detail (status/subscription/payments/export/delete), plans, payments, settings, audit log

## Later phases
- [ ] Move school modules (students, classes, results, attendance, finance, etc.) from browser storage to Cloud with school-status checks
- [ ] Multi-teacher result entry, RACE + result checker on Cloud
- [ ] Online payments (Paystack/Flutterwave) — user chose manual recording for now

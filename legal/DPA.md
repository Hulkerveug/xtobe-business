# Data Processing Agreement (DPA)
**XTOBE BUSINESS — Processor Agreement under UAE Federal Decree-Law No. 45 of 2021 (PDPL)**
Version 1.0 — Effective 2026-09-22 — legal@xtobe.ae

## 1. Roles
- **Clinic** = Data Controller (determines purposes and means of processing patient/client data).
- **XTOBE BUSINESS** = Data Processor (processes only on the Controller's documented instructions via the Platform).

## 2. Scope of Processing
XTOBE processes on the Controller's behalf: client contact data (name, masked phone number), conversation content (WhatsApp/Instagram/Facebook), appointment records, and lead data — solely to operate the inbox, booking, content studio, and lead features.

## 3. Data Minimisation & Masking
- Phone numbers are **masked in the UI** by default (`+971 5X XXX 1234`); full numbers are revealed only to the account holder.
- Lead phone numbers are stored as **salted hashes + masked display values**.
- XTOBE has no independent right to read, use, or retain Controller data beyond service delivery.

## 4. Security Measures
- Encryption in transit (TLS 1.2+); secrets held server-side only, never in client bundles.
- Rate limiting, brute-force account lockout, webhook signature verification, and session-based API lockdown.
- Access limited to personnel bound by confidentiality obligations.

## 5. Breach Notification
XTOBE notifies the Controller **without undue delay and no later than 72 hours** after becoming aware of a personal data breach, with nature, scope, and remediation.

## 6. Sub-processors
Hosting (Render/Cloud provider) and Meta (WhatsApp Cloud API) act as sub-processors. Controller consent to this DPA constitutes consent to the current sub-processor list. Changes will be notified in advance.

## 7. Data Subject Requests (/unlink)
Controllers can trigger deletion of a data subject's records via the `/unlink` request (email to privacy@xtobe.ae or in-product). XTOBE completes deletion or anonymisation **within 30 days** and confirms in writing, except where retention is legally required.

## 8. Retention & Deletion
On termination, Controller data is exportable for 30 days, then deleted/anonymised within 90 days unless law requires longer.

## 9. Liability
Liability is limited per the ToS. XTOBE is not liable for Controller's unlawful instructions.

## 10. Governing Law
UAE Federal Decree-Law No. 45 of 2021 (PDPL) and applicable UAE federal law. Disputes: UAE courts at the place of XTOBE's registered office.

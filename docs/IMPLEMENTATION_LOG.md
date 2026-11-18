# Qitaa — Implementation Log

2026-10-14

- Official code repository: overurdream-collab/arab-magic-decoder.
- Main commit matched the Lovable project at the beginning of the review: da711a55db6a216ff82313b0ce5830682ea1f3cf.
- Isolated branch: feat/qitaa-phase1-seller-admin-review, draft PR #1.
- Lovable previously created initial seller and admin routes, the seller applications schema and review functions.
- Changes on this branch: extracted seller type labels into a shared module, separated approval/rejection handlers, added navigation links and reset the offer editor when the selected offer changes.
- Added Qitaa CI workflow for typecheck, lint and build, and two documents covering the current implementation and target requirements.
- The first GitHub Actions job concluded unsuccessfully without starting recorded steps. Build and lint have not been verified yet.
- Original PDFs 00 through 09 are specifications for the complete system, not proof that a separate Laravel or Flutter application exists. Document 10 is not yet supplied.

Next: inspect actual CI logs when available, verify the routes and security behavior with representative test accounts, then review the draft pull request. The main branch remains unchanged and no deployment is authorized by this review.

## 2026-10-14 — GitHub connection, merge and second phase
- PR #1 was merged with all three CI checks green: TypeScript/lint/build, disposable PostgreSQL permission tests, and HTTP route smoke.
- Lovable reported the merged main SHA, confirming repository synchronization.
- Initial seller hardening was applied partly to Lovable's cloud database: admin helper, policy and insert grant were updated; the free-plan database action allowance interrupted further steps. The live DB is **not fully migrated**. The remaining seller-offer DELETE revoke and index must be checked/applied before accepting production seller use; no production order checkout was enabled.
- PR #2 adds two-stage administrator CSV import for the master parts catalog: bounded parser, staging/review, atomic PostgreSQL confirmation, replay protection, and database tests. The catalog migration is source-controlled but **not deployed** to Lovable's live Supabase until separately validated.
- No proof of authoritative VIN-to-fitment data, real merchant onboarding UAT, local payments or production release exists yet.

## 2026-10-15 — Request lifecycle and production read-only checks

- PR #9: rebased request lifecycle onto the post-VIN mainline and merged after CI, PostgreSQL ACL tests, route smoke and vehicle preview tests all passed.
- Live Lovable Supabase received the new `purchase_requests` table and its five scoped RPCs. SQL checks confirmed the table exists, RLS is enabled, the expected select policies exist and buyer/seller/cancel functions exist. No live customer requests existed at verification.
- PR #10: added a non-destructive follow-up migration denying client direct mutations. The equivalent restrictions were applied in production and verified: authenticated SELECT allowed; authenticated INSERT/UPDATE/DELETE denied; anonymous table SELECT and create RPC denied.
- PR #11: added non-destructive search-gap permissions and CI invariants. The analytics base SQL and grants were executed in production, but the final verification query was rejected by the temporary free-tier Lovable MCP query quota; **not yet production-verified**.
- PR #12: added a partial unique index for one open request per buyer and offer, along with duplicate/re-order regression tests. CI passed, and changes merged. **Live application and verification of this follow-up migration remain pending.**
- Snapshot of existing production catalog: 7 vehicle makes, 14 models, 18 parts, 8 sellers (6 verified), 77 offers (59 active from verified sellers), zero buyer purchase requests. No synthetic customer order data was inserted into production.
- Still needed: restore DB query quota; verify analytics rights and apply the duplicate-request guard after checking for conflicting existing rows; run authorized buyer/seller UAT; test mobile browser and VIN integration; audit order fulfillment semantics and offer stock edits; validate the external vehicle-data usage rights before bulk catalog imports.

## 2026-11-14 — Purchase lifecycle verification and CI isolation

- PR #16 merged: buyer quantity selector enforces a bounded client quantity and passes it to the existing server-side purchase-request RPC. All five CI workflows passed before merge.
- PR #18 merged: disposable PostgreSQL regression checks enforce acceptance before fulfillment, inventory reservation on acceptance, terminal fulfilled state, and denial of cancellation after fulfillment. All five CI workflows passed before merge.
- PR #19 merged: browser E2E concurrency now scopes to a pull request or ref, preventing unrelated pull requests from cancelling one another. Its initial browser run failed during Supabase CLI setup; a retry completed successfully, with all five workflows green before merge.
- PR #17 remains a separate change for quantity boundary, full-stock reservation and cancellation restoration. Its first browser workflow was cancelled under the old shared concurrency group; retry and final merge are tracked separately. Do not mark #17 complete until its retry succeeds and it is merged.
- The automated GitHub workflows use disposable local databases and synthetic accounts. CI success does NOT verify production migration state, real-world fulfillment, COD settlement, external VIN fitment accuracy, or release readiness.
- Do not apply migrations to production or enable live payment/fulfillment solely on the basis of these checks.

Current execution gates after PR #45: validate vehicle identity data provenance/rights before import; verify deployment/migration parity only with explicit production authorization. Delivery/COD/refund flows remain unimplemented pending approved operating rules. Inventory race, stock-edit, and garage browser regressions are in CI.


## 2026-11-14 — Handover PRs and quantity guard merged

- PR #20 (merge SHA `4476779a526b315e3d70b5ac22bd1b9eff418778`) and PR #21 (merge SHA `bfa91d92fb7dc2c8ff6db1ff02e7b9d0f9b7771c`) merged after all five required workflows succeeded on their reviewed heads.
- PR #17 was rebased onto the then-current `main` to preserve PR #19's isolated E2E concurrency configuration. CI passed 5/5 on tested SHA `dd1cb93be9795c91dd213506003bb6ac9e163bb2`; merged as `ac19c5858e17096bc77417eaa126d96bccba548b`.
- The quantity SQL test covers negative, zero, over-available, and full-stock quantities; confirms no reservation before seller acceptance, exact reservation on acceptance, and exact inventory restoration on permitted buyer cancellation. All checks used disposable databases and synthetic users; no production data or schema was changed.
- Follow-up remains: test concurrent requests/stock edits under contention, and separately verify production migration parity only with explicit authorization.

## 2026-11-14 — Concurrent inventory reservation test

- PR #23 merged as `843966ddfb743b405cbd607709babf813bc85373`; all five required CI workflows passed on tested SHA `4e2289660bc6dfaf56900209857843a2999e970e` (run IDs: 43628942285, 43628942212, 43628942209, 43628942343, 43628942226).
- A new disposable PostgreSQL test races two buyers' five-unit requests against the same five-unit offer. A test-only trigger holds the winning offer row lock so both seller-acceptance RPC calls overlap.
- **Verified in CI:** exactly one accept succeeds, inventory reaches zero without going negative, and the competing request remains `requested`.
- Seller stock edits racing with accepted reservations remain untested. No application migration or production database was changed.


## 2026-11-14 — Stock change before acceptance

- PR #25 merged as `276f9c1ee17a36548503625856534e47cecbc881`; all five required workflows passed on tested SHA `de8135626ccb7e52c68853b0bcdd93668ac5bb10` (run IDs: 43629625536, 43629625553, 43629625537, 43629625547, 43629625565).
- **Verified in disposable PostgreSQL CI:** after a buyer creates a five-unit request, seller stock can change to four before acceptance; acceptance fails with `stock changed`, preserving stock at four and request status as `requested`. Restoring stock to five allows acceptance and existing cancellation restoration checks pass.
- This validates stock rechecking at acceptance; it does not test concurrent seller edits against active reservations or production deployment parity. No production schema/data changed.


## 2026-11-14 — Purchase request audit history

- PR #27 merged as `dab0ac926b94c492d8e08b21a8f81602638d141c`; all five required workflows passed on tested head `5b918b2fd888f0bda16834385d0f7f3f6baeaea0` (run IDs: 43630530757, 43630530769, 43630530762, 43630530763, 43630530818).
- Added an append-only event table for request creation/status changes, with actor, old/new status, note, and timestamp.
- **Verified in disposable PostgreSQL CI:** buyer/seller participants can read their event history, unrelated buyer access is filtered, direct authenticated INSERT/UPDATE/DELETE is denied, and creation, acceptance, and cancellation are attributed to the correct actor.
- Additive migration only. Production migration application, real account UAT, and audit coverage for other domains remain outstanding.


## 2026-11-14 — Participant request history UI

- PR #29 merged as `6c38b3ba0be185c8ceb2aa0f1c7246459d9622c0`; all five workflows passed on tested SHA `37f16a709ca09b1e68ad23752258899877852737` (run IDs: 43631590639, 43631590648, 43631590649, 43631590647, 43631590642).
- Buyer order cards and seller request cards now offer an on-demand event timeline, loaded through a participant-authorized RPC. The browser E2E confirms both buyer and verified seller can open the event history.
- Request history UI is tested in CI; delivery tracking, payment settlement, production UAT, and audit views for other domains remain outstanding.


## 2026-11-14 — Stale draft PR cleanup

- Reviewed draft PR #5 (head SHA 746b7cb39794e1524d7bb341c32d627c1dd1c6ec, base SHA 671231076d39708bb34c21bf0b03462b9aa0a974); GitHub reported it unmergeable.
- Its purchase-request migration blob matches current main exactly. The request UI and tests on the draft branch are older than current main, which includes quantity, concurrency, audit, participant history, and browser coverage.
- Closed PR #5 as superseded, without merging or changing its branch contents. No source or production data changed.


## 2026-11-14 — Read-only admin request monitoring

- PR #32 merged as `abc7edd84b88d48b3facab7ca6fc90dbaa9ad3e2`; all five workflows passed on tested head `4bd75d1d6431e5b07b1de1e0cd0b0cc95ab7b8ff` (run IDs: 43634117323, 43634117286, 43634117259, 43634117243, 43634117303).
- Added a server-authorized, status-filtered admin request list and admin access to request event history. The admin page is read-only; no transition, payment, or delivery actions were added.
- **Verified in disposable CI:** admin can list/filter requests and inspect history; non-admin RPC access is denied; browser E2E confirms admin navigation and history display.
- Production database unchanged. Delivery/COD operations and production UAT remain open.


## 2026-11-14 — Seller stock edits with accepted reservations

- PR #34 merged as `3f4ae1ab388a9df6cbb44fe68274a9c615ec9103`; tested head was `c11a2a81365fef7c4e7f93058ed4bfe8c67ceacf`.
- Added a disposable PostgreSQL regression for an accepted two-unit request from five units, a seller edit of available stock to one, and buyer cancellation. The expected final available stock is three (the edited one plus the released two). Clarified in the seller UI that the stock field means available-to-sell units and excludes accepted reservations.
- All five CI workflows passed: Qitaa CI `43634718906`, DB Security `43634718975`, HTTP Smoke `43634718920`, Buyer-Seller Browser E2E `43634718921`, Vehicle Reference Preview `43634718912`.
- No schema or production database changes. Delivery, COD, refunds, real-user UAT, and production migration parity remain open.


## 2026-11-14 — Admin request monitor isolation regression

- PR #36 merged as `90c1c219feedcd008b246c8e2d2e9bbd65b71925`; tested head `8690cf45460f4c979b3ba048f649b162ed58a7f3`.
- Added disposable PostgreSQL checks for admin status filtering, request uniqueness in the returned list, and denial of the admin RPC to buyer and seller roles.
- Pinned the E2E workflow to Supabase CLI `3.1.0` after GitHub API rate limits blocked `version: latest` during setup.
- All five workflows passed: DB Security `43635667831`, HTTP Smoke `43635667832`, Buyer-Seller Browser E2E `43635667839`, Qitaa CI `43635667919`, Vehicle Reference Preview `43635667910`.
- Tests used a disposable PostgreSQL database and synthetic users; no production database changes.


## 2026-11-14 — Concurrent seller stock edit and reservation

- PR #38 merged as `c68754d679884db7e0547b0bc8a179ccac9e3df1`; tested head `50e854788ef7a79f25872b6a91f14b7087a86a73`.
- Added a disposable PostgreSQL race where seller B accepts a two-unit request while editing available stock. The test confirms row-level serialization, preserves the accepted request, and verifies buyer cancellation raises edited stock from one to three.
- All five workflows passed: DB Security `43637364399`, Qitaa CI `43637364404`, HTTP Smoke `43637364406`, Vehicle Reference Preview `43637364438`, Buyer-Seller Browser E2E `43637364455`.
- Test-only change; no production database or application behavior was changed.


## 2026-11-14 — عزل بيانات سيارات العملاء

- PR #41 دُمج بالـSHA 740fb0e3206db7d928ae5245f17ef2bbf9ecebc3 بعد نجاح الفحوص الخمسة على head 4e760e44f9ff23f6e1c58768cb2de0e40010df17.
- أُضيفت اختبارات PostgreSQL مؤقتة تثبت أن المستخدم الآخر لا يستطيع قراءة سيارة العميل أو تعديلها أو حذفها أو انتحال مالكها، وأن المالك يظل قادراً على قراءة سيارته وتحديثها وإضافة سجل صيانة.
- نتائج Actions: DB Security 43639935410، HTTP Smoke 43639935496، Browser E2E 43639935434، Vehicle Reference Preview 43639935488، CI 43639935457 — كلها ناجحة.
- تغيير اختبارات فقط؛ لم يتغير التطبيق أو المخطط، ولم تُمس قاعدة الإنتاج.

## 2026-11-14 — حدود صلاحيات سجل التدقيق للمجهول

- PR #42 مدمج في SHA d726386f319c414c39d5b21cf7d440166b407cb9 بعد نجاح 5/5 فحوص على head f2db17a960942303a1450869f5855b2fcc18cb8d.
- أضاف اختبار PostgreSQL مؤقتاً يثبت أن anon لا يملك EXECUTE على دالتي قراءة سجل الطلبات أو الإدارة، ولا SELECT/INSERT/UPDATE/DELETE على جدول سجل الأحداث، مع بقاء EXECUTE للحسابات المصادق عليها.
- Actions: E2E 43640184208، HTTP Smoke 43640184183، DB Security 43640184222، Vehicle Preview 43640184190، CI 43640184220 — كلها ناجحة. الاختبار فقط؛ لا تغيير إنتاجي.

## 2026-11-15 — رحلة متصفح الكراج

- PR #45 دُمج في SHA 199911ec9ec394107febbf38046ad976ebe8b921؛ head المختبر fdef6dcd1969f9d69d022b25d7f15f7c9d5c5fdf.
- أضاف رحلة متصفح على Supabase محلي مؤقت: العميل ينشئ سيارة، يسجل صيانة ويشاهد السجل؛ حساب عميل آخر لا يرى المركبة. أُضيفت صفوف ماركة/موديل اصطناعية إلى seed الخاص بـE2E فقط.
- الفحوص الخمسة نجحت: HTTP Smoke 43643643130، Vehicle Reference Preview 43643643121، DB Security 43643643152، CI 43643643156، Browser E2E 43643643214. يؤكد سجل E2E صراحة نجاح إنشاء المركبة والصيانة وعزل الحساب الآخر.
- تغييرات اختبار وبيانات مؤقتة فقط؛ لا تعديل على منطق التطبيق أو مخطط/بيانات الإنتاج.

## 2026-11-15 — Vehicle reference integrity and verified checkpoint

- PR #47 merged as `9a6785af7ccb0c965eed413b9d29c6474cc5f2be` (reviewed head `2b3cd9d79091637cc2aa20ae55baa7e014f3b914`). It rejects invisible Unicode control characters in staged vehicle references and includes a regression test. All five required workflows passed: Vehicle Reference Preview `43645660672`, HTTP Smoke `43645660663`, DB Security `43645660693`, CI `43645660681`, Buyer-Seller E2E `43645660669`.
- PR #48 merged as `d7e24c50f6278791992910b137f8e5f5cb4d1c62` (reviewed head `64df3c4bbf49f6c285db8a8397d03af06711549d`). Conflicting vehicle type identities now require review; a regression test covers the conflict. All five workflows passed: CI `43655996731`, HTTP Smoke `43655996694`, Vehicle Reference Preview `43655996664`, DB Security `43655996713`, Buyer-Seller E2E `43655996714`.
- PR #49 merged as `71ba890e5322ced52c94e23f7b07fe78e1a378a2` (reviewed head `21cc71e7426db921e1d1bd1518aea5bea6f9b937`). Vehicle identity grouping now uses an encoded canonical tuple rather than delimiter concatenation; the regression covers delimiter-bearing make/model pairs. All five workflows passed: CI `43659702029`, Buyer-Seller E2E `43659702052`, DB Security `43659702074`, HTTP Smoke `43659702031`, Vehicle Reference Preview `43659702077`.
- These changes affect offline preview logic/tests only. No external dataset was imported, and no production database, deployment, payment, or customer data was changed.
- Vehicle source-rights review was refreshed in `docs/VEHICLE_DATA_SOURCE_REVIEW.md`; source-specific terms and the limits of package licensing are recorded. Candidate open-government subsets remain unapproved for import pending dataset/version-level provenance and attribution checks.
- Current main SHA at this checkpoint: `71ba890e5322ced52c94e23f7b07fe78e1a378a2`. Main-branch DB Security and Buyer-Seller E2E workflows were still running when this note was prepared; verify their final conclusions before treating the post-merge main checkpoint as green.


## 2026-11-15 — Offline vehicle preview size-bound validation

- PR #51 merged as `050065ed8f4f0762ed14f55aaa3124fb7e17c978` after five successful checks on reviewed head `50ffcc038d66d078c1ed5236f911ccae6bccb0db`.
- Verified workflow runs: Qitaa CI `43660826618`, DB Security `43660826596`, HTTP Smoke `43660826578`, Vehicle Reference Preview `43660826667`, Browser E2E `43660826586` — all completed successfully.
- `maxRows` now requires a positive safe integer, rejecting NaN, infinity, fractional and unsafe limits. Synthetic unit regressions cover invalid values and a valid one-row bound.
- PR #17 and #18 were already merged; browser E2E concurrency isolation was implemented in PR #19. No duplicate edits to these completed gates.
- No production database, import, payment or deployment was performed. Source redistribution rights, authoritative OEM/fitment verification, production migration parity, real-account UAT and delivery/COD/refund business rules remain open.

## 2026-11-15 — Vehicle preview bounds and Unicode input hardening

- PR #53 merged as 73166f370eb31d36558ce4ff7333c51aaa1f7aa9 on reviewed head a2587f9d6ba63307e8f211a92f3a4b53158391ad. Existing catalog records with malformed year intervals now require review. All five checks passed: CI 43674965199, DB Security 43674965101, Vehicle Preview 43674965128, HTTP Smoke 43674965093, Browser E2E 43674965080.
- PR #54 merged as 7c463a0896e02fee156a7affb712f9bd63ef4d2c on head 9f2a0503b7dcdfa2fab52ba373af59022ef9c042. Vehicle make/model and source IDs now reject Unicode line/paragraph separators. All five checks passed: Browser E2E 43679093654, anonymous pages 43679093707, CI 43679093606, DB Security 43679093615, Vehicle Preview 43679093608.
- PR #55 merged as 715820104b220b3ed159ec4e30bbd33198814053 on final tested head 7be970b989e959623324efab822649e2687cd929. The 50,000-row default is now a hard ceiling; callers may choose a lower limit but cannot raise it. Initial CI found a formatting error in the regression-list line; it was corrected on the same branch. All five final checks passed: Browser E2E 43683800686, Vehicle Preview 43683800678, DB Security 43683800697, anonymous pages 43683800706, CI 43683800660. Post-merge main DB Security 43684062340 and E2E 43684062400 also passed.
- PR #56 merged as 32f2fa2540882b83f4af4edb2c2a05d7e391ae82 on tested head 4b8da4076df1dd6b17393f0b43e9e69f82b544db. Input validation rejects unpaired UTF-16 surrogates while allowing valid pairs. The first offline-import run exposed incorrectly double-escaped test fixtures; the fixtures were corrected to exercise actual code units. All five checks passed: Browser E2E 43684129751, anonymous pages 43684129757, CI 43684129772, DB Security 43684129762, Vehicle Preview 43684129749.
- All above changes are limited to offline vehicle-reference preview and synthetic tests. No external data import, production migration, payment, deployment, or customer-data change occurred.
- Resume checkpoint: main at 32f2fa2540882b83f4af4edb2c2a05d7e391ae82. Verify post-merge main checks and open PRs before the next change. Catalog source approval, production migration parity, real-user UAT, delivery/COD/refunds and the other planned product domains remain open.

## 2026-11-15 — Append-only audit for seller and catalog administration

- PR #58 merged as 995134cb0225cac76a9e1acf456d9e1bfd3a8e9f on reviewed head 98c3bb39b8a7e2dd293c57ca9c6591c963efd242. Added append-only seller-application events for submission, approval and rejection, including actor/status/review note. Applicant and admin reads are scoped by RLS; authenticated direct writes and event UPDATE/DELETE are denied. Tests cover approval/rejection attribution and cross-applicant isolation. Initial DB runs exposed an ungranted has_role call in the new policy and a malformed test dollar-quote; both were corrected before merge. Final five checks passed: E2E 43685361915, DB Security 43685361987, CI 43685361962, anonymous pages 43685361932, Vehicle Preview 43685361952.
- PR #59 merged as 96d1b21cff766c3c455d9b92705e3dd3d3d9be34 on reviewed head 9e761ad9ee7848ff87734f97f58b8fb5e8d07cf9. Added append-only catalog-import events for staged/applied transitions, actor and source label; the event table does not copy payload or preview data. Admin-only reads and denied direct writes are covered with immutability checks. The first DB run exposed an existing has_role permission issue when the test queried the separate batch table; the test now verifies through the new event table without widening existing privileges. Final five checks passed: E2E 43685875350, offline import 43685875447, anonymous pages 43685875390, DB Security 43685875367, CI 43685875325.
- Both migrations and regressions ran against disposable PostgreSQL in CI. No production database, schema, catalog, deployment, or customer data was changed.
- Current main at this checkpoint: 96d1b21cff766c3c455d9b92705e3dd3d3d9be34. The post-merge main DB Security and Buyer-Seller E2E workflows were still in progress when recorded; check the latest Actions before claiming main is green.


## 2026-11-15 — عرض سجل التدقيق في لوحة المسؤول

- PR #61 merged as `be91e113f7dc281a2d2028532f20b0868dfa6503`; final tested head `fcdf44506cb854e710d283168d34f2640b0358b6`.
- Added admin-gated seller application history (submission and review status events) and the latest 20 catalog import events (staged/applied), using the existing RLS policies and typed Supabase schema.
- Extended isolated browser E2E seeds and assertions. The final journey passed seller submission/approval history and catalog staging/application history, as well as the existing buyer/seller/admin and garage flows.
- All five required checks passed on the final PR head: CI `43687991606`, DB Security `43687991724`, Vehicle Reference Preview `43687991703`, HTTP Smoke `43687991507`, Browser E2E `43687991616`.
- Earlier attempts found and corrected a JSX row wrapper, formatting issues, E2E seed ordering, and a test selector that did not match the button's accessible name. The final runs above passed after those corrections.
- Only disposable local Supabase E2E data was used. No production migration, data, payment, or deployment action occurred. Admin audit history is now visible in the current UI and browser-tested, but real administrator UAT and production migration/RLS parity remain unverified.
- Current main merge checkpoint: `be91e113f7dc281a2d2028532f20b0868dfa6503`. Recheck current open PRs and Actions before continuing.


## 2026-11-15 — إظهار منفذ حدث التدقيق في الواجهات الإدارية

- PR #63 merged as `f1b9ad7d81748755dcf304ee74e8150695e2d65b`, reviewed head `5252cd53869dd1b0095880770a46101a7dc85bec`.
- The seller-application and catalog-import audit timelines now show the actor ID (or system actor) alongside the event, status/note, and timestamp. No schema or authorization change was needed; actor attribution was already recorded by the append-only tables.
- Browser E2E verifies actor attribution on both timelines. All five required checks passed: CI `43688980871`, DB Security `43688980886`, Vehicle Preview `43688980937`, HTTP Smoke `43688980904`, Browser E2E `43688980867`.
- Uses only synthetic disposable E2E data. No production database or deployment was touched. Admin UAT and production migration/RLS parity remain unverified.
- Current main merge checkpoint: `f1b9ad7d81748755dcf304ee74e8150695e2d65b`.

## 2026-11-19 — Catalog CSV boundary regressions and CI checkpoint

- PR #89 merged into main as `404d0f0cbf98a9302fc569c64d4556122e9792fc` after all five checks passed on final reviewed head `985aff4119680ca32c7fa9630c85d3932f945119`: Qitaa CI `44417743033`, DB Security `44417743116`, HTTP Smoke `44417743078`, Vehicle Reference Preview `44417743211`, Buyer-Seller Browser E2E `44417743027`.
- Added CSV import regression cases for UTF-8 BOM and reordered required headers, case-insensitive duplicate OEMs, exactly 200 versus 201 rows, duplicate headers, wrong row width and oversize input. The initial PR-head CI failed only on Prettier; formatting was corrected and the final head passed.
- Confirmed PR #17 and #18 remain merged. Browser E2E concurrency is already isolated by PR number or branch ref; no workflow rewrite is required.
- This is offline/synthetic test coverage, **not** real supplier-data validation or merchant acceptance testing. No production DB, payments or deployment were touched.
- Remaining gates: authoritative OEM/fitment provenance, real merchant/customer/admin UAT, production migration/RLS parity, delivery and collections workflows, workshop interfaces, and native apps. Do not declare launch readiness on the basis of CI alone.

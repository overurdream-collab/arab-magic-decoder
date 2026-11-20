import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const buyer = { email: "buyer.e2e@qitaa.test", password: "Qitaa-E2E-Buyer-2026!" };
const outsider = { email: "outsider.e2e@qitaa.test", password: "Qitaa-E2E-Outsider-2026!" };
const makeId = "96000000-0000-4000-8000-000000000001";
const modelId = "97000000-0000-4000-8000-000000000001";
const vehicleName = "سيارة E2E الخاصة";

async function login(page, credentials) {
  await page.goto(`${base}/garage`);
  await page.getByPlaceholder("البريد الإلكتروني").fill(credentials.email);
  await page.getByPlaceholder("كلمة المرور").fill(credentials.password);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.getByRole("heading", { name: "سياراتي" }).waitFor({ timeout: 15000 });
  await page.getByText(/سيارة محفوظة/).waitFor({ timeout: 15000 });
}

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await login(owner, buyer);
  await owner.getByText("0 سيارة محفوظة").waitFor();

  await owner.getByRole("button", { name: /إضافة سيارة/ }).click();
  const selects = owner.locator("select");
  await selects.nth(0).selectOption(makeId);
  await selects.nth(1).selectOption(modelId);
  await owner.getByPlaceholder("سنة الصنع").fill("2020");
  await owner.getByPlaceholder("العداد الحالي (كم)").fill("50000");
  await owner.getByPlaceholder(/اسم مميز/).fill(vehicleName);
  await owner.getByRole("button", { name: "حفظ السيارة" }).click();
  await owner.getByText(vehicleName).waitFor({ timeout: 15000 });
  await owner.getByText("1 سيارة محفوظة").waitFor({ timeout: 15000 });
  report.push("PASS owner creates and reads a vehicle");

  await owner.getByRole("button", { name: "تسجيل صيانة / تغيير زيت" }).click();
  await owner.getByLabel("العداد عند الخدمة").fill("50100");
  await owner.getByLabel("العمر الافتراضي (كم)").fill("5000");
  await owner.getByLabel("المدة الزمنية (أشهر)").fill("6");
  await owner.getByPlaceholder("نوع الزيت (مثلاً: شل)").fill("زيت اختبار");
  await owner.getByPlaceholder("اللزوجة 5W-30").fill("5W-30");
  await owner.getByRole("button", { name: "حفظ السجل" }).click();
  await owner.locator("li").filter({ hasText: "زيت اختبار" }).waitFor({ timeout: 15000 });
  report.push("PASS owner records maintenance and sees service history");

  // Re-fetch from the backend instead of trusting the current React state.
  await owner.reload();
  await owner.getByRole("heading", { name: "سياراتي" }).waitFor({ timeout: 15000 });
  await owner.getByText(vehicleName).waitFor({ timeout: 15000 });
  await owner.getByText("1 سيارة محفوظة").waitFor({ timeout: 15000 });
  await owner.locator("li").filter({ hasText: "زيت اختبار" }).waitFor({ timeout: 15000 });
  report.push("PASS vehicle and maintenance persist after page reload");

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await login(other, outsider);
  await other.getByText("0 سيارة محفوظة").waitFor({ timeout: 15000 });
  assert.equal(await other.getByText(vehicleName).count(), 0);
  assert.equal(await other.getByText("زيت اختبار").count(), 0);
  await other.reload();
  await other.getByText("0 سيارة محفوظة").waitFor({ timeout: 15000 });
  assert.equal(await other.getByText(vehicleName).count(), 0);
  assert.equal(await other.getByText("زيت اختبار").count(), 0);
  report.push("PASS another customer cannot see vehicles or maintenance, including after reload");

  await ownerContext.close();
  await otherContext.close();
  console.log(report.join("\n"));
} catch (error) {
  console.error(report.join("\n"));
  throw error;
} finally {
  await browser.close();
}

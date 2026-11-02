import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const partId = "93000000-0000-4000-8000-000000000001";
const buyer = { email: "buyer.e2e@qitaa.test", password: "Qitaa-E2E-Buyer-2026!" };
const seller = { email: "seller.e2e@qitaa.test", password: "Qitaa-E2E-Seller-2026!" };
const outsider = { email: "outsider.e2e@qitaa.test", password: "Qitaa-E2E-Outsider-2026!" };

async function login(page, credentials, path) {
  await page.goto(`${base}${path}`);
  await page.getByPlaceholder("البريد الإلكتروني").fill(credentials.email);
  await page.getByPlaceholder("كلمة المرور").fill(credentials.password);
  await page.getByRole("button", { name: "دخول" }).click();
  await page.getByText(/جارٍ التحميل|جارٍ التحقق/).first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  if (path === "/orders") await page.getByText("لا توجد طلبات حتى الآن").waitFor({ timeout: 10000 });
  if (path === "/seller") await page.getByText("طلبات العملاء").waitFor({ timeout: 10000 });
}

const browser = await chromium.launch({ headless: true });
const diagnostics = [];
const report = [];
let buyerPage;
try {
  const buyerContext = await browser.newContext();
  buyerPage = await buyerContext.newPage();
  buyerPage.on("pageerror", e => diagnostics.push("PAGEERROR " + e.message));
  buyerPage.on("response", r => { if (r.status() >= 400) diagnostics.push(`HTTP ${r.status()} ${r.url()}`); });
  buyerPage.on("console", m => { if (m.type() === "error") diagnostics.push("CONSOLE " + m.text()); });
  await login(buyerPage, buyer, "/orders");
  await buyerPage.goto(`${base}/part/${partId}`);
  await buyerPage.waitForTimeout(1500);
  console.log("PART_PAGE_URL", buyerPage.url());
  console.log("PART_PAGE_TEXT", (await buyerPage.locator("body").innerText()).slice(0,5000));
  console.log("BROWSER_DIAGNOSTICS", diagnostics.join("\\n"));
  await buyerPage.getByRole("button", { name: "أرسل طلب توفر" }).click();
  await buyerPage.waitForTimeout(1500);
  console.log("AFTER_REQUEST_URL", buyerPage.url());
  console.log("AFTER_REQUEST_TEXT", (await buyerPage.locator("body").innerText()).slice(0,4000));
  if (!buyerPage.url().endsWith("/orders")) throw new Error("Purchase request did not navigate to /orders");
  await buyerPage.getByText("بانتظار موافقة التاجر").waitFor({ timeout: 15000 });
  report.push("PASS buyer creates purchase request through part page");

  const outsiderContext = await browser.newContext();
  const outsiderPage = await outsiderContext.newPage();
  await login(outsiderPage, outsider, "/orders");
  await outsiderPage.getByText("لا توجد طلبات حتى الآن").waitFor({ timeout: 15000 });
  report.push("PASS another buyer cannot see the buyer's request");

  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  await login(sellerPage, seller, "/seller");
  await sellerPage.getByText("طلبات العملاء").waitFor({ timeout: 15000 });
  await sellerPage.getByRole("button", { name: "تأكيد التوفر" }).click();
  await sellerPage.getByText("محجوز").waitFor({ timeout: 15000 });
  report.push("PASS seller sees and accepts the request");

  await buyerPage.reload();
  await buyerPage.getByText("وافق التاجر وحجز الكمية").waitFor({ timeout: 15000 });
  buyerPage.once("dialog", dialog => dialog.accept());
  await buyerPage.getByRole("button", { name: "إلغاء الطلب" }).click();
  await buyerPage.getByText("أُلغي الطلب").waitFor({ timeout: 15000 });
  report.push("PASS buyer cancels accepted request");

  await buyerContext.close();
  await outsiderContext.close();
  await sellerContext.close();
  console.log(report.join("\n"));
} catch (error) {
  console.error(report.join("\n"));
  throw error;
} finally {
  await browser.close();
}

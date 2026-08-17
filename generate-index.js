/**
 * generate-template-pages.js
 * ---------------------------
 * Surajfx.in - Static Template Page Generator
 *
 * Ei script ta Firebase Realtime Database-er 'templates' path theke
 * sob template data fetch kore, protita template-er jonno alada
 * static HTML page banai: /output/template/<id>.html
 *
 * Kaj ki kore:
 *   - Prottek page-e real title, real YouTube thumbnail niye proper
 *     Open Graph tags boshai (WhatsApp/Instagram/Twitter-e share korle
 *     sothik preview dekhabe)
 *   - Page load hole 0.6 sec por automatic mul app-e (index.html#card-num)
 *     redirect kore, jate full interactive experience (video play,
 *     like, use button) age-r moto e thake
 *   - Crawler bot (WhatsApp/Google) JS run kore na, tai sudhu static
 *     content ta dekhbe -> proper preview + SEO
 *
 * Kivabe run korbe:
 *   1. npm install firebase-admin
 *   2. serviceAccountKey.json ei folder-e rakhbo (template-cc1cb project-er)
 *   3. Terminal-e: node generate-template-pages.js
 *   4. output/template/ folder-e sob HTML file toiri hoi jabo
 *   5. output/ folder-er content root-e copy kore GitHub-e push korle
 *      Vercel/GitHub Pages automatic deploy kore dibe
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://template-cc1cb-default-rtdb.firebaseio.com",
  });
}

const db = admin.database();

const SITE_URL = "https://surajfx.in";
const FALLBACK_IMAGE = SITE_URL + "/icon.svg";

// ---------- Helper: HTML-safe escape ----------
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getYouTubeId(url) {
  if (!url) return "";
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\s]+)/);
  return m ? m[1] : "";
}

function getDriveId(url) {
  if (!url) return "";
  const m = String(url).match(/\/d\/([^/?]+)/);
  return m ? m[1] : "";
}

function getThumb(t) {
  if (t.thumb) return t.thumb;
  const ytId = getYouTubeId(t.video);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  const driveId = getDriveId(t.video);
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w400`;
  return FALLBACK_IMAGE;
}

function catLabel(cat) {
  if (cat === "cinematic") return "Cinematic";
  if (cat === "hindi") return "Hindi Music";
  return "Trending";
}

// ---------- HTML Template for one template share-page ----------
function buildHTML(t) {
  const title = esc(t.name ? `Template #${t.num} / ${t.name}` : `Template #${t.num}`);
  const category = catLabel(t.cat);
  const image = getThumb(t);
  const desc = `${title} — Free CapCut ${category} template by SurajFX. Tap to use instantly.`;
  const pageUrl = `${SITE_URL}/template/${t.id}.html`;
  const redirectUrl = `${SITE_URL}/index.html#card-${t.num}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — SurajFX</title>

<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${pageUrl}">

<!-- Open Graph -->
<meta property="og:type" content="video.other">
<meta property="og:url" content="${pageUrl}">
<meta property="og:title" content="${title} — SurajFX">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${image}">
<meta property="og:site_name" content="SurajFX">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title} — SurajFX">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${image}">

<!-- Schema.org -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "${title}",
  "image": "${image}",
  "url": "${pageUrl}",
  "author": { "@type": "Organization", "name": "SurajFX" }
}
</script>

<meta http-equiv="refresh" content="0.6;url=${redirectUrl}">
<style>
  body{background:#08060f;color:#f0f0ff;font-family:sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center}
  img{max-width:320px;width:100%;border-radius:16px;margin-bottom:16px;box-shadow:0 8px 30px rgba(0,0,0,0.5)}
  h1{font-size:20px;margin:0 0 6px}
  p{color:#9a8fc9;font-size:13px;margin:0 0 20px}
  a.btn{background:linear-gradient(135deg,#e13cff,#ff8a3d);color:#fff;text-decoration:none;padding:12px 24px;border-radius:100px;font-weight:700;font-size:14px}
</style>
</head>
<body>
  <img src="${image}" alt="${title}">
  <h1>${title}</h1>
  <p>${category} · Opening SurajFX...</p>
  <a class="btn" href="${redirectUrl}">Open Template →</a>
</body>
</html>`;
}

// ---------- Main ----------
async function generate() {
  console.log("Firebase theke templates fetch kora hocche...");

  const snap = await db.ref("templates").once("value");
  const data = snap.val() || {};
  const templates = Object.entries(data).map(([id, t]) => ({ id, ...t }));

  if (!templates.length) {
    console.log("Kono template paoa jayni.");
    process.exit(0);
  }

  const outputDir = path.join(__dirname, "output", "template");
  fs.mkdirSync(outputDir, { recursive: true });

  const sitemapUrls = [];

  templates.forEach((t) => {
    const html = buildHTML(t);
    const filePath = path.join(outputDir, `${t.id}.html`);
    fs.writeFileSync(filePath, html, "utf-8");
    console.log(`✔ Generated: /template/${t.id}.html`);
    sitemapUrls.push(`${SITE_URL}/template/${t.id}.html`);
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
${sitemapUrls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, "output", "sitemap-templates.xml"), sitemap, "utf-8");

  console.log(`\nTotal ${templates.length} ta page generate hoise. "output/template/" folder check korun.`);
  process.exit(0);
}

generate().catch((err) => {
  console.error("Error hoise:", err);
  process.exit(1);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const sharp = require("sharp");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = Number(process.env.PORT || 10000);

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json({ limit: "5mb" }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

const HTML_SKELETON = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <h1>Hello, CodixGPT!</h1>
</body>
</html>`;

const META_TAGS = [
  ["<meta charset=\"UTF-8\">", "Sets the character encoding."],
  ["<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">", "Makes the page responsive on mobile devices."],
  ["<meta name=\"description\" content=\"...\">", "Provides a short page description for search engines."],
  ["<meta name=\"keywords\" content=\"...\">", "Lists page keywords; modern search engines generally give this little weight."],
  ["<meta name=\"author\" content=\"...\">", "Defines the page author."],
  ["<meta name=\"robots\" content=\"index, follow\">", "Provides crawler instructions."],
  ["<meta property=\"og:title\" content=\"...\">", "Open Graph title for social sharing."],
  ["<meta property=\"og:description\" content=\"...\">", "Open Graph description for social sharing."],
  ["<meta property=\"og:image\" content=\"...\">", "Open Graph preview image."],
  ["<meta name=\"theme-color\" content=\"#000000\">", "Sets the browser UI theme color where supported."]
];

function minifyCss(css) {
  return String(css)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyJs(js) {
  // Lightweight safe minifier: removes comments and collapses whitespace
  // while preserving strings and template literals.
  let out = "", i = 0, quote = null, lineComment = false, blockComment = false;
  while (i < js.length) {
    const c = js[i], n = js[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      i++;
      continue;
    }
    if (blockComment) {
      if (c === "*" && n === "/") { blockComment = false; i += 2; }
      else i++;
      continue;
    }
    if (!quote && c === "/" && n === "/") { lineComment = true; i += 2; continue; }
    if (!quote && c === "/" && n === "*") { blockComment = true; i += 2; continue; }
    if (quote) {
      out += c;
      if (c === "\\" && i + 1 < js.length) { out += js[++i]; }
      else if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; out += c; i++; continue; }
    out += c;
    i++;
  }
  return out.replace(/\s+/g, " ").replace(/\s*([{}()[\];,:])\s*/g, "$1").trim();
}

function minifyHtml(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function randomPassword(length = 18) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function imageToBase64(buffer, mime = "image/jpeg") {
  const b64 = buffer.toString("base64");
  return `data:${mime};base64,${b64}`;
}

async function extractColors(buffer, count = 8) {
  const { data, info } = await sharp(buffer)
    .resize(80, 80, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([rgb]) => {
      const [r,g,b] = rgb.split(",").map(Number);
      return "#" + [r,g,b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
    });
}

async function githubSearch(q) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodixGPT"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await axios.get("https://api.github.com/search/repositories", {
    params: { q, per_page: 10, sort: "stars", order: "desc" },
    headers
  });
  return response.data.items.map(repo => ({
    name: repo.full_name,
    description: repo.description || "No description.",
    url: repo.html_url,
    stars: repo.stargazers_count,
    language: repo.language || "N/A"
  }));
}

app.get("/api/health", (req, res) => res.json({ ok: true, name: "CodixGPT", version: "1.0.0" }));

app.get("/api/tools", (req, res) => res.json({
  tools: [
    "Image to Base64", "Image to HEX", "CSS Minifier", "JS Minifier",
    "Password Generator", "GitHub Repository Search", "HTML Meta Tags",
    "HTML Text Tags", "HTML Prototype", "HTML Minifier"
  ]
}));

app.post("/api/minify/css", (req, res) => {
  if (typeof req.body.code !== "string") return res.status(400).json({ error: "code is required" });
  res.json({ result: minifyCss(req.body.code) });
});

app.post("/api/minify/js", (req, res) => {
  if (typeof req.body.code !== "string") return res.status(400).json({ error: "code is required" });
  res.json({ result: minifyJs(req.body.code) });
});

app.post("/api/minify/html", (req, res) => {
  if (typeof req.body.code !== "string") return res.status(400).json({ error: "code is required" });
  res.json({ result: minifyHtml(req.body.code) });
});

app.get("/api/password", (req, res) => res.json({ password: randomPassword(18), length: 18 }));

app.get("/api/html/prototype", (req, res) => res.json({ html: HTML_SKELETON }));

app.get("/api/html/meta", (req, res) => res.json({
  tags: META_TAGS.map(([tag, description]) => ({ tag, description }))
}));

app.get("/api/html/text-tags", (req, res) => res.json({
  tags: [
    { tag: "<h1>...</h1>", description: "Main heading." },
    { tag: "<h2>...</h2>", description: "Section heading." },
    { tag: "<h3>...</h3>", description: "Subsection heading." },
    { tag: "<p>...</p>", description: "Paragraph text." },
    { tag: "<strong>...</strong>", description: "Strong importance, usually bold." },
    { tag: "<em>...</em>", description: "Emphasis, usually italic." },
    { tag: "<mark>...</mark>", description: "Highlighted text." },
    { tag: "<small>...</small>", description: "Small-print text." },
    { tag: "<del>...</del>", description: "Deleted text." },
    { tag: "<ins>...</ins>", description: "Inserted text." },
    { tag: "<code>...</code>", description: "Inline code." },
    { tag: "<pre>...</pre>", description: "Preformatted text." },
    { tag: "<blockquote>...</blockquote>", description: "A quoted section." }
  ]
}));

app.get("/api/github/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Search query is required" });
    res.json({ results: await githubSearch(q) });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message });
  }
});

app.post("/api/image/base64", async (req, res) => {
  try {
    const { data, mime } = req.body;
    if (!data) return res.status(400).json({ error: "Base64 image data is required" });
    const clean = data.includes(",") ? data.split(",")[1] : data;
    const buffer = Buffer.from(clean, "base64");
    res.json({ result: await imageToBase64(buffer, mime || "image/jpeg") });
  } catch (e) {
    res.status(400).json({ error: "Invalid image data" });
  }
});

app.post("/api/image/colors", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Base64 image data is required" });
    const clean = data.includes(",") ? data.split(",")[1] : data;
    const buffer = Buffer.from(clean, "base64");
    res.json({ colors: await extractColors(buffer) });
  } catch (e) {
    res.status(400).json({ error: "Could not process image" });
  }
});

// Telegram bot
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  const sessions = new Map();

  bot.start(ctx => ctx.reply(
`Hello! 👋 Welcome to CodixGPT.

Developer tools are ready. Choose a command:

Commands:
- Image to Base64: /uripic
- Image to HEX: /hex
- CSS minifier: /minicss
- JS minifier: /minijs
- Password generator: /pass
- Search GitHub repository: /repos
- HTML meta tags: /meta
- HTML text tags: /htmlt
- HTML prototype: /html
- HTML minifier: /minihtml`
  ));

  bot.command("uripic", ctx => {
    sessions.set(ctx.from.id, "uripic");
    ctx.reply("Please send the image you want to convert to a Base64 data URI.");
  });

  bot.command("hex", ctx => {
    sessions.set(ctx.from.id, "hex");
    ctx.reply("Please send the image you want me to extract colors from.");
  });

  bot.command("minicss", ctx => {
    sessions.set(ctx.from.id, "minicss");
    ctx.reply("Type the CSS code you want to minify.");
  });

  bot.command("minijs", ctx => {
    sessions.set(ctx.from.id, "minijs");
    ctx.reply("Type the JavaScript code you want to minify.");
  });

  bot.command("minihtml", ctx => {
    sessions.set(ctx.from.id, "minihtml");
    ctx.reply("Type the HTML code you want to minify.");
  });

  bot.command("pass", ctx => ctx.reply(`Your 18-character password:\n\n\`${randomPassword(18)}\``, { parse_mode: "Markdown" }));

  bot.command("html", ctx => ctx.reply(`HTML prototype:\n\n\`\`\`html\n${HTML_SKELETON}\n\`\`\``, { parse_mode: "Markdown" }));

  bot.command("meta", ctx => ctx.reply(
    META_TAGS.map(([tag, description]) => `${tag}\n→ ${description}`).join("\n\n")
  ));

  bot.command("htmlt", ctx => ctx.reply(
    [
      "<h1>...</h1> → Main heading",
      "<h2>...</h2> → Section heading",
      "<p>...</p> → Paragraph",
      "<strong>...</strong> → Strong importance",
      "<em>...</em> → Emphasis",
      "<mark>...</mark> → Highlighted text",
      "<small>...</small> → Small-print text",
      "<del>...</del> → Deleted text",
      "<ins>...</ins> → Inserted text",
      "<code>...</code> → Inline code",
      "<pre>...</pre> → Preformatted text",
      "<blockquote>...</blockquote> → Quoted section"
    ].join("\n")
  ));

  bot.command("repos", ctx => {
    sessions.set(ctx.from.id, "repos");
    ctx.reply("Type a GitHub repository search query (for example: `node telegram bot`).", { parse_mode: "Markdown" });
  });

  bot.on("photo", async ctx => {
    const mode = sessions.get(ctx.from.id);
    if (!mode) return ctx.reply("Please choose a tool command first.");

    try {
      const photos = ctx.message.photo;
      const file = await ctx.telegram.getFile(photos[photos.length - 1].file_id);
      const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data);

      if (mode === "uripic") {
        const mime = file.file_path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        const result = await imageToBase64(buffer, mime);
        await ctx.reply(`Base64 data URI:\n\n${result}`, { disable_web_page_preview: true });
      } else if (mode === "hex") {
        const colors = await extractColors(buffer);
        await ctx.reply(`Extracted colors:\n\n${colors.join("\n")}`);
      }
      sessions.delete(ctx.from.id);
    } catch (e) {
      ctx.reply("Sorry, I could not process that image.");
    }
  });

  bot.on("text", async ctx => {
    const mode = sessions.get(ctx.from.id);
    if (!mode || ctx.message.text.startsWith("/")) return;
    const text = ctx.message.text;

    try {
      if (mode === "minicss") await ctx.reply(`Minified CSS:\n\n${minifyCss(text)}`);
      else if (mode === "minijs") await ctx.reply(`Minified JavaScript:\n\n${minifyJs(text)}`);
      else if (mode === "minihtml") await ctx.reply(`Minified HTML:\n\n${minifyHtml(text)}`);
      else if (mode === "repos") {
        const results = await githubSearch(text);
        if (!results.length) return ctx.reply("No repositories found.");
        await ctx.reply(results.map((r, i) =>
          `${i + 1}. ${r.name}\n⭐ ${r.stars} | ${r.language}\n${r.description}\n${r.url}`
        ).join("\n\n"));
      }
      sessions.delete(ctx.from.id);
    } catch (e) {
      ctx.reply("Something went wrong while processing your request.");
    }
  });

  bot.launch().then(() => console.log("CodixGPT Telegram bot is running."));
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
} else {
  console.warn("TELEGRAM_BOT_TOKEN is not set. API will run without the Telegram bot.");
}

app.listen(PORT, () => console.log(`CodixGPT API listening on port ${PORT}`));

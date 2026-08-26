# CodixGPT 🚀

**CodixGPT** is a developer toolkit available in two ways:

1. A Telegram bot powered by Node.js
2. A responsive HTML/CSS/JavaScript web app using the same REST API

## Commands

- `/uripic` — Image to Base64 Data URI
- `/hex` — Extract dominant HEX colors from an image
- `/minicss` — CSS minifier
- `/minijs` — JavaScript minifier
- `/pass` — Generate an 18-character letters-only password
- `/repos` — Search GitHub repositories
- `/meta` — HTML meta tag reference
- `/htmlt` — HTML text tag reference
- `/html` — HTML prototype
- `/minihtml` — HTML minifier

## Project structure

```text
CodixGPT/
├── backend/
│   ├── src/server.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   └── README.md
└── README.md
```

## Run locally

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm start
```

On Linux/macOS, use `cp .env.example .env`.

Put your Telegram bot token in `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_TOKEN
```

The API will run on `http://localhost:10000` by default.

### Frontend

Edit `frontend/js/app.js` and set:

```js
const API = "http://localhost:10000";
```

Then open `frontend/index.html` with a static server.

## Render

Deploy `backend` as a Render Web Service:

- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: `backend`
- Environment variable: `TELEGRAM_BOT_TOKEN`
- Optional: `GITHUB_TOKEN`
- Optional: `CORS_ORIGIN`

Render provides the `PORT` environment variable automatically.

## GitHub API

`/repos` uses GitHub's repository search API. A GitHub token is optional but useful for higher API limits.

## Notes

The CSS/HTML minifiers are intentionally lightweight. The JavaScript minifier is designed for common code and preserves quoted strings/templates; for production-grade bundling/minification, a dedicated compiler such as esbuild or Terser can be added later.

Never commit `.env`, bot tokens, or private API credentials.

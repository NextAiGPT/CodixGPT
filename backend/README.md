# CodixGPT Backend

Node.js + Express API and Telegram bot backend for CodixGPT.

## Features

- Telegram bot with developer commands
- CSS / JS / HTML minification
- Image → Base64 Data URI
- Image → HEX color extraction
- 18-character letters-only password generator
- GitHub repository search API
- HTML prototype
- HTML meta tags reference
- HTML text tags reference
- REST endpoints used by the web app

## Render deployment

1. Create a new **Web Service** on Render.
2. Connect this repository.
3. Set the Root Directory to `backend` if the repository contains both folders.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variable:
   - `TELEGRAM_BOT_TOKEN` = your BotFather token
   - `GITHUB_TOKEN` = optional GitHub token for higher API limits
   - `CORS_ORIGIN` = your frontend URL, or `*` for development
7. Render supplies `PORT` automatically.

The service exposes `GET /api/health`.

## API

- `POST /api/minify/css` `{ "code": "..." }`
- `POST /api/minify/js` `{ "code": "..." }`
- `POST /api/minify/html` `{ "code": "..." }`
- `GET /api/password`
- `GET /api/html/prototype`
- `GET /api/html/meta`
- `GET /api/html/text-tags`
- `GET /api/github/search?q=...`
- `POST /api/image/base64` `{ "data": "data:image/png;base64,..." }`
- `POST /api/image/colors` `{ "data": "data:image/png;base64,..." }`

## Security note

Never commit `.env` or your Telegram/GitHub tokens. The included `.env.example` is safe to commit.

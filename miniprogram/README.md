# AI ID Photo Mini Program

A complete WeChat Mini Program front-end project for AI ID photo generation.

## Features

- Upload selfie from camera or album
- Select ID photo size and background color
- Generate AI ID photo preview via backend API
- View result with retry and HD download entry
- Create order (payment flow placeholder)
- View personal history and open detail page
- Unified request/upload/storage/format utilities

## Project Structure

```text
miniprogram/
  app.js
  app.json
  app.wxss
  sitemap.json
  project.config.json
  components/
  pages/
  utils/
  assets/
  README.md
```

## API Base URL

Default API URL in `app.js`:

```js
apiBaseUrl: 'http://localhost:3000/api'
```

If you use real mobile device debugging, replace localhost with a reachable LAN IP.

## How to Run in WeChat DevTools

1. Open **WeChat DevTools**.
2. Choose **Import Project**.
3. Select folder: `.../id-editor-ui/miniprogram`.
4. AppID can use `touristappid` for local development.
5. Ensure your backend service is running and can respond to:
   - `POST /api/upload`
   - `POST /api/generate`
   - `POST /api/orders`
   - `GET /api/images/my?userId=u_demo_001`
6. Click compile and preview.

## Notes

- This repository includes only front-end logic.
- Payment flow is intentionally reserved (no real `wx.requestPayment`).
- Components and utils are designed for easy commercial extension.

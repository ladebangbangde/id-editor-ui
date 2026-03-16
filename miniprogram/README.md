# AI ID Photo Mini Program

WeChat Mini Program frontend for `id-editor-server`.

## API Alignment

Default runtime base URLs in `app.js`:

```js
serverBaseUrl: 'http://127.0.0.1:30000'
apiBaseUrl: 'http://127.0.0.1:30000/api'
```

This mini-program now aligns with server endpoints:

- `GET /health`
- `GET /api/auth/me`
- `POST /api/auth/admin/login`
- `GET /api/scenes`
- `GET /api/scenes/:sceneKey`
- `POST /api/upload`
- `POST /api/images/generate`
- `GET /api/tasks/:taskId`
- `GET /api/images/history`
- `GET /api/images/:imageId/detail`
- `POST /api/orders`
- `GET /api/orders/:orderId`
- `POST /api/orders/:orderId/mock-pay`
- `GET /api/download/:resultId/{preview|hd|print}`
- `GET /api/admin/stats`

## E2E Flow Used by UI

1. Health check at app launch.
2. Fetch current user (`/api/auth/me`) at app launch.
3. Upload selfie (`/api/upload`).
4. Generate ID photo (`/api/images/generate`).
5. Poll task status (`/api/tasks/:taskId`) until success/fail.
6. View result and optionally:
   - copy preview download URL,
   - create order + mock pay + get HD/print download URL.
7. View history (`/api/images/history`) and detail (`/api/images/:imageId/detail`).

## Run in WeChat DevTools

1. Import `miniprogram/` into WeChat DevTools.
2. Ensure `id-editor-server` is running and reachable from DevTools host.
3. If using real device, change base URL in `app.js` to reachable LAN / tunnel URL.

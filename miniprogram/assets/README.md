# 本地收款码图片放置说明

如果你不方便把 `jpg` 提交到仓库，可以把图片只放在你本地：

1. 把微信收款码图片放到本目录，比如 `miniprogram/assets/wechat-pay.jpg`
2. 打开 `miniprogram/pages/about/about.js`
3. 将 `SUPPORT_QR_CODE_PATH` 改为：`'/assets/wechat-pay.jpg'`
4. 重新编译小程序

> 建议尺寸：宽度 600px 以上，清晰白底。

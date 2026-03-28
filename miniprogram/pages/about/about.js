// 使用说明：
// 1) 将你的微信收款码图片放到小程序目录内（例如：/miniprogram/assets/wechat-pay.jpg）
// 2) 把下面 SUPPORT_QR_CODE_PATH 改成对应路径（例如：'/assets/wechat-pay.jpg'）
// 3) 重新编译小程序即可生效
const SUPPORT_QR_CODE_PATH = '/assets/wechat-pay.jpg';

Page({
  data: {
    qrCodeSrc: SUPPORT_QR_CODE_PATH
  }
});

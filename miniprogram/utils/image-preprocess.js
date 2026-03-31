const MAX_ORIGINAL_SIZE = 15 * 1024 * 1024;
const TARGET_MAX_SIZE = 2.2 * 1024 * 1024;
const MAX_LONG_SIDE = 2200;

function getImageInfo(path) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: path,
      success: resolve,
      fail: reject
    });
  });
}

function compressImage(path, quality) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: path,
      quality,
      success: resolve,
      fail: reject
    });
  });
}

function getFileStat(path) {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath: path,
      success: resolve,
      fail: () => resolve({ size: 0 })
    });
  });
}

async function preprocessUploadImage(file = {}) {
  const tempFilePath = file.tempFilePath || '';
  const originalSize = Number(file.size || 0);
  if (!tempFilePath) {
    throw new Error('未读取到图片文件，请重试');
  }
  if (originalSize > MAX_ORIGINAL_SIZE) {
    throw new Error('图片过大，请选择 15MB 内图片');
  }

  const imageInfo = await getImageInfo(tempFilePath);
  const longSide = Math.max(Number(imageInfo.width || 0), Number(imageInfo.height || 0));
  const shouldCompress = originalSize > TARGET_MAX_SIZE || longSide > MAX_LONG_SIDE;

  if (!shouldCompress) {
    return {
      filePath: tempFilePath,
      originalSize,
      finalSize: originalSize,
      compressed: false
    };
  }

  const qualityPlan = originalSize > 6 * 1024 * 1024 ? [78, 70, 62] : [82, 74];
  let currentPath = tempFilePath;

  for (let i = 0; i < qualityPlan.length; i += 1) {
    const res = await compressImage(currentPath, qualityPlan[i]);
    if (res && res.tempFilePath) {
      currentPath = res.tempFilePath;
      const stat = await getFileStat(currentPath);
      const nextSize = Number(stat.size || 0);
      if (nextSize > 0 && nextSize <= TARGET_MAX_SIZE) {
        return {
          filePath: currentPath,
          originalSize,
          finalSize: nextSize,
          compressed: true
        };
      }
    }
  }

  const fallbackStat = await getFileStat(currentPath);
  return {
    filePath: currentPath,
    originalSize,
    finalSize: Number(fallbackStat.size || originalSize),
    compressed: currentPath !== tempFilePath
  };
}

module.exports = {
  preprocessUploadImage
};

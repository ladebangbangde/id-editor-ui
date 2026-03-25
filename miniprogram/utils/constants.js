const SCENE_TEMPLATES = [
  {
    sceneKey: 'passport',
    sceneName: '护照照片',
    widthMm: 33,
    heightMm: 48,
    pixelWidth: 413,
    pixelHeight: 531,
    description: '适用于护照办理与国际证件审核',
    featured: true
  },
  {
    sceneKey: 'visa',
    sceneName: '签证照片',
    widthMm: 33,
    heightMm: 48,
    pixelWidth: 413,
    pixelHeight: 531,
    description: '适用于常见国家签证申请场景',
    featured: true
  },
  {
    sceneKey: 'driving_license',
    sceneName: '驾驶证照片',
    widthMm: 22,
    heightMm: 32,
    pixelWidth: 260,
    pixelHeight: 378,
    description: '适用于驾驶证报名与换证需求',
    featured: true
  },
  {
    sceneKey: 'one_inch',
    sceneName: '一寸证件照',
    widthMm: 25,
    heightMm: 35,
    pixelWidth: 295,
    pixelHeight: 413,
    description: '常用于证件办理与基础报名',
    featured: false
  },
  {
    sceneKey: 'two_inch',
    sceneName: '二寸证件照',
    widthMm: 35,
    heightMm: 49,
    pixelWidth: 413,
    pixelHeight: 579,
    description: '适用于部分考试和留学申请',
    featured: false
  },
  {
    sceneKey: 'resume',
    sceneName: '简历照片',
    widthMm: 25,
    heightMm: 35,
    pixelWidth: 295,
    pixelHeight: 413,
    description: '用于简历投递和求职资料提交',
    featured: false
  },
  {
    sceneKey: 'exam',
    sceneName: '考试报名照',
    widthMm: 35,
    heightMm: 45,
    pixelWidth: 413,
    pixelHeight: 531,
    description: '适用于考试报名系统上传',
    featured: false
  }
];

const COLOR_OPTIONS = [
  { value: 'white', label: '白色', hex: '#FFFFFF' },
  { value: 'blue', label: '蓝色', hex: '#2F67E8' },
  { value: 'red', label: '红色', hex: '#D94848' }
];

const STATUS_MAP = {
  pending: '待支付',
  paid: '已支付',
  processing: '处理中',
  success: '已完成',
  failed: '失败'
};

const STORAGE_KEYS = {
  CURRENT_SCENE: 'current_scene',
  CURRENT_UPLOAD: 'current_upload',
  CURRENT_RESULT: 'current_result',
  CURRENT_PROCESS_FAILURE: 'current_process_failure',
  FLOW_DRAFT: 'id_photo_flow_draft',
  HISTORY_LIST: 'history_list'
};

const MOCK_RESULT = {
  taskId: 'task_mock_001',
  previewUrl: 'https://dummyimage.com/600x800/f5f7fb/667085&text=%E8%AF%81%E4%BB%B6%E7%85%A7%E9%A2%84%E8%A7%88',
  resultUrl: 'https://dummyimage.com/1200x1600/f1f5f9/475569&text=%E9%AB%98%E6%B8%85%E5%9B%BE',
  sizeCode: 'one_inch',
  qualityStatus: 'PASSED',
  qualityMessage: '质量检测通过',
  warnings: [],
  fileDesc: 'JPG/PNG 格式结果链接可直接复制'
};

const MOCK_HISTORY = [
  {
    recordId: 'r001',
    sceneName: '护照照片',
    sizeText: '33×48mm',
    backgroundColor: '蓝色',
    previewUrl: 'https://dummyimage.com/300x380/e2e8f0/475569&text=%E6%8A%A4%E7%85%A7',
    createdAt: '2026-03-15 10:20',
    status: 'paid'
  },
  {
    recordId: 'r002',
    sceneName: '驾驶证照片',
    sizeText: '22×32mm',
    backgroundColor: '白色',
    previewUrl: 'https://dummyimage.com/300x380/e2e8f0/475569&text=%E9%A9%BE%E9%A9%B6%E8%AF%81',
    createdAt: '2026-03-14 18:40',
    status: 'pending'
  }
];

module.exports = {
  SCENE_TEMPLATES,
  COLOR_OPTIONS,
  STATUS_MAP,
  STORAGE_KEYS,
  MOCK_RESULT,
  MOCK_HISTORY
};

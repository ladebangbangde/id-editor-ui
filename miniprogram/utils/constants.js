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
  success: '成功',
  failed: '失败'
};

const STORAGE_KEYS = {
  CURRENT_SCENE: 'current_scene',
  CURRENT_UPLOAD: 'current_upload',
  CURRENT_RESULT: 'current_result'
};

module.exports = {
  SCENE_TEMPLATES,
  COLOR_OPTIONS,
  STATUS_MAP,
  STORAGE_KEYS
};

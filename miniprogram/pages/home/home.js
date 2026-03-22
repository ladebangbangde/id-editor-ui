const { getHomeTemplateConfig } = require('../../utils/api');
const { getFriendlySceneName, getFriendlySceneHint } = require('../../utils/photo-display');

const HOME_TABS = [
  { key: 'popular', label: '热门尺寸' },
  { key: 'general', label: '通用寸照' },
  { key: 'medical', label: '医药卫生' },
  { key: 'language', label: '语言考试' },
  { key: 'civil', label: '公务考试' },
  { key: 'degree', label: '学历考试' },
  { key: 'career', label: '职业资格' },
  { key: 'passport', label: '签证护照' },
  { key: 'police', label: '公安证件' },
  { key: 'social', label: '社保民政' }
];

const MAIN_ACTIONS = [
  {
    key: 'photo',
    title: '拍摄证件照',
    subtitle: '制作标准证件照',
    iconText: '拍',
    iconClass: 'icon-camera',
    cardClass: 'main-card-camera',
    badge: '常用',
    routeType: 'upload'
  },
  {
    key: 'background',
    title: '一键换底色',
    subtitle: '智能抠图换底色',
    iconText: '色',
    iconClass: 'icon-color',
    cardClass: 'main-card-color',
    badge: '推荐',
    routeType: 'background'
  }
];

const QUICK_ACTIONS = [
  {
    key: 'custom-size',
    title: '自定义像素',
    iconText: '定',
    iconClass: 'icon-custom',
    routeType: 'custom-size'
  },
  {
    key: 'formal-wear',
    title: '智能换正装',
    iconText: '装',
    iconClass: 'icon-suit',
    routeType: 'feature',
    toastText: '智能换正装功能开发中'
  },
  {
    key: 'vip-custom',
    title: '高端定制',
    iconText: '定',
    iconClass: 'icon-vip',
    routeType: 'feature',
    toastText: '高端定制功能开发中'
  },
  {
    key: 'receipt',
    title: '回执办理',
    iconText: '回',
    iconClass: 'icon-receipt',
    routeType: 'feature',
    toastText: '回执办理功能开发中'
  }
];

const HOME_TEMPLATE_MAP = {
  popular: [
    {
      sceneKey: 'one_inch',
      name: '一寸',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '适合常规证件办理与简历投递',
      tags: ['白底', '蓝底', '红底', '常用']
    },
    {
      sceneKey: 'two_inch',
      name: '二寸',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '常用于报名、资格审核与出国材料',
      tags: ['白底', '蓝底', '官方推荐']
    },
    {
      sceneKey: 'teacher_exam',
      name: '教资报名（请选白底）',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '教师资格考试报名常用规格',
      tags: ['白底', '热门', '考试报名']
    },
    {
      sceneKey: 'university_collect',
      name: '大学生图像采集',
      pixelWidth: 480,
      pixelHeight: 640,
      hot: false,
      tip: '学信网及毕业图像采集常见规格',
      tags: ['白底', '常用']
    },
    {
      sceneKey: 'computer_exam',
      name: '计算机考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '适用于计算机等级考试报名',
      tags: ['蓝底', '考试']
    },
    {
      sceneKey: 'health_certificate',
      name: '健康证',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: false,
      tip: '常见健康证办理上传尺寸',
      tags: ['红底', '医药卫生']
    }
  ],
  general: [
    {
      sceneKey: 'small_one_inch',
      name: '小一寸',
      pixelWidth: 260,
      pixelHeight: 378,
      hot: false,
      tip: '适用于部分表格、工牌与报名',
      tags: ['白底', '通用']
    },
    {
      sceneKey: 'one_inch_general',
      name: '一寸',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '基础通用寸照规格',
      tags: ['白底', '蓝底', '红底']
    },
    {
      sceneKey: 'two_inch_general',
      name: '二寸',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '常见通用报名及资格申请',
      tags: ['白底', '常用']
    },
    {
      sceneKey: 'resume_photo',
      name: '简历照片',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: false,
      tip: '适合求职、简历附件与资料提交',
      tags: ['白底', '职业']
    }
  ],
  medical: [
    {
      sceneKey: 'health_certificate',
      name: '健康证',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: true,
      tip: '常用于健康证、体检相关办理',
      tags: ['红底', '常用']
    },
    {
      sceneKey: 'nurse_exam',
      name: '护士执业考试',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: false,
      tip: '医药卫生考试报名可优先使用白底',
      tags: ['白底', '官方推荐']
    }
  ],
  language: [
    {
      sceneKey: 'mandarin_test',
      name: '普通话考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '语言类考试常见上传规格',
      tags: ['白底', '考试']
    },
    {
      sceneKey: 'ielts_signup',
      name: '雅思报名',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: false,
      tip: '可用于语言考试报名资料提交',
      tags: ['白底', '签证护照']
    }
  ],
  civil: [
    {
      sceneKey: 'provincial_exam',
      name: '省考',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '公务员 / 省考报名常见规格',
      tags: ['白底', '热门']
    },
    {
      sceneKey: 'national_exam',
      name: '国考报名',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '国家公务员考试报名模板',
      tags: ['白底', '官方推荐']
    }
  ],
  degree: [
    {
      sceneKey: 'university_collect',
      name: '大学生图像采集',
      pixelWidth: 480,
      pixelHeight: 640,
      hot: true,
      tip: '毕业、学籍信息采集常用规格',
      tags: ['白底', '学历考试']
    },
    {
      sceneKey: 'graduate_exam',
      name: '考研报名',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: false,
      tip: '研究生考试报名上传可使用白底',
      tags: ['白底', '考试报名']
    }
  ],
  career: [
    {
      sceneKey: 'teacher_exam',
      name: '教资报名（请选白底）',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '教师资格证考试报名模板',
      tags: ['白底', '职业资格']
    },
    {
      sceneKey: 'computer_exam',
      name: '计算机考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '职业资格及等级考试常用',
      tags: ['蓝底', '常用']
    }
  ],
  passport: [
    {
      sceneKey: 'passport_photo',
      name: '护照',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: true,
      tip: '护照、港澳通行证等常见模板',
      tags: ['白底', '官方推荐']
    },
    {
      sceneKey: 'visa_photo',
      name: '签证照片',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: false,
      tip: '适用于常见国家签证申请',
      tags: ['白底', '签证护照']
    }
  ],
  police: [
    {
      sceneKey: 'driving_license',
      name: '驾驶证',
      pixelWidth: 260,
      pixelHeight: 378,
      hot: true,
      tip: '驾驶证报名、换证等常见规格',
      tags: ['白底', '公安证件']
    },
    {
      sceneKey: 'id_card',
      name: '身份证补办照',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: false,
      tip: '可作公安证件资料参考模板',
      tags: ['白底', '证件办理']
    }
  ],
  social: [
    {
      sceneKey: 'social_security',
      name: '社保卡',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: true,
      tip: '社保卡、民政事务常用规格',
      tags: ['白底', '社保民政']
    },
    {
      sceneKey: 'marriage_registration',
      name: '结婚登记照',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '结婚登记照建议优先选红底',
      tags: ['红底', '民政办理']
    }
  ]
};

function buildPixelText(item = {}) {
  const pixelWidth = Number(item.pixelWidth || item.pixel_width || 0);
  const pixelHeight = Number(item.pixelHeight || item.pixel_height || 0);
  if (!pixelWidth || !pixelHeight) {
    return item.pixelText || '尺寸待确认';
  }
  return `${pixelWidth} × ${pixelHeight}px`;
}

function normalizeTemplate(item = {}) {
  const sceneKey = item.sceneKey || item.scene_key || '';
  return {
    ...item,
    name: getFriendlySceneName({
      sceneKey,
      sizeCode: item.sizeCode || item.size_code || '',
      sceneName: item.name || item.sceneName || item.scene_name || ''
    }, '未命名模板'),
    sceneKey,
    tags: Array.isArray(item.tags) ? item.tags : [],
    tip: item.tip || item.description || getFriendlySceneHint({ sceneKey }) || '',
    hot: Boolean(item.hot || item.featured),
    pixelText: buildPixelText(item)
  };
}

function getMockTemplatesByTab(tabKey) {
  return (HOME_TEMPLATE_MAP[tabKey] || []).map(normalizeTemplate);
}

Page({
  data: {
    loading: true,
    error: false,
    errorMessage: '',
    tabs: HOME_TABS,
    activeTab: HOME_TABS[0].key,
    activeTabLabel: HOME_TABS[0].label,
    mainActions: MAIN_ACTIONS,
    quickActions: QUICK_ACTIONS,
    templateList: [],
    isEmpty: false
  },

  onLoad() {
    this.loadHomeTemplates();
  },

  async loadHomeTemplates(tabKey = this.data.activeTab) {
    const currentTab = this.data.tabs.find((item) => item.key === tabKey) || this.data.tabs[0];

    this.setData({
      loading: true,
      error: false,
      errorMessage: '',
      activeTab: currentTab.key,
      activeTabLabel: currentTab.label
    });

    try {
      const response = await getHomeTemplateConfig(currentTab.key);
      const serverTabs = response.tabs;
      const serverTemplates = response.templates;
      const nextTabs = Array.isArray(serverTabs) && serverTabs.length ? serverTabs : this.data.tabs;
      const normalizedList = Array.isArray(serverTemplates) && serverTemplates.length
        ? serverTemplates.map(normalizeTemplate)
        : getMockTemplatesByTab(currentTab.key);

      this.setData({
        tabs: nextTabs,
        templateList: normalizedList,
        isEmpty: normalizedList.length === 0,
        loading: false
      });
    } catch (error) {
      const fallbackList = getMockTemplatesByTab(currentTab.key);
      this.setData({
        templateList: fallbackList,
        isEmpty: fallbackList.length === 0,
        loading: false,
        error: fallbackList.length === 0,
        errorMessage: '网络异常，已尝试切换本地模板，请稍后重试。'
      });

      if (fallbackList.length) {
        wx.showToast({ title: '已切换为默认模板', icon: 'none' });
      }
    }
  },

  handleTabChange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.activeTab || this.data.loading) {
      return;
    }
    this.loadHomeTemplates(key);
  },

  handleMainActionTap(event) {
    const { item } = event.currentTarget.dataset;
    this.navigateByAction(item);
  },

  handleQuickActionTap(event) {
    const { item } = event.currentTarget.dataset;
    this.navigateByAction(item);
  },

  handleTemplateTap(event) {
    const { item } = event.currentTarget.dataset;
    if (!item || !item.sceneKey) {
      wx.showToast({ title: '模板信息异常，请重试', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/upload/upload?sceneKey=${item.sceneKey}&sceneName=${encodeURIComponent(item.name)}`
    });
  },

  handleRetry() {
    this.loadHomeTemplates(this.data.activeTab);
  },

  goCustomSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  navigateByAction(action = {}) {
    if (!action.routeType) {
      return;
    }

    if (action.routeType === 'custom-size') {
      this.goCustomSize();
      return;
    }

    if (action.routeType === 'upload') {
      wx.navigateTo({ url: '/pages/upload/upload' });
      return;
    }

    if (action.routeType === 'background') {
      wx.navigateTo({ url: '/pages/upload/upload?mode=background' });
      return;
    }

    wx.showToast({ title: action.toastText || '功能开发中', icon: 'none' });
  }
});

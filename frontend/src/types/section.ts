/** 制样方式 */
export type PreparationMethod = 'resin' | 'epoxy';

/** 切片质量标注 */
export type SectionQuality = 'good' | 'fair' | 'poor' | 'unrated';

/** 显微观察方式 */
export type ObservationMethod = 'ppl' | 'xpl' | 'reflected' | 'sem';

/** 显微照片：文件名之外还需补录观察方式、倍数与说明 */
export interface Micrograph {
  /** 文件名，同一张切片内唯一 */
  fileName: string;
  /** 观察方式；null 表示旧资料未补录 */
  method: ObservationMethod | null;
  /** 倍数，如 40 表示 40×；null 表示旧资料未补录 */
  magnification: number | null;
  /** 说明（标「优」时主图说明不能为空） */
  description: string;
}

/** 矿物占比（合计应约等于 100%） */
export interface MineralRatios {
  /** 橄榄石 */
  olivine: number;
  /** 辉石 */
  pyroxene: number;
  /** 长石 */
  feldspar: number;
  /** 金属 */
  metal: number;
}

/** 切片与制样（ThinSection） */
export interface ThinSection {
  id: string;
  /** 切片编号，形如 TS-2024-001 */
  sectionNo: string;
  /** 关联样本 id */
  sampleId: string;
  /** 厚度，单位 μm */
  thickness: number;
  preparation: PreparationMethod;
  minerals: MineralRatios;
  /** 显微照片清单 */
  micrographs: Micrograph[];
  /** 主图文件名（须指向 micrographs 中某一张）；null 表示「待指定」 */
  primaryImage: string | null;
  quality: SectionQuality;
  createdAt: number;
}

export const PREPARATION_LABELS: Record<PreparationMethod, string> = {
  resin: '树脂包埋',
  epoxy: '环氧粘接',
};

export const SECTION_QUALITY_LABELS: Record<SectionQuality, string> = {
  good: '优（可直接定量）',
  fair: '良（局部可用）',
  poor: '差（仅观察）',
  unrated: '未标注',
};

export const OBSERVATION_METHOD_LABELS: Record<ObservationMethod, string> = {
  ppl: '单偏光',
  xpl: '正交偏光',
  reflected: '反射光',
  sem: '扫描电镜',
};

export const PREPARATIONS: PreparationMethod[] = ['resin', 'epoxy'];
export const SECTION_QUALITIES: SectionQuality[] = ['good', 'fair', 'poor', 'unrated'];
export const OBSERVATION_METHODS: ObservationMethod[] = ['ppl', 'xpl', 'reflected', 'sem'];

export const MINERAL_KEYS: (keyof MineralRatios)[] = ['olivine', 'pyroxene', 'feldspar', 'metal'];

export const MINERAL_LABELS: Record<keyof MineralRatios, string> = {
  olivine: '橄榄石',
  pyroxene: '辉石',
  feldspar: '长石',
  metal: '金属',
};

/** 矿物占比合计 */
export function mineralTotal(m: MineralRatios): number {
  return MINERAL_KEYS.reduce((sum, k) => sum + (Number(m[k]) || 0), 0);
}

/** 切片资料状态 */
export type SectionDocStatus = 'missing' | 'pending-primary' | 'ready';

export const SECTION_DOC_STATUS_LABELS: Record<SectionDocStatus, string> = {
  missing: '缺资料',
  'pending-primary': '待指定主图',
  ready: '资料完整',
};

/** 当前主图照片；未指定或指向的照片已移除时返回 null */
export function findPrimaryMicrograph(section: ThinSection): Micrograph | null {
  if (!section.primaryImage) return null;
  return section.micrographs.find((m) => m.fileName === section.primaryImage) ?? null;
}

/**
 * 资料状态判定：
 *  - 缺资料：没有显微照片，或存在未补录观察方式 / 倍数的照片（含旧切片）
 *  - 待指定主图：照片资料齐全但未指定主图
 *  - 资料完整：主图已指定且照片资料齐全
 */
export function sectionDocStatus(section: ThinSection): SectionDocStatus {
  if (section.micrographs.length === 0) return 'missing';
  if (section.micrographs.some((m) => !m.method || m.magnification === null)) return 'missing';
  if (!findPrimaryMicrograph(section)) return 'pending-primary';
  return 'ready';
}

/** 质量标「优」的前置校验：主图要存在且说明不为空；返回 null 表示可标优 */
export function goodQualityBlockReason(section: ThinSection): string | null {
  const primary = findPrimaryMicrograph(section);
  if (!primary) return '主图待指定';
  if (!primary.description.trim()) return `主图 ${primary.fileName} 的说明为空`;
  return null;
}

/** 制样方式 */
export type PreparationMethod = 'resin' | 'epoxy';

/** 显微观察方式 */
export type ObservationMethod = 'ppl' | 'xpl' | 'reflected' | 'sem-bse';

/** 显微照片（观察方式 / 倍数 / 说明） */
export interface Micrograph {
  id: string;
  /** 文件名，如 met001_ppl.jpg */
  fileName: string;
  /** 观察方式 */
  method: ObservationMethod;
  /** 放大倍数；未知为 null */
  magnification: number | null;
  /** 照片说明（标「优」时主图必填） */
  note: string;
}

/** 切片质量标注 */
export type SectionQuality = 'good' | 'fair' | 'poor' | 'unrated';

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
  /** 显微照片清单（观察方式 / 倍数 / 说明） */
  micrographs: Micrograph[];
  /** 主图照片 id，每张切片最多一张；null 表示待指定 */
  primaryMicrographId: string | null;
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

export const PREPARATIONS: PreparationMethod[] = ['resin', 'epoxy'];
export const SECTION_QUALITIES: SectionQuality[] = ['good', 'fair', 'poor', 'unrated'];

export const OBSERVATION_METHOD_LABELS: Record<ObservationMethod, string> = {
  ppl: '单偏光',
  xpl: '正交偏光',
  reflected: '反射光',
  'sem-bse': 'SEM 背散射',
};

export const OBSERVATION_METHODS: ObservationMethod[] = ['ppl', 'xpl', 'reflected', 'sem-bse'];

/** 资料状态：完整 / 缺资料 */
export type SectionDataStatus = 'complete' | 'missing';

export const SECTION_DATA_STATUS_LABELS: Record<SectionDataStatus, string> = {
  complete: '资料齐全',
  missing: '缺资料',
};

/** 取切片主图；未指定或指向已删除照片时返回 null */
export function primaryMicrograph(
  s: Pick<ThinSection, 'micrographs' | 'primaryMicrographId'>,
): Micrograph | null {
  if (!s.primaryMicrographId) return null;
  return s.micrographs.find((m) => m.id === s.primaryMicrographId) ?? null;
}

/** 资料状态：无照片、主图待指定或主图说明为空都算缺资料 */
export function sectionDataStatus(s: ThinSection): SectionDataStatus {
  const primary = primaryMicrograph(s);
  if (!s.micrographs.length || !primary || !primary.note.trim()) return 'missing';
  return 'complete';
}

/** 校验能否标为「优」：主图要存在且说明不为空；返回 null 表示可以，否则为原因 */
export function canMarkGood(s: Pick<ThinSection, 'micrographs' | 'primaryMicrographId'>): string | null {
  if (!s.micrographs.length) return '尚未上传显微照片';
  const primary = primaryMicrograph(s);
  if (!primary) return '主图待指定';
  if (!primary.note.trim()) return `主图 ${primary.fileName} 缺少说明`;
  return null;
}

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

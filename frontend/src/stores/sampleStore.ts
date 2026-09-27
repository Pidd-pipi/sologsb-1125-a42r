import { create } from 'zustand';
import { db, makeId, seedIfEmpty } from '../db';
import type { AnalysisRecord } from '../types/analysis';
import type { FindRecord } from '../types/find';
import type { MeteoriteSample } from '../types/sample';
import { canMarkGood, type Micrograph, type SectionQuality, type ThinSection } from '../types/section';

export interface SampleState {
  samples: MeteoriteSample[];
  finds: FindRecord[];
  sections: ThinSection[];
  analysis: AnalysisRecord[];
  loading: boolean;
  loaded: boolean;
  loadAll: () => Promise<void>;
  addSample: (input: Omit<MeteoriteSample, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSample: (id: string, patch: Partial<MeteoriteSample>) => Promise<void>;
  removeSample: (id: string) => Promise<void>;
  addFind: (input: Omit<FindRecord, 'id' | 'createdAt'>) => Promise<string>;
  addSection: (input: Omit<ThinSection, 'id' | 'createdAt'>) => Promise<string>;
  updateSection: (id: string, patch: Partial<ThinSection>) => Promise<void>;
  addMicrograph: (sectionId: string, input: Omit<Micrograph, 'id'>) => Promise<void>;
  updateMicrograph: (sectionId: string, micrographId: string, patch: Partial<Omit<Micrograph, 'id'>>) => Promise<void>;
  removeMicrograph: (sectionId: string, micrographId: string) => Promise<void>;
  setPrimaryMicrograph: (sectionId: string, micrographId: string | null) => Promise<void>;
  /** 标注质量；标「优」前校验主图与说明，不合格时保持原状态并返回原因 */
  labelSectionQuality: (sectionId: string, quality: SectionQuality) => Promise<string | null>;
  addAnalysis: (input: Omit<AnalysisRecord, 'id' | 'createdAt'>) => Promise<string>;
  nextSampleSeq: () => number;
}

export const useSampleStore = create<SampleState>((set, get) => ({
  samples: [],
  finds: [],
  sections: [],
  analysis: [],
  loading: false,
  loaded: false,

  loadAll: async () => {
    set({ loading: true });
    await seedIfEmpty();
    const [samples, finds, sections, analysis] = await Promise.all([
      db.samples.toArray(),
      db.finds.toArray(),
      db.sections.toArray(),
      db.analysis.toArray(),
    ]);
    samples.sort((a, b) => b.createdAt - a.createdAt);
    finds.sort((a, b) => b.createdAt - a.createdAt);
    sections.sort((a, b) => b.createdAt - a.createdAt);
    analysis.sort((a, b) => b.createdAt - a.createdAt);
    set({ samples, finds, sections, analysis, loading: false, loaded: true });
  },

  addSample: async (input) => {
    const now = Date.now();
    const record: MeteoriteSample = { ...input, id: makeId('sample'), createdAt: now, updatedAt: now };
    await db.samples.add(record);
    set({ samples: [record, ...get().samples] });
    return record.id;
  },

  updateSample: async (id, patch) => {
    const updatedAt = Date.now();
    await db.samples.update(id, { ...patch, updatedAt });
    set({
      samples: get().samples.map((s) => (s.id === id ? { ...s, ...patch, updatedAt } : s)),
    });
  },

  removeSample: async (id) => {
    await db.transaction('rw', db.samples, db.finds, db.sections, db.analysis, async () => {
      await db.samples.delete(id);
      await db.finds.where('sampleId').equals(id).delete();
      await db.sections.where('sampleId').equals(id).delete();
      await db.analysis.where('sampleId').equals(id).delete();
    });
    set({
      samples: get().samples.filter((s) => s.id !== id),
      finds: get().finds.filter((f) => f.sampleId !== id),
      sections: get().sections.filter((s) => s.sampleId !== id),
      analysis: get().analysis.filter((a) => a.sampleId !== id),
    });
  },

  addFind: async (input) => {
    const record: FindRecord = { ...input, id: makeId('find'), createdAt: Date.now() };
    await db.finds.add(record);
    set({ finds: [record, ...get().finds] });
    return record.id;
  },

  addSection: async (input) => {
    const record: ThinSection = { ...input, id: makeId('section'), createdAt: Date.now() };
    await db.sections.add(record);
    set({ sections: [record, ...get().sections] });
    return record.id;
  },

  updateSection: async (id, patch) => {
    await db.sections.update(id, patch);
    set({ sections: get().sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },

  addMicrograph: async (sectionId, input) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;
    const micrograph: Micrograph = { ...input, id: makeId('mg') };
    await get().updateSection(sectionId, { micrographs: [...section.micrographs, micrograph] });
  },

  updateMicrograph: async (sectionId, micrographId, patch) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;
    const micrographs = section.micrographs.map((m) => (m.id === micrographId ? { ...m, ...patch } : m));
    await get().updateSection(sectionId, { micrographs });
  },

  removeMicrograph: async (sectionId, micrographId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;
    const patch: Partial<ThinSection> = {
      micrographs: section.micrographs.filter((m) => m.id !== micrographId),
    };
    // 移除的若是主图：明确标为待指定，绝不自动改指其他照片
    if (section.primaryMicrographId === micrographId) {
      patch.primaryMicrographId = null;
    }
    await get().updateSection(sectionId, patch);
  },

  setPrimaryMicrograph: async (sectionId, micrographId) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return;
    if (micrographId !== null && !section.micrographs.some((m) => m.id === micrographId)) return;
    await get().updateSection(sectionId, { primaryMicrographId: micrographId });
  },

  labelSectionQuality: async (sectionId, quality) => {
    const section = get().sections.find((s) => s.id === sectionId);
    if (!section) return '切片不存在';
    if (quality === 'good') {
      const reason = canMarkGood(section);
      if (reason) return reason;
    }
    await get().updateSection(sectionId, { quality });
    return null;
  },

  addAnalysis: async (input) => {
    const record: AnalysisRecord = { ...input, id: makeId('analysis'), createdAt: Date.now() };
    await db.analysis.add(record);
    set({ analysis: [record, ...get().analysis] });
    return record.id;
  },

  nextSampleSeq: () => {
    const year = new Date().getFullYear();
    const prefix = `MET-${year}-`;
    const used = get()
      .samples.map((s) => s.sampleNo)
      .filter((no) => no.startsWith(prefix))
      .map((no) => Number(no.slice(prefix.length)))
      .filter((n) => Number.isFinite(n));
    const max = used.length ? Math.max(...used) : 0;
    return max + 1;
  },
}));

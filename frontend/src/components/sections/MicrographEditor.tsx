import { useState } from 'react';
import {
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useSampleStore } from '../../stores/sampleStore';
import { useToastStore } from '../../stores/uiStore';
import {
  OBSERVATION_METHODS,
  OBSERVATION_METHOD_LABELS,
  findPrimaryMicrograph,
  sectionDocStatus,
  SECTION_DOC_STATUS_LABELS,
  type Micrograph,
  type ObservationMethod,
  type ThinSection,
} from '../../types/section';

interface Props {
  section: ThinSection;
}

/** 单张切片的显微照片维护：补录观察方式/倍数/说明、指定主图、移除照片 */
export default function MicrographEditor({ section }: Props) {
  const updateSection = useSampleStore((s) => s.updateSection);
  const notify = useToastStore((s) => s.notify);

  const [draft, setDraft] = useState({
    fileName: '',
    method: 'ppl' as ObservationMethod,
    magnification: 40,
    description: '',
  });

  const status = sectionDocStatus(section);
  const primary = findPrimaryMicrograph(section);

  const commit = async (micrographs: Micrograph[], primaryImage?: string | null) => {
    try {
      await updateSection(
        section.id,
        primaryImage === undefined ? { micrographs } : { micrographs, primaryImage },
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : '切片更新失败', 'warning');
    }
  };

  const patchAt = (index: number, patch: Partial<Micrograph>) => {
    void commit(section.micrographs.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const removeAt = (index: number) => {
    const target = section.micrographs[index];
    const next = section.micrographs.filter((_, i) => i !== index);
    if (section.primaryImage && section.primaryImage === target.fileName) {
      // 移除的是主图文件：明确置为「待指定」，不自动改指其他照片
      void commit(next, null);
      notify(`已移除主图 ${target.fileName}，${section.sectionNo} 主图置为「待指定」`, 'warning');
    } else {
      void commit(next);
    }
  };

  const setPrimary = async (fileName: string) => {
    try {
      await updateSection(section.id, { primaryImage: fileName });
      notify(`已将 ${fileName} 指定为 ${section.sectionNo} 的主图`);
    } catch (err) {
      notify(err instanceof Error ? err.message : '主图指定失败', 'warning');
    }
  };

  const addMicrograph = () => {
    const fileName = draft.fileName.trim();
    if (!fileName) {
      notify('请填写照片文件名', 'warning');
      return;
    }
    if (section.micrographs.some((m) => m.fileName === fileName)) {
      notify(`照片 ${fileName} 已存在`, 'warning');
      return;
    }
    void commit([
      ...section.micrographs,
      {
        fileName,
        method: draft.method,
        magnification: Number(draft.magnification) || null,
        description: draft.description.trim(),
      },
    ]);
    setDraft((d) => ({ ...d, fileName: '', description: '' }));
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="outlined"
          color={status === 'ready' ? 'success' : status === 'pending-primary' ? 'info' : 'warning'}
          label={SECTION_DOC_STATUS_LABELS[status]}
        />
        <Typography variant="caption" color="text.secondary">
          {primary
            ? `主图：${primary.fileName}`
            : section.micrographs.length
              ? '主图：待指定'
              : '主图：无照片'}
        </Typography>
      </Stack>

      {section.micrographs.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          尚未登记显微照片，可在下方补录。
        </Typography>
      ) : (
        section.micrographs.map((m, index) => {
          const isPrimary = section.primaryImage === m.fileName;
          return (
            <Stack
              key={m.fileName}
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Tooltip title={isPrimary ? '当前主图' : '设为主图'}>
                <span>
                  <IconButton
                    size="small"
                    color={isPrimary ? 'warning' : 'default'}
                    disabled={isPrimary}
                    onClick={() => void setPrimary(m.fileName)}
                    aria-label={`设 ${m.fileName} 为主图`}
                  >
                    {isPrimary ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="body2" fontWeight={600}>
                {m.fileName}
              </Typography>
              {isPrimary ? <Chip size="small" color="warning" variant="outlined" label="主图" /> : null}
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <Select
                  value={m.method ?? ''}
                  displayEmpty
                  onChange={(e) => {
                    const v = e.target.value as ObservationMethod | '';
                    if (v) patchAt(index, { method: v });
                  }}
                  inputProps={{ 'aria-label': `${m.fileName} 观察方式` }}
                >
                  <MenuItem value="">
                    <em>观察方式待补</em>
                  </MenuItem>
                  {OBSERVATION_METHODS.map((om) => (
                    <MenuItem key={om} value={om}>
                      {OBSERVATION_METHOD_LABELS[om]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                label="倍数"
                value={m.magnification ?? ''}
                onChange={(e) =>
                  patchAt(index, {
                    magnification: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                sx={{ width: 90 }}
                inputProps={{ min: 1, 'aria-label': `${m.fileName} 倍数` }}
              />
              <TextField
                key={`${m.fileName}-desc`}
                size="small"
                label="说明"
                defaultValue={m.description}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== m.description) patchAt(index, { description: v });
                }}
                sx={{ flex: 1, minWidth: 160 }}
                inputProps={{ 'aria-label': `${m.fileName} 说明` }}
              />
              <Tooltip title="移除照片">
                <IconButton
                  size="small"
                  onClick={() => removeAt(index)}
                  aria-label={`移除照片 ${m.fileName}`}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        })
      )}

      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="照片文件名"
          value={draft.fileName}
          onChange={(e) => setDraft((d) => ({ ...d, fileName: e.target.value }))}
          sx={{ width: 180 }}
          inputProps={{ 'aria-label': '新照片文件名' }}
        />
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel id={`method-add-${section.id}`}>观察方式</InputLabel>
          <Select
            labelId={`method-add-${section.id}`}
            label="观察方式"
            value={draft.method}
            onChange={(e) =>
              setDraft((d) => ({ ...d, method: e.target.value as ObservationMethod }))
            }
          >
            {OBSERVATION_METHODS.map((om) => (
              <MenuItem key={om} value={om}>
                {OBSERVATION_METHOD_LABELS[om]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="number"
          label="倍数"
          value={draft.magnification}
          onChange={(e) =>
            setDraft((d) => ({ ...d, magnification: Number(e.target.value) }))
          }
          sx={{ width: 90 }}
          inputProps={{ min: 1, 'aria-label': '新照片倍数' }}
        />
        <TextField
          size="small"
          label="说明"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          sx={{ flex: 1, minWidth: 160 }}
          inputProps={{ 'aria-label': '新照片说明' }}
        />
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addMicrograph}>
          添加照片
        </Button>
      </Stack>
    </Stack>
  );
}

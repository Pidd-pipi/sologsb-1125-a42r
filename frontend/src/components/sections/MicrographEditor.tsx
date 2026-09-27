import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
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
  type ObservationMethod,
  type ThinSection,
} from '../../types/section';

interface Draft {
  fileName: string;
  method: ObservationMethod;
  magnification: string;
  note: string;
}

const emptyDraft: Draft = { fileName: '', method: 'ppl', magnification: '', note: '' };

/** 切片显微照片编辑：观察方式 / 倍数 / 说明，主图指定与移除 */
export default function MicrographEditor({ section }: { section: ThinSection }) {
  const addMicrograph = useSampleStore((s) => s.addMicrograph);
  const updateMicrograph = useSampleStore((s) => s.updateMicrograph);
  const removeMicrograph = useSampleStore((s) => s.removeMicrograph);
  const setPrimaryMicrograph = useSampleStore((s) => s.setPrimaryMicrograph);
  const notify = useToastStore((s) => s.notify);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const submit = async () => {
    const fileName = draft.fileName.trim();
    if (!fileName) {
      notify('请先填写照片文件名', 'warning');
      return;
    }
    await addMicrograph(section.id, {
      fileName,
      method: draft.method,
      magnification: draft.magnification === '' ? null : Number(draft.magnification),
      note: draft.note.trim(),
    });
    setDraft(emptyDraft);
    notify(`已为 ${section.sectionNo} 添加照片 ${fileName}`);
  };

  const remove = async (micrographId: string, fileName: string) => {
    const wasPrimary = section.primaryMicrographId === micrographId;
    await removeMicrograph(section.id, micrographId);
    notify(
      wasPrimary ? `已移除主图 ${fileName}，主图已标为待指定` : `已移除照片 ${fileName}`,
      wasPrimary ? 'warning' : 'success',
    );
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        显微照片（{section.micrographs.length}）
        {section.micrographs.length > 0 && !section.primaryMicrographId ? ' · 主图待指定' : ''}
      </Typography>

      {section.micrographs.map((m) => {
        const isPrimary = section.primaryMicrographId === m.id;
        return (
          <Box
            key={m.id}
            sx={{
              border: '1px dashed',
              borderColor: isPrimary ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              p: 1,
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {isPrimary ? (
                  <Chip size="small" color="primary" icon={<StarIcon />} label="主图" />
                ) : null}
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, wordBreak: 'break-all' }}>
                  {m.fileName}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={isPrimary ? `取消 ${m.fileName} 的主图` : `设 ${m.fileName} 为主图`}
                  onClick={() => void setPrimaryMicrograph(section.id, isPrimary ? null : m.id)}
                >
                  {isPrimary ? (
                    <StarIcon fontSize="small" color="primary" />
                  ) : (
                    <StarBorderIcon fontSize="small" />
                  )}
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`移除照片 ${m.fileName}`}
                  onClick={() => void remove(m.id, m.fileName)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel id={`mg-method-${m.id}`}>观察方式</InputLabel>
                  <Select
                    labelId={`mg-method-${m.id}`}
                    label="观察方式"
                    value={m.method}
                    onChange={(e) =>
                      void updateMicrograph(section.id, m.id, {
                        method: e.target.value as ObservationMethod,
                      })
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
                  defaultValue={m.magnification ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    if (v !== m.magnification) {
                      void updateMicrograph(section.id, m.id, { magnification: v });
                    }
                  }}
                  sx={{ width: 100 }}
                />
                <TextField
                  size="small"
                  label="说明"
                  defaultValue={m.note}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== m.note) void updateMicrograph(section.id, m.id, { note: v });
                  }}
                  sx={{ flex: 1, minWidth: 180 }}
                />
              </Stack>
            </Stack>
          </Box>
        );
      })}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField
          size="small"
          label="文件名"
          value={draft.fileName}
          onChange={(e) => setDraft((d) => ({ ...d, fileName: e.target.value }))}
          sx={{ width: 170 }}
          inputProps={{ 'aria-label': `为 ${section.sectionNo} 添加照片文件名` }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id={`mg-new-method-${section.id}`}>观察方式</InputLabel>
          <Select
            labelId={`mg-new-method-${section.id}`}
            label="观察方式"
            value={draft.method}
            onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as ObservationMethod }))}
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
          onChange={(e) => setDraft((d) => ({ ...d, magnification: e.target.value }))}
          sx={{ width: 90 }}
        />
        <TextField
          size="small"
          label="说明"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          sx={{ flex: 1, minWidth: 160 }}
        />
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => void submit()}>
          添加照片
        </Button>
      </Stack>
    </Stack>
  );
}

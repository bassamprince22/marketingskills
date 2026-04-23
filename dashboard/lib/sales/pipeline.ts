import type { DocType, PipelineStageConfig } from './types'
import { DEFAULT_PIPELINE_STAGE_CONFIGS, STAGE_LABELS } from './types'

export function normalizePipelineStages(input?: PipelineStageConfig[] | null): PipelineStageConfig[] {
  const base = input?.length ? input : DEFAULT_PIPELINE_STAGE_CONFIGS
  const seen = new Set<string>()

  return base
    .filter((stage) => stage?.key?.trim())
    .map((stage, index) => {
      const key = stage.key.trim()
      if (seen.has(key)) return null
      seen.add(key)

      return {
        key,
        label: stage.label?.trim() || STAGE_LABELS[key] || key,
        color: stage.color || DEFAULT_PIPELINE_STAGE_CONFIGS.find((entry) => entry.key === key)?.color || '#94A3B8',
        order: Number.isFinite(stage.order) ? stage.order : (index + 1) * 10,
        is_terminal: Boolean(stage.is_terminal),
        report_bucket: stage.report_bucket || DEFAULT_PIPELINE_STAGE_CONFIGS.find((entry) => entry.key === key)?.report_bucket || 'open',
        meta_stage_key: stage.meta_stage_key ?? null,
        meta_stage_label: stage.meta_stage_label ?? null,
        crm_only: Boolean(stage.crm_only),
        suggested_doc_types: Array.isArray(stage.suggested_doc_types) && stage.suggested_doc_types.length
          ? stage.suggested_doc_types.filter(Boolean) as DocType[]
          : DEFAULT_PIPELINE_STAGE_CONFIGS.find((entry) => entry.key === key)?.suggested_doc_types || [],
      }
    })
    .filter(Boolean)
    .sort((left, right) => (left?.order ?? 0) - (right?.order ?? 0)) as PipelineStageConfig[]
}

export function getPipelineStageMap(stages?: PipelineStageConfig[] | null) {
  return Object.fromEntries(normalizePipelineStages(stages).map((stage) => [stage.key, stage]))
}

export function getPipelineStageKeys(stages?: PipelineStageConfig[] | null) {
  return normalizePipelineStages(stages).map((stage) => stage.key)
}

export function getPipelineStageLabelMap(stages?: PipelineStageConfig[] | null) {
  const map = getPipelineStageMap(stages)
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value.label]))
}

export function getSuggestedDocTypesForStage(stageKey: string, stages?: PipelineStageConfig[] | null): DocType[] {
  return getPipelineStageMap(stages)[stageKey]?.suggested_doc_types ?? []
}

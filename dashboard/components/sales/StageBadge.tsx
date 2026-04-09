import { STAGE_LABELS, type PipelineStage } from '@/lib/sales/types'

interface Props {
  stage: PipelineStage
  size?: 'sm' | 'md'
}

export function StageBadge({ stage, size = 'md' }: Props) {
  const padClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`${padClass} rounded-full font-medium whitespace-nowrap stage-${stage}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}

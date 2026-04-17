import { STAGE_LABELS, type PipelineStage } from '@/lib/sales/types'

interface Props {
  stage: PipelineStage
  size?: 'sm' | 'md'
}

export function StageBadge({ stage, size = 'md' }: Props) {
  return (
    <span
      className={`badge stage-${stage}${size === 'sm' ? ' badge-sm' : ''}`}
      style={{ whiteSpace: 'nowrap' }}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}

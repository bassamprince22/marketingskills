export interface WidgetConfig {
  id:      string
  label:   string
  visible: boolean
  order:   number
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stat_cards',             label: 'Pipeline Stats',        visible: true,  order: 1  },
  { id: 'pipeline_constellation', label: 'Pipeline Overview',     visible: true,  order: 2  },
  { id: 'notifications',          label: 'Notifications',         visible: true,  order: 3  },
  { id: 'challenges',             label: 'Challenge Race',        visible: true,  order: 4  },
  { id: 'commissions',            label: 'Commissions',           visible: true,  order: 5  },
  { id: 'revenue_chart',          label: 'Closed Revenue Chart',  visible: true,  order: 6  },
  { id: 'todays_orbit',           label: "Today's Orbit",         visible: true,  order: 7  },
  { id: 'crew_leaderboard',       label: 'Crew Leaderboard',      visible: true,  order: 8  },
  { id: 'signal_stream',          label: 'Signal Stream',         visible: true,  order: 9  },
  { id: 'auto_assign',            label: 'Auto Assign',           visible: true,  order: 10 },
  { id: 'panel_unassigned',       label: 'Unassigned Leads',      visible: true,  order: 11 },
  { id: 'panel_overdue',          label: 'Overdue Follow-ups',    visible: true,  order: 12 },
  { id: 'panel_at_risk',          label: 'Deals at Risk',         visible: true,  order: 13 },
  { id: 'panel_stale',            label: 'Stale Leads',           visible: true,  order: 14 },
]

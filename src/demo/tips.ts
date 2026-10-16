import { createBeaconTips } from '@registry/new-york/beacon-tip/beacon-tip'

export const { BeaconTip, useBeaconTips } = createBeaconTips(
  {
    'command-menu': {
      kind: 'new',
      title: 'Command menu',
      body: 'Press Ctrl K anywhere to jump to a page or run an action.',
      priority: 1,
    },
    'export-csv': {
      kind: 'new',
      title: 'Export to CSV',
      body: 'Download the current view as a spreadsheet.',
    },
    'sidebar-reports': {
      kind: 'tip',
      title: 'Reports live here',
      body: 'This one was waiting: it only joins the queue once the sidebar is open.',
    },
    'old-announcement': {
      kind: 'new',
      title: 'Never shown',
      body: 'Its until date has passed, so the beacon never appears.',
      until: '2020-01-01',
    },
  },
  { openDelay: 500 },
)

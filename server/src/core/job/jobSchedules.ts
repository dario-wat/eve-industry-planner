/** Mirrors the timers in deploy/pi/systemd. The order here is the order on the jobs page. */
export const JOB_SCHEDULES: { jobName: string; schedule: string }[] = [
  { jobName: 'region_order_book', schedule: 'Every 5 minutes' },
  { jobName: 'market_history_candidates', schedule: 'Daily 11:30 UTC, except the 1st' },
  { jobName: 'market_history_all', schedule: 'Monthly, 1st at 11:30 UTC' },
];

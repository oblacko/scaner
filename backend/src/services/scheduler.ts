import cron from 'node-cron';
import { db } from '../db/connection.js';
import { monitors, scans } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { runNucleiScan } from './nuclei.js';

const activeJobs = new Map<string, cron.ScheduledTask>();

export function startScheduler() {
  // Load all active monitors and schedule them
  const activeMonitors = db.select().from(monitors).where(eq(monitors.status, 'active')).all();
  
  for (const monitor of activeMonitors) {
    scheduleMonitor(monitor);
  }
  
  console.log(`[Scheduler] Started ${activeMonitors.length} scheduled monitors`);
}

export function scheduleMonitor(monitor: any) {
  // Cancel existing job if any
  unscheduleMonitor(monitor.id);
  
  if (monitor.status !== 'active') return;
  
  let cronExpr: string;
  
  switch (monitor.schedule) {
    case 'hourly':
      cronExpr = '0 * * * *';
      break;
    case 'daily':
      cronExpr = '0 0 * * *';
      break;
    case 'weekly':
      cronExpr = '0 0 * * 0';
      break;
    case 'monthly':
      cronExpr = '0 0 1 * *';
      break;
    case 'custom':
      cronExpr = monitor.cronExpression;
      break;
    default:
      cronExpr = '0 0 * * *';
  }
  
  if (!cronExpr || !cron.validate(cronExpr)) {
    console.error(`[Scheduler] Invalid cron expression for monitor ${monitor.id}: ${cronExpr}`);
    return;
  }
  
  const job = cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Running scheduled scan for ${monitor.name} (${monitor.url})`);
    
    const scanId = `scan-${Date.now()}`;
    db.insert(scans).values({
      id: scanId,
      monitorId: monitor.id,
      target: monitor.url,
      templates: monitor.templateMode === 'all' ? 'All Templates' : JSON.parse(monitor.templateCategories || '[]').join(', '),
      duration: 0,
      status: 'running',
      startedAt: new Date(),
      terminalOutput: '[INF] Scheduled scan started...\n',
    }).run();
    
    db.update(monitors).set({ status: 'scanning', updatedAt: new Date() }).where(eq(monitors.id, monitor.id)).run();
    
    try {
      await runNucleiScan(scanId, monitor);
      console.log(`[Scheduler] Scan complete: ${scanId}`);
    } catch (err) {
      console.error(`[Scheduler] Scan failed: ${scanId}`, err);
    }
  }, { scheduled: true });
  
  activeJobs.set(monitor.id, job);
  console.log(`[Scheduler] Monitor ${monitor.id} scheduled with cron: ${cronExpr}`);
}

export function unscheduleMonitor(monitorId: string) {
  const job = activeJobs.get(monitorId);
  if (job) {
    job.stop();
    activeJobs.delete(monitorId);
    console.log(`[Scheduler] Monitor ${monitorId} unscheduled`);
  }
}

export function stopScheduler() {
  for (const [id, job] of activeJobs) {
    job.stop();
    console.log(`[Scheduler] Stopped job for monitor ${id}`);
  }
  activeJobs.clear();
}

import { spawn } from 'child_process';
import { db } from '../db/connection.js';
import { scans, findings, monitors } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface NucleiFinding {
  templateId?: string;
  template?: string;
  info?: { name?: string; severity?: string };
  host?: string;
  'matched-at'?: string;
  'extracted-results'?: string[];
  curl_command?: string;
  meta?: Record<string, string>;
}

export async function runNucleiScan(scanId: string, monitor: any): Promise<void> {
  const advanced = JSON.parse(monitor.advanced || '{}');
  const startTime = Date.now();
  
  // Build nuclei arguments
  const args = [
    '-u', monitor.url,
    '-rl', String(advanced.rateLimit || 150),
    '-timeout', String(advanced.timeout || 30),
    '-j',
    '-silent',
  ];
  
  // Template selection
  const tagMap: Record<string, string> = {
    cve: 'cve',
    misconfiguration: 'misconfig',
    'exposed-panels': 'panel',
    'subdomain-takeover': 'takeover',
    'ssl-tls': 'ssl',
    technologies: 'tech',
    dns: 'dns',
    headless: 'headless',
  };

  if (monitor.templateMode === 'categories') {
    const categories = JSON.parse(monitor.templateCategories || '[]');
    const tags = categories.map((cat: string) => tagMap[cat] || cat).join(',');
    if (tags) args.push('-tags', tags);
  } else if (monitor.templateMode === 'custom') {
    const templates = JSON.parse(monitor.customTemplates || '[]');
    for (const t of templates) {
      args.push('-t', t);
    }
  }
  // templateMode === 'all' uses all templates (no -t flag needed with -u)
  
  // User agent
  if (advanced.userAgent) {
    args.push('-H', `User-Agent: ${advanced.userAgent}`);
  }
  
  // Redirects
  if (!advanced.followRedirects) {
    args.push('-no-redirects');
  } else if (advanced.maxRedirects) {
    args.push('-max-redirects', String(advanced.maxRedirects));
  }
  
  // Templates path
  if (advanced.templatesPath) {
    args.push('-tp', advanced.templatesPath);
  }

  const terminalLines: string[] = [
    `[INF] Nuclei scan started for ${monitor.url}`,
    `[INF] Arguments: nuclei ${args.join(' ')}`,
  ];
  
  db.update(scans).set({ terminalOutput: terminalLines.join('\n') }).where(eq(scans.id, scanId)).run();

  return new Promise((resolve, reject) => {
    const nucleiProcess = spawn('nuclei', args);
    const output: NucleiFinding[] = [];
    let stderr = '';

    nucleiProcess.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          output.push(parsed);
          terminalLines.push(`[${output.length}] ${parsed.info?.name || parsed.template} [${parsed.info?.severity || 'unknown'}]`);
        } catch {
          terminalLines.push(line);
        }
      }
      // Update terminal output periodically
      db.update(scans).set({ terminalOutput: terminalLines.join('\n') }).where(eq(scans.id, scanId)).run();
    });

    nucleiProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      terminalLines.push(`[ERR] ${data.toString().trim()}`);
    });

    nucleiProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      const status = code === 0 ? 'completed' : 'failed';
      
      terminalLines.push(`[INF] Scan ${status} in ${(duration / 1000).toFixed(2)}s (${output.length} findings)`);
      
      db.update(scans).set({
        duration,
        status: status as any,
        completedAt: new Date(),
        terminalOutput: terminalLines.join('\n'),
      }).where(eq(scans.id, scanId)).run();

      // Save findings
      for (const finding of output) {
        const severity = (finding.info?.severity || 'info').toLowerCase();
        const validSeverity = ['info', 'low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'info';
        
        db.insert(findings).values({
          id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          scanId,
          templateId: finding.templateId || finding.template || 'unknown',
          name: finding.info?.name || finding.template || 'Unknown',
          severity: validSeverity as any,
          host: finding.host || monitor.url,
          matchedAt: finding['matched-at'] || monitor.url,
          extracted: finding['extracted-results']?.join('\n') || null,
          cve: finding.meta?.cve || null,
          remediation: null,
        }).run();
      }

      // Update monitor status back to active
      db.update(monitors).set({ status: 'active', updatedAt: new Date() }).where(eq(monitors.id, monitor.id)).run();

      if (status === 'completed') {
        resolve();
      } else {
        reject(new Error(`Nuclei exited with code ${code}: ${stderr}`));
      }
    });

    nucleiProcess.on('error', (err) => {
      const duration = Date.now() - startTime;
      terminalLines.push(`[ERR] Failed to start Nuclei: ${err.message}`);
      
      db.update(scans).set({
        duration,
        status: 'failed',
        terminalOutput: terminalLines.join('\n'),
      }).where(eq(scans.id, scanId)).run();
      
      db.update(monitors).set({ status: 'error', updatedAt: new Date() }).where(eq(monitors.id, monitor.id)).run();
      
      reject(err);
    });
  });
}

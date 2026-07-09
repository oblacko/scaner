import { db } from '../db/connection.js';
import { channels } from '../db/schema.js';

export async function sendNotifications(scanId: string, findings: any[]): Promise<void> {
  const enabledChannels = db.select().from(channels).where(eq(channels.enabled, 1)).all();
  
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;
  
  const summary = findings.length > 0
    ? `Scan complete: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low, ${infoCount} info`
    : 'Scan complete: No vulnerabilities found';
  
  for (const channel of enabledChannels) {
    try {
      const config = JSON.parse(channel.config);
      
      switch (channel.type) {
        case 'slack':
          await sendSlack(config.webhook, summary, findings);
          break;
        case 'telegram':
          await sendTelegram(config.botToken, config.chatId, summary);
          break;
        case 'discord':
          await sendDiscord(config.webhook, summary, findings);
          break;
        case 'webhook':
          await sendWebhook(config.url, config.method || 'POST', summary, findings);
          break;
        case 'email':
          // Requires nodemailer setup
          console.log(`[Email] Would send to ${config.address}: ${summary}`);
          break;
      }
    } catch (err) {
      console.error(`[Notifier] ${channel.type} failed:`, err);
    }
  }
}

async function sendSlack(webhook: string, summary: string, findings: any[]): Promise<void> {
  if (!webhook) return;
  const blocks = findings.slice(0, 10).map(f => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*[${f.severity.toUpperCase()}]* ${f.name}\n${f.matchedAt}`,
    },
  }));
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: summary,
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: 'Sentinel Scan Report' } },
        { type: 'section', text: { type: 'mrkdwn', text: summary } },
        { type: 'divider' },
        ...blocks,
      ],
    }),
  });
}

async function sendTelegram(botToken: string, chatId: string, summary: string): Promise<void> {
  if (!botToken || !chatId) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🛡️ *Sentinel Scan*\n\n${summary}`,
      parse_mode: 'Markdown',
    }),
  });
}

async function sendDiscord(webhook: string, summary: string, findings: any[]): Promise<void> {
  if (!webhook) return;
  const fields = findings.slice(0, 10).map(f => ({
    name: `[${f.severity.toUpperCase()}] ${f.name}`,
    value: f.matchedAt,
    inline: false,
  }));
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: 'Sentinel Scan Report',
        description: summary,
        color: findings.length > 0 ? 0xff0000 : 0x00ff00,
        fields,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
}

async function sendWebhook(url: string, method: string, summary: string, findings: any[]): Promise<void> {
  if (!url) return;
  await fetch(url, {
    method: method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary, findings, timestamp: new Date().toISOString() }),
  });
}

import { eq } from 'drizzle-orm';

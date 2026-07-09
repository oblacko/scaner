export interface TemplateCategory {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'cve', label: 'CVEs', icon: 'shield-alert', count: 4500 },
  { id: 'misconfiguration', label: 'Misconfigurations', icon: 'settings', count: 1200 },
  { id: 'exposed-panels', label: 'Exposed Panels', icon: 'layout', count: 350 },
  { id: 'subdomain-takeover', label: 'Subdomain Takeover', icon: 'globe', count: 80 },
  { id: 'ssl-tls', label: 'SSL/TLS Issues', icon: 'lock', count: 200 },
  { id: 'technologies', label: 'Technologies', icon: 'cpu', count: 1800 },
  { id: 'dns', label: 'DNS Issues', icon: 'globe', count: 150 },
  { id: 'headless', label: 'Headless', icon: 'eye', count: 300 },
];

export const CUSTOM_TEMPLATES_LIST = [
  'cve-2024-1234-rce',
  'apache-struts-rce',
  'wordpress-admin-exposure',
  'jwt-none-alg',
  'sql-error-based',
  'xxe-lfi-detection',
  'ssrf-oob-interaction',
  'log4j-jndi-rce',
  'spring-cloud-gateway-rce',
  'nginx-offby-slash',
  'kubernetes-api-exposed',
  'docker-registry-open',
  'elasticsearch-unauth',
  'mongodb-unauth',
  'redis-unauth',
  'jenkins-script-console',
  'git-config-exposure',
  'env-file-exposure',
  'swagger-api-docs',
  'graphql-introspection',
];

export const SEVERITY_WEIGHTS: Record<string, number> = {
  info: 0.3,
  low: 0.35,
  medium: 0.2,
  high: 0.1,
  critical: 0.05,
};

export const SEVERITY_COLORS: Record<string, string> = {
  info: '#3B82F6',
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

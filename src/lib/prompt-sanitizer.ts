/**
 * Sanitize user inputs before sending to AI to prevent prompt injection.
 * Strips common injection patterns while preserving legitimate study content.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi,
  /you\s+are\s+now\s+/gi,
  /forget\s+(everything|all|your)\s+(you|instructions?|rules?)/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/?s>/gi,
  /act\s+as\s+(if\s+)?you\s+(are|were)/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /new\s+instructions?\s*:/gi,
  /override\s+(system|instructions?|rules?)/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
];

export function sanitizeAIInput(input: string): string {
  if (!input) return input;
  
  let sanitized = input;
  
  // Remove known injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  
  // Limit length to prevent token abuse
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }
  
  return sanitized.trim();
}

export function hasInjectionAttempt(input: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(input));
}

const MAX_MESSAGE_LENGTH = 5000;

export function validateMessage(content: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Message content is required.' };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` };
  }

  return { valid: true, sanitized: sanitizeHtml(trimmed) };
}

export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length > 0 && password.length <= 128;
}

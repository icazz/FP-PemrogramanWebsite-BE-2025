const MIME_TO_EXT: Record<string, string> = {
  ['image/png']: 'png',
  ['image/jpeg']: 'jpg',
  ['image/jpg']: 'jpg',
  ['image/webp']: 'webp',
};

const BASE64_REGEX =
  /^(?:[\d+/A-Za-z]{4})*(?:[\d+/A-Za-z]{2}==|[\d+/A-Za-z]{3}=)?$/;

export function parseDataUrl(value: string): { mime?: string; base64: string } {
  const match = value.match(/^data:([^;]+);base64,(.*)$/);

  if (match) {
    return {
      mime: match[1],
      base64: match[2],
    };
  }

  return {
    mime: undefined,
    base64: value,
  };
}

export function getExtensionFromMime(mime?: string | null): string {
  if (!mime) return 'bin';

  return MIME_TO_EXT[mime] ?? 'bin';
}

export function isBase64(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const [, maybeBase64] = value.split(',');
  const raw = maybeBase64 ?? value;

  if (raw.length % 4 !== 0) return false;

  return BASE64_REGEX.test(raw);
}

export function base64ToBuffer(value: string): Buffer {
  const [, maybeBase64] = value.split(',');
  const raw = maybeBase64 ?? value;

  return Buffer.from(raw, 'base64');
}

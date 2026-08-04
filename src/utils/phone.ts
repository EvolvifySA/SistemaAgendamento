export function normalizePhone(value: string, defaultCountryCode = "55"): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith(defaultCountryCode) && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}

export function formatWhatsAppPhone(value: string): string {
  const normalized = normalizePhone(value);
  return normalized ? `+${normalized}` : value;
}


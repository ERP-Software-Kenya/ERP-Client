// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().replace('Z', '+05:30');
}

export function futureIST(hours: number): string {
  return new Date(Date.now() + IST_OFFSET_MS + hours * 3600 * 1000)
    .toISOString()
    .replace('Z', '+05:30');
}

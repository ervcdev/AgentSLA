export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}

export function shortHash(hash: string): string {
  return shortAddress(hash, 8, 6);
}

export function formatDuration(seconds: bigint | number): string {
  let s =
    typeof seconds === "bigint" ? Number(seconds) : Math.floor(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return "0s";

  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  const secs = s - minutes * 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };

function romanToNumber(roman: string): number | null {
  if (!/^[IVXL]+$/.test(roman)) {
    return null;
  }
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const value = ROMAN[roman[i]];
    const next = ROMAN[roman[i + 1]] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

/**
 * "System short" from an ESI name, the way traders write it. NPC stations are "Jita IV - Moon 4 -
 * Caldari Navy Assembly Plant" (becomes "Jita 4-4"). Structures are "Perimeter - Tranquility
 * Trading Tower" and use `nickname` when given ("Perimeter TTT"), else the rest of the name.
 */
export function shortLocationName(
  fullName: string,
  isNpcStation: boolean,
  nickname?: string,
): string {
  const parts = fullName.split(' - ');
  if (parts.length < 2) {
    return fullName;
  }
  if (!isNpcStation) {
    return `${parts[0]} ${nickname ?? parts.slice(1).join(' - ')}`;
  }
  const planetAt = parts[0].lastIndexOf(' ');
  const planet = planetAt === -1 ? null : romanToNumber(parts[0].slice(planetAt + 1));
  if (planet === null) {
    return fullName;
  }
  const moon = parts[1].match(/^Moon (\d+)$/);
  return `${parts[0].slice(0, planetAt)} ${moon ? `${planet}-${moon[1]}` : planet}`;
}

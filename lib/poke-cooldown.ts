export const POKE_COOLDOWN_MS = 10 * 60 * 1000;

export function pokeCooldownRemainingSeconds(
  lastPokeAt: Date | null | undefined,
  now = new Date(),
): number {
  if (!lastPokeAt) return 0;
  const endsAt = lastPokeAt.getTime() + POKE_COOLDOWN_MS;
  return Math.max(0, Math.ceil((endsAt - now.getTime()) / 1000));
}

export function pokeCooldownUntil(
  lastPokeAt: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (!lastPokeAt) return null;
  const endsAt = new Date(lastPokeAt.getTime() + POKE_COOLDOWN_MS);
  return endsAt > now ? endsAt : null;
}

export function pokeCooldownMessage(lastPokeAt: Date): string {
  const seconds = pokeCooldownRemainingSeconds(lastPokeAt);
  const mins = Math.ceil(seconds / 60);
  return `You can poke this friend again in ${mins} minute${mins === 1 ? '' : 's'}`;
}

type PokeableWakt = {
  canPoke: boolean;
  pokeCooldownUntil?: string | null;
  pokeCooldownSeconds?: number;
};

export function applyPokeCooldown<T extends PokeableWakt>(
  wakt: T,
  lastPokeAt: Date | null | undefined,
  now = new Date(),
): T {
  const remaining = pokeCooldownRemainingSeconds(lastPokeAt, now);
  if (remaining <= 0) {
    return { ...wakt, pokeCooldownUntil: null, pokeCooldownSeconds: 0 };
  }

  const until = pokeCooldownUntil(lastPokeAt, now);
  return {
    ...wakt,
    canPoke: false,
    pokeCooldownUntil: until?.toISOString() ?? null,
    pokeCooldownSeconds: remaining,
  };
}

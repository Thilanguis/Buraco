export function getRestorativeDewHealing(phase, cardsPlayed) {
  const count = Math.max(0, Number(cardsPlayed) || 0);
  const currentPhase = Math.max(1, Math.min(3, Number(phase) || 1));
  const values = currentPhase === 1
    ? [100, 65, 30]
    : currentPhase === 2
      ? [120, 80, 40]
      : [150, 100, 50];
  if (count <= 1) return values[0];
  if (count <= 3) return values[1];
  if (count <= 5) return values[2];
  return 0;
}

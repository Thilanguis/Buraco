export function getRestorativeDewHealing(phase, cardsPlayed) {
  const count = Math.max(0, Number(cardsPlayed) || 0);
  const phaseThree = Number(phase) >= 3;
  if (count <= 1) return phaseThree ? 180 : 150;
  if (count <= 3) return phaseThree ? 120 : 100;
  if (count <= 5) return phaseThree ? 60 : 50;
  return 0;
}

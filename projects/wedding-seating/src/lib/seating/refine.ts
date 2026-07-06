import type { Assignment, SeatingInput } from "./types";
import { scoreAssignment } from "./score";
import { isHardValid } from "./constraints";

function bestMove(
  current: Assignment,
  input: SeatingInput
): { next: Assignment; score: number } | null {
  const baseScore = scoreAssignment(current, input);
  let best: { next: Assignment; score: number } | null = null;

  const guestIds = Object.keys(current).sort();
  const tableIds = input.tables.map((t) => t.id).sort();

  const consider = (next: Assignment) => {
    if (!isHardValid(next, input)) return;
    const s = scoreAssignment(next, input);
    if (s > baseScore && (best === null || s > best.score)) {
      best = { next, score: s };
    }
  };

  // Moves: send one guest to a different table.
  for (const gid of guestIds) {
    for (const tid of tableIds) {
      if (current[gid] === tid) continue;
      consider({ ...current, [gid]: tid });
    }
  }
  // Swaps: exchange the tables of two guests.
  for (let i = 0; i < guestIds.length; i++) {
    for (let j = i + 1; j < guestIds.length; j++) {
      const a = guestIds[i];
      const b = guestIds[j];
      if (current[a] === current[b]) continue;
      consider({ ...current, [a]: current[b], [b]: current[a] });
    }
  }
  return best;
}

export function refine(
  assignment: Assignment,
  input: SeatingInput,
  maxPasses = 20
): Assignment {
  let current: Assignment = { ...assignment };
  for (let pass = 0; pass < maxPasses; pass++) {
    const improvement = bestMove(current, input);
    if (!improvement) break;
    current = improvement.next;
  }
  return current;
}

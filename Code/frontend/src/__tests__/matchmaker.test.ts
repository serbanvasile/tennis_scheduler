import { greedyPairs, makeMatches } from "../matchmaker";
import type { Player, Court } from "../types";

test("greedyPairs pairs adjacent-by-skill players", () => {
  const players: Player[] = [
    { id: "a", displayName: "A", skill: 1 },
    { id: "b", displayName: "B", skill: 2 },
    { id: "c", displayName: "C", skill: 3 },
    { id: "d", displayName: "D", skill: 4 }
  ];
  const pairs = greedyPairs(players);
  expect(pairs).toEqual([
    ["a", "b"],
    ["c", "d"]
  ]);
});

test("makeMatches fills courts and times in order", () => {
  const courts: Court[] = [
    { id: "c1", label: "C1", timeSlots: ["18:00", "19:15"] },
    { id: "c2", label: "C2", timeSlots: ["18:00"] }
  ];
  const pairs = [["a", "b"], ["c", "d"], ["e", "f"], ["g", "h"]];
  const matches = makeMatches("w1", pairs, courts);
  // Expect 2 matches (4 pairs = 2 matches, each using 2 pairs)
  expect(matches.length).toBe(2);
  expect(matches[0].courtId).toBe("c1");
  expect(matches[1].courtId).toBe("c1");
});

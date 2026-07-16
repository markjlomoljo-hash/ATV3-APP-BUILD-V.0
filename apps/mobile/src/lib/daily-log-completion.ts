const COMPLETE_FOOD_STATES = new Set([
  "meals_complete_no_snacks_logged",
  "meals_complete_with_snacks_logged",
  "user_marked_complete",
]);

export function isFoodDayComplete(completionState: string): boolean {
  return COMPLETE_FOOD_STATES.has(completionState);
}

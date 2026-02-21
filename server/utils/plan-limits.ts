export function getMaxLeadersForPlan(plan: string | null | undefined): number {
  switch (plan) {
    case "stewardship":
      return 10;
    case "formation":
      return 3;
    case "free":
    case "foundations":
    default:
      return 1;
  }
}

export function getLeaderLimitMessage(maxLeaders: number, planName: string): string {
  const capitalizedPlan = planName.charAt(0).toUpperCase() + planName.slice(1);
  return `This ministry has reached its leader limit of ${maxLeaders} for the ${capitalizedPlan} plan. Please upgrade your plan or remove a leader before adding a new one.`;
}

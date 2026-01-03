/**
 * getActor
 * Owns: canonical identity resolution (Actor) for all trust zones.
 * Does NOT own: business logic, persistence, route parsing.
 * Layer: Application
 * Trust zone: web|ext|public
 * Used by: route handlers and server entrypoints.
 */

export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'device'; userId: string; deviceId: string }
  | { kind: 'public' };

export async function getActorFromRequest(_req: Request): Promise<Actor> {
  // Quest 1.1: skeleton only.
  // Real logic arrives in Level 1 Identity quests.
  return { kind: 'public' };
}

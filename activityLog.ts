import { supabase } from "@/integrations/supabase/client";

export type LogSeverity = "info" | "warning" | "error" | "success";

export const logActivity = async (
  userId: string,
  action: string,
  opts: {
    entity?: string;
    entityId?: string;
    details?: Record<string, any>;
    severity?: LogSeverity;
    actorEmail?: string | null;
  } = {}
) => {
  try {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      actor_email: opts.actorEmail ?? null,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      details: opts.details ?? {},
      severity: opts.severity ?? "info",
    });
  } catch {
    /* never throw on logging */
  }
};

import { supabase } from "@/integrations/supabase/client";

export async function logError(
  errorMessage: string,
  errorType: string = "runtime",
  metadata?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("error_logs").insert({
      user_id: user.id,
      error_type: errorType,
      error_message: errorMessage.slice(0, 1000),
      page_url: window.location.pathname,
      metadata: metadata || {},
    });
  } catch { /* silent */ }
}

// Global error handler
export function setupGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    logError(event.message, "unhandled", {
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logError(msg, "unhandled_promise");
  });
}

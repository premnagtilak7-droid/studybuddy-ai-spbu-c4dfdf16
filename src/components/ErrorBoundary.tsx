import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Log to database silently
    this.logError(error, errorInfo);
  }

  async logError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("error_logs").insert({
          user_id: user.id,
          error_type: "crash",
          error_message: error.message,
          error_stack: error.stack?.slice(0, 2000),
          page_url: window.location.pathname,
          metadata: { componentStack: errorInfo.componentStack?.slice(0, 1000) },
        });
      }
    } catch { /* silent */ }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">
              This feature encountered an unexpected error. Your data is safe.
            </p>
            <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

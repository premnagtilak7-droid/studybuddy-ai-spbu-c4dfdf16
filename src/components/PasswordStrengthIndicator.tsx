import { checkPasswordStrength } from "@/lib/auth-security";
import { Check, X } from "lucide-react";

interface Props {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null;
  
  const { score, label, color, checks } = checkPasswordStrength(password);
  
  const requirements = [
    { key: "minLength", label: "At least 8 characters", met: checks.minLength },
    { key: "hasNumber", label: "Contains a number", met: checks.hasNumber },
    { key: "hasSpecial", label: "Contains a special character", met: checks.hasSpecial },
    { key: "hasUppercase", label: "Contains uppercase letter", met: checks.hasUppercase },
    { key: "hasLowercase", label: "Contains lowercase letter", met: checks.hasLowercase },
  ];

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= score ? color : "hsl(var(--muted))",
            }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
      
      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((req) => (
          <div key={req.key} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

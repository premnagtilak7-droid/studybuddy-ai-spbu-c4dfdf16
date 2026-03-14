// Rate limiting for login attempts
const RATE_LIMIT_KEY = "login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitData {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

export function getRateLimitData(): RateLimitData {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { attempts: 0, lockedUntil: null, lastAttempt: 0 };
}

function saveRateLimitData(data: RateLimitData) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
}

export function isAccountLocked(): { locked: boolean; minutesLeft: number } {
  const data = getRateLimitData();
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const minutesLeft = Math.ceil((data.lockedUntil - Date.now()) / 60000);
    return { locked: true, minutesLeft };
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    saveRateLimitData({ attempts: 0, lockedUntil: null, lastAttempt: 0 });
  }
  return { locked: false, minutesLeft: 0 };
}

export function recordFailedAttempt(): { locked: boolean; attemptsLeft: number } {
  const data = getRateLimitData();
  data.attempts += 1;
  data.lastAttempt = Date.now();
  
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    saveRateLimitData(data);
    return { locked: true, attemptsLeft: 0 };
  }
  
  saveRateLimitData(data);
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - data.attempts };
}

export function resetRateLimit() {
  localStorage.removeItem(RATE_LIMIT_KEY);
}

// Password strength validation
export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: "Very Weak", color: "hsl(0, 84%, 60%)" },
    1: { label: "Weak", color: "hsl(0, 84%, 60%)" },
    2: { label: "Fair", color: "hsl(25, 95%, 53%)" },
    3: { label: "Good", color: "hsl(48, 96%, 53%)" },
    4: { label: "Strong", color: "hsl(142, 71%, 45%)" },
    5: { label: "Very Strong", color: "hsl(142, 71%, 45%)" },
  };
  
  return { score, ...labels[score], checks };
}

export function isPasswordValid(password: string): boolean {
  const { checks } = checkPasswordStrength(password);
  return checks.minLength && checks.hasNumber && checks.hasSpecial;
}

// Inactivity auto-logout
const LAST_ACTIVITY_KEY = "last_activity_timestamp";
const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function updateLastActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function shouldAutoLogout(): boolean {
  const last = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!last) return false;
  return Date.now() - parseInt(last) > INACTIVITY_LIMIT_MS;
}

import AppLayout from "@/components/AppLayout";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="prose prose-sm dark:prose-invert space-y-4 text-foreground">
          <Section title="1. Data We Collect">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Account info:</strong> Email, display name, education details you provide</li>
              <li><strong>Study data:</strong> Subjects, study logs, notes, flashcards, timetable</li>
              <li><strong>Usage data:</strong> Feature usage, session duration (for improving the app)</li>
              <li><strong>Device info:</strong> Device type (mobile/desktop) for responsive experience</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Provide and personalize the study experience</li>
              <li>Generate AI-powered study plans, mock tests, and analysis</li>
              <li>Track your progress and study streaks</li>
              <li>Send study reminders you set up</li>
              <li>Process payments through Razorpay (we never store card details)</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing">
            <p className="text-sm text-muted-foreground">
              We do <strong>NOT</strong> sell or share your data with third parties except:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Razorpay:</strong> For payment processing only (payment ID and status)</li>
              <li><strong>AI Service:</strong> Your study questions are sent to generate answers (not stored by the AI provider)</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>All data encrypted in transit via HTTPS/TLS</li>
              <li>Row-level security ensures only you can access your data</li>
              <li>Passwords are hashed — we never store plain text passwords</li>
              <li>File uploads are scanned for malicious content</li>
              <li>Session tokens expire and refresh automatically</li>
            </ul>
          </Section>

          <Section title="5. Your Rights">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li><strong>Download:</strong> Export all your data from your Profile page</li>
              <li><strong>Delete:</strong> Permanently delete your account and all data from Profile</li>
              <li><strong>Update:</strong> Edit your profile information anytime</li>
              <li><strong>Opt-out:</strong> Decline cookies and disable notifications</li>
            </ul>
          </Section>

          <Section title="6. Cookies">
            <p className="text-sm text-muted-foreground">
              We only use essential cookies for authentication and storing your preferences (theme, language).
              We do not use tracking or advertising cookies.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p className="text-sm text-muted-foreground">
              StudyBuddy is designed for students of all ages. For users under 13, we recommend parental guidance
              during account creation.
            </p>
          </Section>

          <Section title="8. Contact">
            <p className="text-sm text-muted-foreground">
              For privacy concerns, contact us through the Support ticket system in the app or email the admin.
            </p>
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
      {children}
    </div>
  );
}

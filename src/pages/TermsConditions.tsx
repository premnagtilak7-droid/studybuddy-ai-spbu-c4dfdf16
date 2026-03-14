import AppLayout from "@/components/AppLayout";
import { FileText } from "lucide-react";

export default function TermsConditions() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Terms & Conditions</h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="space-y-4 text-foreground">
          <Section title="1. Acceptance">
            <p className="text-sm text-muted-foreground">
              By using StudyBuddy, you agree to these terms. If you don't agree, please don't use the app.
            </p>
          </Section>

          <Section title="2. Account">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>You must provide a valid email to create an account</li>
              <li>You are responsible for keeping your password secure</li>
              <li>One account per person — no sharing accounts</li>
              <li>We may ban accounts that violate these terms</li>
            </ul>
          </Section>

          <Section title="3. Acceptable Use">
            <p className="text-sm text-muted-foreground">You agree NOT to:</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Use the app for any illegal purpose</li>
              <li>Attempt to manipulate AI features with prompt injection</li>
              <li>Upload malicious files or harmful content</li>
              <li>Access other users' data or accounts</li>
              <li>Abuse the AI features for non-educational purposes</li>
              <li>Attempt to reverse-engineer or hack the app</li>
            </ul>
          </Section>

          <Section title="4. Subscriptions & Payments">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Free plan includes basic features with limited AI usage</li>
              <li>Pro and Elite plans are billed monthly via Razorpay</li>
              <li>You can cancel anytime from your Profile page</li>
              <li>Refunds are handled on a case-by-case basis via support</li>
            </ul>
          </Section>

          <Section title="5. AI Features">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>AI answers are for study assistance — verify important information</li>
              <li>AI-generated content may not always be accurate</li>
              <li>Don't rely solely on AI for exam preparation</li>
            </ul>
          </Section>

          <Section title="6. Data & Content">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>You own your study data — we don't claim ownership</li>
              <li>You can export or delete your data anytime</li>
              <li>Content you share in study groups or forums is visible to group members</li>
            </ul>
          </Section>

          <Section title="7. Limitation of Liability">
            <p className="text-sm text-muted-foreground">
              StudyBuddy is provided "as is." We're not liable for any academic outcomes,
              data loss due to unforeseen circumstances, or third-party service interruptions.
            </p>
          </Section>

          <Section title="8. Changes">
            <p className="text-sm text-muted-foreground">
              We may update these terms. Continued use after changes means you accept the new terms.
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

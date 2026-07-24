import { LegalLayout } from '@/components/LegalLayout';

export const metadata = {
  title: 'Privacy Policy — Think Different Training',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="legal-flag">
        <strong>Flagged for review:</strong> this is a draft. The <span className="legal-placeholder">[DATE]</span>{' '}
        and <span className="legal-placeholder">[CONTACT EMAIL]</span> placeholders need your input before this is
        published. Also double-check Section 4, which names specific vendors (Supabase, Clerk, Stripe, Resend) —
        confirm each is actually in use, since I did not verify your current stack against this list. Nothing in
        the legal wording itself has been changed or invented.
      </p>

      <p><em>Last updated: <span className="legal-placeholder">[DATE]</span></em></p>

      <p>
        Think Different Training (&quot;TDT,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects
        your privacy. This Privacy Policy explains what personal information we collect, how we use it, and the
        choices you have.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        <strong>From applications:</strong> Name, email, phone number, age, city/state, school/team, jersey number,
        parent/guardian contact information, and answers to application questions (playing background, goals,
        access to equipment/facilities, etc.).
      </p>
      <p>
        <strong>From platform use:</strong> Game and training film you submit, coach annotations and notes on that
        film, drill and habit completion data, messages sent through the platform, voice memos, and call/session
        participation data.
      </p>
      <p>
        <strong>From payment:</strong> Payment is processed by a third-party processor (Stripe). We do not store
        your full card number. We retain records of payment status, amount, and date for our own accounting
        purposes.
      </p>
      <p>
        <strong>Automatically collected:</strong> Basic technical information such as device type and general usage
        data, used only to maintain and improve the platform.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Evaluate applications and manage enrollment</li>
        <li>Provide film review, coaching feedback, and progress tracking</li>
        <li>Communicate with you about your account, program, and payments</li>
        <li>Improve the Service</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>3. Information About Minors</h2>
      <p>Many athletes using TDT are under 18. Where the athlete is a minor:</p>
      <ul>
        <li>We require parent/guardian contact information as part of the application.</li>
        <li>Parent/guardian consent is required before a minor&apos;s information, film, or account is created.</li>
        <li>
          We limit the use of a minor&apos;s data strictly to providing the coaching service and do not use it for
          marketing or share it with third parties beyond what&apos;s needed to operate the platform (e.g. our
          hosting or payment providers).
        </li>
        <li>
          Parents/guardians may request to review, update, or delete their child&apos;s information by contacting
          us (see Section 8).
        </li>
      </ul>

      <h2>4. Who We Share Information With</h2>
      <p>We share information only with:</p>
      <ul>
        <li><strong>Coach (Jaiden Francais)</strong> — for the purpose of providing coaching and film review.</li>
        <li>
          <strong>Service providers</strong> who help us operate the platform, such as our hosting provider
          (Supabase), authentication provider (Clerk), payment processor (Stripe), and email delivery provider
          (Resend). These providers are contractually limited to using your data only to provide their service to
          us.
        </li>
        <li>
          <strong>Legal compliance</strong> — if required by law, subpoena, or to protect the safety of an
          individual.
        </li>
      </ul>
      <p>
        We do not share film, application data, or personal information with any recruiter, school, or third party
        for marketing or recruiting purposes without your explicit permission.
      </p>

      <h2>5. Data Security</h2>
      <p>
        We take reasonable technical measures to protect your information, including restricting database access so
        that athletes can only see their own data and coaches can only see data for athletes in their program
        (row-level access controls). No system is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your information for as long as your account is active and for a reasonable period afterward for
        legitimate business or legal purposes (e.g. payment records, dispute resolution). You may request deletion
        of your data as described in Section 8, subject to any legal retention requirements.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Correct inaccurate information</li>
        <li>Request deletion of your information</li>
        <li>Withdraw consent (where applicable, e.g. for a minor&apos;s participation)</li>
      </ul>

      <h2>8. Contact Us</h2>
      <p>
        To exercise any of these rights or ask questions about this policy, contact us at{' '}
        <span className="legal-placeholder">[CONTACT EMAIL]</span>.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the updated version with a new &quot;Last
        updated&quot; date.
      </p>
    </LegalLayout>
  );
}

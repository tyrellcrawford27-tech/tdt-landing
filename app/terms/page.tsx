import { LegalLayout } from '@/components/LegalLayout';

export const metadata = {
  title: 'Terms of Service — Think Different Training',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p><em>Last updated: July 24, 2026</em></p>

      <p>
        Please read these Terms of Service (&quot;Terms&quot;) carefully before using Think Different Training
        (&quot;TDT,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), including our website, application
        platform, and any related services (collectively, the &quot;Service&quot;).
      </p>
      <p>
        By applying to, paying for, or using the Service, you agree to be bound by these Terms. If you are under 18,
        a parent or legal guardian must review and accept these Terms on your behalf, and by submitting payment or
        an application, the parent/guardian represents they have done so.
      </p>

      <h2>1. What Think Different Training Is</h2>
      <p>
        TDT is a paid athlete development program combining film review, personalized drill assignments, coaching
        calls, and progress tracking, delivered over a defined program period (currently 100 days per cohort). The
        Service is provided by the coaching team (&quot;Coach&quot;) and the underlying software platform.
      </p>

      <h2>2. No Guarantee of Outcomes</h2>
      <p>
        TDT does not guarantee that any athlete will receive a scholarship offer, recruiting interest, roster spot,
        or any other specific outcome. Athletic recruiting depends on many factors outside our control, including
        the athlete&apos;s own performance, timing, and decisions made by third parties (coaches, schools,
        recruiters). Participation in the Service is not a promise of results.
      </p>

      <h2>3. Enrollment and Payment</h2>
      <ul>
        <li>Enrollment requires submission of an application and is subject to review and acceptance by Coach.</li>
        <li>
          Program fees are due as stated at the time of enrollment. Prices and program structure are subject to
          change for future cohorts but will not change for an athlete already enrolled in a paid cohort.
        </li>
        <li>
          Payment is processed through a third-party payment processor (currently{' '}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>). TDT does not
          store your full payment card information.
        </li>
      </ul>

      <h2>4. Refund Policy</h2>
      <ul>
        <li>Full refund if requested within 3 days of payment, before the cohort begins and before any film review has started.</li>
        <li>Once the cohort begins and Jaiden has started reviewing film or coaching, payments are non-refundable — the spot was reserved and coaching time allocated specifically for you, out of a cohort capped at 12.</li>
        <li>If you&apos;re removed from the program for inactivity (not submitting film, missing scheduled calls without communicating), no refund is issued, since the coaching time was made available regardless of use.</li>
      </ul>

      <h2>5. Athlete and Parent/Guardian Responsibilities</h2>
      <ul>
        <li>You agree to provide accurate information in your application.</li>
        <li>
          If the athlete is a minor, a parent or legal guardian must consent to enrollment, the collection of the
          athlete&apos;s film and personal information, and these Terms.
        </li>
        <li>You are responsible for the accuracy of any film, statements, or information submitted through the Service.</li>
      </ul>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Share your account login with anyone else.</li>
        <li>Use the Service for any unlawful purpose.</li>
        <li>Upload film, images, or content you do not have the right to share.</li>
        <li>Attempt to access other athletes&apos; data or accounts.</li>
      </ul>

      <h2>7. Intellectual Property</h2>
      <ul>
        <li>Athletes retain ownership of the film and content they submit.</li>
        <li>
          By submitting film, you grant TDT a limited license to use it solely for the purpose of providing
          coaching, film review, and program services to you.
        </li>
        <li>
          TDT retains all rights to the platform, drill content, curriculum, and any TDT-branded materials. You may
          not copy, redistribute, or resell TDT&apos;s content.
        </li>
      </ul>

      <h2>8. Communication</h2>
      <p>
        All coaching communication happens through the TDT platform. TDT does not permit or facilitate direct
        messaging between athletes outside the platform for safety reasons.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, TDT and its coaches are not liable for any indirect, incidental, or
        consequential damages arising from use of the Service, including but not limited to lost recruiting
        opportunities, missed offers, or dissatisfaction with results. TDT&apos;s total liability in any
        circumstance is limited to the amount paid for the applicable program.
      </p>

      <h2>10. Termination</h2>
      <p>
        TDT may suspend or terminate an athlete&apos;s access to the Service for violation of these Terms,
        non-payment, or other reasonable cause, at Coach&apos;s discretion.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes take effect
        constitutes acceptance of the revised Terms.
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict of law
        principles.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms can be sent to{' '}
        <a href="mailto:tyrell@thinkdifferenttraining.com">tyrell@thinkdifferenttraining.com</a>.
      </p>

      <p>
        See also our <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  );
}

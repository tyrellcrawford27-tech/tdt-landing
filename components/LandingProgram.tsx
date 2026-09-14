import { CTAButton } from '@/components/CTAButton';
import { TDTLogo } from '@/components/TDTLogo';
import styles from './LandingProgram.module.css';

export { HowItWorks } from "./HowItWorks";

type HundredDaysProps = {
  onOpenFilmFaq?: () => void;
};

export function HundredDays({ onOpenFilmFaq }: HundredDaysProps) {
  return (
    <section id="100-days" aria-labelledby="days-heading" className={`${styles.darkSection} ${styles.daysSection}`}>
      <div className={styles.container}>
        <div className={styles.daysPanel}>
          <div className={styles.daysIntro}>
            <p className={styles.eyebrow}>Why remote</p>
            <h2 id="days-heading" className={styles.heading}>Remote coaching for<br />real film-led progress.</h2>
            <p>In-person training is great for reps and coaching touch, but most growth happens when you’re alone. Remote coaching keeps your work honest with film review, structure, and direct feedback.</p>
            <a href="#faq-film" onClick={onOpenFilmFaq} className={styles.textLink}>Don&apos;t have film? <span aria-hidden="true">↗</span></a>
          </div>
          <dl className={styles.daysDetails}>
            <div><dt>Execution, not vibes.</dt><dd>Film points out missed reads and habits so your training is based on what actually happens in your game, not guessing.</dd></div>
            <div><dt>Complete guidance.</dt><dd>You get direct, on-demand feedback while training solo, so you are never working without a clear plan.</dd></div>
            <div><dt>Consistent progress.</dt><dd>Short feedback loops create better routines and make your 100-day journey feel simple, repeatable, and trackable.</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ProgramPricing({ transition = false }: { transition?: boolean }) {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={`${styles.lightSection}${transition ? ` ${styles.pricingTransition}` : ''}`}
    >
      <div className={`${styles.container} ${styles.pricingLayout}`}>
        <div className={styles.pricingIntro}>
          <p className={styles.eyebrow}>Program details</p>
          <h2 id="pricing-heading" className={styles.heading}>Personal coaching, built around your game.</h2>
          <p>We keep class size intentionally small so every athlete gets personal attention, faster feedback, and a clear game plan.</p>
          <p>Jaiden can only serve ten players at a time, so every spot requires commitment, fast turnaround, and honest communication.</p>
          <a href="#faq" className={styles.textLink}>Have a question first? <span aria-hidden="true">↗</span></a>
        </div>
        <div className={styles.priceCard}>
          <div className={styles.priceCardTop}>
            <span>Think Different Training</span>
            <div className={styles.cardLogo}><TDTLogo letterColor="#1A0F0A" /></div>
          </div>
          <p className={styles.price}>10 seats</p>
          <p className={styles.priceDescription}>Limited to 10 players so coaching stays focused and personal.</p>
          <ul className={styles.inclusions}>
            <li>Access to our coaching app</li>
            <li>Personal game film review with Jaiden</li>
            <li>On-video annotations and feedback</li>
            <li>Personalised drills connected to your film</li>
            <li>Coaching conversations and progress review</li>
          </ul>
          <CTAButton href="/apply" className={styles.applyButton}>Apply for coaching</CTAButton>
          <p className={styles.cardNote}>If a spot opens up, it fills quickly because each player gets dedicated coaching time.</p>
        </div>
      </div>
    </section>
  );
}

export function LandingFinalCTA() {
  return (
    <section id="apply-cta" aria-labelledby="apply-heading" className={styles.finalSection}>
      <div className={styles.finalContent}>
        <p className={styles.eyebrow}>Your next step</p>
        <h2 id="apply-heading" className={styles.heading}>Let’s talk about your game.</h2>
        <p>Tell us about the player you are and the player you want to become. After the application, you can book a call to ask questions and discuss the fit. Parents are part of that conversation.</p>
        <CTAButton href="/apply" className={styles.applyButton}>Apply for coaching</CTAButton>
      </div>
    </section>
  );
}

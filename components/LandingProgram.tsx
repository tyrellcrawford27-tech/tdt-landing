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
            <p className={styles.eyebrow}>Why online</p>
            <h2 id="days-heading" className={styles.heading}>Online coaching for<br />real film-led progress.</h2>
            <p>Everything we know works better online: film catches what you can’t see in the moment, structure keeps you moving forward for 100 days, and you get focused guidance from a coach who knows the level you want to reach.</p>
            <a href="#faq-film" onClick={onOpenFilmFaq} className={styles.textLink}>Don&apos;t have film? <span aria-hidden="true">↗</span></a>
          </div>
          <dl className={styles.daysDetails}>
            <div><dt>See what happens between the lines.</dt><dd>Film review highlights missed reads, habits, and decision points you miss in real time, so your next workout has purpose.</dd></div>
            <div><dt>Guidance that compounds over 100 days.</dt><dd>Weekly checkpoints and a clear roadmap make it easier to stay consistent, adjust fast, and build a stable routine.</dd></div>
            <div><dt>Coaching from someone who&apos;s been there.</dt><dd>You get direct input from a coach with experience at the level you&apos;re aiming for, not a generic program.</dd></div>
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
          <h2 id="pricing-heading" className={styles.heading}>This is your focused, film-first coaching program.</h2>
          <p>We keep class size intentionally small so each athlete gets personal attention, faster feedback, and a clear plan built around their game goals.</p>
          <p>Jaiden can only serve 10 players at a time, so every spot requires commitment, fast turnaround on work, and honest communication.</p>
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
          <p className={styles.cardNote}>If this spot opens up, it fills quickly because each player gets dedicated time and a full coaching load.</p>
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

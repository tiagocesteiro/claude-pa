import Link from "next/link";
import { Wordmark } from "@/components/ui";

/**
 * Aliança — public marketing landing at `/`. Server-rendered (no interactivity),
 * reachable logged-out (see proxy allowlist). Built on the same design tokens
 * and wordmark as the app for one coherent brand.
 */

const CASAIS = [
  "Importa e gere os convidados num só lugar, sem folhas de cálculo perdidas.",
  "Segue as confirmações (RSVP) e vê num relance quem falta responder.",
  "Monta a disposição das mesas sobre a planta real da quinta, com sugestão automática.",
];

const QUINTAS = [
  "Desenha os teus espaços: plantas e arranjos de mesas com dimensões reais.",
  "Acompanha o progresso de cada casamento marcado e o que ainda falta tratar.",
  "Sem acesso aos dados pessoais dos convidados. A privacidade do casal fica protegida.",
];

const STEPS = [
  {
    title: "Cria o casamento",
    text: "Escolhe a data e o espaço. Casais e quintas partilham o mesmo plano, cada um com a sua vista.",
  },
  {
    title: "Adiciona convidados e confirmações",
    text: "Importa a lista por Excel e acompanha os RSVP à medida que chegam.",
  },
  {
    title: "Monta o seating",
    text: "Distribui os convidados pelas mesas sobre a planta real, com disposição automática.",
  },
];

const FEATURES: { title: string; text: string; icon: "excel" | "rsvp" | "auto" | "plan" | "pdf" | "eye" }[] = [
  { title: "Import por Excel", text: "Traz a lista de convidados como já a tens.", icon: "excel" },
  { title: "Seguimento de RSVP", text: "Confirmados, pendentes e recusas, sempre atualizados.", icon: "rsvp" },
  { title: "Mesas automáticas", text: "Uma primeira disposição gerada por ti em segundos.", icon: "auto" },
  { title: "Plantas reais", text: "Salas e arranjos com as dimensões do espaço.", icon: "plan" },
  { title: "Export em PDF", text: "Um mapa por sala, pronto a imprimir para o dia.", icon: "pdf" },
  { title: "Vista da quinta", text: "O espaço acompanha o progresso, sem ver dados privados.", icon: "eye" },
];

function FeatureIcon({ name }: { name: string }) {
  const common = {
    className: "landing-feature-mark",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "excel":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M4 9h16M10 9v12M4 15h16" />
        </svg>
      );
    case "rsvp":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "auto":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
          <path d="M10 7h4a4 4 0 0 1 4 4M14 17h-4a4 4 0 0 1-4-4" />
        </svg>
      );
    case "plan":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h7V4M14 20v-6h7" />
        </svg>
      );
    case "pdf":
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 15h6M9 12h3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <Wordmark href="/" />
        <div className="landing-nav-links">
          <Link href="/login" className="landing-nav-link">
            Entrar
          </Link>
          <Link href="/registar" className="btn btn-primary btn-sm">
            Criar conta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <svg
          className="landing-hero-rings"
          viewBox="0 0 120 74"
          aria-hidden
          focusable="false"
        >
          <circle cx="46" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="74" cy="34" r="30" fill="none" stroke="var(--accent)" strokeWidth="3" />
        </svg>
        <h1>
          O casamento inteiro, <em>reunido</em> num só lugar.
        </h1>
        <p className="landing-hero-tagline">
          Aliança liga casais e quintas, do primeiro convidado à última mesa.
        </p>
        <p className="landing-hero-sub">
          Gere os convidados, segue as confirmações e monta o seating sobre as plantas reais do
          espaço, com disposição automática das mesas.
        </p>
        <div className="landing-cta-row">
          <Link href="/registar" className="btn btn-primary">
            Começar
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Entrar
          </Link>
        </div>
        <p className="landing-hero-hint">Projeto piloto. Criar conta leva menos de um minuto.</p>
      </header>

      {/* Two audiences */}
      <section className="landing-section">
        <span className="landing-eyebrow">Dois públicos, um plano</span>
        <h2 className="landing-section-title">Feito para quem casa e para quem recebe</h2>
        <p className="landing-section-lead">
          Casais e quintas trabalham no mesmo casamento, cada um com a vista certa para o seu papel.
        </p>
        <div className="landing-audience-grid">
          <article className="card landing-audience">
            <p className="landing-audience-kicker">Para casais</p>
            <h3>Organiza tudo sem stress</h3>
            <ul className="landing-benefits">
              {CASAIS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
          <article className="card landing-audience">
            <p className="landing-audience-kicker">Para quintas</p>
            <h3>Acompanha cada casamento</h3>
            <ul className="landing-benefits">
              {QUINTAS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <span className="landing-eyebrow">Como funciona</span>
        <h2 className="landing-section-title">Três passos, do plano ao dia</h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="landing-step">
              <div className="landing-step-num">{String(i + 1).padStart(2, "0")}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <span className="landing-eyebrow">Funcionalidades</span>
        <h2 className="landing-section-title">Tudo o que o dia precisa</h2>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <FeatureIcon name={f.icon} />
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <h2>Pronto para começar?</h2>
        <p>Cria a tua conta e monta o primeiro casamento hoje. Casal ou quinta, é só entrar.</p>
        <div className="landing-cta-row">
          <Link href="/registar" className="btn btn-primary">
            Criar conta
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Wordmark href="/" />
        <div className="landing-footer-links">
          <Link href="#">Privacidade</Link>
          <Link href="#">Termos</Link>
        </div>
      </footer>
    </div>
  );
}

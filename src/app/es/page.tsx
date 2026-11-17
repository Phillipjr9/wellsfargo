import { SiteShell } from "@/components/site-shell";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wells Fargo en Español | Servicios Financieros y Banca por Internet",
  description: "Explore cuentas de cheques, ahorros, tarjetas de crédito, préstamos hipotecarios y atención al cliente en español.",
};

export default function EspanolPage() {
  const cards = [
    {
      icon: "/images/icon-checking.png",
      title: "Cuentas de cheques",
      desc: "Compare Everyday Checking, Clear Access Banking sin cargos por sobregiro y opciones Premier.",
      cta: "Comparar cuentas",
      href: "/checking/compare",
    },
    {
      icon: "/images/icon-home.png",
      title: "Préstamos hipotecarios",
      desc: "Opciones para comprar casa con un pago inicial tan bajo como el 3% y calculadoras mensuales.",
      cta: "Explorar hipotecas",
      href: "/mortgage/buying-a-house",
    },
    {
      icon: "/images/icon-card.png",
      title: "Tarjetas de crédito",
      desc: "Gane 20,000 puntos de bonificación con Autograph o 2% en recompensas en efectivo.",
      cta: "Ver tarjetas",
      href: "/credit-cards",
    },
  ];

  return (
    <SiteShell langToggle="en">
      <section className="wf-page-hero wf-hero-warm" lang="es">
        <div className="content-width wf-page-hero-inner with-image">
          <div className="wf-page-hero-copy">
            <span className="wf-eyebrow">Wells Fargo en Español</span>
            <h1>Una cuenta de cheques a su medida</h1>
            <p>
              Descubra beneficios diseñados para su estilo de vida, administre su dinero con Wells Fargo Online y
              encuentre sucursales con banqueros que hablan español cerca de usted.
            </p>
            <div className="wf-hero-actions">
              <Link href="/checking/compare" className="button button-red">
                Encuentre su cuenta <ChevronRight size={18} />
              </Link>
              <Link href="/" className="button button-outline">
                View in English
              </Link>
            </div>
          </div>
          <div className="wf-page-hero-media">
            <img src="/images/checking-hero.jpg" alt="Banca móvil de Wells Fargo" />
          </div>
        </div>
      </section>

      <section className="wf-section content-width" lang="es">
        <div className="section-heading">
          <span className="accent-line" />
          <h2>Soluciones bancarias para cada meta</h2>
        </div>
        <div className="guidance-grid">
          {cards.map((c) => (
            <article key={c.title} className="wf-product-card">
              <img src={c.icon} alt="" width="56" height="56" style={{ marginBottom: 12 }} />
              <h3>{c.title}</h3>
              <p className="wf-product-desc">{c.desc}</p>
              <div className="wf-product-actions">
                <Link href={c.href} className="button button-red">{c.cta}</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="wf-related-grid" style={{ marginTop: 48 }}>
          <Link href="/locations?spanish=1" className="wf-related-card">
            <h3>Cajeros automáticos y sucursales</h3>
            <p>Busque sucursales con atención en español y cajeros las 24 horas.</p>
            <span className="wf-text-cta">Buscar ubicación <ArrowRight size={16} /></span>
          </Link>
          <Link href="/appointments" className="wf-related-card">
            <h3>Haga una cita</h3>
            <p>Programe una cita en persona o por teléfono con un representante bancario.</p>
            <span className="wf-text-cta">Programar cita <ArrowRight size={16} /></span>
          </Link>
          <Link href="/online-banking/dashboard" className="wf-related-card">
            <h3>Banca por Internet Wells Fargo Online</h3>
            <p>Consulte saldos, transfiera fondos y pague cuentas en nuestro panel interactivo.</p>
            <span className="wf-text-cta">Iniciar sesión <ArrowRight size={16} /></span>
          </Link>
          <Link href="/savings-cds" className="wf-related-card">
            <h3>Cuentas de ahorros y CD</h3>
            <p>Haga crecer sus ahorros con transferencias automáticas y tasas fijas.</p>
            <span className="wf-text-cta">Ver ahorros <ArrowRight size={16} /></span>
          </Link>
          <Link href="/privacy-security/fraud" className="wf-related-card">
            <h3>Centro de seguridad</h3>
            <p>Consejos para prevenir fraudes, estafas y proteger sus cuentas las 24 horas.</p>
            <span className="wf-text-cta">Ver seguridad <ArrowRight size={16} /></span>
          </Link>
          <Link href="/help" className="wf-related-card">
            <h3>Servicio al cliente (1-877-287-7501)</h3>
            <p>Líneas de ayuda, números de ruta y respuestas a preguntas frecuentes.</p>
            <span className="wf-text-cta">Obtener ayuda <ArrowRight size={16} /></span>
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}

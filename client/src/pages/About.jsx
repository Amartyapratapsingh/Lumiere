import { Link } from 'react-router-dom'
import { IconArrow, IconFlask, IconShield, IconTruck, IconGlobe } from '../components/Icons.jsx'

const PILLARS = [
  {
    icon: <IconShield size={22} />,
    title: 'Sourced domestically, not for export',
    body: 'Gulf houses frequently bottle a weaker formula for overseas distribution. Our sellers buy from the counters locals buy from, so the concentration you get is the concentration that made the fragrance famous.',
  },
  {
    icon: <IconFlask size={22} />,
    title: 'Batch codes on record',
    body: 'Every carton is photographed on arrival before it goes into storage. If you want to check what you received against what we logged, ask and we will send the photo.',
  },
  {
    icon: <IconTruck size={22} />,
    title: 'Duty settled before dispatch',
    body: 'A flat 5% customs handling charge appears at checkout and we pay it up front. No courier will ever knock asking you for more.',
  },
  {
    icon: <IconGlobe size={22} />,
    title: 'Shelf life we would accept ourselves',
    body: 'We reject consignments with under twelve months remaining. Skincare travels in insulated cartons; nothing sits on a loading dock in May.',
  },
]

export default function About() {
  return (
    <>
      <header className="about-hero">
        <img src="/images/editorial/moody-glam.jpg" alt="" />
        <div className="about-hero-veil" />
        <div className="page about-hero-body">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Our story</span>
          <h1>We started because the good stuff never made it here.</h1>
          <p className="lede">
            Anyone who has asked a relative flying back from Sharjah to squeeze a bottle of attar into their
            luggage knows the problem. Lumière exists so you do not have to.
          </p>
        </div>
      </header>

      <section className="section-tight">
        <div className="page-narrow prose">
          <p className="lede">
            For years, buying imported beauty in India meant one of three bad options: pay resellers triple,
            gamble on a marketplace listing with no batch information, or wait for someone to travel.
          </p>
          <p>
            We built Lumière as a marketplace rather than a shop because the people who solve this best are
            already out there — the family running an attar counter in Deira, the buyer who flies to Incheon
            twice a month, the Paris agent working with independent perfumers in Grasse. What they lacked was
            a storefront that Indian shoppers could trust, and a way to clear customs without the buyer
            getting a surprise bill.
          </p>
          <p>
            So we handle the storefront, the payments, the customs paperwork and the customer relationship.
            The sellers keep what they are good at: knowing which batch is worth carrying.
          </p>
        </div>
      </section>

      <section className="section-tight" id="authenticity">
        <div className="page">
          <div className="section-head">
            <div>
              <h2>How we keep it honest</h2>
              <p>Four things we will not compromise on.</p>
            </div>
          </div>
          <div className="pillars">
            {PILLARS.map((p) => (
              <article key={p.title} className="pillar">
                <span className="pillar-icon">{p.icon}</span>
                <h3>{p.title}</h3>
                <p className="muted">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight" id="shipping">
        <div className="page">
          <div className="faq-grid">
            <div>
              <h2>Shipping &amp; duty</h2>
              <p className="lede">What you pay, and when.</p>
            </div>
            <dl className="faq">
              <dt>How much is shipping?</dt>
              <dd>Free on orders over ₹2,500. Below that it is a flat ₹149 anywhere in India.</dd>

              <dt>What is the 5% charge at checkout?</dt>
              <dd>
                Customs duty and handling on imported goods. We pay it before your parcel is dispatched, so
                nothing is collected on delivery.
              </dd>

              <dt>How long does delivery take?</dt>
              <dd>
                Two to five working days for metros, up to seven elsewhere. Orders placed before 2pm are
                dispatched the same day.
              </dd>

              <dt id="returns">Can I return something?</dt>
              <dd>
                Unopened items, within 14 days. For hygiene reasons we cannot take back opened cosmetics
                unless the item arrived damaged or is not what you ordered — in which case we cover the
                return shipping too.
              </dd>

              <dt>Is everything genuine?</dt>
              <dd>
                Yes, and we will show you the batch photograph on request. If anything you receive fails a
                brand’s own authentication check, we refund in full and remove the seller.
              </dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="page">
          <div className="seller-band">
            <div>
              <h2>Bring your stock to Lumière</h2>
              <p>
                If you already import beauty, opening a store takes a few minutes and costs nothing to list.
              </p>
              <div className="row wrap" style={{ marginTop: '1.5rem' }}>
                <Link to="/signup?role=seller" className="btn btn-light">
                  Open a store <IconArrow size={15} />
                </Link>
                <Link to="/sell" className="btn btn-ghost seller-band-ghost">How it works</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

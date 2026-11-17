"use client";

import { Check, CheckCircle2, Copy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type CalculatorType =
  | "mortgage"
  | "homebuyer3"
  | "savings"
  | "personal-loan"
  | "auto-loan"
  | "rewards"
  | "retirement"
  | "goals"
  | "routing"
  | "privacy"
  | "security-checklist";

function fmtCurrency(val: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(val) ? val : 0);
}

const routingByState: { state: string; ach: string; wire: string }[] = [
  { state: "Alabama", ach: "062000080", wire: "121000248" },
  { state: "Alaska", ach: "125200057", wire: "121000248" },
  { state: "Arizona", ach: "122105278", wire: "121000248" },
  { state: "California (Northern)", ach: "121042882", wire: "121000248" },
  { state: "California (Southern)", ach: "122000247", wire: "121000248" },
  { state: "Colorado", ach: "102000076", wire: "121000248" },
  { state: "Connecticut", ach: "021101108", wire: "121000248" },
  { state: "Delaware", ach: "031100869", wire: "121000248" },
  { state: "District of Columbia", ach: "054001220", wire: "121000248" },
  { state: "Florida", ach: "063107513", wire: "121000248" },
  { state: "Georgia", ach: "061000227", wire: "121000248" },
  { state: "Idaho", ach: "124103799", wire: "121000248" },
  { state: "Illinois", ach: "071101307", wire: "121000248" },
  { state: "Iowa", ach: "073000228", wire: "121000248" },
  { state: "Kansas", ach: "101089292", wire: "121000248" },
  { state: "Maryland", ach: "055003201", wire: "121000248" },
  { state: "Minnesota", ach: "091000019", wire: "121000248" },
  { state: "Mississippi", ach: "062203751", wire: "121000248" },
  { state: "Montana", ach: "092905278", wire: "121000248" },
  { state: "Nebraska", ach: "104000058", wire: "121000248" },
  { state: "Nevada", ach: "321270742", wire: "121000248" },
  { state: "New Jersey", ach: "021200025", wire: "121000248" },
  { state: "New Mexico", ach: "107002192", wire: "121000248" },
  { state: "New York", ach: "026012881", wire: "121000248" },
  { state: "North Carolina", ach: "053000219", wire: "121000248" },
  { state: "North Dakota", ach: "091300010", wire: "121000248" },
  { state: "Oregon", ach: "123006800", wire: "121000248" },
  { state: "Pennsylvania", ach: "031000503", wire: "121000248" },
  { state: "South Carolina", ach: "053207766", wire: "121000248" },
  { state: "South Dakota", ach: "091400046", wire: "121000248" },
  { state: "Tennessee", ach: "064003768", wire: "121000248" },
  { state: "Texas", ach: "111900659", wire: "121000248" },
  { state: "Utah", ach: "124002971", wire: "121000248" },
  { state: "Virginia", ach: "051400549", wire: "121000248" },
  { state: "Washington", ach: "125008547", wire: "121000248" },
  { state: "Wisconsin", ach: "075911988", wire: "121000248" },
  { state: "Wyoming", ach: "102301092", wire: "121000248" },
];

export function InteractiveTool({ type }: { type: CalculatorType }) {
  if (type === "mortgage" || type === "homebuyer3") {
    return <MortgageWidget defaultDownPct={type === "homebuyer3" ? 3 : 20} />;
  }
  if (type === "savings") return <SavingsWidget />;
  if (type === "personal-loan") return <LoanWidget kind="personal" />;
  if (type === "auto-loan") return <LoanWidget kind="auto" />;
  if (type === "rewards") return <RewardsWidget />;
  if (type === "retirement") return <RetirementWidget />;
  if (type === "goals") return <GoalWidget />;
  if (type === "routing") return <RoutingWidget />;
  if (type === "privacy") return <PrivacyWidget />;
  return <SecurityChecklistWidget />;
}

function MortgageWidget({ defaultDownPct }: { defaultDownPct: number }) {
  const [price, setPrice] = useState(420000);
  const [downPct, setDownPct] = useState(defaultDownPct);
  const [rate, setRate] = useState(6.375);
  const [years, setYears] = useState(30);

  const downAmount = (price * downPct) / 100;
  const principal = Math.max(0, price - downAmount);
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  const pi =
    monthlyRate > 0 ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1) : principal / n;
  const taxIns = (price * 0.0145) / 12;
  const total = pi + taxIns;

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Estimate your monthly mortgage payment</h3>
        <p className="wf-muted">Adjust home price, down payment, term, and interest rate for an instant estimate.</p>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="m-price">Home price ($)</label>
            <input id="m-price" type="number" min={50000} max={5000000} step={5000} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="m-down">Down payment ({downPct}%)</label>
            <input id="m-down" type="range" min={3} max={40} step={1} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} />
            <small>{fmtCurrency(downAmount)} down payment</small>
          </div>
        </div>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="m-rate">Interest rate (%)</label>
            <input id="m-rate" type="number" min={1} max={15} step={0.125} value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="m-term">Loan term</label>
            <select id="m-term" value={years} onChange={(e) => setYears(Number(e.target.value))}>
              <option value={30}>30-year fixed</option>
              <option value={20}>20-year fixed</option>
              <option value={15}>15-year fixed</option>
            </select>
          </div>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Estimated Monthly Total</span>
        <div className="wf-big-number">{fmtCurrency(total)}<span>/mo</span></div>
        <ul className="wf-breakdown">
          <li><span>Principal &amp; interest</span><strong>{fmtCurrency(pi)}</strong></li>
          <li><span>Est. property tax &amp; insurance</span><strong>{fmtCurrency(taxIns)}</strong></li>
          <li><span>Loan amount</span><strong>{fmtCurrency(principal)}</strong></li>
          <li><span>Down payment ({downPct}%)</span><strong>{fmtCurrency(downAmount)}</strong></li>
        </ul>
        <Link href="/appointments" className="button button-red wf-full-btn">Talk to a home mortgage consultant</Link>
      </div>
    </div>
  );
}

function SavingsWidget() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(250);
  const [apy, setApy] = useState(4.0);
  const [months, setMonths] = useState(11);

  const r = apy / 100 / 12;
  let balance = initial;
  for (let i = 0; i < months; i++) {
    balance = balance * (1 + r) + monthly;
  }
  const contributed = initial + monthly * months;
  const interest = Math.max(0, balance - contributed);

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Savings &amp; CD earnings calculator</h3>
        <p className="wf-muted">Model how a Special Fixed Rate CD or automated monthly savings can grow over time.</p>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="s-init">Opening deposit ($)</label>
            <input id="s-init" type="number" min={0} max={1000000} step={500} value={initial} onChange={(e) => setInitial(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="s-mo">Monthly deposit ($0 for CDs)</label>
            <input id="s-mo" type="number" min={0} max={25000} step={50} value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="s-apy">Annual Percentage Yield (%)</label>
            <input id="s-apy" type="number" min={0.01} max={10} step={0.05} value={apy} onChange={(e) => setApy(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="s-term">Term length</label>
            <select id="s-term" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={4}>4 months (Special CD)</option>
              <option value={7}>7 months (Special CD)</option>
              <option value={11}>11 months (Special CD)</option>
              <option value={24}>24 months</option>
              <option value={60}>60 months</option>
            </select>
          </div>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Projected Ending Balance</span>
        <div className="wf-big-number">{fmtCurrency(balance, 2)}</div>
        <ul className="wf-breakdown">
          <li><span>Total contributions</span><strong>{fmtCurrency(contributed, 2)}</strong></li>
          <li><span>Estimated interest earned</span><strong>{fmtCurrency(interest, 2)}</strong></li>
          <li><span>Selected term</span><strong>{months} months @ {apy.toFixed(2)}% APY</strong></li>
        </ul>
        <Link href="/savings-cds/rates" className="button button-outline wf-full-btn">View all savings &amp; CD rates</Link>
      </div>
    </div>
  );
}

function LoanWidget({ kind }: { kind: "personal" | "auto" }) {
  const [amount, setAmount] = useState(kind === "personal" ? 15000 : 28000);
  const [apr, setApr] = useState(kind === "personal" ? 8.49 : 6.29);
  const [months, setMonths] = useState(kind === "personal" ? 48 : 60);

  const r = apr / 100 / 12;
  const payment = r > 0 ? (amount * (r * Math.pow(1 + r, months))) / (Math.pow(1 + r, months) - 1) : amount / months;
  const totalInterest = Math.max(0, payment * months - amount);

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>{kind === "personal" ? "Check your estimated monthly payment" : "Auto financing payment estimator"}</h3>
        <p className="wf-muted">
          {kind === "personal"
            ? "Explore fixed monthly payments with $0 origination fee and $0 prepayment penalty."
            : "Estimate monthly car payments before visiting a participating dealership."}
        </p>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="l-amt">Loan amount ($)</label>
            <input id="l-amt" type="number" min={3000} max={100000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="l-apr">Estimated APR (%)</label>
            <input id="l-apr" type="number" min={1} max={25} step={0.25} value={apr} onChange={(e) => setApr(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="wf-input-group">
          <label htmlFor="l-term">Repayment term</label>
          <select id="l-term" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
            <option value={48}>48 months</option>
            <option value={60}>60 months</option>
            <option value={72}>72 months</option>
          </select>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Estimated Fixed Payment</span>
        <div className="wf-big-number">{fmtCurrency(payment, 2)}<span>/mo</span></div>
        <ul className="wf-breakdown">
          <li><span>Principal borrowed</span><strong>{fmtCurrency(amount)}</strong></li>
          <li><span>Estimated total interest</span><strong>{fmtCurrency(totalInterest)}</strong></li>
          <li><span>Origination fee</span><strong>$0</strong></li>
        </ul>
        <Link href="/appointments" className="button button-red wf-full-btn">Speak with a lending specialist</Link>
      </div>
    </div>
  );
}

function RewardsWidget() {
  const [dining, setDining] = useState(450);
  const [travel, setTravel] = useState(350);
  const [gasTransit, setGasTransit] = useState(250);
  const [streamingPhone, setStreamingPhone] = useState(140);
  const [other, setOther] = useState(800);

  const bonus3xAnnual = (dining + travel + gasTransit + streamingPhone) * 12 * 3;
  const base1xAnnual = other * 12;
  const welcomeBonus = (dining + travel + gasTransit + streamingPhone + other) * 3 >= 1000 ? 20000 : 0;
  const firstYearPts = bonus3xAnnual + base1xAnnual + welcomeBonus;

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Autograph<sup>®</sup> 3X points calculator</h3>
        <p className="wf-muted">Enter your typical monthly spending to estimate your first-year Wells Fargo Rewards<sup>®</sup> points.</p>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="r-din">Restaurants &amp; dining ($/mo — 3X)</label>
            <input id="r-din" type="number" min={0} max={10000} step={50} value={dining} onChange={(e) => setDining(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="r-trv">Travel, flights &amp; hotels ($/mo — 3X)</label>
            <input id="r-trv" type="number" min={0} max={10000} step={50} value={travel} onChange={(e) => setTravel(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="r-gas">Gas, EV &amp; transit ($/mo — 3X)</label>
            <input id="r-gas" type="number" min={0} max={5000} step={25} value={gasTransit} onChange={(e) => setGasTransit(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="r-str">Streaming &amp; phone plans ($/mo — 3X)</label>
            <input id="r-str" type="number" min={0} max={2000} step={10} value={streamingPhone} onChange={(e) => setStreamingPhone(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="wf-input-group">
          <label htmlFor="r-oth">All other purchases ($/mo — 1X)</label>
          <input id="r-oth" type="number" min={0} max={20000} step={50} value={other} onChange={(e) => setOther(Number(e.target.value) || 0)} />
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Estimated First-Year Points</span>
        <div className="wf-big-number">{firstYearPts.toLocaleString()}<span> pts</span></div>
        <ul className="wf-breakdown">
          <li><span>3X everyday categories</span><strong>{bonus3xAnnual.toLocaleString()} pts</strong></li>
          <li><span>1X other purchases</span><strong>{base1xAnnual.toLocaleString()} pts</strong></li>
          <li><span>Intro welcome bonus</span><strong>{welcomeBonus.toLocaleString()} pts</strong></li>
          <li><span>Redemption value (1¢/pt)</span><strong>{fmtCurrency(firstYearPts / 100)}</strong></li>
        </ul>
      </div>
    </div>
  );
}

function RetirementWidget() {
  const [age, setAge] = useState(34);
  const [retireAge, setRetireAge] = useState(65);
  const [current, setCurrent] = useState(65000);
  const [monthly, setMonthly] = useState(650);

  const years = Math.max(1, retireAge - age);
  const r = 0.065 / 12;
  let total = current;
  for (let i = 0; i < years * 12; i++) {
    total = total * (1 + r) + monthly;
  }

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Retirement readiness estimator</h3>
        <p className="wf-muted">Illustrates hypothetical tax-advantaged growth assuming an illustrative 6.5% annualized return.</p>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="rt-age">Current age</label>
            <input id="rt-age" type="number" min={18} max={75} value={age} onChange={(e) => setAge(Number(e.target.value) || 18)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="rt-ret">Target retirement age</label>
            <input id="rt-ret" type="number" min={age + 1} max={85} value={retireAge} onChange={(e) => setRetireAge(Number(e.target.value) || 65)} />
          </div>
        </div>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="rt-cur">Current retirement savings ($)</label>
            <input id="rt-cur" type="number" min={0} step={5000} value={current} onChange={(e) => setCurrent(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="rt-mo">Monthly contribution ($)</label>
            <input id="rt-mo" type="number" min={0} step={50} value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)} />
          </div>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Hypothetical Balance at Age {retireAge}</span>
        <div className="wf-big-number">{fmtCurrency(total)}</div>
        <ul className="wf-breakdown">
          <li><span>Investment horizon</span><strong>{years} years</strong></li>
          <li><span>Est. 4% annual withdrawal</span><strong>{fmtCurrency(total * 0.04)}/yr</strong></li>
        </ul>
        <Link href="/appointments" className="button button-red wf-full-btn">Meet with a financial advisor</Link>
      </div>
    </div>
  );
}

function GoalWidget() {
  const presets = [
    { name: "Build an emergency fund", target: 12000, months: 18, route: "/savings-cds", cta: "Explore savings options" },
    { name: "Save for a home down payment", target: 25000, months: 24, route: "/mortgage/buying-a-house", cta: "Explore 3% down mortgages" },
    { name: "Pay down higher-interest debt", target: 9000, months: 24, route: "/financial-goals/borrow", cta: "Compare borrowing options" },
    { name: "Invest for long-term milestones", target: 50000, months: 60, route: "/investing-wealth", cta: "Explore investment services" },
  ];
  const [selected, setSelected] = useState(0);
  const [target, setTarget] = useState(presets[0].target);
  const [saved, setSaved] = useState(2500);
  const [months, setMonths] = useState(presets[0].months);

  const remaining = Math.max(0, target - saved);
  const monthlyNeeded = months > 0 ? remaining / months : remaining;

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Interactive money goal builder</h3>
        <p className="wf-muted">Choose a priority below to calculate a clear, achievable monthly target.</p>
        <div className="wf-pill-row">
          {presets.map((preset, i) => (
            <button
              key={preset.name}
              type="button"
              className={selected === i ? "wf-pill active" : "wf-pill"}
              onClick={() => {
                setSelected(i);
                setTarget(preset.target);
                setMonths(preset.months);
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="wf-form-row">
          <div className="wf-input-group">
            <label htmlFor="g-tgt">Goal amount ($)</label>
            <input id="g-tgt" type="number" min={500} step={500} value={target} onChange={(e) => setTarget(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="g-sav">Already set aside ($)</label>
            <input id="g-sav" type="number" min={0} step={250} value={saved} onChange={(e) => setSaved(Number(e.target.value) || 0)} />
          </div>
          <div className="wf-input-group">
            <label htmlFor="g-mo">Timeline (months)</label>
            <input id="g-mo" type="number" min={1} max={180} value={months} onChange={(e) => setMonths(Number(e.target.value) || 1)} />
          </div>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Monthly Action Target</span>
        <div className="wf-big-number">{fmtCurrency(monthlyNeeded)}<span>/mo</span></div>
        <ul className="wf-breakdown">
          <li><span>Remaining toward goal</span><strong>{fmtCurrency(remaining)}</strong></li>
          <li><span>Weekly equivalent</span><strong>{fmtCurrency(monthlyNeeded / 4.33)}/wk</strong></li>
        </ul>
        <Link href={presets[selected].route} className="button button-red wf-full-btn">{presets[selected].cta}</Link>
      </div>
    </div>
  );
}

function RoutingWidget() {
  const [index, setIndex] = useState(3);
  const [copied, setCopied] = useState("");
  const current = routingByState[index];

  function copyValue(val: string) {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopied(val);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Routing number lookup by state</h3>
        <p className="wf-muted">
          Select the state where your checking or savings account was opened to find your 9-digit ABA routing number for
          direct deposits, ACH payments, and domestic wires.
        </p>
        <div className="wf-input-group">
          <label htmlFor="state-routing">State where account was opened</label>
          <select id="state-routing" value={index} onChange={(e) => setIndex(Number(e.target.value))}>
            {routingByState.map((item, idx) => (
              <option key={item.state} value={idx}>
                {item.state}
              </option>
            ))}
          </select>
        </div>
        <div className="wf-check-diagram" aria-label="Sample check diagram">
          <div className="wf-check-top">
            <span>WELLS FARGO BANK, N.A.</span>
            <span>Check #1001</span>
          </div>
          <div className="wf-check-micr">
            <span>
              <strong>⑆{current.ach}⑆</strong>
              <small>Routing Number</small>
            </span>
            <span>
              <strong>0123456789⑈</strong>
              <small>Account Number</small>
            </span>
            <span>
              <strong>1001</strong>
              <small>Check #</small>
            </span>
          </div>
        </div>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">{current.state}</span>
        <ul className="wf-breakdown">
          <li>
            <span>Direct deposit &amp; ACH routing</span>
            <button type="button" className="wf-copy-btn" onClick={() => copyValue(current.ach)}>
              <strong>{current.ach}</strong> {copied === current.ach ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </li>
          <li>
            <span>Domestic wire transfer</span>
            <button type="button" className="wf-copy-btn" onClick={() => copyValue(current.wire)}>
              <strong>{current.wire}</strong> {copied === current.wire ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </li>
          <li>
            <span>International wire (SWIFT)</span>
            <strong>WFBIUS6S</strong>
          </li>
        </ul>
        <Link href="/online-banking/dashboard" className="button button-red wf-full-btn">
          View full account numbers in Online Banking
        </Link>
      </div>
    </div>
  );
}

function PrivacyWidget() {
  const [analytics, setAnalytics] = useState(true);
  const [personalized, setPersonalized] = useState(false);
  const [doNotShare, setDoNotShare] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>Manage privacy &amp; cookie preferences</h3>
        <p className="wf-muted">Update your browser choices for analytics, tailored marketing, and cross-context sharing at any time.</p>
        <label className="wf-toggle-row">
          <input type="checkbox" checked disabled />
          <span><strong>Strictly Necessary Cookies</strong> — Always active for site security and navigation.</span>
        </label>
        <label className="wf-toggle-row">
          <input type="checkbox" checked={analytics} onChange={(e) => { setAnalytics(e.target.checked); setSaved(false); }} />
          <span><strong>Performance &amp; Site Analytics</strong> — Helps improve speed, search relevance, and accessibility.</span>
        </label>
        <label className="wf-toggle-row">
          <input type="checkbox" checked={personalized} onChange={(e) => { setPersonalized(e.target.checked); setSaved(false); }} />
          <span><strong>Interest-Based Advertising</strong> — Tailors Wells Fargo offers across participating websites.</span>
        </label>
        <label className="wf-toggle-row">
          <input type="checkbox" checked={doNotShare} onChange={(e) => { setDoNotShare(e.target.checked); setSaved(false); }} />
          <span><strong>Do Not Sell or Share Opt-Out</strong> — Restrict third-party targeted advertising disclosures.</span>
        </label>
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Your Preference Status</span>
        <p className="wf-muted">
          Global Privacy Control (GPC) browser signals are automatically honored. Save your choices below to apply them immediately.
        </p>
        <button type="button" className="button button-red wf-full-btn" onClick={() => setSaved(true)}>
          Save privacy choices
        </button>
        {saved && (
          <p className="wf-saved-banner">
            <CheckCircle2 size={17} /> Preferences updated and applied to this session.
          </p>
        )}
      </div>
    </div>
  );
}

function SecurityChecklistWidget() {
  const items = [
    "Enable a passkey or 2-Step Verification for Wells Fargo Online sign-on",
    "Turn on instant push/text alerts for card purchases, wires, and Zelle transfers",
    "Never share a one-time passcode — Wells Fargo will never call and ask for it",
    "Verify unexpected calls by hanging up and dialing the number on the back of your card",
    "Send money with Zelle only to friends, family, and people you personally know and trust",
  ];
  const [checked, setChecked] = useState<boolean[]>([true, true, false, false, false]);
  const score = checked.filter(Boolean).length;

  return (
    <div className="wf-tool-card">
      <div className="wf-tool-inputs">
        <h3>5-Step Account Protection Checkup</h3>
        <p className="wf-muted">Complete each safeguard to strengthen your protection against phishing and impersonation scams.</p>
        {items.map((label, idx) => (
          <label key={label} className="wf-toggle-row">
            <input
              type="checkbox"
              checked={checked[idx]}
              onChange={() => setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="wf-tool-result">
        <span className="wf-eyebrow">Security Readiness</span>
        <div className="wf-big-number">{score} / {items.length}</div>
        <p className="wf-muted">
          <ShieldCheck size={16} style={{ display: "inline", verticalAlign: "text-bottom" }} />{" "}
          {score === items.length
            ? "Excellent — all recommended safeguards reviewed."
            : "Review the remaining habits and report suspicious messages right away."}
        </p>
        <Link href="/privacy-security/fraud/report" className="button button-red wf-full-btn">
          Report fraud or phishing
        </Link>
      </div>
    </div>
  );
}

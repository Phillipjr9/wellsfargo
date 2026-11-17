import type { CardRow } from "@/components/wfo-types";

/**
 * Real Wells Fargo card artwork served from /public/images/cards.
 * Sources: creditcards.wellsfargo.com card art + Wells Fargo debit-card pages.
 */
export const CARD_ART = {
  debit: "/images/cards/debit-card.png",
  autograph: "/images/cards/autograph.png",
  activeCash: "/images/cards/active-cash.png",
  reflect: "/images/cards/reflect.png",
  autographJourney: "/images/cards/autograph-journey.png",
  signify: "/images/cards/signify.png",
} as const;

export type CardArtInfo = {
  src: string;
  alt: string;
  label: string;
  kind: "Debit Card" | "Credit Card";
};

export function getCardArt(card: CardRow): CardArtInfo {
  const name = `${card.cardName} ${card.network}`.toLowerCase();
  let src: string = CARD_ART.autograph;
  let label = "Wells Fargo Visa® Credit Card";
  let kind: CardArtInfo["kind"] = "Credit Card";

  if (name.includes("debit") || name.includes("visa debit")) {
    src = CARD_ART.debit;
    label = "Wells Fargo Visa® Debit Card";
    kind = "Debit Card";
  } else if (name.includes("journey")) {
    src = CARD_ART.autographJourney;
    label = "Wells Fargo Autograph Journey℠ Visa Infinite® Card";
  } else if (name.includes("autograph")) {
    src = CARD_ART.autograph;
    label = "Wells Fargo Autograph® Visa Signature® Card";
  } else if (name.includes("active cash")) {
    src = CARD_ART.activeCash;
    label = "Wells Fargo Active Cash® Visa® Card";
  } else if (name.includes("reflect")) {
    src = CARD_ART.reflect;
    label = "Wells Fargo Reflect® Visa® Card";
  } else if (name.includes("signify")) {
    src = CARD_ART.signify;
    label = "Signify Business Cash® Mastercard®";
  }

  return { src, alt: `${label} ending in ${card.last4}`, label, kind };
}

/** All card rows for a profile, sorted debit first and with art attached. */
export function sortCards<T extends { card: CardRow }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aDebit = getCardArt(a.card).kind === "Debit Card" ? 0 : 1;
    const bDebit = getCardArt(b.card).kind === "Debit Card" ? 0 : 1;
    return aDebit - bDebit || a.card.id - b.card.id;
  });
}

"use client";

import { Check, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type PaymentFlowKind = "transfer" | "zelle" | "billpay" | "deposit";

export type PaymentFlowConfig = {
  kind: PaymentFlowKind;
  title: string;
  subtitle?: string;
  amount: string;
  fromLabel: string;
  toLabel: string;
  recipientInitials?: string;
};

type FlowState = PaymentFlowConfig & {
  open: boolean;
  stage: "processing" | "success";
  reference: string;
  completedAt: string;
};

const IDLE: FlowState = {
  open: false,
  stage: "processing",
  kind: "transfer",
  title: "",
  amount: "",
  fromLabel: "",
  toLabel: "",
  reference: "",
  completedAt: "",
};

const PROCESS_STEPS = ["Encrypting payment details…", "Verifying accounts…", "Posting securely…"];

function makeReference(kind: PaymentFlowKind) {
  const prefix = kind === "zelle" ? "ZL" : kind === "billpay" ? "BP" : kind === "deposit" ? "MD" : "TR";
  return `${prefix}-${Math.floor(100000000 + Math.random() * 900000000)}`;
}

const MIN_PROCESS_MS = 2000;

export function usePaymentFlow() {
  const [flow, setFlow] = useState<FlowState>(IDLE);

  async function run<T>(config: PaymentFlowConfig, task: () => Promise<T>): Promise<T> {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFlow({ ...config, open: true, stage: "processing", reference: "", completedAt: "" });
    const started = Date.now();
    const result = await task();
    const remaining = Math.max(0, (reduced ? 350 : MIN_PROCESS_MS) - (Date.now() - started));
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    setFlow((prev) => ({
      ...prev,
      stage: "success",
      reference: makeReference(config.kind),
      completedAt: new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }));
    return result;
  }

  function close() {
    setFlow((prev) => ({ ...prev, open: false }));
  }

  return { flow, run, close };
}

export function PaymentFlowModal({ state, onClose }: { state: FlowState; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!state.open || state.stage !== "processing") {
      setStepIndex(0);
      return;
    }
    const timer = window.setInterval(
      () => setStepIndex((s) => (s + 1) % PROCESS_STEPS.length),
      680,
    );
    return () => window.clearInterval(timer);
  }, [state.open, state.stage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && state.stage === "success") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.stage, onClose]);

  const successCopy = useMemo(() => {
    switch (state.kind) {
      case "zelle":
        return { headline: "Money sent with Zelle®", note: "Your recipient will be notified within minutes." };
      case "billpay":
        return { headline: "Payment scheduled", note: "You'll receive an alert when the payment posts." };
      case "deposit":
        return { headline: "Check deposited", note: "Funds are credited to your available balance now." };
      default:
        return { headline: "Transfer complete", note: "Balances were updated instantly across both accounts." };
    }
  }, [state.kind]);

  if (!state.open) return null;

  const processing = state.stage === "processing";

  return (
    <div
      className="wfo-flow-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={processing ? "Processing payment" : "Payment confirmation"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && state.stage === "success") onClose();
      }}
    >
      <div className={`wfo-flow-modal ${state.stage}`}>
        {state.stage === "success" && (
          <button type="button" className="wfo-flow-close" aria-label="Close confirmation" onClick={onClose}>
            <X size={17} />
          </button>
        )}

        <div className="wfo-flow-brand">
          <img src="/images/wf-logo-220.png" alt="Wells Fargo" width="132" height="14" />
        </div>

        {processing ? (
          <div className="wfo-flow-processing">
            {state.kind === "zelle" ? (
              <div className="wfo-zelle-flight" aria-hidden="true">
                <span className="wfo-zelle-dot from">{(state.fromLabel || "WF")[0].toUpperCase()}</span>
                <span className="wfo-zelle-path">
                  <span className="wfo-zelle-plane">
                    <Send size={20} />
                  </span>
                </span>
                <span className="wfo-zelle-dot to">{(state.recipientInitials || state.toLabel || "R")[0].toUpperCase()}</span>
              </div>
            ) : state.kind === "deposit" ? (
              <div className="wfo-deposit-slot" aria-hidden="true">
                <span className="wfo-deposit-check" />
                <span className="wfo-deposit-line" />
              </div>
            ) : (
              <svg className="wfo-flow-spinner" viewBox="0 0 96 96" aria-hidden="true">
                <circle className="wfo-flow-ring" cx="48" cy="48" r="40" />
                <circle className="wfo-flow-arc" cx="48" cy="48" r="40" />
              </svg>
            )}
            <strong className="wfo-flow-processing-title">
              {state.kind === "deposit" ? "Depositing your check" : state.kind === "zelle" ? "Sending money securely" : "Processing your request"}
            </strong>
            <span className="wfo-flow-processing-sub">{state.amount}</span>
            <div className="wfo-flow-step" role="status" aria-live="polite">
              <span className="wfo-flow-step-dot" />
              {PROCESS_STEPS[stepIndex]}
            </div>
            <div className="wfo-flow-progress">
              <span />
            </div>
            <p className="wfo-flow-hint">Do not close or refresh while we complete this request.</p>
          </div>
        ) : (
          <div className="wfo-flow-success">
            <div className="wfo-flow-check-wrap" aria-hidden="true">
              <svg viewBox="0 0 96 96" className="wfo-flow-check-svg">
                <circle className="wfo-flow-check-circle" cx="48" cy="48" r="40" pathLength={100} />
                <path className="wfo-flow-check-mark" d="M31 49.5 43 61.5 66 36" pathLength={100} />
              </svg>
              <span className="wfo-flow-pulse" />
              <span className="wfo-flow-pulse delay" />
            </div>
            <h2>{successCopy.headline}</h2>
            <p className="wfo-flow-success-note">{successCopy.note}</p>

            <div className="wfo-flow-receipt">
              <div className="wfo-flow-receipt-amount">
                <span>Amount</span>
                <strong>{state.amount}</strong>
              </div>
              <div className="wfo-flow-receipt-row">
                <span>From</span>
                <strong>{state.fromLabel}</strong>
              </div>
              <div className="wfo-flow-receipt-row">
                <span>To</span>
                <strong>{state.toLabel}</strong>
              </div>
              <div className="wfo-flow-receipt-row">
                <span>Confirmation #</span>
                <strong>{state.reference}</strong>
              </div>
              <div className="wfo-flow-receipt-row">
                <span>Completed</span>
                <strong>{state.completedAt}</strong>
              </div>
            </div>

            <button type="button" className="wfo-flow-done" onClick={onClose}>
              <Check size={17} /> Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

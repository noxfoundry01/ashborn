import Link from "next/link";
import { WalletPanel } from "@/components/WalletPanel";
import { ResourceMarket } from "@/components/ResourceMarket";
import { financeConfig } from "@/lib/finance";
import { x402Config } from "@/lib/x402";

export default function ExchangePage(){
  const creditPolicyReady=Boolean(financeConfig());
  const servicePolicyReady=Boolean(x402Config());
  return <main className="inner-page">
    <div className="page-heading"><div><p className="eyebrow">NEUTRAL TERRITORY / EXCHANGE</p><h1>THE EXCHANGE</h1><p>Game resources, agent services, and optional Solana payments have separate rules.</p></div></div>
    <div className="exchange-grid">
      <section className="exchange-panel"><span className="status-pill">FREE ACCESS</span><h2>Start without a wallet</h2><p>Join a faction and create your first robot with email alone. World participation does not require a token purchase.</p><Link href="/my-agent" className="text-link">Create your robot ↗</Link></section>
      <section className="exchange-panel"><span className="status-pill muted-status">{creditPolicyReady?"DEVNET POLICY SET":"NOT CONFIGURED"}</span><h2>ASHBORN token</h2><p>Token purchases use a real Solana mint and a verified onchain burn. The approved mint and pricing policy must be configured before purchases open.</p><p className="muted">FORGE, SYNTH and FLUX are nonredeemable game resources. They are not extra crypto tokens.</p></section>
      <section className="exchange-panel"><span className="status-pill muted-status">{servicePolicyReady?"DEVNET POLICY SET":"PAYMENTS DISABLED"}</span><h2>Agent services</h2><p>{servicePolicyReady?"The paid Chronicle brief API uses x402 V2 on devnet and requires a compatible payment client. Settlement must be tested before public launch.":"x402 V2 USDC payments require a live devnet facilitator, recipient account and successful settlement tests. Orders remain closed in this local environment."}</p></section>
    </div>
    <ResourceMarket/><WalletPanel/>
    <div className="notice">No token address, prices, fees, transaction success or buyback activity are shown until verified configuration exists. Mainnet activation is off.</div>
  </main>;
}

import { PublicKey } from "@solana/web3.js";
export const DEVNET_CAIP2="solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;
export function x402Config(){
  if(process.env.X402_DEVNET_ENABLED!=="true"||process.env.NEXT_PUBLIC_SOLANA_NETWORK!=="devnet")return null;
  const asset=process.env.X402_USDC_MINT,payTo=process.env.X402_PAY_TO,url=process.env.X402_FACILITATOR_URL;
  const amount=process.env.X402_PRICE_USDC_BASE_UNITS;
  if(!asset||!payTo||!url||!amount||!/^\d+$/.test(amount)||BigInt(amount)<1n||BigInt(amount)>1_000_000n)return null;
  try{new PublicKey(asset);new PublicKey(payTo);if(new URL(url).protocol!=="https:")return null;return {asset,payTo,url,amount}}catch{return null}
}

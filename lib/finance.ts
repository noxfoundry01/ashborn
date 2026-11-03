import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
export function parseTokenUnits(value: string, decimals: number): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value) || decimals<0 || decimals>9) throw new Error("Invalid token rate");
  const [whole, fraction=""] = value.split(".");
  if (fraction.length>decimals) throw new Error("Token rate has too many decimals");
  return BigInt(whole)*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,"0")||"0");
}
export function financeConfig() {
  if (process.env.FINANCE_DEVNET_ENABLED!=="true" || process.env.NEXT_PUBLIC_SOLANA_NETWORK!=="devnet") return null;
  const mint=process.env.NEXT_PUBLIC_ASHBORN_MINT;
  const decimals=Number(process.env.ASHBORN_MINT_DECIMALS);
  const bps=Number(process.env.ASHBORN_BURN_BPS);
  const rate=process.env.ASHBORN_TOKENS_PER_100_CREDITS;
  const treasury=process.env.ASHBORN_TREASURY_TOKEN_ACCOUNT;
  if (!mint || !rate || !Number.isInteger(decimals) || decimals<0 || decimals>9 || !Number.isInteger(bps) || bps<1 || bps>10000) return null;
  try {
    new PublicKey(mint);
    const amount=parseTokenUnits(rate,decimals);
    const burn=amount*BigInt(bps)/10000n;
    if (amount<=0n || burn<=0n || amount>BigInt(Number.MAX_SAFE_INTEGER)) return null;
    if (burn<amount) { if (!treasury) return null; new PublicKey(treasury); }
    return {mint,decimals,bps,amount,burn,treasuryAmount:amount-burn,treasury:treasury??null,rate};
  } catch { return null; }
}
export const signatureSchema=z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/);

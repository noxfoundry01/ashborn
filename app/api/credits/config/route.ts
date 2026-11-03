import { NextResponse } from "next/server";
import { financeConfig } from "@/lib/finance";
import { isPaused } from "@/lib/controls";
export const dynamic="force-dynamic";
export async function GET(){const c=financeConfig();const enabled=c&&!await isPaused("finance_paused");return NextResponse.json(enabled?{enabled:true,network:"devnet",mint:c.mint,decimals:c.decimals,token_amount:c.amount.toString(),burn_amount:c.burn.toString(),treasury_amount:c.treasuryAmount.toString(),burn_bps:c.bps,credits:100}:{enabled:false,network:"devnet"})}

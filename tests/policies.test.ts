import { describe, expect, it } from "vitest";
import { validateLeaderProposal } from "../lib/agent-runtime";
import { parseTokenUnits } from "../lib/finance";
import { chatSchema, profileSchema, soulSchema, soulUpdateSchema } from "../lib/validation";
import { DEVNET_GENESIS_HASH, requireDevnetGenesis } from "../lib/solana-network";
import { getBurnCheckedInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";
import { associatedTokenAddress, legacyInstruction } from "../lib/token-program";
import { resourceOrderSchema } from "../lib/resources";
import { workerAuthorized } from "../lib/worker-auth";

describe("server input boundaries", () => {
  it("rejects malformed Soul Core values and accepts a free starter", () => {
    const starter={name:"Aster",chassis:"weaver",profession:"researcher",value:"knowledge",motivation:"Restore the island archive",curiosity:65,ambition:40,sociability:55,caution:70,public_chat:false};
    expect(soulSchema.safeParse(starter).success).toBe(true);
    expect(soulSchema.safeParse({...starter,curiosity:101}).success).toBe(false);
    expect(soulSchema.safeParse({...starter,name:"<script>"}).success).toBe(false);
  });
  it("accepts only bounded guidance fields for a Soul Core revision", () => {
    const revision={value:"knowledge",motivation:"Preserve a reliable record of the island",curiosity:70,ambition:40,sociability:55,caution:65};
    expect(soulUpdateSchema.safeParse(revision).success).toBe(true);
    expect(soulUpdateSchema.safeParse({...revision,caution:-1}).success).toBe(false);
    expect(soulUpdateSchema.safeParse({...revision,owner_id:"another-user"}).success).toBe(false);
  });
  it("limits public identity and chat length", () => {
    expect(profileSchema.safeParse({display_name:"Island Citizen",faction:"eden"}).success).toBe(true);
    expect(profileSchema.safeParse({display_name:"X",faction:"eden"}).success).toBe(false);
    expect(chatSchema.safeParse({body:"x".repeat(501)}).success).toBe(false);
  });
  it("rejects cross-faction or invented model actions", () => {
    expect(validateLeaderProposal("obsidian",{action:"fortify",note:"Protect the foundry"}).action).toBe("fortify");
    expect(()=>validateLeaderProposal("eden",{action:"fortify",note:"Try another faction"})).toThrow();
    expect(()=>validateLeaderProposal("havoc",{action:"transfer_tokens",note:"Spend money"})).toThrow();
  });
  it("parses exact token units without float rounding", () => {
    expect(parseTokenUnits("1.25",6)).toBe(1_250_000n);
    expect(()=>parseTokenUnits("1.0000001",6)).toThrow();
    expect(()=>parseTokenUnits("1e3",6)).toThrow();
  });
  it("checks the full Solana devnet genesis hash rather than its x402 chain ID", () => {
    expect(() => requireDevnetGenesis(DEVNET_GENESIS_HASH)).not.toThrow();
    expect(() => requireDevnetGenesis(DEVNET_GENESIS_HASH.slice(0,32))).toThrow();
  });
  it("builds a wallet-signed burn instruction with the exact base units", async () => {
    const owner=new PublicKey("11111111111111111111111111111111");
    const mint=new PublicKey("So11111111111111111111111111111111111111112");
    const source=await associatedTokenAddress(mint,owner);
    const ix=legacyInstruction(getBurnCheckedInstruction({account:address(source.toBase58()),mint:address(mint.toBase58()),authority:{address:address(owner.toBase58()),role:2},amount:1_250_000n,decimals:6}));
    expect(ix.programId.toBase58()).toBe(TOKEN_PROGRAM_ADDRESS);
    expect(ix.keys.map(key=>key.isSigner)).toEqual([false,false,true]);
    expect(ix.keys[0].isWritable).toBe(true);
    expect(ix.data[0]).toBe(15);
    expect(new DataView(ix.data.buffer,ix.data.byteOffset,ix.data.byteLength).getBigUint64(1,true)).toBe(1_250_000n);
    expect(ix.data[9]).toBe(6);
  });
  it("requires an idempotency key and bounded resource quantity", () => {
    const order={request_id:"550e8400-e29b-41d4-a716-446655440000",resource_key:"forge",quantity:1};
    expect(resourceOrderSchema.safeParse(order).success).toBe(true);
    expect(resourceOrderSchema.safeParse({...order,quantity:11}).success).toBe(false);
    expect(resourceOrderSchema.safeParse({...order,resource_key:"sol"}).success).toBe(false);
    expect(resourceOrderSchema.safeParse({...order,request_id:"abc"}).success).toBe(false);
  });
  it("accepts only an exact worker bearer secret of sufficient length", () => {
    const secret="development-secret-with-32-characters";
    expect(workerAuthorized(`Bearer ${secret}`,secret)).toBe(true);
    expect(workerAuthorized(`Bearer ${secret}x`,secret)).toBe(false);
    expect(workerAuthorized("Bearer short","short")).toBe(false);
    expect(workerAuthorized("Bearer undefined",undefined)).toBe(false);
  });
});

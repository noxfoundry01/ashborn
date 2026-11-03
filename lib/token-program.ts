import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { address, type ReadonlyUint8Array } from "@solana/kit";
import { findAssociatedTokenPda, getMintDecoder, getTokenDecoder, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";

const tokenProgram = new PublicKey(TOKEN_PROGRAM_ADDRESS);

export async function associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  const [pda] = await findAssociatedTokenPda({mint: address(mint.toBase58()), owner: address(owner.toBase58()), tokenProgram: TOKEN_PROGRAM_ADDRESS});
  return new PublicKey(pda);
}

export async function verifiedMint(rpc: Connection, mint: PublicKey) {
  const account = await rpc.getAccountInfo(mint, "confirmed");
  if (!account || !account.owner.equals(tokenProgram)) throw new Error("Invalid token mint program");
  const decoded = getMintDecoder().decode(account.data);
  if (!decoded.isInitialized) throw new Error("Mint is not initialized");
  return decoded;
}

export async function verifiedTokenAccount(rpc: Connection, tokenAccount: PublicKey) {
  const account = await rpc.getAccountInfo(tokenAccount, "confirmed");
  if (!account || !account.owner.equals(tokenProgram)) throw new Error("Invalid token account program");
  return getTokenDecoder().decode(account.data);
}

export function legacyInstruction(instruction: {programAddress: string; accounts?: readonly {address: string; role: number}[]; data?: ReadonlyUint8Array}) {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys: (instruction.accounts ?? []).map(({address: account, role}) => ({pubkey: new PublicKey(account), isWritable: (role & 1) !== 0, isSigner: (role & 2) !== 0})),
    data: instruction.data ? Uint8Array.from(instruction.data) : new Uint8Array(),
  });
}

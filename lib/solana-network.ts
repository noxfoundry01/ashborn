export const DEVNET_GENESIS_HASH="EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export function requireDevnetGenesis(hash:string){if(hash!==DEVNET_GENESIS_HASH)throw new Error("RPC is not Solana devnet")}

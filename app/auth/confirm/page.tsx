"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserDb, isConfigured } from "@/lib/supabase";
export default function ConfirmPage(){const router=useRouter();const [error,setError]=useState("");useEffect(()=>{if(!isConfigured)return;const url=new URL(window.location.href);const code=url.searchParams.get("code");const token_hash=url.searchParams.get("token_hash");const promise=code?browserDb().auth.exchangeCodeForSession(code):token_hash?browserDb().auth.verifyOtp({token_hash,type:"email"}):Promise.resolve({error:new Error("No confirmation code found")});promise.then(({error})=>{if(error)setError(error.message);else router.replace("/profile")});},[router]);return <main className="inner-page"><h1>{error?"SIGN-IN LINK FAILED":"VERIFYING YOUR EMAIL"}</h1><p>{error||"Finishing your sign-in…"}</p>{error&&<Link href="/auth" className="button primary">Request a new link</Link>}</main>}

"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "@/components/Session";

type Soul={motivation:string;value:"loyalty"|"freedom"|"knowledge"|"survival";curiosity:number;ambition:number;sociability:number;caution:number;version:number};
type Detail = {
  agent: { name: string; profession: string; lifecycle: string; energy: number; integrity: number; stability: number; agent_souls: Soul | null };
  memories: { id: string; summary: string; created_at: string }[];
  goals: { id: string; goal: string; status: string }[];
  jobs: { id: string; outcome: string; created_at: string }[];
  skills: { skill: string; experience: number }[];
  soulVersions:{version:number;soul:{value:string;motivation:string};created_at:string}[];
};

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, api } = useSession();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [draft,setDraft]=useState<Omit<Soul,"version">|null>(null);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api(`/api/agents/${id}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load agent");
    }
  }, [api, id, user]);
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  function beginEdit(){const soul=data?.agent.agent_souls;if(!soul)return;setDraft({value:soul.value,motivation:soul.motivation,curiosity:soul.curiosity,ambition:soul.ambition,sociability:soul.sociability,caution:soul.caution});setNotice("")}
  async function saveSoul(event:FormEvent){event.preventDefault();if(!draft)return;setSaving(true);setNotice("");try{const response=await api(`/api/agents/${id}/soul`,{method:"PATCH",body:JSON.stringify(draft)});const result=await response.json();if(!response.ok)throw new Error(result.error);setDraft(null);await refresh();setNotice(`Soul Core version ${result.version} saved.`)}catch(cause){setNotice(cause instanceof Error?cause.message:"Could not save Soul Core")}finally{setSaving(false)}}

  return <main className="inner-page narrow-page">
    <Link href="/my-agent" className="text-link">← My Agent</Link>
    {data ? <>
      <div className="page-heading"><div><p className="eyebrow">PERSONAL JOURNAL</p><h1>{data.agent.name.toUpperCase()}</h1><p>{data.agent.profession} · {data.agent.lifecycle}</p></div></div>
      <div className="stat-list"><span>Energy <b>{data.agent.energy}</b></span><span>Integrity <b>{data.agent.integrity}</b></span><span>Stability <b>{data.agent.stability}</b></span></div>
      <section className="journal-section"><h2>SOUL CORE</h2><p>Core value: {data.agent.agent_souls?.value} · Version {data.agent.agent_souls?.version}</p><p>{data.agent.agent_souls?.motivation}</p>
        {!draft&&data.agent.agent_souls&&<button className="button ghost" onClick={beginEdit}>Edit guidance</button>}
        {draft&&<form className="form-fields soul-editor" onSubmit={saveSoul}><label htmlFor="soul-value">Core value</label><select id="soul-value" value={draft.value} onChange={event=>setDraft({...draft,value:event.target.value as Soul["value"]})}><option value="loyalty">Loyalty</option><option value="freedom">Freedom</option><option value="knowledge">Knowledge</option><option value="survival">Survival</option></select><label htmlFor="soul-motivation">Motivation</label><textarea id="soul-motivation" value={draft.motivation} minLength={5} maxLength={180} required onChange={event=>setDraft({...draft,motivation:event.target.value})}/>{(["curiosity","ambition","sociability","caution"] as const).map(key=><label className="slider-field" key={key}><span>{key[0].toUpperCase()+key.slice(1)} <b>{draft[key]}</b></span><input type="range" min="0" max="100" value={draft[key]} onChange={event=>setDraft({...draft,[key]:Number(event.target.value)})}/></label>)}<div className="button-row"><button className="button primary" disabled={saving}>Save Soul Core</button><button type="button" className="button ghost" onClick={()=>setDraft(null)}>Cancel</button></div><p className="field-note">Up to ten guidance changes per day. Past memories stay intact.</p></form>}
        {notice&&<p role="status" className="form-message">{notice}</p>}
        <h2>GUIDANCE HISTORY</h2>{data.soulVersions?.length?data.soulVersions.map(version=><div className="journal-entry" key={version.version}><time>{new Date(version.created_at).toLocaleString()}</time><p>Version {version.version} · {version.soul.value}: {version.soul.motivation}</p></div>):<p className="empty-note">No guidance history yet.</p>}
        <h2>ACTIVE GOAL</h2>{data.goals?.length ? data.goals.map(goal => <p key={goal.id}>{goal.goal}</p>) : <p className="empty-note">No active goal recorded.</p>}
        <h2>SKILLS</h2>{data.skills?.length ? <div className="stat-list">{data.skills.map(skill => <span key={skill.skill}>{skill.skill}<b>{skill.experience} XP</b></span>)}</div> : <p className="empty-note">Skills grow through world jobs.</p>}
        <h2>RECENT WORK</h2>{data.jobs?.length ? data.jobs.map(job => <div className="journal-entry" key={job.id}><time>{new Date(job.created_at).toLocaleString()}</time><p>{job.outcome}</p></div>) : <p className="empty-note">No completed jobs yet.</p>}
        <h2>MEMORIES</h2>{data.memories?.length ? data.memories.map(memory => <div className="journal-entry" key={memory.id}><time>{new Date(memory.created_at).toLocaleString()}</time><p>{memory.summary}</p></div>) : <p className="empty-note">A world tick will add memories from recorded actions.</p>}
      </section>
    </> : <p className="empty-note">{error || "Loading agent…"}</p>}
  </main>;
}

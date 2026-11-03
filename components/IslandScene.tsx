"use client";
import { useEffect, useRef, useState } from "react";
import { factions, landmarks, type WorldAgent } from "@/lib/world";
type Selection = { kind: "landmark"; id: string } | { kind: "agent"; id: string };
export function IslandScene({ agents }: { agents: WorldAgent[] }) {
  const mount = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "landmark", id: "core" });
  useEffect(() => {
    const host = mount.current; if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const { Application, Container, Graphics, Text } = await import("pixi.js");
      if (disposed) return;
      const app = new Application();
      await app.init({ resizeTo: host, background: "#0b1720", antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
      if (disposed) { app.destroy(true); return; }
      host.appendChild(app.canvas);
      const world = new Container(); app.stage.addChild(world);
      const sea = new Graphics().rect(0, 0, 1000, 700).fill(0x0b1922);
      world.addChild(sea);
      for (let i = 0; i < 12; i++) world.addChild(new Graphics().moveTo(0, 60 + i * 53).bezierCurveTo(280, 30 + i * 52, 600, 95 + i * 51, 1000, 52 + i * 54).stroke({ color: 0x315061, width: 1, alpha: .26 }));
      const coast = [[398,60],[566,48],[724,100],[850,194],[898,314],[872,452],[774,593],[620,642],[472,627],[319,573],[195,454],[146,310],[220,177]] as [number,number][];
      function polygon(points: [number,number][], color: number, alpha=1) { const g = new Graphics(); points.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath().fill({ color, alpha }); world.addChild(g); return g; }
      polygon(coast.map(([x,y]) => [x+8,y+17]),0x02070a,.54);
      const island = polygon(coast,0x3a4645); island.stroke({color:0xb2aaa0,width:4,alpha:.62});
      polygon([[398,60],[566,48],[516,345],[451,420],[319,573],[195,454],[146,310],[220,177]],0x282f35,.95);
      polygon([[566,48],[724,100],[850,194],[898,314],[872,452],[650,469],[516,345]],0xa8aba5,.88);
      polygon([[451,420],[516,345],[650,469],[872,452],[774,593],[620,642],[472,627],[319,573]],0x713c36,.94);
      const ridge = new Graphics().moveTo(245,268).lineTo(430,162).lineTo(543,248).lineTo(660,154).lineTo(823,264).stroke({color:0x151e25,width:24,alpha:.35}); world.addChild(ridge);
      const road = new Graphics().moveTo(290,300).lineTo(510,364).lineTo(704,290).moveTo(510,364).lineTo(597,527).lineTo(428,539).stroke({color:0xd0ab76,width:9,alpha:.52}); world.addChild(road);
      world.addChild(new Graphics().circle(510,364,48).fill(0x1f2427).stroke({color:0xe99559,width:4}));
      world.addChild(new Graphics().circle(510,364,24).fill({color:0xe7763d,alpha:.9}));
      for (const [i, landmark] of landmarks.entries()) {
        const x = landmark.x*10, y=landmark.y*7;
        if (landmark.id !== "core") {
          const shadow = new Graphics().ellipse(x,y+13,32,11).fill({color:0x111719,alpha:.55}); world.addChild(shadow);
          const building = new Graphics().moveTo(x-26,y+6).lineTo(x-26,y-22).lineTo(x,y-37).lineTo(x+26,y-22).lineTo(x+26,y+6).lineTo(x,y+20).closePath().fill(landmark.faction === "eden" ? 0xd6d3c8 : landmark.faction === "havoc" ? 0xb75d4a : 0x191d21).stroke({color:0xd5c6ac,width:2,alpha:.8}); world.addChild(building);
          world.addChild(new Graphics().moveTo(x,y-37).lineTo(x,y+20).stroke({color:0x172026,width:2,alpha:.45}));
        }
        const hit = new Graphics().circle(x,y,landmark.id === "core" ? 48 : 38).fill({color:0xffffff,alpha:.001}); hit.eventMode="static"; hit.cursor="pointer"; hit.on("pointertap",()=>setSelection({kind:"landmark",id:landmark.id})); world.addChild(hit);
        const label = new Text({text:landmark.name.toUpperCase(),style:{fontFamily:"Arial",fontSize:13,fontWeight:"bold",fill:0xf2eee5,letterSpacing:2}}); label.anchor.set(.5,0); label.position.set(x,y+29); world.addChild(label);
        if (i===0 || i===1 || i===4) { const district = new Text({text:landmark.faction!.toUpperCase(),style:{fontFamily:"Arial",fontSize:31,fontWeight:"bold",fill:landmark.faction === "eden" ? 0x22292c : 0xf3eee5,letterSpacing:4}}); district.anchor.set(.5); district.position.set(x,y-84); world.addChild(district); }
      }
      for (const agent of agents) {
        const x=Number(agent.x)*10, y=Number(agent.y)*7;
        const color = agent.faction === "eden" ? 0xf3f0e8 : agent.faction === "havoc" ? 0xe2765f : 0x9fa9b0;
        const marker = new Graphics().circle(x,y,agent.is_leader ? 12 : 7).fill(color).stroke({color:0x10151a,width:3}); marker.eventMode="static"; marker.cursor="pointer"; marker.on("pointertap",()=>setSelection({kind:"agent",id:agent.id})); world.addChild(marker);
        if (agent.is_leader) { const label=new Text({text:agent.name,style:{fontFamily:"Arial",fontSize:14,fontWeight:"bold",fill:0xffffff}}); label.anchor.set(.5,1); label.position.set(x,y-17); world.addChild(label); }
      }
      const fit = () => { const scale=Math.min(host.clientWidth/1000,host.clientHeight/700); world.scale.set(scale); world.position.set((host.clientWidth-1000*scale)/2,(host.clientHeight-700*scale)/2); };
      fit(); const observer=new ResizeObserver(fit); observer.observe(host);
      let down: {x:number;y:number; px:number;py:number}|null=null;
      const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY,px:world.x,py:world.y}; host.setPointerCapture(e.pointerId);};
      const pointerMove=(e:PointerEvent)=>{if(down){world.x=down.px+e.clientX-down.x;world.y=down.py+e.clientY-down.y;}};
      const pointerUp=()=>{down=null;};
      const wheel=(e:WheelEvent)=>{e.preventDefault(); const before=world.scale.x; const next=Math.max(.35,Math.min(2,before*(e.deltaY>0?.9:1.1))); const rect=host.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;world.position.set(mx-(mx-world.x)*next/before,my-(my-world.y)*next/before);world.scale.set(next);};
      host.addEventListener("pointerdown",pointerDown);host.addEventListener("pointermove",pointerMove);host.addEventListener("pointerup",pointerUp);host.addEventListener("pointercancel",pointerUp);host.addEventListener("wheel",wheel,{passive:false});
      cleanup=()=>{observer.disconnect();host.removeEventListener("pointerdown",pointerDown);host.removeEventListener("pointermove",pointerMove);host.removeEventListener("pointerup",pointerUp);host.removeEventListener("pointercancel",pointerUp);host.removeEventListener("wheel",wheel);app.destroy(true,{children:true});};
    })();
    return ()=>{disposed=true;cleanup();};
  }, [agents]);
  const landmark = selection.kind === "landmark" ? landmarks.find(l=>l.id===selection.id) : null;
  const agent = selection.kind === "agent" ? agents.find(a=>a.id===selection.id) : null;
  return <div className="island-layout"><div className="scene-block"><div className="scene-toolbar"><span>◉ LIVE WORLD STATE</span><span>DRAG TO PAN · SCROLL TO ZOOM</span></div><div ref={mount} className="island-canvas" role="img" aria-label="Interactive map of the ASHBORN island; use the location list below for keyboard selection"/><div className="scene-access"><strong>Locations</strong><div>{landmarks.map(l=><button key={l.id} onClick={()=>setSelection({kind:"landmark",id:l.id})}>{l.name}</button>)}</div><strong>Citizens</strong><div>{agents.slice(0,30).map(a=><button key={a.id} onClick={()=>setSelection({kind:"agent",id:a.id})}>{a.name}</button>)}</div></div></div><aside className="scene-detail" aria-live="polite">{landmark ? <><p className="eyebrow">LANDMARK / {landmark.faction?.toUpperCase() ?? "NEUTRAL"}</p><h2>{landmark.name}</h2><p>{landmark.detail}</p><p className="muted">Coordinates {landmark.x}° / {landmark.y}°</p></> : agent ? <><p className="eyebrow">{agent.is_leader ? "FACTION LEADER" : "ISLAND CITIZEN"}</p><h2>{agent.name}</h2><span className={`badge ${agent.faction}`}>{factions[agent.faction].name}</span><p>{agent.profession} · {agent.lifecycle}</p><div className="stat-list"><span>Energy <b>{agent.energy}</b></span><span>Integrity <b>{agent.integrity}</b></span><span>Stability <b>{agent.stability}</b></span></div><p className="muted">Position and stats come from persisted world state.</p></> : <p>Select a location or citizen.</p>}</aside></div>;
}

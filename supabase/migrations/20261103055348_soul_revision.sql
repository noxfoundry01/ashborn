-- Owners may revise guidance without rewriting past memories or public history.
create or replace function public.revise_user_soul(
  p_user uuid,p_agent uuid,p_value text,p_motivation text,
  p_curiosity integer,p_ambition integer,p_sociability integer,p_caution integer
) returns integer language plpgsql security invoker set search_path=public as $$
declare a record; s record; v_version integer; v_soul jsonb;
begin
  if p_value is null or p_value not in ('loyalty','freedom','knowledge','survival')
    or p_motivation is null or char_length(trim(p_motivation)) not between 5 and 180
    or p_curiosity is null or p_curiosity not between 0 and 100
    or p_ambition is null or p_ambition not between 0 and 100
    or p_sociability is null or p_sociability not between 0 and 100
    or p_caution is null or p_caution not between 0 and 100
  then raise exception 'Invalid Soul Core'; end if;
  select id,name,faction into a from public.agents where id=p_agent and owner_id=p_user for update;
  if not found then raise exception 'Agent not found'; end if;
  select * into s from public.agent_souls where agent_id=p_agent for update;
  if not found then raise exception 'Soul Core not found'; end if;
  if s.value=p_value and s.motivation=trim(p_motivation) and s.curiosity=p_curiosity
    and s.ambition=p_ambition and s.sociability=p_sociability and s.caution=p_caution
  then return s.version; end if;
  if (select count(*) from public.agent_soul_versions where agent_id=p_agent and version>1 and created_at>now()-interval '1 day')>=10
  then raise exception 'Soul Core edit limit'; end if;
  v_version:=s.version+1;
  v_soul:=jsonb_build_object('value',p_value,'motivation',trim(p_motivation),'curiosity',p_curiosity,
    'ambition',p_ambition,'sociability',p_sociability,'caution',p_caution);
  update public.agent_souls set version=v_version,value=p_value,motivation=trim(p_motivation),
    curiosity=p_curiosity,ambition=p_ambition,sociability=p_sociability,caution=p_caution,updated_at=now()
    where agent_id=p_agent;
  insert into public.agent_soul_versions(agent_id,version,soul,changed_by)
    values(p_agent,v_version,v_soul,p_user);
  insert into public.world_events(agent_id,agent_name,faction,kind,description,provenance,event_key)
    values(p_agent,a.name,a.faction,'soul_revision',a.name||' revised their Soul Core guidance.',
      'user_action','soul:'||p_agent::text||':'||v_version::text);
  return v_version;
end $$;
revoke all on function public.revise_user_soul(uuid,uuid,text,text,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.revise_user_soul(uuid,uuid,text,text,integer,integer,integer,integer) to service_role;

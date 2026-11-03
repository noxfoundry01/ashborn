-- These functions run only through authenticated server routes with the service role.
-- Database transactions make a partial Soul Core or duplicate chat send impossible.
create or replace function public.create_user_agent(
  p_user uuid, p_name text, p_chassis text, p_profession text,
  p_value text, p_motivation text, p_curiosity integer,
  p_ambition integer, p_sociability integer, p_caution integer,
  p_public_chat boolean
) returns uuid language plpgsql security invoker set search_path=public as $$
declare f text; agent_id uuid; px numeric; py numeric; soul_record jsonb;
begin
  select faction into f from public.profiles where id=p_user;
  if f is null then raise exception 'Profile required'; end if;
  if char_length(p_name) not between 2 and 24 or p_name !~ '^[[:alnum:] _-]+$'
    or p_chassis not in ('sentinel','weaver','ranger')
    or p_profession not in ('engineer','researcher','scout','courier','medic')
    or p_value not in ('loyalty','freedom','knowledge','survival')
    or char_length(p_motivation) not between 5 and 180
    or p_curiosity not between 0 and 100 or p_ambition not between 0 and 100
    or p_sociability not between 0 and 100 or p_caution not between 0 and 100
  then raise exception 'Invalid Soul Core'; end if;
  px := case f when 'obsidian' then 29 when 'eden' then 70 else 42 end;
  py := case f when 'obsidian' then 37 when 'eden' then 35 else 74 end;
  insert into public.agents(owner_id,name,faction,profession,chassis,public_chat,x,y)
  values(p_user,p_name,f,p_profession,p_chassis,p_public_chat,px,py) returning id into agent_id;
  insert into public.agent_souls(agent_id,value,motivation,curiosity,ambition,sociability,caution)
  values(agent_id,p_value,p_motivation,p_curiosity,p_ambition,p_sociability,p_caution);
  soul_record := jsonb_build_object('value',p_value,'motivation',p_motivation,'curiosity',p_curiosity,'ambition',p_ambition,'sociability',p_sociability,'caution',p_caution);
  insert into public.agent_soul_versions(agent_id,version,soul,changed_by)
  values(agent_id,1,soul_record,p_user);
  insert into public.agent_goals(agent_id,goal) values(agent_id,p_motivation);
  insert into public.agent_skills(agent_id,skill) values(agent_id,p_profession);
  insert into public.world_events(agent_id,agent_name,faction,kind,description,provenance,event_key)
  values(agent_id,p_name,f,'awakening',p_name || ' awakened in ' || initcap(f) || '.','user_action','awakening:' || agent_id::text);
  return agent_id;
end $$;
revoke all on function public.create_user_agent(uuid,text,text,text,text,text,integer,integer,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.create_user_agent(uuid,text,text,text,text,text,integer,integer,integer,integer,boolean) to service_role;

create or replace function public.send_human_chat(p_user uuid,p_body text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare identity_record record; message_id uuid;
begin
  if char_length(trim(p_body)) not between 1 and 500 then raise exception 'Invalid message'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 4902));
  select display_name,faction into identity_record from public.profiles where id=p_user;
  if not found then raise exception 'Profile required'; end if;
  if (select count(*) from public.chat_messages where user_id=p_user and created_at>now()-interval '10 seconds')>=2
    or (select count(*) from public.chat_messages where user_id=p_user and created_at>now()-interval '1 day')>=120
  then raise exception 'Chat rate limit'; end if;
  insert into public.chat_messages(user_id,display_name,faction,body)
  values(p_user,identity_record.display_name,identity_record.faction,trim(p_body)) returning id into message_id;
  return message_id;
end $$;
revoke all on function public.send_human_chat(uuid,text) from public, anon, authenticated;
grant execute on function public.send_human_chat(uuid,text) to service_role;

-- A paid quote records a faction. Keeping a saved identity's faction fixed
-- prevents credits and resources from being stranded by a concurrent change.
create or replace function public.prevent_faction_change()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.faction is distinct from old.faction then raise exception 'Faction is permanent after profile creation'; end if;
  return new;
end $$;
create trigger profiles_faction_lock before update on public.profiles
for each row execute function public.prevent_faction_change();

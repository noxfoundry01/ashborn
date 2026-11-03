-- A restrictive policy combines with the existing public identity policy.
-- Public chat stores display name and faction on each message.
create policy "Owner reads profile" on public.profiles as restrictive
  for select to authenticated
  using ((select auth.uid()) = id);
revoke select on public.profiles from anon;
grant select on public.profiles to authenticated;

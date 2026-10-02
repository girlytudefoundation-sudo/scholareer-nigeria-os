revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.is_school_member(uuid, uuid) from public, anon;
revoke execute on function public.school_is_operational(uuid) from public, anon;
revoke execute on function public.platform_owner_exists() from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.is_school_member(uuid, uuid) to authenticated;
grant execute on function public.school_is_operational(uuid) to authenticated;
grant execute on function public.platform_owner_exists() to authenticated;
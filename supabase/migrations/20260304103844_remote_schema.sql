drop extension if exists "pg_net";


  create policy "Parents can manage todo"
  on "public"."events"
  as permissive
  for all
  to public
using (((type = 'todo'::public.event_type) AND ((parent_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.family_connections fc
  WHERE ((fc.parent_id = auth.uid()) AND (fc.student_id = events.student_id))))) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'parent'::public.user_role))))));



  create policy "Users can view relevant events"
  on "public"."events"
  as permissive
  for select
  to public
using (((student_id = auth.uid()) OR (parent_id = auth.uid()) OR ((student_id IS NULL) AND (parent_id IS NULL)) OR (EXISTS ( SELECT 1
   FROM public.family_connections fc
  WHERE ((fc.parent_id = auth.uid()) AND (fc.student_id = events.student_id))))));



  create policy "Admins can delete family connections"
  on "public"."family_connections"
  as permissive
  for delete
  to public
using ((((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text));



  create policy "Parents can view their linked students profiles."
  on "public"."users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.family_connections
  WHERE ((family_connections.parent_id = auth.uid()) AND (family_connections.student_id = users.id)))));




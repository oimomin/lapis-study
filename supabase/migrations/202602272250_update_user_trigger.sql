-- Update the handle_new_user trigger to extract profile data from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (
    id, 
    email, 
    role, 
    first_name, 
    last_name, 
    school_name, 
    grade_level, 
    birthdate, 
    target_high_school
  )
  values (
    new.id, 
    new.email,
    case
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'::public.user_role
      when new.raw_user_meta_data->>'role' = 'parent' then 'parent'::public.user_role
      else 'student'::public.user_role
    end,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'school_name',
    new.raw_user_meta_data->>'grade_level',
    NULLIF(new.raw_user_meta_data->>'birthdate', '')::date,
    new.raw_user_meta_data->>'target_high_school'
  )
  on conflict (id) do update set
    role = excluded.role,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    school_name = excluded.school_name,
    grade_level = excluded.grade_level,
    birthdate = excluded.birthdate,
    target_high_school = excluded.target_high_school;
    
  return new;
end;
$$;

-- Supabase Auth User → public.users 자동 동기화 트리거
-- Supabase SQL Editor에서 실행하세요

-- 1. 새 사용자 생성 시 public.users에 추가하는 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, created_at)
  values (
    new.id,
    new.email,
    now()
  );
  return new;
end;
$$;

-- 2. auth.users INSERT 시 트리거 실행
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. 사용자 삭제 시 public.users에서도 삭제하는 함수 (선택사항)
create or replace function public.handle_delete_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.users where id = old.id;
  return old;
end;
$$;

-- 4. auth.users DELETE 시 트리거 실행
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute procedure public.handle_delete_user();

-- 5. 이메일 업데이트 동기화 (선택사항)
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.users
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_update();

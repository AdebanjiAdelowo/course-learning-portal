-- Functions used by the instructor area's quiz, question and lesson editors.
--
-- They run with the caller's privileges (security invoker), so row-level security still
-- applies; the explicit staff check only turns a silent "0 rows changed" into a clear error.

-- Saves a question together with its answer key in one transaction, so a question can never
-- be left without a key (which would make its quiz impossible to grade).
create function public.save_quiz_question(
  p_quiz_id uuid,
  p_question_id uuid,
  p_type public.question_type,
  p_prompt_md text,
  p_options jsonb,
  p_correct jsonb,
  p_explanation_md text,
  p_points integer
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only instructors can edit quizzes.' using errcode = '42501';
  end if;

  if p_question_id is null then
    insert into public.questions (quiz_id, position, type, prompt_md, options, points)
    values (
      p_quiz_id,
      coalesce((select max(q.position) from public.questions q where q.quiz_id = p_quiz_id), 0) + 1,
      p_type, p_prompt_md, p_options, p_points
    )
    returning id into v_id;
  else
    update public.questions q
    set type = p_type, prompt_md = p_prompt_md, options = p_options, points = p_points
    where q.id = p_question_id and q.quiz_id = p_quiz_id
    returning q.id into v_id;
    if v_id is null then
      raise exception 'That question does not belong to this quiz.' using errcode = 'P0002';
    end if;
  end if;

  insert into public.question_keys (question_id, correct, explanation_md)
  values (v_id, p_correct, p_explanation_md)
  on conflict (question_id) do update
    set correct = excluded.correct, explanation_md = excluded.explanation_md;

  return v_id;
end;
$$;

-- Swaps a question with its neighbour. p_direction < 0 moves it earlier, otherwise later.
-- Positions are unique per quiz, so the swap goes through a temporary out-of-range position.
create function public.move_quiz_question(p_question_id uuid, p_direction integer) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quiz uuid;
  v_position integer;
  v_other uuid;
  v_other_position integer;
begin
  if not public.is_staff() then
    raise exception 'Only instructors can edit quizzes.' using errcode = '42501';
  end if;

  select q.quiz_id, q.position into v_quiz, v_position
  from public.questions q where q.id = p_question_id;
  if v_quiz is null then return; end if;

  if p_direction < 0 then
    select q.id, q.position into v_other, v_other_position from public.questions q
    where q.quiz_id = v_quiz and q.position < v_position order by q.position desc limit 1;
  else
    select q.id, q.position into v_other, v_other_position from public.questions q
    where q.quiz_id = v_quiz and q.position > v_position order by q.position asc limit 1;
  end if;
  if v_other is null then return; end if;

  update public.questions set position = v_position + 1000000 where id = p_question_id;
  update public.questions set position = v_position where id = v_other;
  update public.questions set position = v_other_position where id = p_question_id;
end;
$$;

-- The same swap for lessons within their module.
create function public.move_lesson(p_lesson_id uuid, p_direction integer) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_module uuid;
  v_position integer;
  v_other uuid;
  v_other_position integer;
begin
  if not public.is_staff() then
    raise exception 'Only instructors can edit lessons.' using errcode = '42501';
  end if;

  select l.module_id, l.position into v_module, v_position
  from public.lessons l where l.id = p_lesson_id;
  if v_module is null then return; end if;

  if p_direction < 0 then
    select l.id, l.position into v_other, v_other_position from public.lessons l
    where l.module_id = v_module and l.position < v_position order by l.position desc limit 1;
  else
    select l.id, l.position into v_other, v_other_position from public.lessons l
    where l.module_id = v_module and l.position > v_position order by l.position asc limit 1;
  end if;
  if v_other is null then return; end if;

  update public.lessons set position = v_position + 1000000 where id = p_lesson_id;
  update public.lessons set position = v_position where id = v_other;
  update public.lessons set position = v_other_position where id = p_lesson_id;
end;
$$;

revoke all on function public.save_quiz_question(uuid, uuid, public.question_type, text, jsonb, jsonb, text, integer) from public, anon;
revoke all on function public.move_quiz_question(uuid, integer) from public, anon;
revoke all on function public.move_lesson(uuid, integer) from public, anon;
grant execute on function public.save_quiz_question(uuid, uuid, public.question_type, text, jsonb, jsonb, text, integer) to authenticated, service_role;
grant execute on function public.move_quiz_question(uuid, integer) to authenticated, service_role;
grant execute on function public.move_lesson(uuid, integer) to authenticated, service_role;

-- Phase 4 publication: DSA Module 5 (two-pointers) and DSA Module 6 (sliding-window).
-- PREPARED ONLY. Run only after approval, against the intended local database, after a verified backup.
--
-- Changes exactly two rows of public.modules: is_published becomes true (the updated_at trigger also
-- stamps those rows). Nothing else is written. Every precondition is checked inside one transaction,
-- and any failure aborts with no change.
--
-- Required psql variables (the IDs differ in every database, which is what identifies the target):
--   two_pointers_id       UUID of the two-pointers module in this database
--   sliding_window_id     UUID of the sliding-window module in this database
--   expected_all_modules  total rows in public.modules across every course in this database
--   confirm               must be the word publish-phase4
--
-- Example (development database, IDs read on 18 October 2026):
--   docker exec -i supabase_db_course-learning-portal psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -v two_pointers_id=31f0a4d9-661c-40d8-8232-f3c18246f867 \
--     -v sliding_window_id=4863f0dd-61d2-436e-81aa-e1f1b2f841a9 \
--     -v expected_all_modules=38 -v confirm=publish-phase4 < docs/verification/phase4-publication.sql
--
-- Running it again after success changes nothing and reports that the modules are already published.

\set ON_ERROR_STOP on
\if :{?two_pointers_id}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Missing -v two_pointers_id=<uuid>; nothing was changed'; END $$;
\endif
\if :{?sliding_window_id}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Missing -v sliding_window_id=<uuid>; nothing was changed'; END $$;
\endif
\if :{?expected_all_modules}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Missing -v expected_all_modules=<count>; nothing was changed'; END $$;
\endif
\if :{?confirm}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Missing -v confirm=publish-phase4; nothing was changed'; END $$;
\endif

BEGIN;
SELECT set_config('phase4.two_pointers_id', :'two_pointers_id', true),
       set_config('phase4.sliding_window_id', :'sliding_window_id', true),
       set_config('phase4.expected_all_modules', :'expected_all_modules', true),
       set_config('phase4.confirm', :'confirm', true);

DO $$
DECLARE
  tp uuid := current_setting('phase4.two_pointers_id')::uuid;
  sw uuid := current_setting('phase4.sliding_window_id')::uuid;
  expected_all integer := current_setting('phase4.expected_all_modules')::integer;
  six text[] := ARRAY['python-essentials', 'python-collections-and-testing', 'correctness-and-cost',
                      'recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists'];
  eight text[] := six || ARRAY['two-pointers', 'sliding-window'];
  target_course uuid;
  tp_published boolean;
  sw_published boolean;
  published_now text[];
  other_courses_before text;
  promoted integer;
BEGIN
  IF current_setting('phase4.confirm') <> 'publish-phase4' THEN
    RAISE EXCEPTION 'confirm must be publish-phase4; nothing was changed';
  END IF;
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Unexpected database %; nothing was changed', current_database();
  END IF;

  SELECT id INTO STRICT target_course FROM public.courses WHERE slug = 'data-structures-and-algorithms';
  PERFORM 1 FROM public.modules WHERE course_id = target_course FOR UPDATE;

  -- Identity: this database's total size and the exact module IDs supplied for it.
  IF (SELECT count(*) FROM public.modules) <> expected_all THEN
    RAISE EXCEPTION 'Unexpected database: % modules in total, expected %; nothing was changed', (SELECT count(*) FROM public.modules), expected_all;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.modules WHERE id = tp AND course_id = target_course AND slug = 'two-pointers' AND position = 7)
     OR NOT EXISTS (SELECT 1 FROM public.modules WHERE id = sw AND course_id = target_course AND slug = 'sliding-window' AND position = 8) THEN
    RAISE EXCEPTION 'The supplied module IDs do not match two-pointers at 7 and sliding-window at 8 in this database; nothing was changed';
  END IF;

  -- Curriculum shape.
  IF (SELECT count(*) FROM public.phases WHERE course_id = target_course) <> 8
     OR (SELECT count(*) FROM public.modules WHERE course_id = target_course) <> 34 THEN
    RAISE EXCEPTION 'Unexpected curriculum shape; nothing was changed';
  END IF;

  SELECT is_published INTO tp_published FROM public.modules WHERE id = tp;
  SELECT is_published INTO sw_published FROM public.modules WHERE id = sw;
  SELECT coalesce(array_agg(slug ORDER BY position), '{}') INTO published_now
    FROM public.modules WHERE course_id = target_course AND is_published;

  IF tp_published AND sw_published THEN
    IF published_now <> eight THEN
      RAISE EXCEPTION 'Both modules are published but the published set is unexpected: %', published_now;
    END IF;
    RAISE NOTICE 'two-pointers and sliding-window are already published; nothing was changed';
    RETURN;
  ELSIF tp_published OR sw_published THEN
    RAISE EXCEPTION 'Only one of the two modules is published; refusing a partial state. Nothing was changed';
  END IF;

  -- Every other publication flag must be exactly the six modules published before Phase 4.
  IF published_now <> six THEN
    RAISE EXCEPTION 'Unexpected publication state before Phase 4: %; nothing was changed', published_now;
  END IF;

  -- Never publish an empty module: each target needs its complete, published content.
  IF EXISTS (
    SELECT 1 FROM public.modules m WHERE m.id IN (tp, sw) AND (
      (SELECT count(*) FROM public.lessons l WHERE l.module_id = m.id AND l.is_published) <> 6
      OR (SELECT count(*) FROM public.quizzes q WHERE q.module_id = m.id AND q.is_published) <> 1
      OR (SELECT count(*) FROM public.questions qq JOIN public.quizzes q ON q.id = qq.quiz_id WHERE q.module_id = m.id) <> 10
      OR (SELECT count(*) FROM public.projects p WHERE p.module_id = m.id AND p.is_published) <> 1
      OR (SELECT count(*) FROM public.coding_problems p WHERE p.module_id = m.id AND p.is_published) <> 6
      OR (SELECT count(*) FROM public.coding_problems p JOIN public.coding_problem_solutions s ON s.problem_id = p.id
          WHERE p.module_id = m.id AND jsonb_array_length(s.hidden_tests) >= 5) <> 6)
  ) THEN
    RAISE EXCEPTION 'A target module lacks its complete content (6 lessons, a 10-question quiz, a project, 6 problems with hidden tests). Load the content first; nothing was changed';
  END IF;

  SELECT md5(coalesce(string_agg(id::text || is_published::text, ',' ORDER BY id), ''))
    INTO other_courses_before FROM public.modules WHERE course_id <> target_course;

  UPDATE public.modules SET is_published = true
    WHERE id IN (tp, sw) AND course_id = target_course AND NOT is_published;
  GET DIAGNOSTICS promoted = ROW_COUNT;
  IF promoted <> 2 THEN
    RAISE EXCEPTION 'Expected to publish 2 modules, published %; transaction aborted', promoted;
  END IF;

  SELECT array_agg(slug ORDER BY position) INTO published_now FROM public.modules WHERE course_id = target_course AND is_published;
  IF published_now <> eight
     OR (SELECT count(*) FROM public.modules WHERE course_id = target_course AND NOT is_published) <> 26
     OR (SELECT md5(coalesce(string_agg(id::text || is_published::text, ',' ORDER BY id), '')) FROM public.modules WHERE course_id <> target_course) <> other_courses_before THEN
    RAISE EXCEPTION 'Post-publication state differs from 8 published and 26 planned; transaction aborted';
  END IF;
  RAISE NOTICE 'Published two-pointers and sliding-window: 8 published and 26 planned';
END $$;
COMMIT;

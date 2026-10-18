-- Phase 4 rollback: unpublish two-pointers and sliding-window again.
-- PREPARED ONLY. Use only if a Phase 4 publication must be reversed, after preserving evidence.
--
-- Changes exactly two rows of public.modules (is_published becomes false; the trigger stamps
-- updated_at). Student progress, attempts and submissions in those modules stay stored and
-- reappear if the modules are published again. Same variables as phase4-publication.sql, with
-- confirm=unpublish-phase4.

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
  DO $$ BEGIN RAISE EXCEPTION 'Missing -v confirm=unpublish-phase4; nothing was changed'; END $$;
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
  published_now text[];
  reverted integer;
BEGIN
  IF current_setting('phase4.confirm') <> 'unpublish-phase4' THEN
    RAISE EXCEPTION 'confirm must be unpublish-phase4; nothing was changed';
  END IF;
  SELECT id INTO STRICT target_course FROM public.courses WHERE slug = 'data-structures-and-algorithms';
  PERFORM 1 FROM public.modules WHERE course_id = target_course FOR UPDATE;
  IF (SELECT count(*) FROM public.modules) <> expected_all
     OR NOT EXISTS (SELECT 1 FROM public.modules WHERE id = tp AND course_id = target_course AND slug = 'two-pointers' AND position = 7)
     OR NOT EXISTS (SELECT 1 FROM public.modules WHERE id = sw AND course_id = target_course AND slug = 'sliding-window' AND position = 8) THEN
    RAISE EXCEPTION 'This is not the expected database or the module IDs do not match; nothing was changed';
  END IF;
  SELECT array_agg(slug ORDER BY position) INTO published_now FROM public.modules WHERE course_id = target_course AND is_published;
  IF published_now <> eight THEN
    RAISE EXCEPTION 'Expected exactly the eight Phase 4 modules to be published, found %; nothing was changed', published_now;
  END IF;
  UPDATE public.modules SET is_published = false WHERE id IN (tp, sw) AND course_id = target_course AND is_published;
  GET DIAGNOSTICS reverted = ROW_COUNT;
  SELECT array_agg(slug ORDER BY position) INTO published_now FROM public.modules WHERE course_id = target_course AND is_published;
  IF reverted <> 2 OR published_now <> six THEN
    RAISE EXCEPTION 'Rollback did not return to the six published modules; transaction aborted';
  END IF;
  RAISE NOTICE 'Unpublished two-pointers and sliding-window: 6 published and 28 planned';
END $$;
COMMIT;

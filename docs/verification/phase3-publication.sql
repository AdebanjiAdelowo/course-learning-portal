-- PREPARED ONLY. Do not execute until publication is approved for the intended database.
-- Module flags only: no seeding, account changes, deletions or progress writes.
BEGIN;
DO $$
DECLARE
  target_course uuid;
  promoted integer;
BEGIN
  SELECT id INTO STRICT target_course FROM public.courses
    WHERE slug = 'data-structures-and-algorithms';
  PERFORM 1 FROM public.modules WHERE course_id = target_course FOR UPDATE;
  IF (SELECT count(*) FROM public.phases WHERE course_id = target_course) <> 8
     OR (SELECT count(*) FROM public.modules WHERE course_id = target_course) <> 34 THEN
    RAISE EXCEPTION 'Unexpected curriculum shape; publication aborted';
  END IF;
  IF (SELECT count(*) FROM public.modules WHERE course_id = target_course AND is_published
      AND slug NOT IN ('python-essentials', 'python-collections-and-testing', 'correctness-and-cost',
        'recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists')) <> 0
     OR (SELECT count(*) FROM public.modules WHERE course_id = target_course AND is_published
      AND slug IN ('python-essentials', 'python-collections-and-testing', 'correctness-and-cost')) <> 3 THEN
    RAISE EXCEPTION 'Unexpected existing publication state; publication aborted';
  END IF;
  IF (SELECT count(*) FROM public.modules WHERE course_id = target_course AND
      ((slug = 'recursion-and-induction' AND position = 4)
       OR (slug = 'arrays-and-amortised-analysis' AND position = 5)
       OR (slug = 'linked-lists' AND position = 6))) <> 3 THEN
    RAISE EXCEPTION 'Target modules or ordering differ; publication aborted';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.modules m WHERE m.course_id = target_course
      AND m.slug IN ('recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists')
      AND ((SELECT count(*) FROM public.lessons l WHERE l.module_id = m.id AND l.is_published) <> 6
        OR (SELECT count(*) FROM public.quizzes q WHERE q.module_id = m.id AND q.is_published) <> 1
        OR (SELECT count(*) FROM public.projects p WHERE p.module_id = m.id AND p.is_published) <> 1
        OR (SELECT count(*) FROM public.coding_problems p WHERE p.module_id = m.id AND p.is_published)
            <> CASE WHEN m.slug = 'recursion-and-induction' THEN 5 ELSE 6 END)
  ) THEN
    RAISE EXCEPTION 'Target content is incomplete; publication aborted';
  END IF;
  UPDATE public.modules SET is_published = true
    WHERE course_id = target_course AND NOT is_published
      AND slug IN ('recursion-and-induction', 'arrays-and-amortised-analysis', 'linked-lists');
  GET DIAGNOSTICS promoted = ROW_COUNT;
  IF (SELECT count(*) FROM public.modules WHERE course_id = target_course AND is_published) <> 6
     OR (SELECT count(*) FROM public.modules WHERE course_id = target_course AND NOT is_published) <> 28 THEN
    RAISE EXCEPTION 'Post-publication counts differ; transaction aborted';
  END IF;
  RAISE NOTICE 'Published % additional modules; six published and 28 planned', promoted;
END $$;
COMMIT;

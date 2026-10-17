import { describe, expect, it } from "vitest";
import { course } from "../../seed/course";
import { recursionModule } from "../../seed/recursion-module";
import { arraysModule } from "../../seed/arrays-module";
import { linkedListsModule } from "../../seed/linked-lists-module";

const drafts = [recursionModule, arraysModule, linkedListsModule];
const modules = course.phases.flatMap(phase => phase.modules);

describe("Phase 3 publication preparation", () => {
  it("keeps the three reviewed modules unpublished in their established positions", () => {
    expect(course.phases).toHaveLength(8);
    expect(modules).toHaveLength(34);
    expect(modules.filter(mod => mod.published !== false)).toHaveLength(3);
    expect(drafts.map(mod => modules.indexOf(mod) + 1)).toEqual([4, 5, 6]);
    for (const draft of drafts) {
      expect(draft.published).toBe(false);
      expect(draft.lessons).toHaveLength(6);
      expect(draft.quiz!.questions).toHaveLength(10);
      expect(draft.project!.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100);
    }
  });
  it("derives six published and 28 planned only by promoting the three exact slugs", () => {
    const approvedSlugs = new Set(drafts.map(mod => mod.slug));
    const simulated = modules.map(mod => ({ ...mod, published: approvedSlugs.has(mod.slug) ? true : mod.published }));
    expect(simulated.filter(mod => mod.published !== false)).toHaveLength(6);
    expect(simulated.filter(mod => mod.published === false)).toHaveLength(28);
    expect(modules.filter(mod => mod.published !== false)).toHaveLength(3);
    expect(simulated.map(mod => mod.slug)).toEqual(modules.map(mod => mod.slug));
  });
});

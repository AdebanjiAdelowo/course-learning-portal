import type { ReactNode } from "react";

import { PortalHeader } from "@/components/portal-header";
import { portalNav, siteConfig } from "@/config/site";
import { getUnreadFeedbackCount, requireCourseState } from "@/lib/data/course";
import { requireViewer } from "@/lib/data/viewer";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  const [{ course }, unread] = await Promise.all([requireCourseState(), getUnreadFeedbackCount()]);

  const nav = portalNav.map((item) =>
    item.href === "/learn/feedback" && unread > 0 ? { ...item, badge: unread } : item,
  );

  return (
    <>
      <PortalHeader
        nav={nav}
        rootHref="/learn"
        areaLabel={course.title}
        userName={viewer.profile.full_name}
        userEmail={viewer.profile.email}
        isStaff={viewer.isStaff}
      />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-10">
        {children}
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-faint">
          <p>
            {siteConfig.name} · {course.title}
          </p>
          <p>
            Need help?{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-ink-soft underline underline-offset-4">
              {siteConfig.supportEmail}
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

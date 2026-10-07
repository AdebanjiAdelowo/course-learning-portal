import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PortalHeader } from "@/components/portal-header";
import { adminNav } from "@/config/site";
import { requireStaff } from "@/lib/data/viewer";

export const metadata: Metadata = { title: { default: "Instructor area", template: "%s · Instructor area" } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireStaff();
  return (
    <>
      <PortalHeader
        nav={adminNav}
        rootHref="/admin"
        areaLabel="Instructor area"
        userName={viewer.profile.full_name}
        userEmail={viewer.profile.email}
        isStaff
        showSearch={false}
      />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-10">
        {children}
      </main>
    </>
  );
}

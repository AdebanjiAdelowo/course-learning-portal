import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact and help",
  description: "Get help with your account or ask about enrolment.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <p className="eyebrow">Contact and help</p>
        <h1 className="mt-3 text-4xl font-semibold">How can we help?</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          The course team answers within two working days. For problems signing in, try resetting your password first.
        </p>
        <dl className="mt-8 space-y-5">
          <div>
            <dt className="font-semibold">Forgotten password</dt>
            <dd className="text-ink-soft">
              <Link href="/learn/forgot-password" className="font-semibold text-accent underline underline-offset-4">
                Reset it here
              </Link>
              . The link we send is valid for one hour.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">No account yet</dt>
            <dd className="text-ink-soft">Accounts are issued when you enrol. Use the form to ask about the next cohort.</dd>
          </div>
          {siteConfig.supportEmail ? (
            <div>
              <dt className="font-semibold">Email</dt>
              <dd>
                <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-accent underline underline-offset-4">
                  {siteConfig.supportEmail}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="card p-6 sm:p-8">
        <ContactForm />
      </div>
    </div>
  );
}

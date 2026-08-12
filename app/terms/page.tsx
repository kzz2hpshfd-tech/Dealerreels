import Link from "next/link";

export const metadata = { title: "Terms & Conditions | DealerReels" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href="/register" className="text-xs text-zinc-400 underline">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Terms &amp; Conditions</h1>
          <p className="text-xs text-zinc-500 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">1. Acceptance of Terms</h2>
          <p className="text-sm text-zinc-400">
            By creating an account or using DealerReels, you agree to these Terms &amp; Conditions.
            If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">2. Consent to Be Contacted</h2>
          <p className="text-sm text-zinc-400">
            By providing your phone number and creating an account, you expressly consent to
            receive phone calls and text messages -- including calls or texts made using an
            automatic telephone dialing system, artificial or prerecorded voice, or other
            automated technology -- from DealerReels and from dealerships whose vehicles or
            content you interact with on the platform. This may include calls or texts about
            vehicles you've saved, liked, commented on, or otherwise expressed interest in, even
            if your phone number is registered on a state or federal Do Not Call list.
          </p>
          <p className="text-sm text-zinc-400">
            Consent to receive calls or texts is not a condition of using DealerReels or making
            any purchase. Message and data rates may apply. Message frequency varies. You may
            revoke this consent at any time by contacting us or the dealership directly, or by
            replying STOP to any text message.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">3. Accounts</h2>
          <p className="text-sm text-zinc-400">
            You're responsible for maintaining the confidentiality of your account credentials and
            for all activity under your account. You agree to provide accurate information when
            creating an account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">4. User Content</h2>
          <p className="text-sm text-zinc-400">
            Dealership accounts may post videos and related content ("Content"). You retain
            ownership of Content you post, but grant DealerReels a license to host, display, and
            distribute it within the app. You're responsible for ensuring you have the rights to
            post any Content you upload.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">5. Privacy</h2>
          <p className="text-sm text-zinc-400">
            Information you provide, including your name, email, and phone number, is used to
            operate the service and, where you've consented, to facilitate contact from
            dealerships. See our Privacy Policy for more detail on how information is collected,
            used, and shared.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">6. Changes</h2>
          <p className="text-sm text-zinc-400">
            We may update these Terms from time to time. Continued use of DealerReels after
            changes take effect constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">7. Contact</h2>
          <p className="text-sm text-zinc-400">
            Questions about these Terms can be directed to your account's dealership or to
            DealerReels support.
          </p>
        </section>
      </div>
    </main>
  );
}

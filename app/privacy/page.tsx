import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · VendorMaps",
  description:
    "How VendorMaps collects, uses, and protects your personal information, including analytics, cookies, and your privacy rights.",
};

// Last substantive update to this policy. Update when the content changes.
const LAST_UPDATED = "August 3, 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-lg font-semibold text-black">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6 leading-relaxed text-gray-600">
        This Privacy Policy explains how VendorMaps, a property of Patita
        Creative (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
        collects, uses, and shares information when you use the VendorMaps
        website and mobile app (the
        &ldquo;Service&rdquo;). The Service is intended for use in the United
        States. By using the Service, you agree to the practices described here.
        Your use of the Service is also governed by our{" "}
        <Link href="/terms" className="text-orange-600 underline">
          Terms &amp; Conditions
        </Link>
        .
      </p>

      {/* Information we collect */}
      <Section id="what-we-collect" title="1. Information we collect">
        <p>We collect the following kinds of information:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="font-medium text-gray-800">
              Account information.
            </strong>{" "}
            When you create an account, we collect your name, email address, and (if
            you sign in with Google) basic Google profile information. If you use
            email and password, we store a securely hashed password — never the
            password itself.
          </li>
          <li>
            <strong className="font-medium text-gray-800">Content you submit.</strong>{" "}
            Listings, reviews, ratings, photos, resources, business claims, saved
            items, and messages you send us.
          </li>
          <li>
            <strong className="font-medium text-gray-800">
              Technical &amp; usage information.
            </strong>{" "}
            IP address, device and browser type, the pages you view, and how you
            interact with the Service. Some of this is collected automatically via
            cookies and analytics (see sections 4 and 5).
          </li>
          <li>
            <strong className="font-medium text-gray-800">
              Communications.
            </strong>{" "}
            If you contact us, we keep your message and contact details so we can
            respond.
          </li>
        </ul>
      </Section>

      {/* How we use it */}
      <Section id="how-we-use" title="2. How we use your information">
        <p>We use your information to:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>create and manage your account and authenticate you;</li>
          <li>operate the Service — show listings, reviews, resources, and maps;</li>
          <li>send you transactional emails (verification, password reset, notifications about your submissions);</li>
          <li>moderate content and keep the Service safe and lawful;</li>
          <li>understand and improve how the Service is used; and</li>
          <li>comply with legal obligations and enforce our Terms.</li>
        </ul>
        <p>
          We use your information only for the purposes described above, and we do
          not sell it or use it for unrelated purposes without telling you first.
        </p>
      </Section>

      {/* Service providers */}
      <Section id="service-providers" title="3. Service providers we share data with">
        <p>
          We do not sell your personal information. We share it only with the service
          providers that help us run VendorMaps, each of which processes data on our
          behalf or under its own privacy terms:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="font-medium text-gray-800">Neon</strong> — our
            database host, where account and content data is stored.
          </li>
          <li>
            <strong className="font-medium text-gray-800">Cloudinary</strong> —
            stores and serves images you upload.
          </li>
          <li>
            <strong className="font-medium text-gray-800">Resend</strong> — sends
            transactional email on our behalf.
          </li>
          <li>
            <strong className="font-medium text-gray-800">Google</strong> — provides
            optional &ldquo;Sign in with Google&rdquo; authentication.
          </li>
          <li>
            <strong className="font-medium text-gray-800">Microsoft Clarity</strong>{" "}
            — provides analytics and session insights (see section 5).
          </li>
          <li>
            <strong className="font-medium text-gray-800">Our hosting provider</strong>{" "}
            — serves the website and app and may process technical data such as IP
            addresses.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect our rights
          or users&rsquo; safety, or in connection with a business transfer.
        </p>
      </Section>

      {/* Cookies */}
      <Section id="cookies" title="4. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember
          your preferences, and understand how the Service is used. Essential cookies
          (for example, those that keep your session active) are necessary for the
          Service to work. Analytics cookies (see section 5) help us improve it.
        </p>
        <p>
          We ask for your consent before setting non-essential cookies, and you can
          withdraw consent or manage cookies through your browser settings at any
          time. Disabling some cookies may affect how the Service works.
        </p>
      </Section>

      {/* Microsoft Clarity */}
      <Section id="clarity" title="5. Analytics &amp; session insights (Microsoft Clarity)">
        <p>
          We partner with Microsoft Clarity to understand how visitors use and
          interact with the Service through behavioral metrics, heatmaps, and session
          replay. This helps us find problems and improve the experience. Usage data
          is captured using first- and third-party cookies and other tracking
          technologies to determine the popularity of features and online activity.
        </p>
        <p>
          Clarity may record interactions such as clicks, scrolling, and page
          navigation. We configure Clarity to mask sensitive input (such as text you
          type into forms) where possible. This information is shared with and
          processed by Microsoft. For more information about how Microsoft collects
          and uses your data, see the{" "}
          <a
            href="https://privacy.microsoft.com/privacystatement"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline"
          >
            Microsoft Privacy Statement
          </a>
          .
        </p>
        <p>
          We load Clarity only after you consent to analytics cookies.
        </p>
      </Section>

      {/* Public content */}
      <Section id="public-content" title="6. Information that is public">
        <p>
          VendorMaps is a community directory, so some information you provide is
          public by design. Listings you add, reviews and ratings you post, and your
          public profile details may be visible to anyone using the Service. Please
          do not include sensitive personal information in content you post publicly.
        </p>
      </Section>

      {/* Retention */}
      <Section id="retention" title="7. How long we keep your information">
        <p>
          We keep your information for as long as your account is active or as needed
          to provide the Service, comply with our legal obligations, resolve
          disputes, and enforce our agreements. When you delete your account, we
          delete or anonymize your personal information, except where we are required
          to keep it. Some content you posted publicly (such as reviews) may remain
          visible in anonymized form unless you ask us to remove it.
        </p>
      </Section>

      {/* Your rights */}
      <Section id="your-rights" title="8. Your privacy rights">
        <p>
          Depending on the US state you live in, you may have rights to access,
          correct, delete, or export your personal information, to opt out of certain
          processing, and to withdraw consent. If you are in a state with a
          comprehensive privacy law (such as California under the CCPA/CPRA), these
          rights may apply to you, and we will not discriminate against you for
          exercising them. We honor these requests for all users regardless of state.
        </p>
        <p>
          You can delete your account at any time from your account settings, or
          request deletion or any of the rights above by emailing us at{" "}
          <a href="mailto:hello@vendormaps.net" className="text-orange-600 underline">
            hello@vendormaps.net
          </a>
          . We do not sell your personal information.
        </p>
      </Section>

      {/* Where data is processed */}
      <Section id="where-processed" title="9. Where your information is processed">
        <p>
          The Service is intended for users in the United States, and your information
          is stored and processed here. Some of our service providers operate global
          infrastructure and may process limited technical data outside the United
          States on our behalf; we take steps to protect it consistent with this
          policy and applicable law.
        </p>
      </Section>

      {/* Children */}
      <Section id="children" title="10. Children's privacy">
        <p>
          The Service is not directed to children under 13, and we do not knowingly
          collect personal information from them. If you believe a child has provided
          us information, please contact us and we will delete it.
        </p>
      </Section>

      {/* Security */}
      <Section id="security" title="11. Security">
        <p>
          We take reasonable measures to protect your information, including secure
          authentication and hashed passwords. However, no method of transmission or
          storage is completely secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      {/* Changes */}
      <Section id="changes" title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          revise the &ldquo;Last updated&rdquo; date above and, where appropriate,
          notify you. Your continued use of the Service after changes take effect
          means you accept the updated policy.
        </p>
      </Section>

      {/* Contact */}
      <Section id="contact" title="13. Contact us">
        <p>
          For privacy questions or to exercise your rights, contact us at{" "}
          <a href="mailto:hello@vendormaps.net" className="text-orange-600 underline">
            hello@vendormaps.net
          </a>
        </p>
      </Section>

    </div>
  );
}

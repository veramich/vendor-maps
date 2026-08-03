import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions · VendorMaps",
  description:
    "The terms and conditions for using VendorMaps, a community-powered directory of vendors, businesses, markets, and events.",
};

// Last substantive update to these terms. Update when the content changes.
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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-black">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6 leading-relaxed text-gray-600">
        Welcome to VendorMaps. These Terms &amp; Conditions (&ldquo;Terms&rdquo;)
        govern your use of the VendorMaps website and mobile app (together, the
        &ldquo;Service&rdquo;), operated by Patita Creative (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;). The Service is intended for use in
        the United States. By accessing or using the Service, you agree to these
        Terms. If you do not agree, please do not use the Service. Your privacy is
        covered separately in our{" "}
        <Link href="/privacy" className="text-orange-600 underline">
          Privacy Policy
        </Link>
        .
      </p>

      {/* What VendorMaps is */}
      <Section id="what-we-are" title="1. What VendorMaps is">
        <p>
          VendorMaps is a community-powered directory. It helps people discover
          vendors, businesses, markets, pop-up events, and community resources,
          and it lets community members add listings, post reviews and ratings,
          and share resources. We provide the platform; we do not own, operate,
          control, or vet the businesses, events, or resources that appear on it.
        </p>
        <p>
          We are a venue for information contributed by our community. We are not
          a party to any interaction, transaction, or agreement between you and
          any business, vendor, event organizer, or other user.
        </p>
      </Section>

      {/* No responsibility for listed businesses */}
      <Section id="businesses" title="2. We are not responsible for listed businesses">
        <p>
          Listings on VendorMaps are provided for general information only. We do
          not endorse, recommend, guarantee, license, or stand behind any business,
          vendor, market, or event that appears on the Service.
        </p>
        <p>
          Any dealing you have with a business or vendor — including purchases,
          payments, services, food, products, appointments, or in-person visits —
          is solely between you and that business. We are not responsible for, and
          you release us from, any loss, damage, dispute, injury, illness, or
          dissatisfaction arising out of your interaction with any listed business.
          Please use your own judgment and verify anything important directly with
          the business before relying on it.
        </p>
      </Section>

      {/* Accuracy / out of date */}
      <Section id="accuracy" title="3. Information may be inaccurate or out of date">
        <p>
          Much of the information on VendorMaps is submitted by community members
          and may change at any time. Details such as hours, locations, addresses,
          prices, contact information, menus, event dates, and whether a business
          is still operating may be{" "}
          <strong className="font-medium text-gray-800">
            incomplete, inaccurate, or out of date
          </strong>
          .
        </p>
        <p>
          The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. We do not warrant the accuracy, completeness,
          reliability, or availability of any listing or information. Always confirm
          critical details directly with the business before visiting, ordering, or
          relying on anything you find here.
        </p>
      </Section>

      {/* Reviews and ratings */}
      <Section id="reviews" title="4. Reviews and ratings are users' views, not ours">
        <p>
          Reviews, ratings, and comments on VendorMaps are written and submitted
          by community members based on their own personal experiences and
          opinions. They reflect{" "}
          <strong className="font-medium text-gray-800">
            what users have shared — not our views, opinions, or assessment of any
            business
          </strong>
          . A review or rating appearing on the Service is not an endorsement or
          judgment by VendorMaps about that business.
        </p>
        <p>
          We do not independently verify the statements made in reviews and are not
          responsible for them. If you believe a review is false, defamatory, or
          violates these Terms, you can report it (see{" "}
          <a href="#reporting" className="text-orange-600 underline">
            Reporting &amp; takedowns
          </a>
          ).
        </p>
        <p>
          You agree not to post fake, misleading, or incentivized reviews, including
          reviews of your own business or a competitor&rsquo;s, and not to
          manipulate ratings in any way.
        </p>
      </Section>

      {/* Community resources */}
      <Section id="resources" title="5. Community resources">
        <p>
          VendorMaps includes a resources area where community members can post and
          share resources. These resources are contributed by users. We do not
          create, own, verify, endorse, or guarantee them, and we are not
          responsible for their accuracy, legality, safety, or usefulness.
        </p>
        <p>
          Any reliance you place on a community-submitted resource is at your own
          risk. As with listings, we are not responsible for any loss or harm that
          results from your use of a resource posted by another user.
        </p>
      </Section>

      {/* Anyone can add a business */}
      <Section id="submissions" title="6. Community-submitted listings">
        <p>
          Any community member can add a business, vendor, market, or event to
          VendorMaps. Because listings are open to community contribution:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            The person who adds a listing is responsible for it, and confirms they
            have the right to submit the information and that it is accurate to the
            best of their knowledge and not misleading.
          </li>
          <li>
            A listing being present does not mean the business has reviewed,
            approved, or is affiliated with VendorMaps, or that we have verified it.
          </li>
          <li>
            We may review, edit, reject, decline to publish, hold, remove, or expire
            any submission at any time, with or without notice, at our discretion.
          </li>
          <li>
            We do not guarantee that any submission will be listed, that any listing
            will remain available, or that listings will appear in any particular
            order or ranking.
          </li>
        </ul>
        <p>
          If you are a business owner and a listing about you is inaccurate or you
          want it corrected or removed, contact us (see{" "}
          <a href="#reporting" className="text-orange-600 underline">
            Reporting &amp; takedowns
          </a>
          ) and we will review your request.
        </p>
      </Section>

      {/* Claims */}
      <Section id="claims" title="7. Claiming a business listing">
        <p>
          VendorMaps lets a business owner or authorized representative claim a
          listing. By claiming a listing, you represent that you are the owner of, or
          are authorized to act on behalf of, that business.
        </p>
        <p>
          We make a reasonable effort to confirm that the person claiming a listing
          is connected to the business, but{" "}
          <strong className="font-medium text-gray-800">
            our verification is not perfect and errors can occur
          </strong>
          . A claim being approved does not guarantee that the claimant is in fact
          the rightful owner, and we are not liable for claims that are approved in
          error or based on information that later proves to be false.
        </p>
        <p>
          Claiming a listing does not transfer ownership of the listing data to you.
          We may revoke a claim, transfer it, or take other action at any time —
          including where we receive a competing claim or evidence that a claim was
          made without authorization. If you believe a listing for your business was
          claimed by someone else in error, please contact us.
        </p>
      </Section>

      {/* User content & license */}
      <Section id="your-content" title="8. Your content">
        <p>
          &ldquo;User Content&rdquo; means anything you submit to the Service —
          listings, reviews, ratings, photos, resources, claims, and other materials.
          You keep ownership of your User Content. By submitting it, you grant us a
          non-exclusive, worldwide, royalty-free, sublicensable license to host,
          store, display, reproduce, and distribute it for the purpose of operating,
          promoting, and improving the Service.
        </p>
        <p>You represent and warrant that, for any User Content you submit:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>you own it or have the rights to submit it;</li>
          <li>
            it is accurate to the best of your knowledge and not false, misleading,
            or defamatory;
          </li>
          <li>
            it does not infringe anyone&rsquo;s intellectual property, privacy, or
            other rights; and
          </li>
          <li>it does not violate any law or these Terms.</li>
        </ul>
      </Section>

      {/* Acceptable use */}
      <Section id="acceptable-use" title="9. Acceptable use">
        <p>You agree not to use the Service to:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>post false, defamatory, harassing, hateful, or unlawful content;</li>
          <li>
            post fake reviews or manipulate ratings, or impersonate a business or
            another person;
          </li>
          <li>
            submit spam, advertising, or content unrelated to a genuine listing;
          </li>
          <li>
            scrape, crawl, harvest, copy in bulk, resell, or redistribute data from
            the Service without our written permission;
          </li>
          <li>
            interfere with, overload, or attempt to gain unauthorized access to the
            Service or its systems; or
          </li>
          <li>violate any applicable law or the rights of others.</li>
        </ul>
      </Section>

      {/* Moderation */}
      <Section id="moderation" title="10. Moderation and our role">
        <p>
          We may, but are not obligated to, monitor, review, or moderate User
          Content. We may edit, remove, refuse to publish, or restrict any content,
          and we may suspend or terminate any account, at any time and at our
          discretion — including for violating these Terms.
        </p>
        <p>
          Because we do not pre-screen all content, we are not responsible for User
          Content submitted by others. To the extent permitted by law, we act as a
          provider of an interactive computer service and are not the publisher or
          speaker of content provided by our users.
        </p>
      </Section>

      {/* Accounts */}
      <Section id="accounts" title="11. Your account">
        <p>
          You are responsible for keeping your account credentials secure and for
          activity under your account. You must provide accurate information and keep
          it up to date. You may close your account at any time, and you may request
          deletion of your account and associated personal data as described in our{" "}
          <Link href="/privacy" className="text-orange-600 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      {/* Third-party links */}
      <Section id="third-party" title="12. Third-party links and services">
        <p>
          The Service links to third-party websites, social media pages, and
          services (for example, a business&rsquo;s own website or socials). We do
          not control and are not responsible for the content, accuracy, policies, or
          practices of any third party. Visiting third-party sites is at your own
          risk and subject to their terms.
        </p>
      </Section>

      {/* Reporting / takedowns */}
      <Section id="reporting" title="13. Reporting, corrections &amp; takedowns">
        <p>
          If you are a business owner who wants a listing corrected or removed, or if
          you believe content on the Service is inaccurate, infringes your rights, or
          is defamatory or otherwise improper, contact us at{" "}
          <a href="mailto:hello@vendormaps.net" className="text-orange-600 underline">
            hello@vendormaps.net
          </a>{" "}
          with enough detail to identify the content and your concern. We review
          such requests and respond as appropriate, including for intellectual
          property and copyright (DMCA-style) complaints.
        </p>
      </Section>

      {/* Disclaimer of warranties */}
      <Section id="warranties" title="14. Disclaimer of warranties">
        <p>
          The Service and all content are provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind, whether express or
          implied, including warranties of accuracy, merchantability, fitness for a
          particular purpose, and non-infringement. We do not warrant that the
          Service will be uninterrupted, secure, error-free, or that any information
          on it is accurate or current.
        </p>
      </Section>

      {/* Limitation of liability */}
      <Section id="liability" title="15. Limitation of liability">
        <p>
          To the maximum extent permitted by law, VendorMaps and Patita Creative
          will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss arising out of your use of (or inability
          to use) the Service, your reliance on any listing, review, or resource, or
          your dealings with any business or other user.
        </p>
      </Section>

      {/* Indemnification */}
      <Section id="indemnification" title="16. Indemnification">
        <p>
          You agree to indemnify and hold harmless VendorMaps and Patita Creative
          from any claims, damages, losses, liabilities, and expenses (including
          reasonable legal fees) arising out of your User Content, your use of the
          Service, your violation of these Terms, or your violation of any law or the
          rights of any third party — including any claim brought by a business
          arising from a review or listing you submitted.
        </p>
      </Section>

      {/* Changes */}
      <Section id="changes" title="17. Changes to these Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date above. Your continued use of the Service
          after changes take effect means you accept the updated Terms.
        </p>
      </Section>

      {/* Governing law */}
      <Section id="governing-law" title="18. Governing law">
        <p>
          These Terms are governed by the laws of the State of California, without regard to
          its conflict-of-laws rules. Any dispute relating to these Terms or the
          Service will be handled in the courts located in California, unless
          applicable law requires otherwise.
        </p>
      </Section>

      {/* Contact */}
      <Section id="contact" title="19. Contact us">
        <p>
          Questions about these Terms? Reach us at{" "}
          <a href="mailto:hello@vendormaps.net" className="text-orange-600 underline">
            hello@vendormaps.net
          </a>
          .
        </p>
      </Section>

    </div>
  );
}

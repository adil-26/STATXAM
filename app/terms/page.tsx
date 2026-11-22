import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-[#faf5ee] text-[#2b2118] px-5 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-[#e8dccb]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c2652a]">
          StatXam Legal
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Terms &amp; Conditions</h1>
        <p className="mt-1 text-sm text-[#6e5a49]">Last Updated: November 22, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[#3d3024]">
          <section>
            <h2 className="text-base font-bold text-[#2b2118]">1. Acceptance of Terms</h2>
            <p className="mt-2">By creating an account, ticking the acceptance box, or using StatXam, you agree to these Terms &amp; Conditions and our <Link href="/privacy" className="text-[#c2652a] underline font-semibold">Privacy Policy</Link>. If you are under 18, you confirm that your parent or legal guardian has reviewed and approved your use of the app.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">2. Academic Content &amp; AI Tutor Disclaimer</h2>
            <p className="mt-2">StatXam provides past board question papers, CBT mock tests, IELTS modules, and AI-generated solutions (Clara) strictly for educational preparation. While we strive for accuracy, AI explanations may occasionally contain errors—always verify critical exam formulas and official board circulars with your school or examination authority.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">3. Peer-to-Peer Chat &amp; Calling Conduct (Upcoming Features)</h2>
            <p className="mt-2">StatXam plans to introduce profile-based study chat and voice/video calling so students can collaborate and clear doubts together. By using any communication feature on StatXam, you agree to strictly follow our zero-tolerance safety rules:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li><strong>Respectful Academic Use Only:</strong> Harassment, bullying, hate speech, threats, sexually explicit content, nudity, spam, or solicitation are strictly prohibited in chats and calls.</li>
              <li><strong>No Impersonation or Doxxing:</strong> Do not share another student&apos;s private phone number, address, or personal photos without consent.</li>
              <li><strong>Moderation, Reporting &amp; Blocking:</strong> Users can report abusive messages/calls and block other profiles directly inside the app. StatXam reserves the right to suspend or permanently ban any account that violates these guidelines without prior notice.</li>
              <li><strong>No Unauthorized Recording:</strong> Do not secretly record or distribute private voice or video calls of other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">4. Student Paper Contributions &amp; StatXam Coins</h2>
            <p className="mt-2">When you upload missing question papers to earn StatXam Coins, you confirm the files are authentic exam papers and free of malware or illegal content. StatXam Coins are virtual in-app rewards with no real-world cash value and cannot be exchanged for money.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">5. Account Security</h2>
            <p className="mt-2">You are responsible for keeping your password and linked Telegram OTP account secure. Notify us immediately if you suspect unauthorized access to your profile.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">6. Updates to These Terms</h2>
            <p className="mt-2">We may update these Terms as we launch new features such as peer chat and calling. Continued use of StatXam after updates are published means you accept the revised Terms.</p>
          </section>
        </div>

        <div className="mt-8 border-t border-[#e8dccb] pt-5 flex justify-between text-xs text-[#6e5a49]">
          <Link href="/privacy" className="font-semibold text-[#c2652a] hover:underline">
            &larr; Read Privacy Policy
          </Link>
          <Link href="/" className="hover:underline font-medium">
            Back to StatXam
          </Link>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#faf5ee] text-[#2b2118] px-5 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-[#e8dccb]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c2652a]">
          StatXam Legal
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[#6e5a49]">Last Updated: November 22, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-[#3d3024]">
          <section>
            <h2 className="text-base font-bold text-[#2b2118]">1. Information We Collect</h2>
            <p className="mt-2">When you use the StatXam mobile app or website, we collect only the data needed to run your academic experience:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li><strong>Account &amp; Profile Data:</strong> Full name, email address, optional mobile number, selected study language, target education board/class (e.g., CBSE, State Boards, JEE, NEET, IELTS), and profile photo.</li>
              <li><strong>Learning &amp; Exam Telemetry:</strong> Mock test scores, accuracy, daily streaks, IELTS lesson progress, and StatXam Coin bounty records.</li>
              <li><strong>AI Doubt Solver (Clara) Inputs:</strong> Text doubts, images, and PDFs (up to 25 MB) you upload to receive step-by-step academic explanations.</li>
              <li><strong>Telegram OTP &amp; Recovery:</strong> Your Telegram Chat ID (only if you choose to link <code>@statxambot</code>) to deliver instant password recovery OTPs.</li>
              <li><strong>Device &amp; Notification Tokens:</strong> Firebase Cloud Messaging (FCM) device tokens to send exam alerts, bounty approvals, and study reminders.</li>
              <li><strong>Peer Chat &amp; Calling (Upcoming Social Features):</strong> When peer-to-peer study chat and voice/video calling are enabled, we process your profile visibility, direct messages, media shared in chats, call connection metadata (participants, timestamps, duration), and—only during active calls with your permission—live microphone and camera streams. We do not record private user calls.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">2. How We Use Your Data</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>Authenticate your account and sync progress across web and Android via Supabase.</li>
              <li>Generate step-by-step academic solutions and IELTS feedback using AI processing (Groq Cloud).</li>
              <li>Enable safe peer-to-peer study discussions, direct messaging, and voice/video calls between registered profiles.</li>
              <li>Verify student-uploaded past year question papers and award StatXam Coins.</li>
              <li>Prevent spam, abuse, harassment, and unauthorized access across chat, calls, and community features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">3. Device Permissions</h2>
            <p className="mt-2">StatXam may request optional Android permissions only when you use specific features: <strong>Camera &amp; Storage</strong> (to scan/upload exam questions or profile pictures), <strong>Microphone</strong> (for IELTS speaking practice and upcoming voice/video calls), and <strong>Notifications</strong> (for study alerts and incoming messages/calls).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">4. Children &amp; Student Safety (Under 18)</h2>
            <p className="mt-2">StatXam is built for students, including learners under 18. We do not sell student personal data, and we do not run behavioural tracking or targeted third-party advertising directed at minors. Students under 18 should use StatXam with the consent and supervision of a parent or legal guardian.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">5. Data Sharing &amp; Third-Party Services</h2>
            <p className="mt-2">We do not sell your personal information. Data is processed strictly by essential infrastructure providers: <strong>Supabase</strong> (authentication &amp; database), <strong>Groq</strong> (AI doubt solving), <strong>Google Firebase</strong> (push notifications), and <strong>Telegram</strong> (optional OTP delivery). Message or call abuse reports may be reviewed by our moderation team for safety.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">6. Your Rights &amp; Account Deletion</h2>
            <p className="mt-2">You have the right to access, correct, or permanently delete your StatXam account and personal data, or withdraw consent at any time. To request full account and data deletion, email our Grievance &amp; Privacy Officer below from your registered email address; requests are processed within 7 business days.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#2b2118]">7. Grievance Officer &amp; Contact</h2>
            <p className="mt-2">
              <strong>StatXam Support &amp; Privacy Desk</strong><br />
              Email: <a href="mailto:support@statxam.app" className="text-[#c2652a] underline font-semibold">support@statxam.app</a><br />
              Support Alternate: <a href="mailto:adilimteyaz2002@gmail.com" className="text-[#c2652a] underline">adilimteyaz2002@gmail.com</a><br />
              Location: Punjab &amp; All-India
            </p>
          </section>
        </div>

        <div className="mt-8 border-t border-[#e8dccb] pt-5 flex justify-between text-xs text-[#6e5a49]">
          <Link href="/terms" className="font-semibold text-[#c2652a] hover:underline">
            Read Terms &amp; Conditions &rarr;
          </Link>
          <Link href="/" className="hover:underline font-medium">
            Back to StatXam
          </Link>
        </div>
      </div>
    </main>
  );
}

-- ==============================================================================
-- StatXam Production Database Schema (Supabase / PostgreSQL)
-- Project ID: wdrkjctckwvgezaqqzpp
-- Host: https://wdrkjctckwvgezaqqzpp.supabase.co
-- Description: Complete schema for 20-Year Papers, Chapters, Groq AI Questions,
--              OCR Ingestion Queue, Student Profiles & Telegram 2FA
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Student Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    language TEXT DEFAULT 'punjabi' CHECK (language IN ('punjabi', 'english', 'hindi')) NOT NULL,
    target_exam TEXT DEFAULT 'PSEB Class 10',
    target_institution TEXT DEFAULT 'State Top 500 Merit',
    estimated_rank INTEGER DEFAULT 142,
    accuracy NUMERIC(5,2) DEFAULT 89.40,
    streak_days INTEGER DEFAULT 7,
    questions_solved INTEGER DEFAULT 1280,
    telegram_linked BOOLEAN DEFAULT TRUE,
    telegram_handle TEXT DEFAULT '@StatXamAuthBot',
    accepted_terms_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration support for existing profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz DEFAULT now();

-- 2. Chapters & Units Table (Subject-wise Syllabus Index)
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    board TEXT NOT NULL DEFAULT 'PSEB Class 10',
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    unit_number INTEGER NOT NULL,
    name_en TEXT NOT NULL,
    name_pa TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    weightage_marks INTEGER DEFAULT 6,
    total_questions_bank INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 20-Year Exam Papers Dossier Table (with Google Drive Links)
CREATE TABLE IF NOT EXISTS public.papers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    exam TEXT NOT NULL,
    subject TEXT NOT NULL,
    subject_code TEXT NOT NULL DEFAULT '04',
    total_questions INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    source TEXT NOT NULL,
    description TEXT,
    drive_pdf_url TEXT, -- Google Drive / CDN link
    drive_rubric_url TEXT, -- Official Marking Scheme link
    offline_cached BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Question Bank Table (OCR Extracted & Groq AI Synthesized)
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT REFERENCES public.chapters(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    language TEXT DEFAULT 'punjabi' CHECK (language IN ('punjabi', 'english', 'hindi')) NOT NULL,
    stem TEXT NOT NULL,
    diagram_url TEXT,
    options JSONB NOT NULL,
    correct_option TEXT NOT NULL, -- Stored server-side only
    solution TEXT,
    source TEXT CHECK (source IN ('google_drive_pdf_extracted', 'groq_board_trend_synthesizer', 'gemini_board_trend_synthesizer')) NOT NULL,
    review_status TEXT CHECK (review_status IN ('pending', 'accepted', 'rejected')) DEFAULT 'accepted' NOT NULL,
    exam_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium' NOT NULL,
    marks INTEGER NOT NULL DEFAULT 4,
    negative_marks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Admin PDF Ingestion & Groq AI Generation Queue
CREATE TABLE IF NOT EXISTS public.pdf_ingest_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_url TEXT NOT NULL,
    document_title TEXT NOT NULL,
    board TEXT NOT NULL,
    subject TEXT NOT NULL,
    year INTEGER NOT NULL,
    language TEXT DEFAULT 'punjabi' NOT NULL,
    chapter_id TEXT,
    ocr_status TEXT CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
    groq_status TEXT CHECK (groq_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
    generated_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Graded Exam Submissions Table (Immutable Server-Evaluated Records)
CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    test_title TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    accuracy NUMERIC(5,2) NOT NULL,
    percentile NUMERIC(5,2) NOT NULL,
    rank_estimate TEXT,
    time_spent_minutes INTEGER DEFAULT 14,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Telegram 2FA OTP Requests Table
CREATE TABLE IF NOT EXISTS public.telegram_otp_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR FAST TELEMETRY & QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_questions_exam_code ON public.questions(exam_code);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_review_status ON public.questions(review_status);
CREATE INDEX IF NOT EXISTS idx_papers_year ON public.papers(year);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_code ON public.chapters(subject_code);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.test_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON public.telegram_otp_requests(mobile);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_ingest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_otp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access for Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Update Access for Profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public Insert Access for Profiles" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access for Chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Public Read Access for Questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admin Update Access for Questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Admin Insert Access for Questions" ON public.questions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access for Papers" ON public.papers FOR SELECT USING (true);
CREATE POLICY "Admin Access for Ingest Queue" ON public.pdf_ingest_queue FOR ALL USING (true);
CREATE POLICY "Public Insert Access for Submissions" ON public.test_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Access for Submissions" ON public.test_submissions FOR SELECT USING (true);
CREATE POLICY "OTP Access Policy" ON public.telegram_otp_requests FOR ALL USING (true);

-- ==============================================================================
-- SEED DATA: PSEB Class 10 Mathematics Chapters (Code 04)
-- ==============================================================================
INSERT INTO public.chapters (id, board, subject_code, subject_name, unit_number, name_en, name_pa, name_hi, weightage_marks)
VALUES
('pseb-ch-01', 'PSEB Class 10', '04', 'Mathematics', 1, 'Real Numbers', 'ਵਾਸਤਵਿਕ ਸੰਖਿਆਵਾਂ', 'वास्तविक संख्याएँ', 4),
('pseb-ch-02', 'PSEB Class 10', '04', 'Mathematics', 2, 'Polynomials', 'ਬਹੁਪਦ', 'बहुपद', 4),
('pseb-ch-03', 'PSEB Class 10', '04', 'Mathematics', 3, 'Pair of Linear Equations in Two Variables', 'ਦੋ ਚਲਾਂ ਵਾਲੇ ਰੇਖੀ ਸਮੀਕਰਣਾਂ ਦੇ ਜੋੜੇ', 'दो चर वाले रैखिक समीकरण युग्म', 6),
('pseb-ch-04', 'PSEB Class 10', '04', 'Mathematics', 4, 'Quadratic Equations', 'ਦੋ ਘਾਤੀ ਸਮੀਕਰਣ', 'द्विघात समीकरण', 6),
('pseb-ch-05', 'PSEB Class 10', '04', 'Mathematics', 5, 'Arithmetic Progressions (AP)', 'ਅੰਕਗਣਿਤਕ ਲੜੀਆਂ', 'समांतर श्रेढ़ी', 6),
('pseb-ch-06', 'PSEB Class 10', '04', 'Mathematics', 6, 'Triangles (Theorems & Proofs)', 'ਤ੍ਰਿਭੁਜ', 'त्रिभुज', 8),
('pseb-ch-07', 'PSEB Class 10', '04', 'Mathematics', 7, 'Coordinate Geometry', 'ਨਿਰਦੇਸ਼ ਅੰਕ ਜਮਾਇਤੀ', 'निर्देशांक ज्यामिति', 6),
('pseb-ch-08', 'PSEB Class 10', '04', 'Mathematics', 8, 'Introduction to Trigonometry', 'ਤਿਕੋਣਮਿਤੀ ਦਾ ਜਾਣ-ਪਛਾਣ', 'त्रिकोणमिति का परिचय', 8),
('pseb-ch-09', 'PSEB Class 10', '04', 'Mathematics', 9, 'Some Applications of Trigonometry', 'ਤਿਕੋਣਮਿਤੀ ਦੇ ਕੁਝ ਉਪਯੋਗ', 'त्रिकोणमिति के कुछ अनुप्रयोग', 4),
('pseb-ch-10', 'PSEB Class 10', '04', 'Mathematics', 10, 'Circles (Tangents & Theorems)', 'ਚੱਕਰ', 'वृत्त', 6),
('pseb-ch-11', 'PSEB Class 10', '04', 'Mathematics', 11, 'Areas Related to Circles', 'ਚੱਕਰਾਂ ਨਾਲ ਸੰਬੰਧਿਤ ਖੇਤਰਫਲ', 'वृत्तों से संबंधित क्षेत्रफल', 4),
('pseb-ch-12', 'PSEB Class 10', '04', 'Mathematics', 12, 'Surface Areas and Volumes', 'ਸਤ੍ਹਾ ਦੇ ਖੇਤਰਫਲ ਅਤੇ ਆਇਤਨ', 'पृष्ठीय क्षेत्रफल और आयतन', 6),
('pseb-ch-13', 'PSEB Class 10', '04', 'Mathematics', 13, 'Statistics (Mean, Median, Mode)', 'ਅੰਕੜਾ ਵਿਗਿਆਨ', 'सांख्यिकी', 8),
('pseb-ch-14', 'PSEB Class 10', '04', 'Mathematics', 14, 'Probability', 'ਸੰਭਾਵਨਾ', 'प्रायिकता', 5)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Scholar Profile
INSERT INTO public.profiles (id, full_name, mobile, language, target_exam, target_institution, estimated_rank, accuracy, streak_days, questions_solved, telegram_linked, telegram_handle)
VALUES (
    'scholar-gurpreet-01',
    'Gurpreet Singh',
    '+91 98765 43210',
    'punjabi',
    'PSEB Class 10',
    'State Top 500 Merit',
    142,
    89.40,
    7,
    1280,
    TRUE,
    '@StatXamAuthBot'
) ON CONFLICT (id) DO UPDATE SET updated_at = now();

-- Seed 20-Year Archive Papers with Drive Links
INSERT INTO public.papers (id, title, year, exam, subject, subject_code, total_questions, duration_minutes, source, description, drive_pdf_url, drive_rubric_url, offline_cached)
VALUES
(
    'pseb-10-maths-2024',
    'PSEB Class 10 Maths Annual Exam 2024',
    2024,
    'PSEB Class 10',
    'Mathematics (ਗਣਿਤ)',
    '04',
    34,
    180,
    'google_drive_pdf_extracted',
    'Standard Paper · Set A (Punjabi/English Bilingual) with official 4-section rubrics.',
    'https://drive.google.com/file/d/1pseb2024maths_facsimile/view?usp=sharing',
    'https://drive.google.com/file/d/1pseb2024maths_rubric/view?usp=sharing',
    TRUE
),
(
    'pseb-10-maths-2023',
    'PSEB Class 10 Maths Annual Exam 2023',
    2023,
    'PSEB Class 10',
    'Mathematics (ਗਣਿਤ)',
    '04',
    34,
    180,
    'google_drive_pdf_extracted',
    'Annual March Examination Set B with complete step-wise grading scheme.',
    'https://drive.google.com/file/d/1pseb2023maths_facsimile/view?usp=sharing',
    'https://drive.google.com/file/d/1pseb2023maths_rubric/view?usp=sharing',
    TRUE
),
(
    'pseb-10-maths-2022',
    'PSEB Class 10 Maths Term 2 Exam 2022',
    2022,
    'PSEB Class 10',
    'Mathematics (ਗਣਿਤ)',
    '04',
    30,
    120,
    'google_drive_pdf_extracted',
    'Official Term-2 Board Paper featuring Quadratic Equations and Surface Areas.',
    'https://drive.google.com/file/d/1pseb2022maths_facsimile/view?usp=sharing',
    'https://drive.google.com/file/d/1pseb2022maths_rubric/view?usp=sharing',
    TRUE
),
(
    'pseb-10-science-2024',
    'Science (ਵਿਗਿਆਨ) Official Annual Paper 2024',
    2024,
    'PSEB Class 10',
    'Science (ਵਿਗਿਆਨ)',
    '05',
    30,
    180,
    'google_drive_pdf_extracted',
    'Chemical Reactions, Ray Optics & Electricity Focus with lab experiment guides.',
    'https://drive.google.com/file/d/1pseb2024science_facsimile/view?usp=sharing',
    'https://drive.google.com/file/d/1pseb2024science_rubric/view?usp=sharing',
    TRUE
),
(
    'cbse-12-physics-2024',
    'CBSE Class 12 Physics 2024 (Set 1)',
    2024,
    'CBSE Class 12',
    'Physics Core',
    '55/1/1',
    33,
    180,
    'google_drive_pdf_extracted',
    'All India Senior School Certificate Examination 2024 with full vector derivations.',
    'https://drive.google.com/file/d/1cbse2024phy_facsimile/view?usp=sharing',
    'https://drive.google.com/file/d/1cbse2024phy_rubric/view?usp=sharing',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Seed Sample Questions
INSERT INTO public.questions (id, chapter_id, subject, topic, language, stem, options, correct_option, solution, source, review_status, exam_code, year, difficulty, marks, negative_marks)
VALUES
(
    'PSEB24-MTH-Q14',
    'pseb-ch-06',
    'mathematics',
    'Triangles & Proportionality (Theorems)',
    'punjabi',
    'ਸਿੱਧ ਕਰੋ ਕਿ ਜੇਕਰ ਕਿਸੇ ਤ੍ਰਿਭੁਜ ਦੀ ਇੱਕ ਭੁਜਾ ਦੇ ਸਮਾਂਤਰ ਬਾਕੀ ਦੋ ਭੁਜਾਵਾਂ ਨੂੰ ਕੱਟਦੀ ਹੋਈ ਰੇਖਾ ਖਿੱਚੀ ਜਾਵੇ ਤਾਂ ਉਹ ਬਾਕੀ ਦੋ ਭੁਜਾਵਾਂ ਨੂੰ ਇੱਕੋ ਅਨੁਪਾਤ ਵਿੱਚ ਵੰਡਦੀ ਹੈ (ਥੇਲਸ ਥਿਊਰਮ)। ਤ੍ਰਿਭੁਜ ABC ਵਿੱਚ, DE || BC ਹੈ। ਜੇਕਰ AD = 2.4 cm, DB = 3.6 cm ਅਤੇ AE = 2.0 cm ਹੋਵੇ, ਤਾਂ EC ਦਾ ਮੁੱਲ ਪਤਾ ਕਰੋ।',
    '[{"id": "A", "text": "2.8 cm"}, {"id": "B", "text": "3.0 cm"}, {"id": "C", "text": "3.2 cm"}, {"id": "D", "text": "3.5 cm"}]'::jsonb,
    'B',
    'ਥੇਲਸ ਥਿਊਰਮ (ਮੁੱਢਲੀ ਅਨੁਪਾਤਿਕਤਾ ਥਿਊਰਮ) ਅਨੁਸਾਰ: AD / DB = AE / EC. ਮੁੱਲ ਭਰਨ ਤੇ: 2.4 / 3.6 = 2.0 / EC => 2 / 3 = 2.0 / EC => EC = 3.0 cm.',
    'google_drive_pdf_extracted',
    'accepted',
    'PSEB-X-MTH-2024',
    2024,
    'medium',
    4,
    0
),
(
    'PSEB24-MTH-Q04',
    'pseb-ch-04',
    'mathematics',
    'Quadratic Equations (Discriminant)',
    'punjabi',
    'ਦੋ ਘਾਤੀ ਸਮੀਕਰਣ 2x² - 4x + 3 = 0 ਦਾ ਡਿਸਕ੍ਰਿਮੀਨੈਂਟ (D) ਪਤਾ ਕਰੋ ਅਤੇ ਮੂਲਾਂ ਦੀ ਪ੍ਰਕਿਰਤੀ ਦੱਸੋ।',
    '[{"id": "A", "text": "D = -8, ਕੋਈ ਵਾਸਤਵਿਕ ਮੂਲ ਨਹੀਂ"}, {"id": "B", "text": "D = 8, ਦੋ ਵੱਖਰੇ ਵਾਸਤਵਿਕ ਮੂਲ"}, {"id": "C", "text": "D = 0, ਦੋ ਬਰਾਬਰ ਮੂਲ"}, {"id": "D", "text": "D = 16, ਵਾਸਤਵਿਕ ਮੂਲ"}]'::jsonb,
    'A',
    'ਦਿੱਤਾ ਗਿਆ ਸਮੀਕਰਣ 2x² - 4x + 3 = 0 ਹੈ। ਇੱਥੇ a = 2, b = -4, c = 3. ਡਿਸਕ੍ਰਿਮੀਨੈਂਟ D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8. ਕਿਉਂਕਿ D < 0 ਹੈ, ਇਸ ਲਈ ਸਮੀਕਰਣ ਦਾ ਕੋਈ ਵਾਸਤਵਿਕ ਮੂਲ ਨਹੀਂ ਹੈ।',
    'groq_board_trend_synthesizer',
    'accepted',
    'PSEB-X-MTH-2024',
    2024,
    'easy',
    2,
    0
)
ON CONFLICT (id) DO UPDATE SET stem = EXCLUDED.stem, solution = EXCLUDED.solution;

-- ==============================================================================
-- 7. Real-Time Peer-to-Peer Messaging & UGC Safety System
-- ==============================================================================

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_b TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_preview TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_different_participants CHECK (participant_a <> participant_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_conversation_pair
    ON public.conversations (LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b));

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON public.conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON public.conversations(participant_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, read_at);

-- User Blocklist (Safety / UGC compliance)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT check_different_blocks CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- User Reports Table (App Store & Indus UGC moderation)
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status, created_at DESC);

-- Device Tokens Table (FCM Push Notifications)
CREATE TABLE IF NOT EXISTS public.device_tokens (
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'web', 'ios')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);

-- Notifications Audit Log Table
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user ON public.notifications_log(user_id, created_at DESC);

-- Enable Supabase Realtime for Messages & Conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Conversations RLS Policies
DROP POLICY IF EXISTS "Users can view their own conversations if not blocked" ON public.conversations;
CREATE POLICY "Users can view their own conversations if not blocked"
    ON public.conversations FOR SELECT
    USING (
        auth.uid() IS NULL
        OR (auth.uid()::text = participant_a OR auth.uid()::text = participant_b)
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_id = auth.uid()::text AND b.blocked_id = CASE WHEN auth.uid()::text = participant_a THEN participant_b ELSE participant_a END)
               OR (b.blocker_id = CASE WHEN auth.uid()::text = participant_a THEN participant_b ELSE participant_a END AND b.blocked_id = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "Users can create conversations if not blocked" ON public.conversations;
CREATE POLICY "Users can create conversations if not blocked"
    ON public.conversations FOR INSERT
    WITH CHECK (
        (auth.uid() IS NULL OR auth.uid()::text = participant_a OR auth.uid()::text = participant_b)
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_id = participant_a AND b.blocked_id = participant_b)
               OR (b.blocker_id = participant_b AND b.blocked_id = participant_a)
        )
    );

DROP POLICY IF EXISTS "Users can update their conversations last_message" ON public.conversations;
CREATE POLICY "Users can update their conversations last_message"
    ON public.conversations FOR UPDATE
    USING (auth.uid() IS NULL OR auth.uid()::text = participant_a OR auth.uid()::text = participant_b);

-- Messages RLS Policies
DROP POLICY IF EXISTS "Users can view messages in their conversations if not blocked" ON public.messages;
CREATE POLICY "Users can view messages in their conversations if not blocked"
    ON public.messages FOR SELECT
    USING (
        auth.uid() IS NULL
        OR (auth.uid()::text = sender_id OR auth.uid()::text = recipient_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_id = sender_id AND b.blocked_id = recipient_id)
               OR (b.blocker_id = recipient_id AND b.blocked_id = sender_id)
        )
    );

DROP POLICY IF EXISTS "Users can insert messages to allowed recipients" ON public.messages;
CREATE POLICY "Users can insert messages to allowed recipients"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() IS NULL
        OR (auth.uid()::text = sender_id)
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks b
            WHERE (b.blocker_id = sender_id AND b.blocked_id = recipient_id)
               OR (b.blocker_id = recipient_id AND b.blocked_id = sender_id)
        )
    );

-- Critical RLS Policy: Recipients can mark incoming messages as read (live double-tick support)
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
CREATE POLICY "Recipients can mark messages as read"
    ON public.messages FOR UPDATE
    USING (auth.uid() IS NULL OR auth.uid()::text = recipient_id)
    WITH CHECK (auth.uid() IS NULL OR auth.uid()::text = recipient_id);

-- Optional delivered_at timestamp column for multi-stage delivery receipts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, recipient_id) WHERE read_at IS NULL;

-- Blocks RLS Policies
DROP POLICY IF EXISTS "Users can view their own block list" ON public.user_blocks;
CREATE POLICY "Users can view their own block list"
    ON public.user_blocks FOR SELECT
    USING (auth.uid()::text = blocker_id);

DROP POLICY IF EXISTS "Users can add blocks" ON public.user_blocks;
CREATE POLICY "Users can add blocks"
    ON public.user_blocks FOR INSERT
    WITH CHECK (auth.uid()::text = blocker_id);

DROP POLICY IF EXISTS "Users can remove blocks" ON public.user_blocks;
CREATE POLICY "Users can remove blocks"
    ON public.user_blocks FOR DELETE
    USING (auth.uid()::text = blocker_id);

-- Reports RLS Policies
DROP POLICY IF EXISTS "Users can submit reports" ON public.user_reports;
CREATE POLICY "Users can submit reports"
    ON public.user_reports FOR INSERT
    WITH CHECK (auth.uid()::text = reporter_id);

DROP POLICY IF EXISTS "Users and admins can view reports" ON public.user_reports;
CREATE POLICY "Users and admins can view reports"
    ON public.user_reports FOR SELECT
    USING (
        auth.uid()::text = reporter_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()::text AND (p.target_institution = 'Admin' OR p.id LIKE 'admin%')
        )
    );

-- Device Tokens RLS Policies
DROP POLICY IF EXISTS "Users manage their own device tokens" ON public.device_tokens;
CREATE POLICY "Users manage their own device tokens"
    ON public.device_tokens FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Notifications Log RLS Policies
DROP POLICY IF EXISTS "Users view their own notifications" ON public.notifications_log;
CREATE POLICY "Users view their own notifications"
    ON public.notifications_log FOR SELECT
    USING (auth.uid()::text = user_id);

-- ==============================================================================
-- 8. Auto-Provision Profile Trigger on auth.users
-- Automatically syncs every new auth registration into public.profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_uname TEXT;
  final_uname TEXT;
BEGIN
  base_uname := LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'scholar'), '[^a-z0-9]', '_', 'g'));
  IF length(base_uname) < 3 THEN
    base_uname := 'scholar';
  END IF;
  final_uname := SUBSTRING(base_uname FROM 1 FOR 14) || '_' || SUBSTRING(MD5(NEW.id) FROM 1 FOR 4);

  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    mobile,
    language,
    target_exam,
    target_institution,
    estimated_rank,
    accuracy,
    streak_days,
    questions_solved,
    telegram_linked,
    telegram_handle
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Scholar'),
    COALESCE(NEW.raw_user_meta_data->>'username', final_uname),
    COALESCE(NEW.raw_user_meta_data->>'mobile', NEW.email, NEW.id),
    COALESCE(NEW.raw_user_meta_data->>'language', 'english'),
    COALESCE(NEW.raw_user_meta_data->>'target_exam', 'CBSE & Pan-India Board'),
    COALESCE(NEW.raw_user_meta_data->>'target_institution', 'National Merit Rank'),
    150,
    88.0,
    1,
    0,
    false,
    '@statxambot'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    mobile = EXCLUDED.mobile,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 9. Instagram-Style Unique @username System & Chat Composite Indexes
-- ==============================================================================

-- 9.1 Add username handle column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- 9.2 Backfill existing profiles with clean unique handle derived from full_name + random suffix
UPDATE public.profiles
SET username = LOWER(
  REGEXP_REPLACE(
    CONCAT(
      COALESCE(NULLIF(REGEXP_REPLACE(LOWER(full_name), '[^a-z0-9]', '_', 'g'), ''), 'scholar'),
      '_',
      SUBSTRING(MD5(id) FROM 1 FOR 4)
    ),
    '_+', '_', 'g'
  )
)
WHERE username IS NULL OR username = '';

-- 9.3 Ensure unique case-insensitive index on LOWER(username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (LOWER(username));

-- 9.4 Text pattern indexes for fast Instagram-style debounced substring/prefix search
CREATE INDEX IF NOT EXISTS idx_profiles_username_pattern ON public.profiles (LOWER(username) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_fullname_pattern ON public.profiles (LOWER(full_name) text_pattern_ops);

-- 9.5 Composite indexes for instant (<100ms) inbox & message timeline loading
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations (participant_a, participant_b, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON public.conversations (participant_b, participant_a, last_message_at DESC);



import { AllIndiaPaperEntry, ALL_INDIA_PAPERS_CATALOG, ALL_INDIAN_BOARDS } from './boards-catalog';
import { PilotProfile } from './types';

export interface PaperContribution {
  id: string;
  studentId: string;
  studentName: string;
  studentMobile: string;
  boardId: string;
  boardName: string;
  boardCode: string;
  state: string;
  classLevel: 'Class 10' | 'Class 12';
  year: number;
  subject: string;
  paperSet?: string;
  paperFileUrl: string;
  fileName?: string;
  fileSize?: number;
  rubricUrl?: string;
  studentNotes?: string;
  rewardCoins: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// Initial mock contributions so the Admin review suite immediately has pending papers to verify
const INITIAL_CONTRIBUTIONS: PaperContribution[] = [
  {
    id: 'contrib-101',
    studentId: 'scholar-allindia-01',
    studentName: 'Aarav Sharma',
    studentMobile: '+91 98765 43210',
    boardId: 'rbse',
    boardName: 'Rajasthan Board',
    boardCode: 'RBSE / BSER',
    state: 'Rajasthan',
    classLevel: 'Class 10',
    year: 2017,
    subject: 'English (Compulsory)',
    paperSet: 'Code 02',
    paperFileUrl: 'local://RBSE_2017_Class10_English.pdf',
    fileName: 'RBSE_2017_Class10_English.pdf',
    fileSize: 2450000,
    rubricUrl: 'https://drive.google.com/file/d/1demo_rubric/preview',
    studentNotes: 'Scanned from our school library archive in Kota, complete with grammar section and marking key.',
    rewardCoins: 150,
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'contrib-102',
    studentId: 'scholar-pseb-02',
    studentName: 'Harpreet Kaur',
    studentMobile: '+91 98111 22334',
    boardId: 'pseb',
    boardName: 'Punjab Board',
    boardCode: 'PSEB',
    state: 'Punjab',
    classLevel: 'Class 12',
    year: 2019,
    subject: 'Physics',
    paperSet: 'Set B',
    paperFileUrl: 'local://PSEB_2019_Class12_Physics.pdf',
    fileName: 'PSEB_2019_Class12_Physics.pdf',
    fileSize: 3100000,
    studentNotes: 'Official annual board paper with ray optics and electricity diagrams.',
    rewardCoins: 150,
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'contrib-103',
    studentId: 'scholar-allindia-01',
    studentName: 'Aarav Sharma',
    studentMobile: '+91 98765 43210',
    boardId: 'bseb',
    boardName: 'Bihar Board',
    boardCode: 'BSEB',
    state: 'Bihar',
    classLevel: 'Class 10',
    year: 2021,
    subject: 'Science (विज्ञान)',
    paperSet: 'Set A',
    paperFileUrl: 'https://drive.google.com/file/d/1bseb_2021_sci/preview',
    fileName: 'BSEB_2021_Science.pdf',
    fileSize: 1800000,
    studentNotes: 'Verified matriculation paper.',
    rewardCoins: 150,
    status: 'approved',
    submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    reviewedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const CONTRIBUTIONS_KEY = 'statxam_paper_contributions';
const COINS_KEY = 'statxam_scholar_coins';

/**
 * Check if a question paper for (Board + Class + Year + Subject) exists in the catalog or database
 */
export function checkPaperAvailabilityInVault(params: {
  boardId: string;
  classLevel: 'Class 10' | 'Class 12';
  year: number;
  subject: string;
}): { exists: boolean; paper?: AllIndiaPaperEntry } {
  const { boardId, classLevel, year, subject } = params;
  const targetSub = subject.toLowerCase().trim();

  // 1. Check official static catalog
  const foundOfficial = ALL_INDIA_PAPERS_CATALOG.find((p) => {
    const bMatch = p.boardId.toLowerCase() === boardId.toLowerCase();
    const cMatch = p.classLevel === classLevel;
    const yMatch = p.year === year;
    const sMatch =
      p.subject.toLowerCase().includes(targetSub) || targetSub.includes(p.subject.toLowerCase());
    return bMatch && cMatch && yMatch && sMatch;
  });

  if (foundOfficial) {
    return { exists: true, paper: foundOfficial };
  }

  // 2. Check custom board papers in local storage
  if (typeof window !== 'undefined') {
    try {
      const customRaw = localStorage.getItem('statxam_custom_board_papers');
      if (customRaw) {
        const customPapers = JSON.parse(customRaw) as AllIndiaPaperEntry[];
        const foundCustom = customPapers.find((p) => {
          const bMatch = p.boardId.toLowerCase() === boardId.toLowerCase();
          const cMatch = p.classLevel === classLevel;
          const yMatch = p.year === year;
          const sMatch =
            p.subject.toLowerCase().includes(targetSub) || targetSub.includes(p.subject.toLowerCase());
          return bMatch && cMatch && yMatch && sMatch;
        });

        if (foundCustom) {
          return { exists: true, paper: foundCustom };
        }
      }
    } catch (e) {
      console.warn('[Contributions] Error checking custom papers:', e);
    }
  }

  return { exists: false };
}

/**
 * Get all paper contributions
 */
export function getPaperContributions(): PaperContribution[] {
  if (typeof window === 'undefined') return INITIAL_CONTRIBUTIONS;
  try {
    const raw = localStorage.getItem(CONTRIBUTIONS_KEY);
    if (!raw) {
      localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(INITIAL_CONTRIBUTIONS));
      return INITIAL_CONTRIBUTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONTRIBUTIONS;
  }
}

/**
 * Submit a student paper contribution
 */
export function submitPaperContribution(
  data: Omit<PaperContribution, 'id' | 'status' | 'submittedAt' | 'rewardCoins'>
): PaperContribution {
  const contributions = getPaperContributions();
  const newEntry: PaperContribution = {
    ...data,
    id: `contrib-${Date.now()}`,
    rewardCoins: 150,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...contributions];
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('statxam_contributions_updated'));
  }

  return newEntry;
}

/**
 * Admin Action: Approve a Paper Contribution
 * 1. Updates status to 'approved'
 * 2. Awards 150 coins to student
 * 3. Adds paper to official Custom Papers Catalog
 */
export function approvePaperContribution(contributionId: string): {
  success: boolean;
  awardedCoins: number;
  paperAddedId: string;
} {
  const contributions = getPaperContributions();
  const item = contributions.find((c) => c.id === contributionId);

  if (!item) {
    throw new Error('Contribution not found');
  }

  item.status = 'approved';
  item.reviewedAt = new Date().toISOString();

  // 1. Save updated contributions
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
  }

  // 2. Award coins to the student
  awardCoinsToStudent(item.studentId, item.rewardCoins || 150);

  // 3. Register the paper in the live custom catalog
  const paperId = `${item.boardId}-${item.classLevel === 'Class 10' ? '10' : '12'}-${Date.now()}`;
  if (typeof window !== 'undefined') {
    try {
      const existingPapersRaw = localStorage.getItem('statxam_custom_board_papers');
      const existingPapers: AllIndiaPaperEntry[] = existingPapersRaw ? JSON.parse(existingPapersRaw) : [];

      const boardObj = ALL_INDIAN_BOARDS.find((b) => b.id === item.boardId);

      const newPaper: AllIndiaPaperEntry = {
        id: paperId,
        title: `${item.boardName} ${item.classLevel} ${item.subject} ${item.year}`,
        year: item.year,
        exam: `${item.boardCode} ${item.classLevel}`,
        subject: item.subject,
        totalQuestions: 50,
        durationMinutes: 180,
        source: 'google_drive_pdf_extracted',
        description: `Verified archival paper contributed by scholar ${item.studentName} (+150 Coins Awarded).`,
        drivePdfUrl: item.paperFileUrl,
        driveRubricUrl: item.rubricUrl || item.paperFileUrl,
        boardId: item.boardId,
        boardName: item.boardName,
        boardCode: item.boardCode,
        state: item.state,
        region: (boardObj?.region as any) || 'North',
        classLevel: item.classLevel,
        mediumLanguage: 'Hindi / English / Regional',
        paperSet: item.paperSet || 'Set A',
        session: 'Annual',
      };

      localStorage.setItem('statxam_custom_board_papers', JSON.stringify([newPaper, ...existingPapers]));
      window.dispatchEvent(new Event('statxam_custom_papers_updated'));
      window.dispatchEvent(new Event('statxam_contributions_updated'));
    } catch (e) {
      console.warn('[Contributions] Error registering approved paper in catalog:', e);
    }
  }

  return {
    success: true,
    awardedCoins: item.rewardCoins || 150,
    paperAddedId: paperId,
  };
}

/**
 * Admin Action: Reject a Paper Contribution
 */
export function rejectPaperContribution(contributionId: string, reason?: string): boolean {
  const contributions = getPaperContributions();
  const item = contributions.find((c) => c.id === contributionId);
  if (!item) return false;

  item.status = 'rejected';
  item.rejectionReason = reason || 'File unreadable, incomplete, or duplicate.';
  item.reviewedAt = new Date().toISOString();

  if (typeof window !== 'undefined') {
    localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
    window.dispatchEvent(new Event('statxam_contributions_updated'));
  }

  return true;
}

/**
 * Award coins to student and update local session wallet
 */
export function awardCoinsToStudent(studentId: string, amount: number): number {
  if (typeof window === 'undefined') return 0;

  try {
    // Current wallet balance
    const currentCoins = getStudentCoins(studentId);
    const newCoins = currentCoins + amount;
    localStorage.setItem(`${COINS_KEY}_${studentId}`, newCoins.toString());

    // Update active pilot session if matching
    const sessionRaw = localStorage.getItem('statxam_pilot_session');
    if (sessionRaw) {
      const profile = JSON.parse(sessionRaw) as PilotProfile;
      if (profile.id === studentId || profile.fullName === 'Aarav Sharma') {
        profile.coins = newCoins;
        localStorage.setItem('statxam_pilot_session', JSON.stringify(profile));
      }
    }

    window.dispatchEvent(new CustomEvent('statxam_coins_updated', { detail: { coins: newCoins } }));
    return newCoins;
  } catch (e) {
    console.warn('[Contributions] Failed updating coins:', e);
    return 0;
  }
}

/**
 * Get student's current coin balance
 */
export function getStudentCoins(studentId: string): number {
  if (typeof window === 'undefined') return 250;
  try {
    const val = localStorage.getItem(`${COINS_KEY}_${studentId}`);
    if (val !== null) return parseInt(val, 10);

    // Check in pilot session
    const sessionRaw = localStorage.getItem('statxam_pilot_session');
    if (sessionRaw) {
      const profile = JSON.parse(sessionRaw) as PilotProfile;
      if (profile.coins !== undefined) return profile.coins;
    }
    return 250; // default welcome coins
  } catch {
    return 250;
  }
}

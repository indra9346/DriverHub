import { AIMessage } from '../types';
import { AppLanguage } from './i18n';

export function getBotWelcome(lang: AppLanguage): AIMessage {
  if (lang === 'kn') {
    return {
      id: 'msg-welcome-kn',
      sender: 'assistant',
      text: `ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ **DriverHub ಬೆಂಬಲ ಸಹಾಯಕ**.\n\nಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ಚಾಲಕರ ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕುವುದು, ಅಗತ್ಯವಿರುವ ಚಾಲನಾ ಪರವಾನಗಿಗಳು (LMV/HMV/ವಾಣಿಜ್ಯ), ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಮಾಡುವ ನಿಯಮಗಳು, ಪ್ರೊಫೈಲ್ ಪರಿಶೀಲನೆ ಅಥವಾ ವೇತನ ಮಾನದಂಡಗಳ ಬಗ್ಗೆ ನೀವು ನನ್ನನ್ನು ಕೇಳಬಹುದು.`,
      timestamp: 'ಇದೀಗ',
      options: [
        '🔍 HMV ಟ್ರಕ್ ಉದ್ಯೋಗಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?',
        '📄 ಯಾವ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಬೇಕು?',
        '💼 ಉದ್ಯೋಗದಾತರು ಅಭ್ಯರ್ಥಿಗಳನ್ನು ಹೇಗೆ ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಮಾಡುತ್ತಾರೆ?',
        '💰 ಬೆಂಗಳೂರು/ಕರ್ನಾಟಕದಲ್ಲಿ ಸಾಮಾನ್ಯ ಚಾಲಕರ ವೇತನ',
        '🏢 ಚಾಲಕರ ಖಾಲಿ ಹುದ್ದೆಯನ್ನು ಪೋಸ್ಟ್ ಮಾಡುವುದು ಹೇಗೆ?'
      ]
    };
  }

  return {
    id: 'msg-welcome-en',
    sender: 'assistant',
    text: `Hello! 👋 I am your **DriverHub Support Assistant**.\n\nHow can I help you today? You can ask me about finding driver jobs, required licenses (LMV/HMV/Commercial), employer posting rules, profile verification, or salary benchmarks.`,
    timestamp: 'Just now',
    options: [
      '🔍 How to apply for HMV truck jobs?',
      '📄 What documents do I need to upload?',
      '💼 How do employers shortlist candidates?',
      '💰 Typical driver salary in Bengaluru/Chennai',
      '🏢 How do I post a driver job vacancy?'
    ]
  };
}

interface SupportEntry {
  keywords: string[];
  answerEn: string;
  answerKn: string;
  optionsEn?: string[];
  optionsKn?: string[];
  actionLinkEn?: { text: string; url: string };
  actionLinkKn?: { text: string; url: string };
}

const SUPPORT_KNOWLEDGE_BASE: SupportEntry[] = [
  {
    keywords: ['hmv', 'heavy truck', 'truck', 'interstate', 'truck driver', 'trailer', 'apply', 'job', 'ಭಾರಿ ಟ್ರಕ್', 'ಟ್ರಕ್', 'ಲಾರಿ', 'ಹೆವಿ', 'ಉದ್ಯೋಗ', 'ಅರ್ಜಿ'],
    answerEn: `🚛 **Heavy Motor Vehicle (HMV) & Truck Jobs**\n\n• **Eligibility**: Valid HMV driving license with commercial transport badge and minimum 2-3 years highway experience.\n• **Salary Range**: ₹25,000 to ₹45,000/month (plus interstate night allowances & trip bonuses).\n• **Required Documents**: HMV License, Aadhaar Card, Police Verification, and Medical Fitness Certificate.\n\nBrowse open verified HMV postings right now:`,
    answerKn: `🚛 **ಭಾರಿ ಮೋಟಾರು ವಾಹನ (HMV) ಮತ್ತು ಟ್ರಕ್ ಉದ್ಯೋಗಗಳು**\n\n• **ಅರ್ಹತೆ**: ಮಾನ್ಯತೆ ಹೊಂದಿರುವ HMV ಚಾಲನಾ ಪರವಾನಗಿ, ವಾಣಿಜ್ಯ ಬ್ಯಾಡ್ಜ್ ಮತ್ತು ಕನಿಷ್ಠ 2-3 ವರ್ಷಗಳ ಹೆದ್ದಾರಿ ಅನುಭವ.\n• **ವೇತನ ಶ್ರೇಣಿ**: ₹25,000 ರಿಂದ ₹45,000/ತಿಂಗಳು (ಅಂತಾರಾಜ್ಯ ರಾತ್ರಿ ಭತ್ಯೆ & ಟ್ರಿಪ್ ಬೋನಸ್ ಸೇರಿ).\n• **ಅಗತ್ಯ ದಾಖಲೆಗಳು**: HMV ಲೈಸೆನ್ಸ್, ಆಧಾರ್ ಕಾರ್ಡ್, ಪೊಲೀಸ್ ಪರಿಶೀಲನೆ, ಮತ್ತು ವೈದ್ಯಕೀಯ ಪ್ರಮಾಣಪತ್ರ.\n\nಈಗಲೇ ತೆರೆದಿರುವ ಪರಿಶೀಲಿಸಿದ HMV ಹುದ್ದೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ:`,
    actionLinkEn: { text: 'View HMV & Truck Jobs', url: '/jobs?category=HMV' },
    actionLinkKn: { text: 'HMV ಮತ್ತು ಟ್ರಕ್ ಉದ್ಯೋಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ', url: '/jobs?category=HMV' },
    optionsEn: ['What about LMV cab driver jobs?', 'Upload my driving license', 'How to get shortlisted?'],
    optionsKn: ['LMV ಕ್ಯಾಬ್ ಚಾಲಕರ ಕೆಲಸಗಳೇನು?', 'ಚಾಲನಾ ಪರವಾನಗಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಆಗುವುದು ಹೇಗೆ?']
  },
  {
    keywords: ['document', 'upload', 'resume', 'license', 'aadhar', 'aadhaar', 'pan', 'verification', 'ದಾಖಲೆ', 'ಲೈಸೆನ್ಸ್', 'ಆಧಾರ್'],
    answerEn: `📄 **Document & Verification Guidelines**\n\nTo ensure 100% employer trust and quick shortlisting, please upload:\n1. **Driving License** (Front & Back clear photo or PDF)\n2. **ID Proof** (Aadhaar / PAN Card)\n3. **Driver Resume** (Listing vehicle types and experience)\n4. **Police Clearance** (Optional but boosts shortlist chances by 3x)\n\nAll documents are securely encrypted in our private storage.`,
    answerKn: `📄 **ದಾಖಲೆಗಳು ಮತ್ತು ಪರಿಶೀಲನೆ ಮಾರ್ಗಸೂಚಿ**\n\nಉದ್ಯೋಗದಾತರ ವಿಶ್ವಾಸ ಮತ್ತು ತ್ವರಿತ ಶಾರ್ಟ್‌ಲಿಸ್ಟ್‌ಗಾಗಿ ಇವುಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ:\n1. **ಚಾಲನಾ ಪರವಾನಗಿ** (ಮುಂಭಾಗ ಮತ್ತು ಹಿಂಭಾಗದ ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಥವಾ PDF)\n2. **ಗುರುತಿನ ಪುರಾವೆ** (ಆಧಾರ್ / ಪ್ಯಾನ್ ಕಾರ್ಡ್)\n3. **ಚಾಲಕರ ರೆಸ್ಯೂಮೆ** (ವಾಹನ ವಿಧ ಮತ್ತು ಅನುಭವದ ವಿವರ)\n4. **ಪೊಲೀಸ್ ಪರಿಶೀಲನಾ ಪ್ರಮಾಣಪತ್ರ** (ಐಚ್ಛಿಕ, ಆದರೆ ಅವಕಾಶವನ್ನು 3 ಪಟ್ಟು ಹೆಚ್ಚಿಸುತ್ತದೆ)\n\nಎಲ್ಲಾ ದಾಖಲೆಗಳು ನಮ್ಮ ಸುರಕ್ಷಿತ ಸಂಗ್ರಹಣೆಯಲ್ಲಿ ರಕ್ಷಿಸಲ್ಪಡುತ್ತವೆ.`,
    actionLinkEn: { text: 'Manage & Upload Documents', url: '/driver/documents' },
    actionLinkKn: { text: 'ದಾಖಲೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', url: '/driver/documents' },
    optionsEn: ['Check my profile completion', 'How to apply for jobs?'],
    optionsKn: ['ಪ್ರೊಫೈಲ್ ಪೂರ್ಣತೆಯನ್ನು ಪರಿಶೀಲಿಸಿ', 'ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು ಹೇಗೆ?']
  },
  {
    keywords: ['shortlist', 'hire', 'process', 'interview', 'selection', 'status', 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್', 'ಸಂದರ್ಶನ', 'ಆಯ್ಕೆ'],
    answerEn: `🎯 **How the DriverHub Recruitment Process Works**\n\n1. **Apply**: Submit your profile and optional cover note to any approved vacancy.\n2. **Under Review**: The employer checks your license validity and experience.\n3. **Shortlisted**: You will receive an instant push notification + SMS alert.\n4. **Interview / Driving Test**: Employer coordinates a vehicle test drive.\n5. **Selected**: Offer confirmation and onboarding!`,
    answerKn: `🎯 **DriverHub ನೇಮಕಾತಿ ಪ್ರಕ್ರಿಯೆ ಹೇಗೆ ನಡೆಯುತ್ತದೆ**\n\n1. **ಅರ್ಜಿ ಸಲ್ಲಿಸಿ**: ಯಾವುದೇ ಅನುಮೋದಿತ ಹುದ್ದೆಗೆ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಸಲ್ಲಿಸಿ.\n2. **ಪರಿಶೀಲನೆ**: ಉದ್ಯೋಗದಾತರು ನಿಮ್ಮ ಲೈಸೆನ್ಸ್ ಮತ್ತು ಅನುಭವವನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.\n3. **ಶಾರ್ಟ್‌ಲಿಸ್ಟ್**: ನಿಮಗೆ ತಕ್ಷಣ ಅಧಿಸೂಚನೆ ಮತ್ತು SMS ಸಂದೇಶ ಬರುತ್ತದೆ.\n4. **ಸಂದರ್ಶನ / ಡ್ರೈವಿಂಗ್ ಟೆಸ್ಟ್**: ಉದ್ಯೋಗದಾತರು ಟ್ರಯಲ್ ಡ್ರೈವ್ ಆಯೋಜಿಸುತ್ತಾರೆ.\n5. **ಆಯ್ಕೆ**: ಆಫರ್ ದೃಢೀಕರಣ ಮತ್ತು ಕೆಲಸ ಪ್ರಾರಂಭ!`,
    actionLinkEn: { text: 'Track My Applications', url: '/driver/applications' },
    actionLinkKn: { text: 'ನನ್ನ ಅರ್ಜಿಗಳ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ', url: '/driver/applications' },
    optionsEn: ['Search open jobs', 'Update my profile details'],
    optionsKn: ['ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ', 'ಪ್ರೊಫೈಲ್ ವಿವರ ನವೀಕರಿಸಿ']
  },
  {
    keywords: ['salary', 'pay', 'rupee', 'inr', 'earnings', 'rate', 'ವೇತನ', 'ಸಂಬಳ', 'ಆದಾಯ'],
    answerEn: `💰 **Standard Driver Salary Benchmarks (2026)**\n\n• **LMV / Cab / Personal Chauffeur**: ₹18,000 – ₹28,000 / month\n• **Tempo / Hyperlocal Delivery**: ₹16,000 – ₹24,000 / month\n• **School Bus / Passenger Transit**: ₹18,000 – ₹25,000 / month\n• **HMV Heavy Truck (Interstate)**: ₹25,000 – ₹38,000 / month\n• **40ft Container Trailer Driver**: ₹32,000 – ₹50,000 / month\n\n*Note: Many employers also provide PF, ESI, medical insurance, and daily trip allowances.*`,
    answerKn: `💰 **ಪ್ರಸ್ತುತ ಚಾಲಕರ ವೇತನ ಮಾನದಂಡಗಳು (2026)**\n\n• **LMV / ಕ್ಯಾಬ್ / ವೈಯಕ್ತಿಕ ಕಾರು ಚಾಲಕ**: ₹18,000 – ₹28,000 / ತಿಂಗಳು\n• **ಟೆಂಪೋ / ಸ್ಥಳೀಯ ಡೆಲಿವರಿ**: ₹16,000 – ₹24,000 / ತಿಂಗಳು\n• **ಶಾಲಾ ಬಸ್ / ಪ್ರಯಾಣಿಕರ ಸಾರಿಗೆ**: ₹18,000 – ₹25,000 / ತಿಂಗಳು\n• **HMV ಭಾರಿ ಟ್ರಕ್ (ಅಂತಾರಾಜ್ಯ)**: ₹25,000 – ₹38,000 / ತಿಂಗಳು\n• **40ft ಕಂಟೈನರ್ ಟ್ರೈಲರ್ ಚಾಲಕ**: ₹32,000 – ₹50,000 / ತಿಂಗಳು\n\n*ಗಮನಿಸಿ: ಹಲವು ಉದ್ಯೋಗದಾತರು PF, ESI, ವೈದ್ಯಕೀಯ ವಿಮೆ ಮತ್ತು ದೈನಂದಿನ ಭತ್ಯೆಗಳನ್ನು ಒದಗಿಸುತ್ತಾರೆ.*`,
    optionsEn: ['Find High-Paying Jobs', 'Post a Job Vacancy'],
    optionsKn: ['ಹೆಚ್ಚು ವೇತನದ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ', 'ಉದ್ಯೋಗ ಖಾಲಿ ಹುದ್ದೆ ಪೋಸ್ಟ್ ಮಾಡಿ']
  },
  {
    keywords: ['post job', 'employer', 'company', 'hire', 'vacancy', 'candidates', 'ಪೋಸ್ಟ್', 'ಕಂಪನಿ', 'ನೇಮಕಾತಿ'],
    answerEn: `🏢 **Posting a Vacancy as an Employer**\n\n1. Register as an Employer and fill your company profile.\n2. Click **Post Job** and specify vehicle category, experience needed, salary, and shift timings.\n3. Your listing is verified by DriverHub Admin within a few hours to prevent spam.\n4. Once approved, thousands of qualified drivers can apply immediately.`,
    answerKn: `🏢 **ಉದ್ಯೋಗದಾತರಾಗಿ ಖಾಲಿ ಹುದ್ದೆಯನ್ನು ಪೋಸ್ಟ್ ಮಾಡುವುದು**\n\n1. ಉದ್ಯೋಗದಾತರಾಗಿ ನೋಂದಾಯಿಸಿ ಮತ್ತು ಕಂಪನಿ ಪ್ರೊಫೈಲ್ ಭರ್ತಿ ಮಾಡಿ.\n2. **ಹೊಸ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡಿ** ಕ್ಲಿಕ್ ಮಾಡಿ ವಾಹನ ವಿಭಾಗ, ಅಗತ್ಯ ಅನುಭವ, ವೇತನ ಮತ್ತು ಪಾಳಿ ಸಮಯ ನಮೂದಿಸಿ.\n3. ಯಾವುದೇ ನಕಲಿ ಪೋಸ್ಟಿಂಗ್ ತಡೆಯಲು DriverHub ಅಡ್ಮಿನ್ ಕೆಲವೇ ಗಂಟೆಗಳಲ್ಲಿ ಪರಿಶೀಲಿಸುತ್ತದೆ.\n4. ಅನುಮೋದನೆಯಾದ ನಂತರ ಅರ್ಹ ಚಾಲಕರು ತಕ್ಷಣ ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು.`,
    actionLinkEn: { text: 'Post a Driver Vacancy', url: '/employer/post-job' },
    actionLinkKn: { text: 'ಚಾಲಕರ ಹುದ್ದೆ ಪ್ರಕಟಿಸಿ', url: '/employer/post-job' },
    optionsEn: ['Search Driver Talent Pool', 'Contact Support'],
    optionsKn: ['ಚಾಲಕರ ಡೇಟಾಬೇಸ್ ಹುಡುಕಿ', 'ಬೆಂಬಲ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ']
  },
  {
    keywords: ['contact', 'human', 'support', 'phone', 'help', 'email', 'issue', 'ಸಂಪರ್ಕ', 'ಫೋನ್', 'ಸಹಾಯ', 'ಸಮಸ್ಯೆ'],
    answerEn: `📞 **DriverHub Support Team**\n\nOur support desk is available Monday to Saturday (9:00 AM – 7:00 PM IST).\n\n• **Helpline**: +91 80 2200 8899\n• **Driver Support**: support@driverhub.in\n• **Employer Desk**: support@driverhub.in\n• **Office**: Electronic City, Bengaluru, Karnataka`,
    answerKn: `📞 **DriverHub ಬೆಂಬಲ ತಂಡ**\n\nನಮ್ಮ ಬೆಂಬಲ ಕೇಂದ್ರವು ಸೋಮವಾರದಿಂದ ಶನಿವಾರದವರೆಗೆ (ಬೆಳಿಗ್ಗೆ 9:00 ರಿಂದ ಸಂಜೆ 7:00 ರವರೆಗೆ) ಲಭ್ಯವಿದೆ.\n\n• **ಸಹಾಯವಾಣಿ**: +91 80 2200 8899\n• **ಚಾಲಕರ ಬೆಂಬಲ**: support@driverhub.in\n• **ಕಂಪನಿ ವಿಭಾಗ**: support@driverhub.in\n• **ಕಚೇರಿ**: ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ, ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ`,
    actionLinkEn: { text: 'Contact Us Form', url: '/contact' },
    actionLinkKn: { text: 'ಸಂಪರ್ಕ ಫಾರ್ಮ್ ತೆರೆಯಿರಿ', url: '/contact' },
    optionsEn: ['Browse Jobs', 'Go to Dashboard'],
    optionsKn: ['ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ', 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ']
  }
];

export function getSupportResponse(userText: string, lang: AppLanguage): AIMessage {
  const query = userText.toLowerCase().trim();

  const match = SUPPORT_KNOWLEDGE_BASE.find(k => k.keywords.some(kw => query.includes(kw.toLowerCase())));

  const timestamp = lang === 'kn' ? 'ಇದೀಗ' : 'Just now';

  if (match) {
    return {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      text: lang === 'kn' ? match.answerKn : match.answerEn,
      timestamp,
      options: lang === 'kn' ? match.optionsKn : match.optionsEn,
      actionLink: lang === 'kn' ? match.actionLinkKn : match.actionLinkEn
    };
  }

  // Fallback factual responder
  if (lang === 'kn') {
    return {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      text: `ಸಂಪರ್ಕಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ವಿಚಾರಣೆ **"${userText}"** ಕುರಿತು:\n\nDriverHub ಭಾರತದ ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲವಾಗಿದೆ. ನೀವು ಪರಿಶೀಲಿಸಿದ ಚಾಲಕ ಉದ್ಯೋಗಗಳನ್ನು ವೀಕ್ಷಿಸಬಹುದು, ವಿಶ್ವಾಸಾರ್ಹತೆಗಾಗಿ ನಿಮ್ಮ ಲೈಸೆನ್ಸ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಬಹುದು ಅಥವಾ ಉದ್ಯೋಗದಾತರಾಗಿ ಹೊಸ ಹುದ್ದೆಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಬಹುದು.\n\nನಿಮಗೆ ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಯಾವುದೇ ಮಾರ್ಗದರ್ಶನ ಬೇಕೇ?`,
      timestamp,
      options: [
        '🔍 ಇತ್ತೀಚಿನ ಚಾಲಕ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ',
        '📄 ಚಾಲನಾ ಪರವಾನಗಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
        '🏢 ಉದ್ಯೋಗದಾತರಾಗಿ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡಿ',
        '📞 ಬೆಂಬಲ ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ'
      ],
      actionLink: {
        text: 'ಎಲ್ಲಾ ಉದ್ಯೋಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
        url: '/jobs'
      }
    };
  }

  return {
    id: 'msg-' + Date.now(),
    sender: 'assistant',
    text: `Thank you for reaching out! Regarding **"${userText}"**:\n\nDriverHub is India's dedicated driver recruitment network. You can explore verified driving vacancies, upload your commercial documents for instant employer trust, or post job openings directly.\n\nWould you like guidance on any of the following?`,
    timestamp,
    options: [
      '🔍 Browse Latest Driver Jobs',
      '📄 Upload Driving License',
      '🏢 Post a Job as Employer',
      '📞 Speak with Human Support'
    ],
    actionLink: {
      text: 'Explore All Jobs',
      url: '/jobs'
    }
  };
}

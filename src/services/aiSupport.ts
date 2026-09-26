import { AIMessage } from '../types';
import { AppLanguage } from './i18n';

const isKannada = (lang: AppLanguage) => lang === 'kn';

export function getInitialBotWelcome(lang: AppLanguage = 'en'): AIMessage {
  const kn = isKannada(lang);
  return {
    id: 'msg-welcome',
    sender: 'assistant',
    text: kn
      ? 'ನಮಸ್ಕಾರ! ನಾನು ಡ್ರೈವರ್ ಹಬ್ ಸಹಾಯ ಸಹಾಯಕ. ಉದ್ಯೋಗ ಹುಡುಕುವುದು, ಅರ್ಜಿ ಸಲ್ಲಿಸುವುದು, ಚಾಲನಾ ಪರವಾನಗಿ ಮತ್ತು ದಾಖಲೆಗಳು, ಉದ್ಯೋಗದ ಸ್ಥಿತಿ ಅಥವಾ ಉದ್ಯೋಗ ಪ್ರಕಟಿಸುವ ಬಗ್ಗೆ ಕೇಳಿ.\n\nನಿಮಗೆ ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು?'
      : 'Hello! I’m the DriverHub Help Assistant. Ask about finding jobs, applying, licenses and documents, application status, or posting a vacancy.\n\nWhat would you like help with?',
    timestamp: kn ? 'ಈಗಷ್ಟೇ' : 'Just now',
    options: kn
      ? ['ಉದ್ಯೋಗಗಳಿಗೆ ಹೇಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲಿ?', 'ಯಾವ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಬೇಕು?', 'ನನ್ನ ಅರ್ಜಿಯ ಸ್ಥಿತಿ ಹೇಗೆ ನೋಡಲಿ?', 'ಚಾಲಕರ ಉದ್ಯೋಗದ ವೇತನ ಎಷ್ಟು?', 'ಉದ್ಯೋಗವನ್ನು ಹೇಗೆ ಪ್ರಕಟಿಸಲಿ?']
      : ['How do I apply for jobs?', 'Which documents should I upload?', 'How do I check my application status?', 'What salary do driver jobs offer?', 'How do I post a vacancy?']
  };
}

type SupportIntent = 'jobs' | 'documents' | 'applications' | 'salary' | 'employer' | 'support' | 'fallback';

const INTENT_KEYWORDS: Record<SupportIntent, string[]> = {
  jobs: ['job', 'jobs', 'vacancy', 'vacancies', 'apply', 'ಅರ್ಜಿ', 'ಉದ್ಯೋಗ ಹುಡುಕು', 'ಕೆಲಸ ಹುಡುಕು', 'ಹುದ್ದೆ'],
  documents: ['document', 'documents', 'upload', 'license', 'licence', 'ಆಧಾರ್', 'ದಾಖಲೆ', 'ಅಪ್‌ಲೋಡ್', 'ಪರವಾನಗಿ', 'ಲೈಸೆನ್ಸ್'],
  applications: ['application', 'applications', 'status', 'shortlist', 'interview', 'ಅರ್ಜಿ ಸ್ಥಿತಿ', 'ಅರ್ಜಿಯ', 'ಆಯ್ಕೆ', 'ಸಂದರ್ಶನ'],
  salary: ['salary', 'pay', 'income', 'ವೇತನ', 'ಸಂಬಳ', 'ಆದಾಯ'],
  employer: ['post job', 'employer', 'hire', 'post a', 'ಕಂಪನಿ', 'ಉದ್ಯೋಗದಾತ', 'ಪ್ರಕಟಿಸ', 'ನೇಮಕ'],
  support: ['support', 'contact', 'help', 'phone', 'email', 'ಸಹಾಯ', 'ಸಂಪರ್ಕ', 'ದೂರವಾಣಿ'],
  fallback: []
};

const intentOrder: SupportIntent[] = ['documents', 'applications', 'salary', 'employer', 'support', 'jobs'];

const messagesByIntent: Record<Exclude<SupportIntent, 'fallback'>, (kn: boolean) => Pick<AIMessage, 'text' | 'options' | 'actionLink'>> = {
  jobs: (kn) => ({
    text: kn
      ? 'ಸಕ್ರಿಯ ಹುದ್ದೆಗಳನ್ನು ಹುಡುಕಲು “ಉದ್ಯೋಗ ಹುಡುಕಿ” ಪುಟ ತೆರೆಯಿರಿ. ಹುದ್ದೆಯ ವಿವರದಲ್ಲಿ ಸ್ಥಳ, ವಾಹನ ವಿಭಾಗ, ಅನುಭವ ಮತ್ತು ವೇತನ ಪರಿಶೀಲಿಸಿ. ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಚಾಲಕರಾಗಿ ಪ್ರವೇಶಿಸಿ.'
      : 'Open Find Jobs to browse active vacancies. Check each listing for its location, vehicle category, experience requirements, and salary. Sign in as a driver to apply.',
    actionLink: { text: kn ? 'ಸಕ್ರಿಯ ಹುದ್ದೆಗಳನ್ನು ನೋಡಿ' : 'Browse active jobs', url: '/jobs' },
    options: kn ? ['ಅರ್ಜಿ ಸ್ಥಿತಿ ಹೇಗೆ ನೋಡಲಿ?', 'ದಾಖಲೆಗಳನ್ನು ಹೇಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಿ?'] : ['How do I check an application?', 'How do I upload documents?']
  }),
  documents: (kn) => ({
    text: kn
      ? 'ನಿಮ್ಮ ಚಾಲಕ ಖಾತೆಯ “ದಾಖಲೆಗಳು ಮತ್ತು ಪರವಾನಗಿ” ವಿಭಾಗದಲ್ಲಿ ಚಾಲನಾ ಪರವಾನಗಿ ಮತ್ತು ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಪರಿಶೀಲನೆ ಪೂರ್ಣವಾಗುವವರೆಗೆ ಸ್ಥಿತಿಯನ್ನು ಬಾಕಿ ಎಂದು ತೋರಿಸಬಹುದು. ಅನುಮೋದನೆ ಖಚಿತ ಅಥವಾ ತಕ್ಷಣವಾಗುತ್ತದೆ ಎಂದು ಈ ಸಹಾಯಕ ಹೇಳಲು ಸಾಧ್ಯವಿಲ್ಲ.'
      : 'Upload your driving license and requested files in Documents & License in your driver account. The status may remain pending until review is complete. I can’t promise approval or an instant review.',
    actionLink: { text: kn ? 'ದಾಖಲೆಗಳ ಪುಟ ತೆರೆಯಿರಿ' : 'Open documents', url: '/driver/documents' },
    options: kn ? ['ನನ್ನ ಅರ್ಜಿ ಸ್ಥಿತಿ ಹೇಗೆ ನೋಡಲಿ?', 'ಸಹಾಯ ಸಂಪರ್ಕ'] : ['How do I check my application?', 'Contact support']
  }),
  applications: (kn) => ({
    text: kn
      ? 'ನಿಮ್ಮ ಚಾಲಕ ಖಾತೆಯಲ್ಲಿ “ನನ್ನ ಅರ್ಜಿಗಳು” ತೆರೆಯಿರಿ. ಉದ್ಯೋಗದಾತರು ಅರ್ಜಿಯ ಸ್ಥಿತಿಯನ್ನು ನವೀಕರಿಸಿದಾಗ ಅಲ್ಲಿ ಕಾಣಬಹುದು. ಸಂದರ್ಶನದ ವಿವರಗಳಿಗಾಗಿ ಅಧಿಸೂಚನೆಗಳು ಮತ್ತು ಸಂದೇಶಗಳನ್ನೂ ಪರಿಶೀಲಿಸಿ.'
      : 'Open My Applications in your driver account to see your submitted applications. Employer status updates appear there. Check Notifications and Messages for interview details.',
    actionLink: { text: kn ? 'ನನ್ನ ಅರ್ಜಿಗಳನ್ನು ನೋಡಿ' : 'View my applications', url: '/driver/applications' },
    options: kn ? ['ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ', 'ಸಹಾಯ ಸಂಪರ್ಕ'] : ['Find jobs', 'Contact support']
  }),
  salary: (kn) => ({
    text: kn
      ? 'ವೇತನವು ಉದ್ಯೋಗ, ಸ್ಥಳ ಮತ್ತು ಉದ್ಯೋಗದಾತರ ಪ್ರಸ್ತಾಪದ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ. ಖಚಿತ ಮೊತ್ತಕ್ಕಾಗಿ ಸಕ್ರಿಯ ಉದ್ಯೋಗ ಪಟ್ಟಿಯಲ್ಲಿರುವ ವೇತನ ಶ್ರೇಣಿಯನ್ನು ನೋಡಿ; ಸಾಮಾನ್ಯ ಅಂದಾಜನ್ನು ಖಚಿತ ವೇತನವೆಂದು ಪರಿಗಣಿಸಬೇಡಿ.'
      : 'Pay depends on the specific role, location, and employer offer. For the stated range, check the active job listing; treat general estimates as estimates, not a guaranteed salary.',
    actionLink: { text: kn ? 'ಉದ್ಯೋಗಗಳ ವೇತನ ನೋಡಿ' : 'See listed job salaries', url: '/jobs' },
    options: kn ? ['ಸ್ಥಳದ ಪ್ರಕಾರ ಉದ್ಯೋಗ ಹುಡುಕಿ', 'ಸಹಾಯ ಸಂಪರ್ಕ'] : ['Search by location', 'Contact support']
  }),
  employer: (kn) => ({
    text: kn
      ? 'ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಲು ಉದ್ಯೋಗದಾತರಾಗಿ ಪ್ರವೇಶಿಸಿ, ಕಂಪನಿ ವಿವರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ಪೋಸ್ಟ್ ಉದ್ಯೋಗ ಫಾರ್ಮ್ ಸಲ್ಲಿಸಿ. ಪ್ರಕಟಣೆಗೆ ಸಕ್ರಿಯ ನೇಮಕಾತಿ ಯೋಜನೆ ಹಾಗೂ ಲಭ್ಯವಿರುವ ಕ್ರೆಡಿಟ್ ಅಥವಾ ಹುದ್ದೆ ಸ್ಲಾಟ್ ಅಗತ್ಯ. ಕಂಪನಿ ಪರಿಶೀಲನೆ ಅಥವಾ ನಿರ್ವಾಹಕರ ಅನುಮೋದನೆ ಬಾಕಿ ಇದ್ದರೆ, ಹುದ್ದೆ ಚಾಲಕರಿಗೆ ಕಾಣುವ ಮೊದಲು ಬಾಕಿ ಸ್ಥಿತಿಯಲ್ಲಿರುತ್ತದೆ.'
      : 'Sign in as an employer, complete the company profile, and submit the Post Job form. Publishing requires an active hiring plan and an available credit or job slot. If company verification or moderation is pending, the listing won’t be visible to drivers until it becomes active.',
    actionLink: { text: kn ? 'ಉದ್ಯೋಗ ಪ್ರಕಟಣೆ ತೆರೆಯಿರಿ' : 'Open job posting', url: '/employer/post-job' },
    options: kn ? ['ನೇಮಕಾತಿ ಯೋಜನೆ ಕುರಿತು ಕೇಳಿ', 'ಸಹಾಯ ಸಂಪರ್ಕ'] : ['Ask about hiring plans', 'Contact support']
  }),
  support: (kn) => ({
    text: kn
      ? 'ಖಾತೆ ಅಥವಾ ಉದ್ಯೋಗಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ನಿರ್ದಿಷ್ಟ ಸಮಸ್ಯೆಯನ್ನು ಪರಿಹರಿಸಲು ನಮ್ಮ ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ. ಈ ಸಹಾಯಕ ಖಾತೆಯ ಒಳಗಿನ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸುವುದಿಲ್ಲ.'
      : 'For help with a specific account or listing issue, contact the support team. This assistant cannot inspect private account records.',
    actionLink: { text: kn ? 'ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ' : 'Contact support', url: '/contact' },
    options: kn ? ['ಸಕ್ರಿಯ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ', 'ಅರ್ಜಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ'] : ['Browse active jobs', 'Check an application']
  })
};

export function getAIResponse(userText: string, lang: AppLanguage = 'en'): AIMessage {
  const query = userText.toLocaleLowerCase();
  const intent = intentOrder.find(candidate => INTENT_KEYWORDS[candidate].some(keyword => query.includes(keyword))) || 'fallback';
  const kn = isKannada(lang);
  const response = intent === 'fallback'
    ? {
        text: kn
          ? 'ಈ ಪ್ರಶ್ನೆಗೆ ಇಲ್ಲಿ ಖಚಿತ ಉತ್ತರ ನೀಡಲು ಸಾಕಷ್ಟು ಮಾಹಿತಿ ಇಲ್ಲ. ಖಾತೆ, ಪಾವತಿ ಅಥವಾ ನಿರ್ದಿಷ್ಟ ಉದ್ಯೋಗದ ಬಗ್ಗೆ ಪರಿಶೀಲನೆ ಬೇಕಿದ್ದರೆ ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ.'
          : 'I don’t have enough verified information to answer that here. For account, payment, or listing-specific help, please contact support.',
        options: kn ? ['ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ', 'ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ'] : ['Find jobs', 'Contact support'],
        actionLink: { text: kn ? 'ಬೆಂಬಲ ಸಂಪರ್ಕ' : 'Contact support', url: '/contact' }
      }
    : messagesByIntent[intent](kn);

  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    text: response.text,
    timestamp: kn ? 'ಈಗಷ್ಟೇ' : 'Just now',
    options: response.options,
    actionLink: response.actionLink
  };
}

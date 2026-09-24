import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'en' | 'kn';

const STORAGE_KEY = 'driverhub_app_language';

// Exact & phrase dictionary for English -> Kannada (ಕನ್ನಡ)
const EN_TO_KN: Record<string, string> = {
  // Navbar
  'Home': 'ಮುಖಪುಟ',
  'HOME': 'ಮುಖಪುಟ',
  'Find Jobs': 'ಉದ್ಯೋಗ ಹುಡುಕಿ',
  'FIND JOBS': 'ಉದ್ಯೋಗ ಹುಡುಕಿ',
  'Top Employers': 'ಪ್ರಮುಖ ಕಂಪನಿಗಳು',
  'TOP EMPLOYERS': 'ಪ್ರಮುಖ ಕಂಪನಿಗಳು',
  'About': 'ನಮ್ಮ ಬಗ್ಗೆ',
  'ABOUT': 'ನಮ್ಮ ಬಗ್ಗೆ',
  'Contact': 'ಸಂಪರ್ಕಿಸಿ',
  'CONTACT': 'ಸಂಪರ್ಕಿಸಿ',
  'Sign In': 'ಲಾಗಿನ್',
  'SIGN IN': 'ಲಾಗಿನ್',
  'Register': 'ನೋಂದಣಿ',
  'REGISTER': 'ನೋಂದಣಿ',
  'Post a new job': 'ಹೊಸ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡಿ',
  '💳 Available credits': '💳 ಲಭ್ಯವಿರುವ ಕ್ರೆಡಿಟ್ಸ್',
  'Professional Recruitment Network': 'ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲ',

  // Home Hero (Pic 1 & Pic 3)
  "India's #1 Professional Driver Recruitment Network": 'ಭಾರತದ #1 ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲ',
  'Drive Your Career Forward with': 'ನಿಮ್ಮ ವೃತ್ತಿಜೀವನವನ್ನು ಮುನ್ನಡೆಸಿ -',
  'Driver Hub': 'ಡ್ರೈವರ್ ಹಬ್ (Driver Hub)',
  'Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.':
    'ಪರಿಶೀಲಿಸಿದ ವಾಣಿಜ್ಯ ಮತ್ತು ವೈಯಕ್ತಿಕ ಚಾಲಕರನ್ನು ನೇರವಾಗಿ ಪ್ರಮುಖ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಕಂಪನಿಗಳು, ಕಾರ್ಪೊರೇಟ್ ಉದ್ಯೋಗದಾತರು ಮತ್ತು ವಾಹನ ಮಾಲೀಕರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ. ನೇರ ನೇಮಕಾತಿ, ಪರಿಶೀಲಿಸಿದ ಲೈಸೆನ್ಸ್, ಶೂನ್ಯ ಏಜೆನ್ಸಿ ಕಮಿಷನ್.',
  'Direct Hiring': 'ನೇರ ನೇಮಕಾತಿ',
  '100% RTO Verified': '100% RTO ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  '₹25k - ₹50k/mo Salary': '₹25k - ₹50k/ತಿಂಗಳ ವೇತನ',
  'Zero Commission': 'ಶೂನ್ಯ ಕಮಿಷನ್',
  'All Driver Types': 'ಎಲ್ಲಾ ಚಾಲಕ ವಿಭಾಗಗಳು',
  'Search': 'ಹುಡುಕಿ',
  'Search Jobs': 'ಕೆಲಸ ಹುಡುಕಿ',
  'Trending:': 'ಟ್ರೆಂಡಿಂಗ್:',
  'Interstate HMV': 'ಅಂತಾರಾಜ್ಯ HMV ಟ್ರಕ್',
  'Bengaluru Sedans': 'ಬೆಂಗಳೂರು ಕ್ಯಾಬ್ / ಸೆಡಾನ್',
  'Hyperlocal Delivery': 'ಸ್ಥಳೀಯ ಡೆಲಿವರಿ ವ್ಯಾನ್',
  'School Buses': 'ಶಾಲಾ ಬಸ್ ಚಾಲಕರು',
  'Verified Drivers': 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕರು',
  'Fleet & Corporate Employers': 'ಫ್ಲೀಟ್ ಮತ್ತು ಕಾರ್ಪೊರೇಟ್ ಕಂಪನಿಗಳು',
  'Active Job Openings': 'ಸಕ್ರಿಯ ಉದ್ಯೋಗಾವಕಾಶಗಳು',
  'Placement Success Rate': 'ನೇಮಕಾತಿ ಯಶಸ್ಸಿನ ದರ',

  // Home Sections
  'Explore by Vehicle & License Category': 'ವಾಹನ ಮತ್ತು ಲೈಸೆನ್ಸ್ ವಿಭಾಗದ ಮೂಲಕ ಹುಡುಕಿ',
  'Featured Driver Openings': 'ಪ್ರಮುಖ ಚಾಲಕ ಉದ್ಯೋಗಾವಕಾಶಗಳು',
  'View All Jobs': 'ಎಲ್ಲಾ ಕೆಲಸಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'Apply Now': 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
  'View Details': 'ವಿವರಗಳನ್ನು ನೋಡಿ',
  'Full-time': 'ಪೂರ್ಣ ಸಮಯ (Full-time)',
  'Part-time': 'ಅರೆಕಾಲಿಕ (Part-time)',
  'Contract': 'ಗುತ್ತಿಗೆ (Contract)',
  'Immediate Joining': 'ತಕ್ಷಣ ಸೇರ್ಪಡೆ',
  'Verified Employer': 'ಪರಿಶೀಲಿಸಿದ ಉದ್ಯೋಗದಾತ',
  'Verified Driver': 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕ',

  // Sidebar & Portals
  'Dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  'Jobs': 'ಉದ್ಯೋಗಗಳು',
  'Database': 'ಚಾಲಕರ ಡೇಟಾಬೇಸ್',
  'Search Candidates': 'ಚಾಲಕರನ್ನು ಹುಡುಕಿ',
  'Saved Searches': 'ಉಳಿಸಿದ ಹುಡುಕಾಟಗಳು',
  'Unlocked Candidates': 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರು',
  'Applications Pipeline': 'ಅರ್ಜಿಗಳ ಪಟ್ಟಿ',
  'Reports': 'ವರದಿಗಳು',
  'Credits & Usage': 'ಕ್ರೆಡಿಟ್ಸ್ ಮತ್ತು ಬಳಕೆ',
  'Billing': 'ಬಿಲ್ಲಿಂಗ್',
  'Messages': 'ಸಂದೇಶಗಳು',
  'Company Profile': 'ಕಂಪನಿ ಪ್ರೊಫೈಲ್',
  'Notifications': 'ಅಧಿಸೂಚನೆಗಳು',
  'Help & Support': 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
  'Contact Sales': 'ಸೇಲ್ಸ್ ಸಂಪರ್ಕಿಸಿ',
  'View plans': 'ಪ್ಲಾನ್‌ಗಳನ್ನು ನೋಡಿ',
  'Sign Out': 'ಲಾಗ್ ಔಟ್',
  'Sign out': 'ಲಾಗ್ ಔಟ್',
  'My Applications': 'ನನ್ನ ಅರ್ಜಿಗಳು',
  'Saved Jobs': 'ಉಳಿಸಿದ ಕೆಲಸಗಳು',
  'My Profile': 'ನನ್ನ ಪ್ರೊಫೈಲ್',
  'Documents & License': 'ದಾಖಲೆಗಳು ಮತ್ತು ಲೈಸೆನ್ಸ್',
  'Account Settings': 'ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  'Analytics Dashboard': 'ಅನಾಲಿಟಿಕ್ಸ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  'Job Moderation Queue': 'ಉದ್ಯೋಗ ಅನುಮೋದನೆ ಪಟ್ಟಿ',
  'Candidate Management': 'ಚಾಲಕರ ನಿರ್ವಹಣೆ',
  'Employer Verification': 'ಕಂಪನಿ ಪರಿಶೀಲನೆ',
  'Global Applications': 'ಎಲ್ಲಾ ಅರ್ಜಿಗಳು',
  'System Configuration': 'ಸಿಸ್ಟಮ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',

  // Employer Database & Actions
  'Modify search': 'ಹುಡುಕಾಟ ಬದಲಿಸಿ',
  'Save search': 'ಹುಡುಕಾಟ ಉಳಿಸಿ',
  'Download Excel': 'ಎಕ್ಸೆಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'View Phone Number': 'ಫೋನ್ ಸಂಖ್ಯೆ ವೀಕ್ಷಿಸಿ',
  'Send Message': 'ಸಂದೇಶ ಕಳುಹಿಸಿ',
  'View Full Dossier': 'ಪೂರ್ಣ ಪ್ರೊಫೈಲ್ ನೋಡಿ',
  'Start with new post': 'ಹೊಸ ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಪ್ರಾರಂಭಿಸಿ',
  'Use a job template': 'ಉದ್ಯೋಗ ಟೆಂಪ್ಲೇಟ್ ಬಳಸಿ',
  'Billing profile': 'ಬಿಲ್ಲಿಂಗ್ ಪ್ರೊಫೈಲ್',
  'Billing History': 'ಬಿಲ್ಲಿಂಗ್ ಇತಿಹಾಸ',
  'Update GSTIN / ISD-GSTIN': 'GSTIN ನವೀಕರಿಸಿ',
  'Buy Credits / Upgrade Plan': 'ಕ್ರೆಡಿಟ್ಸ್ ಖರೀದಿಸಿ / ಪ್ಲಾನ್ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ'
};

const PLACEHOLDER_EN_TO_KN: Record<string, string> = {
  "Job title, 'HMV', 'Cab', 'Delivery'...": "ಹುದ್ದೆ, 'HMV', 'ಕ್ಯಾಬ್', 'ಡೆಲಿವರಿ'...",
  'City (Bengaluru, Chennai...)': 'ನಗರ (ಬೆಂಗಳೂರು, ಮೈಸೂರು, ಚೆನ್ನೈ...)'
};

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (text: string) => text
});

const originalTextMap = new WeakMap<Text, string>();
const originalPlaceholderMap = new WeakMap<Element, string>();

function applyDOMTranslation(lang: AppLanguage) {
  if (typeof document === 'undefined') return;

  // 1. Translate Text Nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || parent.hasAttribute('data-no-translate')) {
      continue;
    }

    const currentVal = textNode.nodeValue || '';
    const trimmed = currentVal.trim();
    if (!trimmed) continue;

    if (lang === 'kn') {
      const original = originalTextMap.get(textNode) ?? trimmed;
      if (!originalTextMap.has(textNode)) {
        originalTextMap.set(textNode, trimmed);
      }
      const translated = EN_TO_KN[original];
      if (translated && currentVal !== translated) {
        textNode.nodeValue = currentVal.replace(trimmed, translated);
      }
    } else {
      const original = originalTextMap.get(textNode);
      if (original && trimmed !== original) {
        textNode.nodeValue = original;
      }
    }
  }

  // 2. Translate Input Placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach((el) => {
    const currentPh = el.getAttribute('placeholder') || '';
    if (lang === 'kn') {
      const origPh = originalPlaceholderMap.get(el) ?? currentPh;
      if (!originalPlaceholderMap.has(el)) {
        originalPlaceholderMap.set(el, currentPh);
      }
      if (PLACEHOLDER_EN_TO_KN[origPh]) {
        el.setAttribute('placeholder', PLACEHOLDER_EN_TO_KN[origPh]);
      }
    } else {
      const origPh = originalPlaceholderMap.get(el);
      if (origPh) {
        el.setAttribute('placeholder', origPh);
      }
    }
  });
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'kn' ? 'kn' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (next: AppLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'kn' : 'en');
  };

  const t = (text: string) => {
    if (lang === 'kn' && EN_TO_KN[text]) {
      return EN_TO_KN[text];
    }
    return text;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    applyDOMTranslation(lang);

    const observer = new MutationObserver(() => {
      applyDOMTranslation(lang);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

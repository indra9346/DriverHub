import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'en' | 'kn';

const STORAGE_KEY = 'driverhub_app_language';

// ============================================================================
// COMPREHENSIVE HUMAN-CURATED KANNADA TRANSLATION CATALOG
// ============================================================================
export const KANNADA_CATALOG: Record<string, string> = {
  // Brand & Slogans
  'Driver Hub': 'Driver Hub',
  'DriverHub': 'DriverHub',
  'Professional Recruitment Network': 'ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲ',
  "India's #1 Professional Driver Recruitment Network": 'ಭಾರತದ #1 ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲ',
  'Drive Your Career Forward with': 'ನಿಮ್ಮ ವೃತ್ತಿಜೀವನವನ್ನು ಮುನ್ನಡೆಸಿ -',
  'Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.':
    'ಪರಿಶೀಲಿಸಿದ ವಾಣಿಜ್ಯ ಮತ್ತು ವೈಯಕ್ತಿಕ ಚಾಲಕರನ್ನು ನೇರವಾಗಿ ಪ್ರಮುಖ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಕಂಪನಿಗಳು, ಕಾರ್ಪೊರೇಟ್ ಉದ್ಯೋಗದಾತರು ಮತ್ತು ವಾಹನ ಮಾಲೀಕರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ. ನೇರ ನೇಮಕಾತಿ, ಪರಿಶೀಲಿಸಿದ ಲೈಸೆನ್ಸ್, ಶೂನ್ಯ ಏಜೆನ್ಸಿ ಕಮಿಷನ್.',
  'Empowering Commercial Drivers & Connecting Fleet Leaders': 'ವಾಣಿಜ್ಯ ಚಾಲಕರ ಸಬಲೀಕರಣ ಮತ್ತು ಪ್ರಮುಖ ಫ್ಲೀಟ್‌ಗಳ ಜೋಡಣೆ',
  'Driver Hub organizes commercial transport hiring across India. We eliminate exploitative middlemen, verify RTO commercial credentials, and ensure timely, transparent wages with zero broker commissions.':
    'Driver Hub ಭಾರತದಾದ್ಯಂತ ವಾಣಿಜ್ಯ ಸಾರಿಗೆ ನೇಮಕಾತಿಯನ್ನು ಸಂಘಟಿಸುತ್ತದೆ. ಮಧ್ಯವರ್ತಿಗಳ ಶೋಷಣೆಯನ್ನು ತಪ್ಪಿಸಿ, RTO ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಶೂನ್ಯ ಕಮಿಷನ್‌ನೊಂದಿಗೆ ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಪಾರದರ್ಶಕ ವೇತನವನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ.',
  'Get in Touch': 'ಸಂಪರ್ಕಿಸಿ',
  "We're Here to Help Drivers & Fleets 24/7": 'ಚಾಲಕರು ಮತ್ತು ಫ್ಲೀಟ್‌ಗಳಿಗೆ 24/7 ಬೆಂಬಲ ನೀಡಲು ನಾವಿದ್ದೇವೆ',
  'Have questions about job listings, RTO verification, or enterprise fleet hiring? Reach out to our dedicated support desk.':
    'ಉದ್ಯೋಗಾವಕಾಶಗಳು, RTO ಪರಿಶೀಲನೆ ಅಥವಾ ಕಂಪನಿ ನೇಮಕಾತಿ ಕುರಿತು ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ನಮ್ಮ ಬೆಂಬಲ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
  'Central Operations & Helpdesk': 'ಕೇಂದ್ರ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಸಹಾಯ ಕೇಂದ್ರ',
  'Our national dispatch & verification desk is based in Bengaluru with regional support coordinators across South and Western India.':
    'ನಮ್ಮ ರಾಷ್ಟ್ರೀಯ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಪರಿಶೀಲನಾ ಕೇಂದ್ರವು ಬೆಂಗಳೂರಿನಲ್ಲಿದ್ದು, ದಕ್ಷಿಣ ಮತ್ತು ಪಶ್ಚಿಮ ಭಾರತದಾದ್ಯಂತ ಪ್ರಾದೇಶಿಕ ಬೆಂಬಲ ಸಂಯೋಜಕರನ್ನು ಹೊಂದಿದೆ.',
  '24/7 Highway Emergency Assistance': '24/7 ಹೆದ್ದಾರಿ ತುರ್ತು ಸಹಾಯ',
  'For verified drivers currently on interstate transit routes:': 'ಅಂತಾರಾಜ್ಯ ಮಾರ್ಗಗಳಲ್ಲಿರುವ ಪರಿಶೀಲಿಸಿದ ಚಾಲಕರಿಗೆ:',
  'Verified Employer Directory': 'ಪರಿಶೀಲಿಸಿದ ಉದ್ಯೋಗದಾತರ ಡೈರೆಕ್ಟರಿ',
  'Top Logistics & Fleet Partners': 'ಪ್ರಮುಖ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಮತ್ತು ಫ್ಲೀಟ್ ಪಾಲುದಾರರು',
  'Explore verified transport companies, corporate fleets, and schools hiring drivers directly.':
    'ನೇರವಾಗಿ ಚಾಲಕರನ್ನು ನೇಮಿಸಿಕೊಳ್ಳುತ್ತಿರುವ ಪರಿಶೀಲಿಸಿದ ಸಾರಿಗೆ ಕಂಪನಿಗಳು, ಕಾರ್ಪೊರೇಟ್ ಫ್ಲೀಟ್‌ಗಳು ಮತ್ತು ಶಾಲೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.',

  // Navigation Links
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
  'Sign Out': 'ಲಾಗ್ ಔಟ್',
  'Sign out': 'ಲಾಗ್ ಔಟ್',
  'Dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  'Jobs': 'ಉದ್ಯೋಗಗಳು',
  'Candidates': 'ಅಭ್ಯರ್ಥಿಗಳು',
  'Database': 'ಚಾಲಕರ ಡೇಟಾಬೇಸ್',
  'Search Candidates': 'ಚಾಲಕರನ್ನು ಹುಡುಕಿ',
  'Saved Searches': 'ಉಳಿಸಿದ ಹುಡುಕಾಟಗಳು',
  'Unlocked Candidates': 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರು',
  'Applications Pipeline': 'ಅರ್ಜಿಗಳ ಪಟ್ಟಿ',
  'Reports': 'ವರದಿಗಳು',
  'Credits & Usage': 'ಕ್ರೆಡಿಟ್ಸ್ ಮತ್ತು ಬಳಕೆ',
  'Billing': 'ಬಿಲ್ಲಿಂಗ್',
  'Billing & Credits': 'ಬಿಲ್ಲಿಂಗ್ ಮತ್ತು ಕ್ರೆಡಿಟ್ಸ್',
  'Messages': 'ಸಂದೇಶಗಳು',
  'Company Profile': 'ಕಂಪನಿ ಪ್ರೊಫೈಲ್',
  'Notifications': 'ಅಧಿಸೂಚನೆಗಳು',
  'Help & Support': 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',
  'Contact Sales': 'ಸೇಲ್ಸ್ ಸಂಪರ್ಕಿಸಿ',
  'View plans': 'ಪ್ಲಾನ್‌ಗಳನ್ನು ನೋಡಿ',
  'My Applications': 'ನನ್ನ ಅರ್ಜಿಗಳು',
  'Saved Jobs': 'ಉಳಿಸಿದ ಕೆಲಸಗಳು',
  'My Profile': 'ನನ್ನ ಪ್ರೊಫೈಲ್',
  'View profile': 'ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಿ',
  'Documents & License': 'ದಾಖಲೆಗಳು ಮತ್ತು ಲೈಸೆನ್ಸ್',
  'Account Settings': 'ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  'Analytics Dashboard': 'ಅನಾಲಿಟಿಕ್ಸ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  'Job Moderation Queue': 'ಉದ್ಯೋಗ ಅನುಮೋದನೆ ಪಟ್ಟಿ',
  'Candidate Management': 'ಚಾಲಕರ ನಿರ್ವಹಣೆ',
  'Driver Document Reviews': 'ಚಾಲಕರ ದಾಖಲೆ ಪರಿಶೀಲನೆ',
  'Employer Verification': 'ಕಂಪನಿ ಪರಿಶೀಲನೆ',
  'Global Applications': 'ಎಲ್ಲಾ ಅರ್ಜಿಗಳು',
  'Admin Account & Access': 'ಅಡ್ಮಿನ್ ಖಾತೆ ಮತ್ತು ಪ್ರವೇಶ',
  'Moderation Queue': 'ಅನುಮೋದನೆ ಪಟ್ಟಿ',
  'Driver Database': 'ಚಾಲಕರ ಡೇಟಾಬೇಸ್',
  'Post a new job': 'ಹೊಸ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡಿ',
  'Post Vacancy': 'ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಮಾಡಿ',
  'Post Driver Vacancy': 'ಚಾಲಕರ ಹುದ್ದೆ ಪೋಸ್ಟ್ ಮಾಡಿ',
  'Manage Jobs': 'ಉದ್ಯೋಗಗಳ ನಿರ್ವಹಣೆ',
  'Manage Vacancy': 'ಹುದ್ದೆ ನಿರ್ವಹಿಸಿ',
  'View Pipeline': 'ಅರ್ಜಿಗಳ ಪಟ್ಟಿ ನೋಡಿ',
  'Staff & Admin Portal': 'ಅಡ್ಮಿನ್ ಪೋರ್ಟಲ್',
  'Admin Login': 'ಅಡ್ಮಿನ್ ಲಾಗಿನ್',
  'Driver Portal': 'ಚಾಲಕರ ಪೋರ್ಟಲ್',
  'Employer Desk': 'ಉದ್ಯೋಗದಾತರ ಪೋರ್ಟಲ್',
  'Admin Control': 'ಅಡ್ಮಿನ್ ನಿಯಂತ್ರಣ',
  'Superadmin': 'ಸೂಪರ್ ಅಡ್ಮಿನ್',
  'Verified Employer': 'ಪರಿಶೀಲಿಸಿದ ಉದ್ಯೋಗದಾತ',
  'Verified Driver': 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕ',
  'Verified Partner': 'ಪರಿಶೀಲಿಸಿದ ಪಾಲುದಾರ',
  '100% License Verified': '100% ಲೈಸೆನ್ಸ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  'Direct Employer Hiring': 'ನೇರ ಉದ್ಯೋಗದಾತ ನೇಮಕಾತಿ',
  'Direct Hiring': 'ನೇರ ನೇಮಕಾತಿ',
  '100% RTO Verified': '100% RTO ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  'Zero Commission': 'ಶೂನ್ಯ ಕಮಿಷನ್',
  '💳 Available credits': '💳 ಲಭ್ಯವಿರುವ ಕ್ರೆಡಿಟ್ಸ್',

  // Categories & Specializations
  'Driver Categories': 'ಚಾಲಕರ ವಿಭಾಗಗಳು',
  'Heavy Truck (HMV)': 'ಭಾರಿ ಟ್ರಕ್ ಚಾಲಕ (HMV)',
  'Heavy Truck': 'ಭಾರಿ ಟ್ರಕ್ (HMV)',
  'HMV': 'HMV ಭಾರಿ ವಾಹನ',
  'LMV': 'LMV ಲಘು ವಾಹನ',
  'LMV Chauffeur': 'LMV ಕಾರು ಚಾಲಕ (Chauffeur)',
  'Personal & Sedan Chauffeur': 'ವೈಯಕ್ತಿಕ ಮತ್ತು ಸೆಡಾನ್ ಚಾಲಕ',
  'Cab Driver': 'ಕ್ಯಾಬ್ ಚಾಲಕ',
  'App-based Cab Driver': 'ಆ್ಯಪ್ ಆಧಾರಿತ ಕ್ಯಾಬ್ ಚಾಲಕ',
  'Delivery Driver': 'ಡೆಲಿವರಿ ಚಾಲಕ',
  'Hyperlocal Delivery Pilot': 'ಸ್ಥಳೀಯ ಡೆಲಿವರಿ ಚಾಲಕ',
  'Bus Driver': 'ಬಸ್ ಚಾಲಕ',
  'School & Staff Bus Driver': 'ಶಾಲಾ ಮತ್ತು ಸಿಬ್ಬಂದಿ ಬಸ್ ಚಾಲಕ',
  'School / Staff Bus': 'ಶಾಲಾ / ಸಿಬ್ಬಂದಿ ಬಸ್',
  'Trailer Driver': 'ಟ್ರೈಲರ್ ಚಾಲಕ',
  '40ft Container Trailer Driver': '40 ಅಡಿ ಕಂಟೈನರ್ ಟ್ರೈಲರ್ ಚಾಲಕ',
  'Tempo Driver': 'ಟೆಂಪೋ ಚಾಲಕ',
  'Tempo / Ace': 'ಟೆಂಪೋ / ಟಾಟಾ ಏಸ್',
  'Personal Driver': 'ವೈಯಕ್ತಿಕ ಚಾಲಕ',
  'Commercial Driver': 'ವಾಣಿಜ್ಯ ಚಾಲಕ',
  'LMV-Transport': 'LMV ಸಾರಿಗೆ',
  'HMV-Transport': 'HMV ಸಾರಿಗೆ',
  'Multi-axle, interstate & container transport': 'ಮಲ್ಟಿ-ಆಕ್ಸಿಲ್, ಅಂತಾರಾಜ್ಯ ಮತ್ತು ಕಂಟೈನರ್ ಸಾರಿಗೆ',
  'Personal, corporate sedans & luxury fleet': 'ವೈಯಕ್ತಿಕ, ಕಾರ್ಪೊರೇಟ್ ಸೆಡಾನ್ ಮತ್ತು ಐಷಾರಾಮಿ ವಾಹನಗಳು',
  'App-based ride hailing & airport transfers': 'ಕ್ಯಾಬ್ ಸೇವೆ ಮತ್ತು ವಿಮಾನ ನಿಲ್ದಾಣ ಸಾರಿಗೆ',
  'E-commerce vans, 2-wheelers & hyperlocal': 'ಇ-ಕಾಮರ್ಸ್ ವ್ಯಾನ್ ಮತ್ತು ಸ್ಥಳೀಯ ವಿತರಣೆ',
  'Passenger transit & student shuttle': 'ಪ್ರಯಾಣಿಕರ ಸಾರಿಗೆ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ಬಸ್',
  'Intra-city distribution & cargo logistics': 'ನಗರದೊಳಗಿನ ಸರಕು ವಿತರಣೆ ಮತ್ತು ಲಾಜಿಸ್ಟಿಕ್ಸ್',
  'Port container clearing & heavy haulage': 'ಬಂದರು ಕಂಟೈನರ್ ಮತ್ತು ಭಾರಿ ಸರಕು ಸಾಗಣೆ',
  'Tour operations & outstation rentals': 'ಪ್ರವಾಸ ಮತ್ತು ಹೊರರಾಜ್ಯ ಬಾಡಿಗೆ ಸೇವೆ',

  // Job Search, Filters & Sliders
  'Pan-India Verified Driver Recruitment': 'ಅಖಿಲ ಭಾರತ ಪರಿಶೀಲಿಸಿದ ಚಾಲಕರ ನೇಮಕಾತಿ',
  'Browse Driving Vacancies Across All Indian States': 'ಭಾರತದ ಎಲ್ಲಾ ರಾಜ್ಯಗಳ ಚಾಲಕ ಉದ್ಯೋಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'Pan-India Job Filters': 'ಅಖಿಲ ಭಾರತ ಉದ್ಯೋಗ ಫಿಲ್ಟರ್‌ಗಳು',
  'Search Keywords / Roles': 'ಕೀವರ್ಡ್‌ಗಳು / ಹುದ್ದೆಯ ಹೆಸರು',
  'Indian State / Union Territory': 'ಭಾರತದ ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶ',
  'City / Operating District': 'ನಗರ / ಕಾರ್ಯಾಚರಣಾ ಜಿಲ್ಲೆ',
  'Logistics Corridor / Area': 'ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಕಾರಿಡಾರ್ / ಪ್ರದೇಶ',
  'Driver License / Vehicle Category': 'ಚಾಲನಾ ಪರವಾನಗಿ / ವಾಹನದ ವಿಭಾಗ',
  'Must-Have Skill': 'ಅಗತ್ಯವಿರುವ ಕೌಶಲ್ಯ',
  'Shift / Employment Type': 'ಪಾಳಿ / ಉದ್ಯೋಗದ ವಿಧ',
  'Minimum Guaranteed Salary': 'ಕನಿಷ್ಠ ಖಾತರಿ ವೇತನ',
  'Min Salary': 'ಕನಿಷ್ಠ ವೇತನ',
  'Any': 'ಯಾವುದಾದರೂ',
  'Reset': 'ರೀಸೆಟ್',
  'Clear': 'ತೆರವುಗೊಳಿಸಿ',
  'Clear All': 'ಎಲ್ಲವನ್ನೂ ತೆರವುಗೊಳಿಸಿ',
  'All States': 'ಎಲ್ಲಾ ರಾಜ್ಯಗಳು',
  'All Cities': 'ಎಲ್ಲಾ ನಗರಗಳು',
  'All Indian States & UTs': 'ಎಲ್ಲಾ ಭಾರತೀಯ ರಾಜ್ಯಗಳು & UTಗಳು',
  'All Major Indian Cities': 'ಎಲ್ಲಾ ಪ್ರಮುಖ ಭಾರತೀಯ ನಗರಗಳು',
  'All Vehicle Categories': 'ಎಲ್ಲಾ ವಾಹನ ವಿಭಾಗಗಳು',
  'Any Driver Skill': 'ಯಾವುದೇ ಕೌಶಲ್ಯ',
  'Any Type': 'ಯಾವುದೇ ವಿಧ',
  'Full-time': 'ಪೂರ್ಣಾವಧಿ',
  'Part-time': 'ಅರೆಕಾಲಿಕ',
  'Contract': 'ಗುತ್ತಿಗೆ',
  'Full-time Regular': 'ನಿಯಮಿತ ಪೂರ್ಣಾವಧಿ',
  'Part-time / Split Shift': 'ಅರೆಕಾಲಿಕ / ವಿಭಜಿತ ಪಾಳಿ',
  'Contract / Trip-based Freight': 'ಗುತ್ತಿಗೆ / ಟ್ರಿಪ್ ಆಧಾರಿತ ಸರಕು ಸಾಗಣೆ',
  'Active Filters': 'ಸಕ್ರಿಯ ಫಿಲ್ಟರ್‌ಗಳು',
  'Search': 'ಹುಡುಕಿ',
  'Search Jobs': 'ಉದ್ಯೋಗ ಹುಡುಕಿ',
  'Browse Jobs': 'ಉದ್ಯೋಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'View All Jobs': 'ಎಲ್ಲಾ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ',
  'View Job': 'ಉದ್ಯೋಗ ವೀಕ್ಷಿಸಿ',
  'View Details': 'ವಿವರಗಳನ್ನು ನೋಡಿ',
  'Apply Now': 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
  'Applied': 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
  'Application Submitted': 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
  'No driving vacancies matching your search': 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಉದ್ಯೋಗಗಳು ಕಂಡುಬಂದಿಲ್ಲ',
  'Try clearing your state/city filter or search across all Indian states to see nationwide logistics openings.':
    'ರಾಜ್ಯ/ನಗರ ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ ಅಥವಾ ರಾಷ್ಟ್ರವ್ಯಾಪಿ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಲು ಹುಡುಕಾಟವನ್ನು ಬದಲಾಯಿಸಿ.',
  'View All Pan-India Vacancies': 'ಎಲ್ಲಾ ಭಾರತೀಯ ಉದ್ಯೋಗಾವಕಾಶಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'Previous': 'ಹಿಂದಿನ',
  'Next': 'ಮುಂದಿನ',
  'Page': 'ಪುಟ',
  'of': 'ರ',
  'Results': 'ಫಲಿತಾಂಶಗಳು',
  'Vacancies': 'ಖಾಲಿ ಹುದ್ದೆಗಳು',
  'Apply Filters': 'ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಅನ್ವಯಿಸಿ',
  'Filters': 'ಫಿಲ್ಟರ್‌ಗಳು',

  // Status Badges & Labels
  'Active & Verified': 'ಸಕ್ರಿಯ ಮತ್ತು ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  'Active': 'ಸಕ್ರಿಯ',
  'Pending Approval': 'ಅನುಮೋದನೆ ಬಾಕಿ ಇದೆ',
  'Pending': 'ಬಾಕಿ ಇದೆ',
  'Closed': 'ಮುಕ್ತಾಯಗೊಂಡಿದೆ',
  'Draft': 'ಕರಡು',
  'Under Review': 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
  'Shortlisted': 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಮಾಡಲಾಗಿದೆ',
  'Interview Scheduled': 'ಸಂದರ್ಶನ ನಿಗದಿಯಾಗಿದೆ',
  'Selected / Hired': 'ಆಯ್ಕೆಯಾಗಿದ್ದಾರೆ / ನೇಮಕಗೊಂಡಿದ್ದಾರೆ',
  'Not Selected': 'ಆಯ್ಕೆಯಾಗಿಲ್ಲ',
  'Withdrawn': 'ಹಿಂಪಡೆಯಲಾಗಿದೆ',
  'Verified': 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  'Blocked': 'ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ',
  'Immediate Joining': 'ತಕ್ಷಣ ಸೇರ್ಪಡೆ',
  'Immediate': 'ತಕ್ಷಣ',
  'Flexible': 'ಹೊಂದಿಕೊಳ್ಳುವ',

  // Statistics & Trust Metrics
  'Verified Drivers': 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕರು',
  'Fleet & Corporate Employers': 'ಫ್ಲೀಟ್ ಮತ್ತು ಕಂಪನಿ ಉದ್ಯೋಗದಾತರು',
  'Active Job Openings': 'ಸಕ್ರಿಯ ಉದ್ಯೋಗಾವಕಾಶಗಳು',
  'Placement Success Rate': 'ನೇಮಕಾತಿ ಯಶಸ್ಸಿನ ದರ',
  'Wage Transparency Rate': 'ವೇತನ ಪಾರದರ್ಶಕತೆಯ ದರ',

  // Chatbot & Support Widget (Fully Localized, Non-Fake AI)
  'DriverHub Assistant': 'ಡ್ರೈವರ್ ಹಬ್ ಬೆಂಬಲ ಸಹಾಯಕ',
  'DriverHub Support Assistant': 'ಡ್ರೈವರ್ ಹಬ್ ಬೆಂಬಲ ಸಹಾಯಕ',
  'DriverHub Help': 'ಡ್ರೈವರ್ ಹಬ್ ಸಹಾಯ',
  'Support Assistant': 'ಬೆಂಬಲ ಸಹಾಯಕ',
  'Online': 'ಸಕ್ರಿಯ',
  'ONLINE': 'ಸಕ್ರಿಯ',
  'Driver & job guidance': 'ಚಾಲಕ ಮತ್ತು ಉದ್ಯೋಗ ಮಾರ್ಗದರ್ಶನ',
  'Instant Driver & Job Help': 'ತಕ್ಷಣದ ಚಾಲಕ ಮತ್ತು ಉದ್ಯೋಗ ಸಹಾಯ',
  'AI Support': 'ಬೆಂಬಲ ಸಹಾಯಕ',
  'Recruitment & License Specialist': 'ನೇಮಕಾತಿ ಮತ್ತು ಲೈಸೆನ್ಸ್ ಬೆಂಬಲ',
  'Quick suggestions': 'ತ್ವರಿತ ಸಲಹೆಗಳು:',
  'Quick Suggestions:': 'ತ್ವರಿತ ಸಲಹೆಗಳು:',
  'QUICK SUGGESTIONS:': 'ತ್ವರಿತ ಸಲಹೆಗಳು:',
  'Need live support?': 'ನೇರ ಸಹಾಯ ಬೇಕೇ?',
  'Ask about driver jobs, licenses, salary...': 'ಚಾಲಕರ ಉದ್ಯೋಗಗಳು, ಲೈಸೆನ್ಸ್, ವೇತನ ಕುರಿತು ಕೇಳಿ...',
  'Reset Chat': 'ಸಂಭಾಷಣೆ ಮರುಹೊಂದಿಸಿ',
  'Close': 'ಮುಚ್ಚಿ',
  'Send': 'ಕಳುಹಿಸಿ',
  'Just now': 'ಇದೀಗ',

  // Contact & Support Form
  'Full Name': 'ಪೂರ್ಣ ಹೆಸರು',
  'Phone Number': 'ಫೋನ್ ಸಂಖ್ಯೆ',
  'Email Address': 'ಇಮೇಲ್ ವಿಳಾಸ',
  'Inquiry Subject': 'ವಿಚಾರಣೆಯ ವಿಷಯ',
  'Message': 'ಸಂದೇಶ',
  'Send Inquiry': 'ಸಂದೇಶ ಕಳುಹಿಸಿ',
  'Inquiry Received!': 'ನಿಮ್ಮ ವಿಚಾರಣೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!',
  'Thank you for contacting Driver Hub. A support specialist will review your request and respond within 2 hours.':
    'Driver Hub ಅನ್ನು ಸಂಪರ್ಕಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಮ್ಮ ಬೆಂಬಲ ತಜ್ಞರು ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಪರಿಶೀಲಿಸಿ 2 ಗಂಟೆಗಳ ಒಳಗೆ ಉತ್ತರಿಸುತ್ತಾರೆ.',
  'Send Another Message': 'ಮತ್ತೊಂದು ಸಂದೇಶ ಕಳುಹಿಸಿ',
  'Driver Support Query': 'ಚಾಲಕರ ಬೆಂಬಲ ವಿಚಾರಣೆ',
  'Employer Fleet Hiring': 'ಉದ್ಯೋಗದಾತ ಫ್ಲೀಟ್ ನೇಮಕಾತಿ',
  'Document Verification Help': 'ದಾಖಲೆ ಪರಿಶೀಲನೆ ಸಹಾಯ',
  'Report Listing Issue': 'ಉದ್ಯೋಗ ಪೋಸ್ಟಿಂಗ್ ಸಮಸ್ಯೆ ವರದಿ',
  'Other Query': 'ಇತರ ವಿಚಾರಣೆ',
  'Other': 'ಇತರೆ',

  // Error States, Loading & Fallbacks
  'This page could not be loaded': 'ಪುಟವನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
  'Check your connection and reload. Your account data has not been changed.':
    'ನಿಮ್ಮ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮರುಲೋಡ್ ಮಾಡಿ. ನಿಮ್ಮ ಖಾತೆಯ ಡೇಟಾದಲ್ಲಿ ಯಾವುದೇ ಬದಲಾವಣೆಯಾಗಿಲ್ಲ.',
  'Reload page': 'ಪುಟವನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ',
  'Loading...': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
  'Authenticating...': 'ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
  'No data available': 'ಯಾವುದೇ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ',
  'No notifications right now': 'ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
  'Mark all read': 'ಎಲ್ಲವನ್ನೂ ಓದಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
  'Job vacancy not found': 'ಉದ್ಯೋಗದ ಹುದ್ದೆ ಕಂಡುಬಂದಿಲ್ಲ',
  'This job may have been closed or removed by the employer.': 'ಈ ಉದ್ಯೋಗವನ್ನು ಉದ್ಯೋಗದಾತರು ಮುಕ್ತಾಯಗೊಳಿಸಿರಬಹುದು ಅಥವಾ ತೆಗೆದುಹಾಕಿರಬಹುದು.',
  'Back to Job Search': 'ಉದ್ಯೋಗ ಹುಡುಕಾಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
  'Back to Search Results': 'ಹುಡುಕಾಟ ಫಲಿತಾಂಶಗಳಿಗೆ ಹಿಂತಿರುಗಿ',

  // Auth & Roles
  'Sign In to Driver Hub': 'Driver Hub ಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
  'Admin Portal Sign In': 'ಅಡ್ಮಿನ್ ಪೋರ್ಟಲ್ ಲಾಗಿನ್',
  'Create an Account': 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ',
  'Password': 'ಪಾಸ್‌ವರ್ಡ್',
  'Forgot?': 'ಮರೆತಿರಾ?',
  'Forgot Password?': 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
  'Reset Your Password': 'ಪಾಸ್‌ವರ್ಡ್ ಮರುಹೊಂದಿಸಿ',
  'Verify Your Email': 'ನಿಮ್ಮ ಇಮೇಲ್ ಪರಿಶೀಲಿಸಿ',
  'Choose a New Password': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ',
  'Password Updated': 'ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಲಾಗಿದೆ',
  'Send Recovery Code': 'ರಿಕವರಿ ಕೋಡ್ ಕಳುಹಿಸಿ',
  'Verify Code': 'ಕೋಡ್ ಪರಿಶೀಲಿಸಿ',
  'Update Password': 'ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಿ',
  'Back to Sign In': 'ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ',
  'Create Account': 'ಖಾತೆ ರಚಿಸಿ',
  "Don't have an account?": 'ಖಾತೆ ಇಲ್ಲವೇ?',
  'Already have an account?': 'ಈಗಾಗಲೇ ಖಾತೆ ಹೊಂದಿದ್ದೀರಾ?',
  'Driver': 'ಚಾಲಕ',
  'Employer': 'ಉದ್ಯೋಗದಾತ',
  'Admin': 'ಅಡ್ಮಿನ್',
  'Continue as Driver': 'ಚಾಲಕರಾಗಿ ಮುಂದುವರಿಯಿರಿ',
  'Continue as Employer': 'ಉದ್ಯೋಗದಾತರಾಗಿ ಮುಂದುವರಿಯಿರಿ',

  // Recruitment Portals & Core Modules
  'Recruitment Portals': 'ನೇಮಕಾತಿ ಪೋರ್ಟಲ್‌ಗಳು',
  'Support Desk': 'ಬೆಂಬಲ ವಿಭಾಗ',
  'Privacy Policy': 'ಗೌಪ್ಯತಾ ನೀತಿ',
  'Terms of Service': 'ಸೇವಾ ನಿಯಮಗಳು',
  'Driver Welfare': 'ಚಾಲಕರ ಕಲ್ಯಾಣ',
  'All rights reserved.': 'ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.',
  'Search All Vacancies': 'ಎಲ್ಲಾ ಹುದ್ದೆಗಳನ್ನು ಹುಡುಕಿ',
  'Verified Companies': 'ಪರಿಶೀಲಿಸಿದ ಕಂಪನಿಗಳು',
  'Join as a Candidate': 'ಅಭ್ಯರ್ಥಿಯಾಗಿ ಸೇರಿ',
  'Employer Sign In': 'ಉದ್ಯೋಗದಾತರ ಲಾಗಿನ್',
  'About Safety & Welfare': 'ಸುರಕ್ಷತೆ ಮತ್ತು ಕಲ್ಯಾಣ ಕುರಿತು',

  // Profile & Credentials
  'Driver Profile & Credentials': 'ಚಾಲಕರ ಪ್ರೊಫೈಲ್ ಮತ್ತು ವಿವರಗಳು',
  'Keep your profile and driving license details updated for verified fleet shortlists': 'ಪರಿಶೀಲಿಸಿದ ಫ್ಲೀಟ್ ನೇಮಕಾತಿಗಾಗಿ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಲೈಸೆನ್ಸ್ ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ ಇರಿಸಿ',
  'Personal & Contact Info': 'ವೈಯಕ್ತಿಕ ಮತ್ತು ಸಂಪರ್ಕ ಮಾಹಿತಿ',
  'Full Legal Name': 'ಪೂರ್ಣ ಕಾನೂನುಬದ್ಧ ಹೆಸರು',
  'Phone Number (Verified)': 'ಫೋನ್ ಸಂಖ್ಯೆ (ಪರಿಶೀಲಿಸಲಾಗಿದೆ)',
  'City / Residential Area': 'ನಗರ / ವಾಸಸ್ಥಳದ ಪ್ರದೇಶ',
  'Driving License & Specialization': 'ಚಾಲನಾ ಪರವಾನಗಿ ಮತ್ತು ಪರಿಣತಿ',
  'Primary Driver Category': 'ಮುಖ್ಯ ಚಾಲಕ ವಿಭಾಗ',
  'Driving License Number': 'ಚಾಲನಾ ಪರವಾನಗಿ (DL) ಸಂಖ್ಯೆ',
  'License Expiry Date': 'ಲೈಸೆನ್ಸ್ ಮುಕ್ತಾಯ ದಿನಾಂಕ',
  'Total Driving Experience (Years)': 'ಒಟ್ಟು ಚಾಲನಾ ಅನುಭವ (ವರ್ಷಗಳು)',
  'Expected Monthly Salary (₹)': 'ನಿರೀಕ್ಷಿತ ಮಾಸಿಕ ವೇತನ (₹)',
  'Joining Availability': 'ಕೆಲಸಕ್ಕೆ ಸೇರುವ ಲಭ್ಯತೆ',
  'Skills & Capabilities (comma-separated)': 'ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಸಾಮರ್ಥ್ಯಗಳು (ವಿರಾಮಚಿಹ್ನೆಯೊಂದಿಗೆ)',
  'Driver Bio / Summary': 'ಚಾಲಕರ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ',
  'Past Driving Experience Records': 'ಹಿಂದಿನ ಚಾಲನಾ ಅನುಭವದ ದಾಖಲೆಗಳು',
  'Add Experience': 'ಅನುಭವ ಸೇರಿಸಿ',
  'Add Driving Experience': 'ಚಾಲನಾ ಅನುಭವ ಸೇರಿಸಿ',
  'Save Profile Details': 'ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು ಉಳಿಸಿ',
  'Save Details': 'ವಿವರಗಳನ್ನು ಉಳಿಸಿ',
  'Saving Details...': 'ವಿವರಗಳನ್ನು ಉಳಿಸಲಾಗುತ್ತಿದೆ...',
  'Company / Fleet Name': 'ಕಂಪನಿ / ಫ್ಲೀಟ್ ಹೆಸರು',
  'Role Title': 'ಹುದ್ದೆಯ ಹೆಸರು',
  'Vehicle Model / Type': 'ವಾಹನದ ಮಾದರಿ / ವಿಧ',
  'Duration (Years)': 'ಅವಧಿ (ವರ್ಷಗಳು)',
  'Key Responsibilities': 'ಮುಖ್ಯ ಜವಾಬ್ದಾರಿಗಳು',
  'Cancel': 'ರದ್ದುಮಾಡಿ',
  'Save Experience': 'ಅನುಭವ ಉಳಿಸಿ',
  'No past experience records added yet.': 'ಇನ್ನೂ ಯಾವುದೇ ಹಿಂದಿನ ಅನುಭವದ ದಾಖಲೆಗಳನ್ನು ಸೇರಿಸಲಾಗಿಲ್ಲ.',
  'Changes Saved Successfully!': 'ಬದಲಾವಣೆಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!',

  // Documents & File Uploads
  'Documents & License Verification': 'ದಾಖಲೆಗಳು ಮತ್ತು ಲೈಸೆನ್ಸ್ ಪರಿಶೀಲನೆ',
  'Upload clear scanned copies or photos of your driving license, ID, and certificates. Verified documents increase employer contact rates by 300%.':
    'ನಿಮ್ಮ ಚಾಲನಾ ಪರವಾನಗಿ, ಗುರುತಿನ ಚೀಟಿ ಮತ್ತು ಪ್ರಮಾಣಪತ್ರಗಳ ಸ್ಪಷ್ಟ ಫೋಟೋಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಪರಿಶೀಲಿಸಿದ ದಾಖಲೆಗಳು ನೇಮಕಾತಿಯ ಅವಕಾಶವನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ.',
  'Upload New Document': 'ಹೊಸ ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
  'Document Category': 'ದಾಖಲೆಯ ವರ್ಗ',
  'Select File': 'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ',
  'Upload Document': 'ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
  'Uploading securely…': 'ಸುರಕ್ಷಿತವಾಗಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…',
  'New documents stay pending until DriverHub reviews them.': 'ಹೊಸ ದಾಖಲೆಗಳನ್ನು DriverHub ಪರಿಶೀಲಿಸುವವರೆಗೆ ಬಾಕಿ ಇರುತ್ತವೆ.',
  'Commercial Driving License (Front/Back)': 'ವಾಣಿಜ್ಯ ಚಾಲನಾ ಪರವಾನಗಿ (ಮುಂಭಾಗ/ಹಿಂಭಾಗ)',
  'Driver Resume / CV': 'ಚಾಲಕರ ರೆಸ್ಯೂಮ್ / CV',
  'Aadhaar Card / Government ID': 'ಆಧಾರ್ ಕಾರ್ಡ್ / ಸರ್ಕಾರಿ ID',
  'PAN Card': 'PAN ಕಾರ್ಡ್',
  'Previous Employer Experience Certificate': 'ಹಿಂದಿನ ಉದ್ಯೋಗದಾತರ ಅನುಭವ ಪ್ರಮಾಣಪತ್ರ',
  'Police Clearance Record': 'ಪೊಲೀಸ್ ಪರಿಶೀಲನಾ ದಾಖಲೆ',
  'Medical Fitness / Other Badge': 'ವೈದ್ಯಕೀಯ ಫಿಟ್‌ನೆಸ್ / ಇತರ ಬ್ಯಾಡ್ಜ್',
  'Uploaded Documents': 'ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಗಳು',
  'Encrypted Cloud Storage': 'ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ ಕ್ಲೌಡ್ ಸಂಗ್ರಹಣೆ',
  'No documents uploaded yet. Upload your driving license above.': 'ಇನ್ನೂ ಯಾವುದೇ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾಗಿಲ್ಲ. ನಿಮ್ಮ ಚಾಲನಾ ಪರವಾನಗಿಯನ್ನು ಮೇಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',

  // Driver Dashboard & Metrics
  'Driver account active': 'ಚಾಲಕರ ಖಾತೆ ಸಕ್ರಿಯವಾಗಿದೆ',
  'Complete your driver profile': 'ನಿಮ್ಮ ಚಾಲಕರ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
  'Welcome back': 'ಮರಳಿ ಸ್ವಾಗತ',
  'Profile Completion': 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣತೆ',
  'Upload license documents to reach 100% →': '100% ತಲುಪಲು ಲೈಸೆನ್ಸ್ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ →',
  'Total Applications': 'ಒಟ್ಟು ಅರ್ಜಿಗಳು',
  'Across verified fleets': 'ಪರಿಶೀಲಿಸಿದ ಫ್ಲೀಟ್‌ಗಳಾದ್ಯಂತ',
  'Shortlisted / Interviews': 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ / ಸಂದರ್ಶನಗಳು',
  'Ready for driving trials': 'ಚಾಲನಾ ಪರೀಕ್ಷೆಗೆ ಸಿದ್ಧವಾಗಿದೆ',
  'Saved Vacancies': 'ಉಳಿಸಿದ ಖಾಲಿ ಹುದ್ದೆಗಳು',
  'View bookmarks →': 'ಬುಕ್‌ಮಾರ್ಕ್‌ಗಳನ್ನು ನೋಡಿ →',
  'Manage files →': 'ಫೈಲ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ →',
  'Recent Applications': 'ಇತ್ತೀಚಿನ ಅರ್ಜಿಗಳು',
  "You haven't applied to any driver vacancies yet.": 'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಚಾಲಕ ಹುದ್ದೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿಲ್ಲ.',
  'Explore Open Jobs': 'ಮುಕ್ತ ಉದ್ಯೋಗಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
  'Recent Updates': 'ಇತ್ತೀಚಿನ ಅಪ್‌ಡೇಟ್‌ಗಳು',
  'View Inbox': 'ಇನ್‌ಬಾಕ್ಸ್ ನೋಡಿ',
  'No unread notifications': 'ಯಾವುದೇ ಓದದ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
  'Recommended for Your License & Location': 'ನಿಮ್ಮ ಲೈಸೆನ್ಸ್ ಮತ್ತು ಸ್ಥಳಕ್ಕೆ ಶಿಫಾರಸು ಮಾಡಲಾದ ಉದ್ಯೋಗಗಳು',
  'View All Vacancies →': 'ಎಲ್ಲಾ ಹುದ್ದೆಗಳನ್ನು ನೋಡಿ →',

  // Settings & Security
  'Manage notification alerts and account security credentials': 'ಅಧಿಸೂಚನೆ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಖಾತೆ ಸುರಕ್ಷತೆಯನ್ನು ನಿರ್ವಹಿಸಿ',
  'Preferences saved successfully!': 'ಆದ್ಯತೆಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!',
  'Job Alerts & Updates': 'ಉದ್ಯೋಗ ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಅಪ್‌ಡೇಟ್‌ಗಳು',
  'WhatsApp Instant Alerts': 'WhatsApp ತ್ವರಿತ ಎಚ್ಚರಿಕೆಗಳು',
  'Get notified immediately when an employer shortlists you': 'ಉದ್ಯೋಗದಾತರು ನಿಮ್ಮನ್ನು ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಮಾಡಿದಾಗ ತಕ್ಷಣ ಸೂಚನೆ ಪಡೆಯಿರಿ',
  'SMS Notifications': 'SMS ಅಧಿಸೂಚನೆಗಳು',
  'Receive interview schedules and venue details via SMS': 'ಸಂದರ್ಶನದ ವಿವರಗಳನ್ನು SMS ಮೂಲಕ ಪಡೆಯಿರಿ',
  'Email Digest': 'ಇಮೇಲ್ ಡೈಜೆಸ್ಟ್',
  'Weekly digest of high-paying jobs in your city': 'ನಿಮ್ಮ ನಗರದ ಉತ್ತಮ ವೇತನದ ಉದ್ಯೋಗಗಳ ವಾರದ ಮಾಹಿತಿ',
  'Save Alert Preferences': 'ಎಚ್ಚರಿಕೆಯ ಆದ್ಯತೆಗಳನ್ನು ಉಳಿಸಿ',
  'Password & Security': 'ಪಾಸ್‌ವರ್ಡ್ ಮತ್ತು ಸುರಕ್ಷತೆ',
  'New Password': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
  'Confirm New Password': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
  'Minimum 6 characters': 'ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳು',
  'Re-type new password': 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಮರು-ಟೈಪ್ ಮಾಡಿ',
  'Updating Password...': 'ಪಾಸ್‌ವರ್ಡ್ ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
  'Reset Demo Database State': 'ಡೆಮೊ ಡೇಟಾಬೇಸ್ ಮರುಹೊಂದಿಸಿ',
  'Reverts all jobs, applications, and drivers to default seed': 'ಎಲ್ಲಾ ಉದ್ಯೋಗಗಳು, ಅರ್ಜಿಗಳು ಮತ್ತು ಚಾಲಕರನ್ನು ಪೂರ್ವನಿಯೋಜಿತ ಸ್ಥಿತಿಗೆ ಮರುಹೊಂದಿಸುತ್ತದೆ',
  'Reset Demo Data': 'ಡೆಮೊ ಡೇಟಾ ಮರುಹೊಂದಿಸಿ',

  // Applications Tracking
  'Track status and review interview appointments': 'ಸ್ಥಿತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಸಂದರ್ಶನದ ಸಮಯವನ್ನು ಪರಿಶೀಲಿಸಿ',
  'All': 'ಎಲ್ಲಾ',
  'In Progress': 'ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ',
  'No applications in this category': 'ಈ ವಿಭಾಗದಲ್ಲಿ ಯಾವುದೇ ಅರ್ಜಿಗಳಿಲ್ಲ',
  'Apply to open driver vacancies across India': 'ಭಾರತದಾದ್ಯಂತ ಮುಕ್ತ ಚಾಲಕ ಹುದ್ದೆಗಳಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
  'Search Open Jobs': 'ಮುಕ್ತ ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ',
  'Application ID': 'ಅರ್ಜಿ ID',
  'Withdraw': 'ಹಿಂಪಡೆಯಿರಿ',
  '1. Applied': '1. ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
  '2. Under Review': '2. ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
  '3. Shortlisted': '3. ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಆಗಿದೆ',
  '4. Driving Test / Trial': '4. ಚಾಲನಾ ಪರೀಕ್ಷೆ / ಟ್ರಯಲ್',
  '5. Hired': '5. ನೇಮಕಗೊಂಡಿದ್ದಾರೆ',
  'Employer Message & Instructions': 'ಉದ್ಯೋಗದಾತರ ಸಂದೇಶ ಮತ್ತು ಸೂಚನೆಗಳು',

  // Saved Jobs & Notifications
  'Saved Driving Jobs': 'ಉಳಿಸಿದ ಚಾಲಕ ಉದ್ಯೋಗಗಳು',
  "Bookmarked vacancies you're interested in": 'ನೀವು ಆಸಕ್ತಿ ಹೊಂದಿರುವ ಬುಕ್‌ಮಾರ್ಕ್ ಮಾಡಿದ ಹುದ್ದೆಗಳು',
  'Search more jobs →': 'ಇನ್ನಷ್ಟು ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ →',
  'No saved vacancies yet': 'ಇನ್ನೂ ಯಾವುದೇ ಉಳಿಸಿದ ಹುದ್ದೆಗಳಿಲ್ಲ',
  'Click the bookmark heart on any job card to save it for quick review.': 'ತ್ವರಿತವಾಗಿ ಪರಿಶೀಲಿಸಲು ಯಾವುದೇ ಉದ್ಯೋಗ ಕಾರ್ಡ್‌ನಲ್ಲಿರುವ ಬುಕ್‌ಮಾರ್ಕ್ ಗುರುತನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ.',
  'Notification Center': 'ಅಧಿಸೂಚನೆ ಕೇಂದ್ರ',
  'Application updates and matching driver opportunities': 'ಅರ್ಜಿ ಅಪ್‌ಡೇಟ್‌ಗಳು ಮತ್ತು ಹೊಂದಾಣಿಕೆಯಾಗುವ ಚಾಲಕ ಅವಕಾಶಗಳು',
  'Mark all as read': 'ಎಲ್ಲವನ್ನೂ ಓದಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
  'You have no notifications at this time.': 'ನಿಮಗೆ ಪ್ರಸ್ತುತ ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ.',

  // Direct Messages
  'Direct Hiring Messages': 'ನೇರ ನೇಮಕಾತಿ ಸಂದೇಶಗಳು',
  'Instant communication between verified fleet employers and commercial drivers': 'ಪರಿಶೀಲಿಸಿದ ಫ್ಲೀಟ್ ಉದ್ಯೋಗದಾತರು ಮತ್ತು ವಾಣಿಜ್ಯ ಚಾಲಕರ ನಡುವೆ ನೇರ ಸಂವಹನ',
  'Active Conversations': 'ಸಕ್ರಿಯ ಸಂಭಾಷಣೆಗಳು',
  'Type a message regarding interview slot, documents, or vehicle trial...': 'ಸಂದರ್ಶನದ ಸಮಯ, ದಾಖಲೆಗಳು ಅಥವಾ ವಾಹನ ಪರೀಕ್ಷೆಯ ಕುರಿತು ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...',
  'Sending…': 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…',
  'Select a conversation to begin messaging.': 'ಸಂದೇಶ ಕಳುಹಿಸಲು ಸಂಭಾಷಣೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',

  // Employer Dashboard, Company Profile, Reports & Billing
  'Active Live Jobs': 'ಸಕ್ರಿಯ ನೇರ ಉದ್ಯೋಗಗಳು',
  'Total Applicants': 'ಒಟ್ಟು ಅರ್ಜಿದಾರರು',
  'Shortlisted Drivers': 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಆದ ಚಾಲಕರು',
  'Scheduled for driving trials': 'ಚಾಲನಾ ಪರೀಕ್ಷೆಗೆ ನಿಗದಿಯಾಗಿದೆ',
  'Pending Approvals': 'ಅನುಮೋದನೆ ಬಾಕಿ',
  'Under admin verification': 'ಅಡ್ಮಿನ್ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
  'Manage listings →': 'ಪಟ್ಟಿಯನ್ನು ನಿರ್ವಹಿಸಿ →',
  'Review pipeline →': 'ಅರ್ಜಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ →',
  'Recent Candidate Applications': 'ಇತ್ತೀಚಿನ ಅಭ್ಯರ್ಥಿ ಅರ್ಜಿಗಳು',
  'No applications received yet.': 'ಇನ್ನೂ ಯಾವುದೇ ಅರ್ಜಿಗಳು ಸ್ವೀಕರಿಸಲಾಗಿಲ್ಲ.',
  'Posted Vacancies': 'ಪೋಸ್ಟ್ ಮಾಡಿದ ಹುದ್ದೆಗಳು',
  "You haven't posted any vacancies yet.": 'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಹುದ್ದೆಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿಲ್ಲ.',
  'Post First Job': 'ಮೊದಲ ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಮಾಡಿ',
  'Post New Driver Vacancy': 'ಹೊಸ ಚಾಲಕರ ಹುದ್ದೆ ಪೋಸ್ಟ್ ಮಾಡಿ',
  'Enterprise Company Details': 'ಕಾರ್ಪೊರೇಟ್ ಕಂಪನಿ ವಿವರಗಳು',
  'Industry Sector': 'ಉದ್ಯಮ ಕ್ಷೇತ್ರ',
  'Contact Person': 'ಸಂಪರ್ಕ ವ್ಯಕ್ತಿ',
  'Website URL': 'ವೆಬ್‌ಸೈಟ್ URL',
  'Company Logo URL': 'ಕಂಪನಿ ಲೋಗೋ URL',
  'City': 'ನಗರ',
  'State': 'ರಾಜ್ಯ',
  'Company Description': 'ಕಂಪನಿ ವಿವರಣೆ',
  'Save Company Profile': 'ಕಂಪನಿ ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ',
  'Profile Saved Successfully!': 'ಪ್ರೊಫೈಲ್ ಯಶಸ್ವಿಯಾಗಿ ಉಳಿಸಲಾಗಿದೆ!',
  'Download applications': 'ಅರ್ಜಿಗಳನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'Download applications from last {range}': 'ಕಳೆದ {range} ಅರ್ಜಿಗಳನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'downloadAppsFromLast': 'ಕಳೆದ {range} ಅರ್ಜಿಗಳನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'downloadAppsDesc': 'ನಿಮ್ಮ ಎಲ್ಲಾ ಸಕ್ರಿಯ ಮತ್ತು ಮುಕ್ತಾಯಗೊಂಡ ಉದ್ಯೋಗಗಳಲ್ಲಿ ಸ್ವೀಕರಿಸಿದ ಚಾಲಕರ ಅರ್ಜಿಗಳನ್ನು ಒಂದೇ ವರದಿಯಲ್ಲಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ ({count} ದಾಖಲೆಗಳು ಸಿದ್ಧವಾಗಿವೆ).',
  'Back': 'ಹಿಂದೆ',
  'Download now': 'ಈಗಲೇ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'View Report': 'ವರದಿ ವೀಕ್ಷಿಸಿ',
  'Unlocked Database Drivers': 'ಡೇಟಾಬೇಸ್‌ನಿಂದ ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರು',
  'View Unlocked Drivers': 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರನ್ನು ನೋಡಿ',
  'Contact sales team': 'ಸೇಲ್ಸ್ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ',
  'Billing profile': 'ಬಿಲ್ಲಿಂಗ್ ಪ್ರೊಫೈಲ್',
  'Update GSTIN / ISD-GSTIN': 'GSTIN / ISD-GSTIN ನವೀಕರಿಸಿ',
  'Billing History': 'ಬಿಲ್ಲಿಂಗ್ ಇತಿಹಾಸ',
  'Buy Credits / Upgrade Plan': 'ಕ್ರೆಡಿಟ್ಸ್ ಖರೀದಿಸಿ / ಪ್ಲಾನ್ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
  'Plan details': 'ಪ್ಲಾನ್ ವಿವರಗಳು',
  'Applies until': 'ಅನ್ವಯವಾಗುವ ದಿನಾಂಕ',
  'Amount': 'ಮೊತ್ತ',
  'Status': 'ಸ್ಥಿತಿ',
  'Action': 'ಕ್ರಿಯೆ',
  'Contact us': 'ಸಂಪರ್ಕಿಸಿ',
  'Success': 'ಯಶಸ್ವಿ',
  'Failed': 'ವಿಫಲವಾಗಿದೆ',
  'Available credits:': 'ಲಭ್ಯವಿರುವ ಕ್ರೆಡಿಟ್ಸ್:',
  'Start with new post': 'ಹೊಸ ಪೋಸ್ಟ್‌ನೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಿ',
  'Use our step-by-step blank form to create your driver job': 'ಹಂತ-ಹಂತದ ಫಾರ್ಮ್ ಬಳಸಿ ಚಾಲಕರ ಉದ್ಯೋಗ ರಚಿಸಿ',
  'Use a job template': 'ಉದ್ಯೋಗ ಟೆಂಪ್ಲೇಟ್ ಬಳಸಿ',
  'Save time and hire the right drivers using ready templates': 'ಸಿದ್ಧ ಟೆಂಪ್ಲೇಟ್‌ಗಳನ್ನು ಬಳಸಿ ಸಮಯ ಉಳಿಸಿ',
  'Save 50% more time': '50% ಹೆಚ್ಚು ಸಮಯ ಉಳಿಸಿ',
  'All Filters': 'ಎಲ್ಲಾ ಫಿಲ್ಟರ್‌ಗಳು',
  'Under Admin Review': 'ಅಡ್ಮಿನ್ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
  'Expired': 'ಮುಕ್ತಾಯಗೊಂಡಿದೆ',
  'Select Plan': 'ಪ್ಲಾನ್ ಆಯ್ಕೆಮಾಡಿ',
  'Applied to job': 'ಉದ್ಯೋಗಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
  'Active leads': 'ಸಕ್ರಿಯ ಲೀಡ್‌ಗಳು',
  'Database matches': 'ಡೇಟಾಬೇಸ್ ಹೊಂದಾಣಿಕೆಗಳು',
  'Unlock matching drivers →': 'ಹೊಂದಾಣಿಕೆಯಾಗುವ ಚಾಲಕರನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಿ →',
  'View Public Job Page': 'ಸಾರ್ವಜನಿಕ ಉದ್ಯೋಗ ಪುಟ ನೋಡಿ',
  'View Database Matches': 'ಡೇಟಾಬೇಸ್ ಹೊಂದಾಣಿಕೆಗಳನ್ನು ನೋಡಿ',
  'View Applications': 'ಅರ್ಜಿಗಳನ್ನು ನೋಡಿ',
  'View Applicants': 'ಅರ್ಜಿದಾರರನ್ನು ನೋಡಿ',
  'Close / Pause Job': 'ಉದ್ಯೋಗ ಮುಕ್ತಾಯ / ಸ್ಥಗಿತಗೊಳಿಸಿ',
  'Publish / Reopen Job (1 Credit)': 'ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಿ / ಮರುಪ್ರಾರಂಭಿಸಿ (1 ಕ್ರೆಡಿಟ್)',
  'Approve & Make Live': 'ಅನುಮೋದಿಸಿ ಮತ್ತು ಲೈವ್ ಮಾಡಿ',
  'Instant Approve Live': 'ತಕ್ಷಣವೇ ಲೈವ್ ಅನುಮೋದಿಸಿ',

  // Admin Portal & Moderation
  'Superadmin Portal': 'ಸೂಪರ್ ಅಡ್ಮಿನ್ ಪೋರ್ಟಲ್',
  'Driver Hub Administration & Moderation': 'Driver Hub ಆಡಳಿತ ಮತ್ತು ಪರಿಶೀಲನೆ',
  'Real-time platform overview, moderation queues, and safety compliance audits': 'ನೈಜ-ಸಮಯದ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ವಿವರ, ಪರಿಶೀಲನೆ ಪಟ್ಟಿ ಮತ್ತು ಸುರಕ್ಷತಾ ಲೆಕ್ಕಪರಿಶೋಧನೆ',
  'Review Pending Jobs': 'ಬಾಕಿ ಇರುವ ಉದ್ಯೋಗಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
  'Total Drivers': 'ಒಟ್ಟು ಚಾಲಕರು',
  'Manage candidates →': 'ಚಾಲಕರನ್ನು ನಿರ್ವಹಿಸಿ →',
  'Registered Fleets': 'ನೋಂದಾಯಿತ ಫ್ಲೀಟ್‌ಗಳು',
  'Verify companies →': 'ಕಂಪನಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ →',
  'Requires action →': 'ಕ್ರಮ ಅಗತ್ಯವಿದೆ →',
  'Moderate Queue': 'ಪರಿಶೀಲನಾ ಪಟ್ಟಿ',
  'All posted jobs have been reviewed!': 'ಎಲ್ಲಾ ಪೋಸ್ಟ್ ಮಾಡಿದ ಉದ್ಯೋಗಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ!',
  'Review & Approve': 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಅನುಮೋದಿಸಿ',
  'Employer Accounts': 'ಉದ್ಯೋಗದಾತ ಖಾತೆಗಳು',
  'View All': 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ'
};

// ============================================================================
// DYNAMIC PATTERN RULES (Exact regex matches for counts, salaries, etc.)
// ============================================================================
const DYNAMIC_RULES: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^(\d+)\s+Open\s+Jobs?$/i, (_, n) => `${n} ಮುಕ್ತ ಉದ್ಯೋಗಗಳು`],
  [/^(\d+)\s+Vacancies$/i, (_, n) => `${n} ಖಾಲಿ ಹುದ್ದೆಗಳು`],
  [/^(\d+)\s+Years?\s+Exp$/i, (_, n) => `${n} ವರ್ಷಗಳ ಅನುಭವ`],
  [/^(\d+)\s+Years?\s+Experience$/i, (_, n) => `${n} ವರ್ಷಗಳ ಅನುಭವ`],
  [/^Exp:\s*(.+)$/i, (_, exp) => `ಅನುಭವ: ${exp}`],
  [/^Posted\s+(.+)$/i, (_, d) => `ಪೋಸ್ಟ್ ದಿನಾಂಕ: ${d}`],
  [/^Page\s+(\d+)\s+of\s+(\d+)\s+\((\d+)\s+Vacancies\)$/i, (_, p, total, v) => `ಪುಟ ${p} / ${total} (${v} ಹುದ್ದೆಗಳು)`],
  [/^Active Filters\s+\((\d+)\s+Results\):$/i, (_, n) => `ಸಕ್ರಿಯ ಫಿಲ್ಟರ್‌ಗಳು (${n} ಫಲಿತಾಂಶಗಳು):`],
  [/^Filters\s+\((\d+)\)$/i, (_, n) => `ಫಿಲ್ಟರ್‌ಗಳು (${n})`],
  [/^All Indian States & UTs\s+\((\d+)\s+Jobs\)$/i, (_, n) => `ಎಲ್ಲಾ ಭಾರತೀಯ ರಾಜ್ಯಗಳು & UTಗಳು (${n} ಉದ್ಯೋಗಗಳು)`],
  [/^₹\s*([\d,]+)\s*-\s*₹\s*([\d,]+)\s*\/\s*mo$/i, (_, min, max) => `₹${min} - ₹${max} / ತಿಂಗಳು`],
  [/^₹\s*([\d,]+)\s*\+\s*\/\s*mo$/i, (_, amt) => `₹${amt}+/ತಿಂಗಳು`],
  [/^₹\s*([\d,]+)\s*\+$/i, (_, amt) => `₹${amt}+`],
  [/^Expected:\s*₹([\d,]+)\s*\/\s*mo$/i, (_, amt) => `ನಿರೀಕ್ಷಿತ: ₹${amt}/ತಿಂಗಳು`],
  [/^View All\s+(\d+)\s+Jobs$/i, (_, n) => `ಎಲ್ಲಾ ${n} ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ`],
  [/^(\d+)\s+new$/i, (_, n) => `${n} ಹೊಸ`],
  [/^Sign In as\s+(.+)$/i, (_, role) => `${role} ಆಗಿ ಲಾಗಿನ್ ಮಾಡಿ`],
  [/^Register as\s+(.+)$/i, (_, role) => `${role} ಆಗಿ ನೋಂದಾಯಿಸಿ`],
  [/^Switch to\s+(.+)\s+Sign In$/i, (_, role) => `${role} ಲಾಗಿನ್‌ಗೆ ಬದಲಾಯಿಸಿ`]
];

/**
 * Clean parameterized translation function.
 * When lang is 'kn', looks up key in KANNADA_CATALOG or matches dynamic rules.
 * If not found, falls back gracefully to original English key.
 * Interpolates `{param}` placeholders if params are provided.
 */
export function translateText(
  key: string,
  lang: AppLanguage,
  params?: Record<string, string | number>
): string {
  if (!key) return key;

  let text = key;

  if (lang === 'kn') {
    const trimmed = key.trim();
    if (KANNADA_CATALOG[trimmed]) {
      text = key.replace(trimmed, KANNADA_CATALOG[trimmed]);
    } else {
      // Check dynamic patterns
      let matched = false;
      for (const [pattern, replacer] of DYNAMIC_RULES) {
        const match = trimmed.match(pattern);
        if (match) {
          const result = replacer(...match);
          text = key.replace(trimmed, result);
          matched = true;
          break;
        }
      }
      if (!matched) {
        text = key;
      }
    }
  }

  // Substitute {paramName}
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return text;
}

export function formatSalaryDisplay(min: number, max: number, lang: AppLanguage): string {
  const minStr = min.toLocaleString('en-IN');
  const maxStr = max.toLocaleString('en-IN');
  if (lang === 'kn') {
    return `₹${minStr} - ₹${maxStr} / ತಿಂಗಳು`;
  }
  return `₹${minStr} - ₹${maxStr} / mo`;
}

export function formatMinSalaryThreshold(min: number, lang: AppLanguage): string {
  if (min <= 0) {
    return lang === 'kn' ? 'ಯಾವುದಾದರೂ' : 'Any';
  }
  const amtStr = min.toLocaleString('en-IN');
  if (lang === 'kn') {
    return `₹${amtStr}+/ತಿಂಗಳು`;
  }
  return `₹${amtStr}+/mo`;
}

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key
});

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
      window.dispatchEvent(new CustomEvent('driverhub_language_changed', { detail: { lang: next } }));
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'kn' : 'en');
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return translateText(key, lang, params);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

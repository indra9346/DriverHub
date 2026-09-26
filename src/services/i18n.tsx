import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'en' | 'kn';

const STORAGE_KEY = 'driverhub_app_language';

// ============================================================================
// 1. EXACT FULL-TEXT DICTIONARY (UI, Pages, Mock Data Jobs, Companies, Bios)
// ============================================================================
const EN_TO_KN: Record<string, string> = {
  // Navbar & Header
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

  // Hero Section & Home Page
  "India's #1 Professional Driver Recruitment Network": 'ಭಾರತದ #1 ವೃತ್ತಿಪರ ಚಾಲಕರ ನೇಮಕಾತಿ ಜಾಲ',
  'Drive Your Career Forward with': 'ನಿಮ್ಮ ವೃತ್ತಿಜೀವನವನ್ನು ಮುನ್ನಡೆಸಿ -',
  'Driver Hub': 'ಡ್ರೈವರ್ ಹಬ್',
  'Connecting verified commercial and personal drivers directly with top logistics fleets, corporate employers, and private vehicle owners. Direct hiring, verified licenses, zero agency cuts.':
    'ಪರಿಶೀಲಿಸಿದ ವಾಣಿಜ್ಯ ಮತ್ತು ವೈಯಕ್ತಿಕ ಚಾಲಕರನ್ನು ನೇರವಾಗಿ ಪ್ರಮುಖ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಕಂಪನಿಗಳು, ಕಾರ್ಪೊರೇಟ್ ಉದ್ಯೋಗದಾತರು ಮತ್ತು ವಾಹನ ಮಾಲೀಕರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ. ನೇರ ನೇಮಕಾತಿ, ಪರಿಶೀಲಿಸಿದ ಲೈಸೆನ್ಸ್, ಶೂನ್ಯ ಏಜೆನ್ಸಿ ಕಮಿಷನ್.',
  'Direct Hiring': 'ನೇರ ನೇಮಕಾತಿ',
  '100% RTO Verified': '100% RTO ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
  '₹25k - ₹50k/mo Salary': '₹25k - ₹50k/ತಿಂಗಳ ವೇತನ',
  'Zero Commission': 'ಶೂನ್ಯ ಕಮಿಷನ್',
  'All Driver Types': 'ಎಲ್ಲಾ ಚಾಲಕ ವಿಭಾಗಗಳು',
  'Bus Driver': 'ಬಸ್ ಚಾಲಕ',
  'Driver License / Vehicle Category': 'ಚಾಲನಾ ಪರವಾನಗಿ / ವಾಹನದ ವಿಭಾಗ',
  'Must-Have Skill': 'ಅಗತ್ಯ ಕೌಶಲ್ಯ',
  'Shift / Employment Type': 'ಪಾಳಿ / ಉದ್ಯೋಗದ ವಿಧ',
  'All Vehicle Categories': 'ಎಲ್ಲಾ ವಾಹನ ವಿಭಾಗಗಳು',
  'Any Type': 'ಯಾವುದೇ ಕೆಲಸದ ವಿಧ',
  'Minimum Guaranteed Salary': 'ಕನಿಷ್ಠ ಖಾತರಿಪಡಿಸಿದ ವೇತನ',
  'Minimum guaranteed monthly salary': 'ಕನಿಷ್ಠ ಖಾತರಿಪಡಿಸಿದ ಮಾಸಿಕ ವೇತನ',
  'Min Salary': 'ಕನಿಷ್ಠ ವೇತನ',
  'Any': 'ಯಾವುದಾದರೂ',
  'Any Skill': 'ಯಾವುದೇ ಕೌಶಲ್ಯ',
  'Search Keywords / Roles': 'ಹುಡುಕಾಟ ಪದಗಳು / ಹುದ್ದೆಗಳು',
  'Indian State / Union Territory': 'ಭಾರತೀಯ ರಾಜ್ಯ / ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶ',
  'City / Operating District': 'ನಗರ / ಕಾರ್ಯಾಚರಣೆ ಜಿಲ್ಲೆ',
  'Type or select any Indian city': 'ಯಾವುದೇ ಭಾರತೀಯ ನಗರವನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ',
  'Type or select a city in': 'ಈ ಪ್ರದೇಶದ ನಗರವನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ',
  'All Cities': 'ಎಲ್ಲಾ ನಗರಗಳು',
  'All States': 'ಎಲ್ಲಾ ರಾಜ್ಯಗಳು',
  'All Indian States & UTs': 'ಎಲ್ಲಾ ಭಾರತೀಯ ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳು',
  'PAN-INDIA JOB FILTERS': 'ಭಾರತದಾದ್ಯಂತ ಉದ್ಯೋಗ ಹುಡುಕಾಟ ಶೋಧಕಗಳು',
  'Clear All': 'ಎಲ್ಲವನ್ನೂ ತೆರವುಗೊಳಿಸಿ',
  'Active Filters': 'ಸಕ್ರಿಯ ಶೋಧಕಗಳು',
  'Results': 'ಫಲಿತಾಂಶಗಳು',
  'Page': 'ಪುಟ',
  'Vacancies': 'ಖಾಲಿ ಹುದ್ದೆಗಳು',
  'Showing': 'ತೋರಿಸಲಾಗುತ್ತಿದೆ',
  'No driving vacancies matching your search': 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದುವ ಚಾಲಕ ಹುದ್ದೆಗಳು ಇಲ್ಲ',
  'Try clearing your state/city filter or search across all Indian states to see nationwide logistics openings.': 'ರಾಜ್ಯ ಅಥವಾ ನಗರ ಶೋಧಕವನ್ನು ತೆರವುಗೊಳಿಸಿ, ಅಥವಾ ಭಾರತದಾದ್ಯಂತದ ಸಾರಿಗೆ ಹುದ್ದೆಗಳನ್ನು ಹುಡುಕಿ.',
  'View All Pan-India Vacancies': 'ಭಾರತದಾದ್ಯಂತದ ಎಲ್ಲಾ ಹುದ್ದೆಗಳನ್ನು ನೋಡಿ',
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
  'Hired Applications': 'ನೇಮಕಗೊಂಡ ಅರ್ಜಿಗಳು',
  'Pan-India Hubs:': 'ಭಾರತದಾದ್ಯಂತದ ಪ್ರಮುಖ ನಗರಗಳು:',
  'Delhi NCR': 'ದೆಹಲಿ ಎನ್‌ಸಿಆರ್',
  'Pune': 'ಪುಣೆ',
  'Ahmedabad': 'ಅಹಮದಾಬಾದ್',
  'Kolkata': 'ಕೊಲ್ಕತ್ತಾ',
  'Featured Opportunities & Why DriverHub': 'ಪ್ರಮುಖ ಉದ್ಯೋಗಾವಕಾಶಗಳು ಮತ್ತು ಡ್ರೈವರ್ ಹಬ್ ಏಕೆ',
  'Live database totals refresh automatically. Driver counts require an approved driving license; hires count applications marked hired.': 'ನೇರ ಡೇಟಾಬೇಸ್ ಸಂಖ್ಯೆಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನವೀಕರಿಸುತ್ತವೆ. ಚಾಲಕರ ಎಣಿಕೆಗೆ ಅನುಮೋದಿತ ಚಾಲನಾ ಪರವಾನಗಿ ಅಗತ್ಯ; ನೇಮಕಾತಿ ಎಣಿಕೆಯಲ್ಲಿ ನೇಮಕಗೊಂಡ ಸ್ಥಿತಿಯ ಅರ್ಜಿಗಳನ್ನಷ್ಟೇ ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ.',

  // Home Categories & Cards
  'Heavy Truck (HMV)': 'ಭಾರಿ ಟ್ರಕ್ ಚಾಲಕ (HMV)',
  'Multi-axle, interstate & container transport': 'ಮಲ್ಟಿ-ಆಕ್ಸಿಲ್, ಅಂತಾರಾಜ್ಯ ಮತ್ತು ಕಂಟೈನರ್ ಸಾರಿಗೆ',
  'LMV Chauffeur': 'LMV ಕಾರು ಚಾಲಕ (Chauffeur)',
  'Personal, corporate sedans & luxury fleet': 'ವೈಯಕ್ತಿಕ, ಕಾರ್ಪೊರೇಟ್ ಮತ್ತು ಐಷಾರಾಮಿ ಕಾರುಗಳು',
  'Cab Driver': 'ಕ್ಯಾಬ್ ಚಾಲಕ (Cab Driver)',
  'App-based ride hailing & airport transfers': 'ಸಿಟಿ ಕ್ಯಾಬ್ ಮತ್ತು ಏರ್‌ಪೋರ್ಟ್ ಪಿಕಪ್/ಡ್ರಾಪ್',
  'Delivery Driver': 'ಡೆಲಿವರಿ ವ್ಯಾನ್ ಚಾಲಕ',
  'E-commerce vans, 2-wheelers & hyperlocal': 'ಇ-ಕಾಮರ್ಸ್ ವ್ಯಾನ್ ಮತ್ತು ಸ್ಥಳೀಯ ಪಾರ್ಸೆಲ್ ವಿತರಣೆ',
  'School / Staff Bus': 'ಶಾಲಾ / ಕಂಪನಿ ಬಸ್ ಚಾಲಕ',
  'Passenger transit & student shuttle': 'ಪ್ರಯಾಣಿಕರ ಬಸ್ ಮತ್ತು ಶಾಲಾ ಮಕ್ಕಳ ಸಾರಿಗೆ',
  'Tempo / Ace': 'ಟೆಂಪೋ / ಟಾಟಾ ಏಸ್ ಚಾಲಕ',
  'Intra-city distribution & cargo logistics': 'ನಗರದೊಳಗಿನ ಸರಕು ಸಾಗಣೆ ಮತ್ತು ವಿತರಣೆ',
  '40ft Trailer Driver': '40 ಅಡಿ ಟ್ರೈಲರ್ ಚಾಲಕ',
  'Port container clearing & heavy haulage': 'ಬಂದರು ಕಂಟೈನರ್ ಮತ್ತು ಭಾರಿ ಸರಕು ಸಾಗಣೆ',
  'Commercial Driver': 'ವಾಣಿಜ್ಯ ವಾಹನ ಚಾಲಕ',
  'Tour operations & outstation rentals': 'ಪ್ರವಾಸಿ ವಾಹನ ಮತ್ತು ಹೊರರಾಜ್ಯ ಬಾಡಿಗೆ ಸೇವೆ',
  'Zero Middlemen Commission': 'ಮಧ್ಯವರ್ತಿಗಳ ಕಮಿಷನ್ ಇಲ್ಲ',
  'Apply directly to 450+ verified transport and corporate fleets with 100% wage transparency.':
    '100% ವೇತನ ಪಾರದರ್ಶಕತೆಯೊಂದಿಗೆ 450+ ಪರಿಶೀಲಿಸಿದ ಸಾರಿಗೆ ಮತ್ತು ಕಾರ್ಪೊರೇಟ್ ಕಂಪನಿಗಳಿಗೆ ನೇರವಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.',
  'Explore Openings': 'ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ',
  'Get Verified & Hired 3x Faster': 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು 3 ಪಟ್ಟು ವೇಗವಾಗಿ ಕೆಲಸ ಪಡೆಯಿರಿ',
  'Upload license & RTO documents once to earn the DriverHub Verified Badge for instant shortlists.':
    'ತಕ್ಷಣ ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಆಗಲು ನಿಮ್ಮ ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಮತ್ತು RTO ದಾಖಲೆಗಳನ್ನು ಒಮ್ಮೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.',
  'Register as Driver': 'ಚಾಲಕರಾಗಿ ನೋಂದಾಯಿಸಿ',
  'Explore by Vehicle & License Category': 'ವಾಹನ ಮತ್ತು ಲೈಸೆನ್ಸ್ ವಿಭಾಗದ ಮೂಲಕ ಹುಡುಕಿ',
  'Featured Driver Openings': 'ಪ್ರಮುಖ ಚಾಲಕ ಉದ್ಯೋಗಾವಕಾಶಗಳು',
  'View All Jobs': 'ಎಲ್ಲಾ ಕೆಲಸಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
  'Apply Now': 'ಈಗಲೇ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
  'View Details': 'ವಿವರಗಳನ್ನು ನೋಡಿ',

  // Mock Data Job Titles
  'Senior Heavy Truck Driver (Multi-Axle Interstate)': 'ಹಿರಿಯ ಭಾರಿ ಟ್ರಕ್ ಚಾಲಕ (ಮಲ್ಟಿ-ಆಕ್ಸಿಲ್ ಅಂತಾರಾಜ್ಯ)',
  'Container Trailer Truck Driver (40ft Trailer)': 'ಕಂಟೈನರ್ ಟ್ರೈಲರ್ ಟ್ರಕ್ ಚಾಲಕ (40 ಅಡಿ ಟ್ರೈಲರ್)',
  'Executive Fleet Chauffeur (Sedans & Luxury SUVs)': 'ಎಕ್ಸಿಕ್ಯೂಟಿವ್ ಕಾರ್ಪೊರೇಟ್ ಕಾರು ಚಾಲಕ (ಸೆಡಾನ್ & SUV)',
  'Senior School Bus Driver (Yellow Board PSV)': 'ಹಿರಿಯ ಶಾಲಾ ಬಸ್ ಚಾಲಕ (ಹಳದಿ ಬೋರ್ಡ್ PSV)',
  'Electric Delivery Van Driver (City Hyperlocal)': 'ಎಲೆಕ್ಟ್ರಿಕ್ ಡೆಲಿವರಿ ವ್ಯಾನ್ ಚಾಲಕ (ಸಿಟಿ ಡೆಲಿವರಿ)',
  'Intra-City Tata Ace & Tempo Cargo Driver': 'ನಗರದೊಳಗಿನ ಟಾಟಾ ಏಸ್ ಮತ್ತು ಟೆಂಪೋ ಸರಕು ಚಾಲಕ',
  'Airport Transfer & Corporate Cab Driver': 'ಏರ್‌ಪೋರ್ಟ್ ಪಿಕಪ್ ಮತ್ತು ಕಾರ್ಪೊರೇಟ್ ಕ್ಯಾಬ್ ಚಾಲಕ',

  // Mock Data Companies
  'Bharat Logistics Pvt Ltd': 'ಭಾರತ್ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್',
  'Bharat Logistics & Fleet Pvt Ltd': 'ಭಾರತ್ ಲಾಜಿಸ್ಟಿಕ್ಸ್ & ಫ್ಲೀಟ್ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್',
  'BHARAT LOGISTICS INDIA PRIVATE LIMITED': 'ಭಾರತ್ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಇಂಡಿಯಾ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್',
  'QuickRide Mobility Solutions': 'ಕ್ವಿಕ್‌ರೈಡ್ ಮೊಬಿಲಿಟಿ ಸೊಲ್ಯೂಷನ್ಸ್',
  'Sunrise International School': 'ಸನ್‌ರೈಸ್ ಇಂಟರ್‌ನ್ಯಾಷನಲ್ ಸ್ಕೂಲ್',
  'Swift Express Logistics': 'ಸ್ವಿಫ್ಟ್ ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಲಾಜಿಸ್ಟಿಕ್ಸ್',

  // Sidebar & Navigation across all 3 Portals
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
  'Driver Portal': 'ಚಾಲಕರ ಪೋರ್ಟಲ್',
  'Employer Desk': 'ಉದ್ಯೋಗದಾತರ ಪೋರ್ಟಲ್',
  'Admin Control': 'ಅಡ್ಮಿನ್ ಪೋರ್ಟಲ್',
  'Superadmin': 'ಸೂಪರ್ ಅಡ್ಮಿನ್',
  'VERIFIED COMMERCIAL DRIVER': 'ಪರಿಶೀಲಿಸಿದ ವಾಣಿಜ್ಯ ಚಾಲಕ',
  'Profile Completion': 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣತೆ',
  'Total Applications': 'ಒಟ್ಟು ಅರ್ಜಿಗಳು',
  'Across verified fleets': 'ಪರಿಶೀಲಿಸಿದ ಕಂಪನಿಗಳಲ್ಲಿ',
  'Shortlisted / Interviews': 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ / ಸಂದರ್ಶನಗಳು',
  'Ready for driving trials': 'ಡ್ರೈವಿಂಗ್ ಟ್ರಯಲ್‌ಗೆ ಸಿದ್ಧ',
  'Saved Vacancies': 'ಉಳಿಸಿದ ಕೆಲಸಗಳು',
  'View bookmarks →': 'ಬುಕ್‌ಮಾರ್ಕ್ ನೋಡಿ →',
  'Uploaded Documents': 'ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಗಳು',
  'Manage files →': 'ದಾಖಲೆ ನಿರ್ವಹಿಸಿ →',
  'Recent Applications': 'ಇತ್ತೀಚಿನ ಅರ್ಜಿಗಳು',
  'Recent Updates': 'ಇತ್ತೀಚಿನ ಮಾಹಿತಿ',
  'View Inbox': 'ಇನ್‌ಬಾಕ್ಸ್ ನೋಡಿ',
  'No unread notifications': 'ಓದದ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
  'Applied': 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
  'View All': 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
  'Based on your Bus category profile in Chikkaballapur': 'ಚಿಕ್ಕಬಳ್ಳಾಪುರದಲ್ಲಿನ ನಿಮ್ಮ ಬಸ್ ಚಾಲಕ ಪ್ರೊಫೈಲ್ ಆಧರಿಸಿ',
  'Looking for a cautious, punctual, and child-friendly driver to operate 32-seater school buses for daily student pick-up and drop-off across Mysuru.': 'ಮೈಸೂರಿನಾದ್ಯಂತ ವಿದ್ಯಾರ್ಥಿಗಳ ದೈನಂದಿನ ಪಿಕ್‌ಅಪ್ ಮತ್ತು ಡ್ರಾಪ್‌ಗಾಗಿ 32 ಆಸನಗಳ ಶಾಲಾ ಬಸ್ ಓಡಿಸಲು ಎಚ್ಚರಿಕೆಯ, ಸಮಯಪಾಲಕ ಮತ್ತು ಮಕ್ಕಳೊಂದಿಗೆ ಸ್ನೇಹಪರ ಚಾಲಕರನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇವೆ.',
  'Safe student and faculty transit across designated school routes in Mysuru. Zero tolerance for speeding or rash driving.': 'ಮೈಸೂರಿನ ನಿಗದಿತ ಶಾಲಾ ಮಾರ್ಗಗಳಲ್ಲಿ ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಸಿಬ್ಬಂದಿಗೆ ಸುರಕ್ಷಿತ ಸಾರಿಗೆ. ಅತಿವೇಗ ಅಥವಾ ಅಜಾಗರೂಕ ಚಾಲನೆಗೆ ಯಾವುದೇ ಸಹನೆ ಇಲ್ಲ.',
  'School Bus & Student Van Driver': 'ಶಾಲಾ ಬಸ್ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ವ್ಯಾನ್ ಚಾಲಕ',
  'School & Staff Bus Driver': 'ಶಾಲೆ ಮತ್ತು ಸಿಬ್ಬಂದಿ ಬಸ್ ಚಾಲಕ',
  'Split Shift: 6:30 AM - 10:00 AM / 1:30 PM - 5:30 PM': 'ವಿಭಜಿತ ಪಾಳಿ: ಬೆಳಿಗ್ಗೆ 6:30–10:00 / ಮಧ್ಯಾಹ್ನ 1:30–ಸಂಜೆ 5:30',
  'Morning & Afternoon split shifts': 'ಬೆಳಿಗ್ಗೆ ಮತ್ತು ಮಧ್ಯಾಹ್ನದ ವಿಭಜಿತ ಪಾಳಿಗಳು',
  'Sunrise Educational Transit': 'ಸನ್‌ರೈಸ್ ಎಜುಕೇಶನಲ್ ಟ್ರಾನ್ಸಿಟ್',
  'Recommended for Your License & Location': 'ನಿಮ್ಮ ಲೈಸೆನ್ಸ್ ಮತ್ತು ಸ್ಥಳಕ್ಕೆ ಶಿಫಾರಸು ಮಾಡಿದ ಕೆಲಸಗಳು',
  'View All Vacancies →': 'ಎಲ್ಲಾ ಕೆಲಸಗಳನ್ನು ನೋಡಿ →',

  // Employer Database, Jobs, Reports, Billing
  'Modify search': 'ಹುಡುಕಾಟ ಬದಲಿಸಿ',
  'Save search': 'ಹುಡುಕಾಟ ಉಳಿಸಿ',
  'Download Excel': 'ಎಕ್ಸೆಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'View Phone Number': 'ಫೋನ್ ಸಂಖ್ಯೆ ವೀಕ್ಷಿಸಿ',
  'Send Message': 'ಸಂದೇಶ ಕಳುಹಿಸಿ',
  'View Full Dossier': 'ಪೂರ್ಣ ಪ್ರೊಫೈಲ್ ನೋಡಿ',
  'Start with new post': 'ಹೊಸ ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಪ್ರಾರಂಭಿಸಿ',
  'Use our step-by-step blank form to create your driver job': 'ಹಂತ-ಹಂತದ ಫಾರ್ಮ್ ಬಳಸಿ ಹೊಸ ಚಾಲಕ ಕೆಲಸವನ್ನು ರಚಿಸಿ',
  'Use a job template': 'ಉದ್ಯೋಗ ಟೆಂಪ್ಲೇಟ್ ಬಳಸಿ',
  'Save time and hire the right drivers using ready templates': 'ಸಿದ್ಧ ಟೆಂಪ್ಲೇಟ್‌ಗಳನ್ನು ಬಳಸಿ ಸಮಯ ಉಳಿಸಿ ಮತ್ತು ಸೂಕ್ತ ಚಾಲಕರನ್ನು ನೇಮಿಸಿ',
  'Save 50% more time': '50% ಸಮಯ ಉಳಿಸಿ',
  'Applied to job': 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿದವರು',
  'Active leads': 'ಸಕ್ರಿಯ ಲೀಡ್ಸ್',
  'Database matches': 'ಡೇಟಾಬೇಸ್ ಹೊಂದಾಣಿಕೆ',
  'Unlock matching drivers →': 'ಹೊಂದಾಣಿಕೆಯಾಗುವ ಚಾಲಕರನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಿ →',
  'Billing profile': 'ಬಿಲ್ಲಿಂಗ್ ಪ್ರೊಫೈಲ್',
  'Billing History': 'ಬಿಲ್ಲಿಂಗ್ ಇತಿಹಾಸ',
  'Update GSTIN / ISD-GSTIN': 'GSTIN ನವೀಕರಿಸಿ',
  'Buy Credits / Upgrade Plan': 'ಕ್ರೆಡಿಟ್ಸ್ ಖರೀದಿಸಿ / ಪ್ಲಾನ್ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
  'Export candidate pipelines, unlocked driver contact logs, and fleet hiring reports':
    'ಅಭ್ಯರ್ಥಿಗಳ ಅರ್ಜಿ ಪಟ್ಟಿ, ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರ ಫೋನ್ ಸಂಖ್ಯೆಗಳು ಮತ್ತು ನೇಮಕಾತಿ ವರದಿಗಳನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
  'Applications': 'ಅರ್ಜಿಗಳು (Applications)',
  'Unlocked Database Drivers': 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರು',
  'View Report': 'ವರದಿ ನೋಡಿ',
  'View Unlocked Drivers': 'ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರನ್ನು ನೋಡಿ',
  'GET IN TOUCH': 'ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ',
  "We're Here to Help Chauffeurs & Fleets 24/7": 'ಚಾಲಕರು ಮತ್ತು ಸಾರಿಗೆ ಕಂಪನಿಗಳಿಗೆ 24/7 ಸಹಾಯಕ್ಕೆ ನಾವು ಸಿದ್ಧ',
  'Have questions about job listings, RTO verification, or enterprise fleet hiring? Reach out to our dedicated support desk.': 'ಉದ್ಯೋಗ ಪ್ರಕಟಣೆಗಳು, ಆರ್‌ಟಿಒ ಪರಿಶೀಲನೆ ಅಥವಾ ದೊಡ್ಡ ಸಾರಿಗೆ ಕಂಪನಿಗಳ ನೇಮಕಾತಿ ಕುರಿತು ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ನಮ್ಮ ಬೆಂಬಲ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
  'Central Operations & Helpdesk': 'ಕೇಂದ್ರ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಸಹಾಯವಾಣಿ',
  'Full Name': 'ಪೂರ್ಣ ಹೆಸರು',
  'Phone Number': 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
  'Email Address': 'ಇಮೇಲ್ ವಿಳಾಸ',
  'Inquiry Type': 'ವಿಚಾರಣೆಯ ವಿಧ',
  'Submit Inquiry': 'ವಿಚಾರಣೆ ಸಲ್ಲಿಸಿ',
  'How can our recruitment team assist you today?': 'ಇಂದು ನಮ್ಮ ನೇಮಕಾತಿ ತಂಡ ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
  'Need help with a specific issue?': 'ನಿರ್ದಿಷ್ಟ ಸಮಸ್ಯೆಗೆ ಸಹಾಯ ಬೇಕೇ?',
  'Our national dispatch & verification desk is based in Bengaluru with regional support coordinators across South and Western India.': 'ನಮ್ಮ ರಾಷ್ಟ್ರೀಯ ಕಾರ್ಯಾಚರಣೆ ಮತ್ತು ಪರಿಶೀಲನಾ ಕೇಂದ್ರ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ. ದಕ್ಷಿಣ ಮತ್ತು ಪಶ್ಚಿಮ ಭಾರತದಲ್ಲಿ ಪ್ರಾದೇಶಿಕ ಸಹಾಯ ಸಂಯೋಜಕರಿದ್ದಾರೆ.',
  'For verified drivers currently on interstate transit routes:': 'ಅಂತರರಾಜ್ಯ ಮಾರ್ಗಗಳಲ್ಲಿ ಪ್ರಯಾಣಿಸುತ್ತಿರುವ ಪರಿಶೀಲಿತ ಚಾಲಕರಿಗಾಗಿ:',
  'Monday - Saturday (9:00 AM - 7:00 PM IST)': 'ಸೋಮವಾರದಿಂದ ಶನಿವಾರದವರೆಗೆ (ಬೆಳಿಗ್ಗೆ 9ರಿಂದ ಸಂಜೆ 7ರವರೆಗೆ, ಭಾರತೀಯ ಸಮಯ)',

  // Admin Console
  'Driver Hub Administration & Moderation': 'ಡ್ರೈವರ್ ಹಬ್ ಅಡ್ಮಿನ್ ಮತ್ತು ಅನುಮೋದನೆ ಕೇಂದ್ರ',
  'Real-time platform overview, moderation queues, and safety compliance audits':
    'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಮೇಲ್ವಿಚಾರಣೆ, ಉದ್ಯೋಗ ಅನುಮೋದನೆ ಮತ್ತು ಚಾಲಕರ ದಾಖಲೆ ಪರಿಶೀಲನೆ ಕೇಂದ್ರ',
  'Sync with Supabase DB': 'Supabase DB ಜೊತೆ ಸಿಂಕ್ ಮಾಡಿ',
  'Total Drivers': 'ಒಟ್ಟು ಚಾಲಕರು',
  'Manage candidates →': 'ಚಾಲಕರನ್ನು ನಿರ್ವಹಿಸಿ →',
  'Registered Fleets': 'ನೋಂದಾಯಿತ ಕಂಪನಿಗಳು',
  'Verify companies →': 'ಕಂಪನಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ →',
  'Active Jobs': 'ಸಕ್ರಿಯ ಕೆಲಸಗಳು',
  'Live on public portal': 'ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಲೈವ್ ಇದೆ',
  'Pending Approvals': 'ಬಾಕಿ ಇರುವ ಅನುಮೋದನೆಗಳು',
  'Requires action →': 'ಕ್ರಮ ಕೈಗೊಳ್ಳಿ →',
  'Moderate Queue': 'ಪಟ್ಟಿ ಪರಿಶೀಲಿಸಿ',
  'Review & Approve': 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಅನುಮೋದಿಸಿ',
  'Employer Accounts': 'ಉದ್ಯೋಗದಾತರ ಖಾತೆಗಳು'
};

// ============================================================================
// 2. DYNAMIC REGEX RULES (Translates Dynamic Counts, Salaries, Experience, Dates)
// ============================================================================
const REGEX_KN_RULES: Array<[RegExp, (...args: string[]) => string]> = [
  [/^₹\s*([\d,]+)\s*[-–]\s*₹?\s*([\d,]+)\s*\/\s*mo$/i, (_, min, max) => `₹${min} – ₹${max} / ತಿಂಗಳು`],
  [/^Exp:\s*(\d+\+?(?:\s*[-–]\s*\d+\+?)?)\s*Years?$/i, (_, years) => `ಅನುಭವ: ${years} ವರ್ಷ`],
  [/^Page\s+(\d+)\s+of\s+(\d+)\s+\((\d+)\s+Vacancies\)$/i, (_, page, pages, count) => `ಪುಟ ${page} / ${pages} (${count} ಹುದ್ದೆಗಳು)`],
  [/^(\d+)\s+profiles found for\s+(.+)$/i, (_, count, query) => `${query} ಗಾಗಿ ${count} ಚಾಲಕರ ಪ್ರೊಫೈಲ್‌ಗಳು ಕಂಡುಬಂದಿವೆ`],
  [/^All Jobs\s*\((\d+)\)$/i, (_, n) => `ಎಲ್ಲಾ ಉದ್ಯೋಗಗಳು (${n})`],
  [/^All Filters\s*\((\d+)\)$/i, (_, n) => `ಎಲ್ಲಾ ಫಿಲ್ಟರ್‌ಗಳು (${n})`],
  [/^\+?\s*Active\s*\((\d+)\)$/i, (_, n) => `+ ಸಕ್ರಿಯ (${n})`],
  [/^\+?\s*Under Review\s*\((\d+)\)$/i, (_, n) => `+ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ (${n})`],
  [/^\+?\s*Expired\s*\((\d+)\)$/i, (_, n) => `+ ಅವಧಿ ಮುಗಿದಿದೆ (${n})`],
  [/^\+?\s*Select Plan\s*\((\d+)\)$/i, (_, n) => `+ ಪ್ಲಾನ್ ಆಯ್ಕೆಮಾಡಿ (${n})`],
  [/^Search Candidates\s*\((\d+)\)$/i, (_, n) => `ಚಾಲಕರನ್ನು ಹುಡುಕಿ (${n})`],
  [/^Saved Searches\s*\((\d+)\)$/i, (_, n) => `ಉಳಿಸಿದ ಹುಡುಕಾಟಗಳು (${n})`],
  [/^Unlocked Candidates\s*\((\d+)\)$/i, (_, n) => `ಅನ್‌ಲಾಕ್ ಮಾಡಿದ ಚಾಲಕರು (${n})`],
  [/^Select All\s*\((\d+)\)$/i, (_, n) => `ಎಲ್ಲಾ ಆಯ್ಕೆಮಾಡಿ (${n})`],
  [/^Filters\s*\((\d+)\)$/i, (_, n) => `ಫಿಲ್ಟರ್‌ಗಳು (${n})`],
  [/^View All\s*\((\d+)\)$/i, (_, n) => `ಎಲ್ಲವನ್ನೂ ನೋಡಿ (${n})`],
  [/^Based on your (.+) category profile in (.+)$/i, (_, category, city) => `${translateStringToKannada(category)} ವಿಭಾಗದ ನಿಮ್ಮ ${translateStringToKannada(city)} ಪ್ರೊಫೈಲ್ ಆಧರಿಸಿ`],
  [/^View Applicants\s*\((\d+)\)$/i, (_, n) => `ಅರ್ಜಿದಾರರನ್ನು ನೋಡಿ (${n})`],
  [/^Review Pending Jobs\s*\((\d+)\)$/i, (_, n) => `ಬಾಕಿ ಉದ್ಯೋಗಗಳನ್ನು ಪರಿಶೀಲಿಸಿ (${n})`],
  [/^Pending Approvals\s*\((\d+)\)$/i, (_, n) => `ಬಾಕಿ ಅನುಮೋದನೆಗಳು (${n})`],
  [/^(\d+)\s*yrs?\s*(\d+)\s*mos?$/i, (_, y, m) => `${y} ವರ್ಷ ${m} ತಿಂಗಳು ಅನುಭವ`],
  [/^(\d+)\s*Years?\s*Experience$/i, (_, y) => `${y} ವರ್ಷಗಳ ಅನುಭವ`],
  [/^(\d+)\s*unlocks$/i, (_, n) => `${n} ಬಾರಿ ಅನ್‌ಲಾಕ್ ಆಗಿದೆ`],
  [/^(\d+)\s*Vacancies$/i, (_, n) => `${n} ಖಾಲಿ ಹುದ್ದೆಗಳು`],
  [/^(\d+)\s*Job Credits\s*•\s*(\d+)\s*Unlocks$/i, (_, j, u) => `${j} ಜಾಬ್ ಕ್ರೆಡಿಟ್ಸ್ • ${u} ಡೇಟಾಬೇಸ್ ಅನ್‌ಲಾಕ್ಸ್`],
  [/^Available credits:\s*(\d+)\s*Jobs$/i, (_, n) => `ಲಭ್ಯವಿರುವ ಕ್ರೆಡಿಟ್ಸ್: ${n} ಉದ್ಯೋಗಗಳು`],
  [/^(\d+)\s*Unlocks$/i, (_, n) => `${n} ಅನ್‌ಲಾಕ್ಸ್`],
  [/^₹\s*([\d,]+)\s*\/mo$/i, (_, amt) => `₹${amt} / ತಿಂಗಳು`],
  [/^₹\s*([\d,]+)\s*\+\s*\/mo$/i, (_, amt) => `₹${amt}+ / ತಿಂಗಳು`],
  [/^₹\s*([\d,]+)\s*\+$/i, (_, amt) => `₹${amt}+`],
  [/^₹\s*([\d,]+)\s*[–-]\s*₹\s*([\d,]+)\s*\/mo$/i, (_, min, max) => `₹${min} – ₹${max} / ತಿಂಗಳು`]
];

// ============================================================================
// 3. PHRASE & VOCABULARY REPLACEMENT (Translates Composite & Dynamic Data Strings)
// ============================================================================
const PHRASE_REPLACEMENTS: Array<[string, string]> = [
  ["We're Here to Help", 'ಸಹಾಯ ಮಾಡಲು ನಾವು ಇಲ್ಲಿದ್ದೇವೆ'],
  ['Chauffeurs & Fleets', 'ಚಾಲಕರು ಮತ್ತು ಸಾರಿಗೆ ಕಂಪನಿಗಳು'],
  ['Get in Touch', 'ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ'],
  ['GET IN TOUCH', 'ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ'],
  ['Featured Opportunities & Why', 'ಪ್ರಮುಖ ಉದ್ಯೋಗಾವಕಾಶಗಳು ಮತ್ತು'],
  ['Live database totals refresh automatically.', 'ನೇರ ಡೇಟಾಬೇಸ್ ಸಂಖ್ಯೆಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ನವೀಕರಿಸುತ್ತವೆ.'],
  ['Driver counts require an approved driving license;', 'ಚಾಲಕರ ಎಣಿಕೆಗೆ ಅನುಮೋದಿತ ಚಾಲನಾ ಪರವಾನಗಿ ಅಗತ್ಯ;'],
  ['hires count applications marked hired.', 'ನೇಮಕಗೊಂಡ ಸ್ಥಿತಿಯ ಅರ್ಜಿಗಳನ್ನಷ್ಟೇ ನೇಮಕಾತಿ ಎಣಿಕೆಯಲ್ಲಿ ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ.'],
  ['No unread notifications', 'ಓದದ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ'],
  ['View All', 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ'],
  ['Hired Applications', 'ನೇಮಕಗೊಂಡ ಅರ್ಜಿಗಳು'],
  ['Fleet & Corporate', 'ಫ್ಲೀಟ್ ಮತ್ತು ಕಾರ್ಪೊರೇಟ್'],
  ['Active & Verified', 'ಸಕ್ರಿಯ ಮತ್ತು ಪರಿಶೀಲಿಸಲಾಗಿದೆ'],
  ['Verified Employer', 'ಪರಿಶೀಲಿಸಿದ ಉದ್ಯೋಗದಾತ'],
  ['Verified Driver', 'ಪರಿಶೀಲಿಸಿದ ಚಾಲಕ'],
  ['Pending Approval', 'ಅನುಮೋದನೆ ಬಾಕಿ ಇದೆ'],
  ['Immediate Joining', 'ತಕ್ಷಣ ಸೇರ್ಪಡೆ'],
  ['Shortlisted', 'ಶಾರ್ಟ್‌ಲಿಸ್ಟ್ ಆಗಿದೆ'],
  ['Senior Long Haul Driver', 'ಹಿರಿಯ ಲಾಂಗ್ ಹಾಲ್ ಟ್ರಕ್ ಚಾಲಕ'],
  ['Medium Commercial Driver', 'ಮಧ್ಯಮ ವಾಣಿಜ್ಯ ವಾಹನ ಚಾಲಕ'],
  ['Heavy Motor Vehicle', 'ಭಾರಿ ಮೋಟಾರು ವಾಹನ'],
  ['Interstate Freight', 'ಅಂತಾರಾಜ್ಯ ಸರಕು ಸಾಗಣೆ'],
  ['GPS Navigation', 'GPS ನ್ಯಾವಿಗೇಷನ್'],
  ['Night Driving', 'ರಾತ್ರಿ ಚಾಲನೆ'],
  ['Heavy License', 'ಭಾರಿ ವಾಹನ ಲೈಸೆನ್ಸ್'],
  ['Current / Latest', 'ಪ್ರಸ್ತುತ ಹುದ್ದೆ'],
  ['Previous', 'ಹಿಂದಿನ ಅನುಭವ'],
  ['License & Edu', 'ಲೈಸೆನ್ಸ್ ಮತ್ತು ಶಿಕ್ಷಣ'],
  ['Pref. Location', 'ಆದ್ಯತೆಯ ಸ್ಥಳ'],
  ['Skills & Vehicles', 'ಕೌಶಲ್ಯ ಮತ್ತು ವಾಹನಗಳು'],
  ['Languages', 'ಭಾಷೆಗಳು'],
  ['Matching:', 'ಹೊಂದಾಣಿಕೆ:'],
  ['Electronic City', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ'],
  ['Bengaluru', 'ಬೆಂಗಳೂರು'],
  ['Bangalore', 'ಬೆಂಗಳೂರು'],
  ['Kengeri', 'ಕೆಂಗೇರಿ'],
  ['Whitefield', 'ವೈಟ್‌ಫೀಲ್ಡ್'],
  ['Peenya', 'ಪೀಣ್ಯ'],
  ['Yeshwanthpur', 'ಯಶವಂತಪುರ'],
  ['Mysuru', 'ಮೈಸೂರು'],
  ['Mangaluru', 'ಮಂಗಳೂರು'],
  ['Hubballi', 'ಹುಬ್ಬಳ್ಳಿ'],
  ['Chennai', 'ಚೆನ್ನೈ'],
  ['Hyderabad', 'ಹೈದರಾಬಾದ್'],
  ['Mumbai', 'ಮುಂಬೈ'],
  ['Salary:', 'ವೇತನ:'],
  ['Posted on :', 'ಪೋಸ್ಟ್ ಮಾಡಿದ ದಿನಾಂಕ:'],
  ['For :', 'ಕಂಪನಿ:'],
  ['Call Now', 'ಈಗ ಕರೆ ಮಾಡಿ'],
  ['Full-time', 'ಪೂರ್ಣ ಸಮಯ'],
  ['Part-time', 'ಅರೆಕಾಲಿಕ'],
  ['Contract', 'ಗುತ್ತಿಗೆ'],
  ['Success', 'ಯಶಸ್ವಿ'],
  ['Cancelled', 'ರದ್ದಾಗಿದೆ'],
  ['Pending', 'ಬಾಕಿ ಇದೆ'],
  ['Verified', 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ'],
  ['How DriverHub Works', 'ಡ್ರೈವರ್ ಹಬ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ'],
  ['Why Choose DriverHub', 'ಡ್ರೈವರ್ ಹಬ್ ಏಕೆ ಆಯ್ಕೆ ಮಾಡಬೇಕು'],
  ['Trusted by India', 'ಭಾರತದ ಪ್ರಮುಖ ಕಂಪನಿಗಳ ನಂಬಿಕೆ'],
  ['Browse All Jobs', 'ಎಲ್ಲಾ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ'],
  ['Post a Job', 'ಉದ್ಯೋಗ ಪೋಸ್ಟ್ ಮಾಡಿ'],
  ['Login', 'ಲಾಗಿನ್'],
  ['Sign Up', 'ನೋಂದಣಿ'],
  ['Email Address', 'ಇಮೇಲ್ ವಿಳಾಸ'],
  ['Password', 'ಪಾಸ್‌ವರ್ಡ್'],
  ['Forgot Password?', 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?'],
  ['Remember me', 'ನನ್ನನ್ನು ನೆನಪಿಡಿ'],
  ['Quick Demo Access', 'ತ್ವರಿತ ಡೆಮೊ ಲಾಗಿನ್'],
  ['Commercial Driver', 'ವಾಣಿಜ್ಯ ಚಾಲಕ'],
  ['Fleet Employer', 'ಫ್ಲೀಟ್ ಉದ್ಯೋಗದಾತ'],
  ['Platform Admin', 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಅಡ್ಮಿನ್'],
  ['Experience', 'ಅನುಭವ'],
  ['Location', 'ಸ್ಥಳ'],
  ['License Type', 'ಲೈಸೆನ್ಸ್ ವಿಧ'],
  ['Vehicle Type', 'ವಾಹನದ ವಿಧ'],
  ['Requirements', 'ಅರ್ಹತೆಗಳು'],
  ['Responsibilities', 'ಜವಾಬ್ದಾರಿಗಳು'],
  ['Benefits & Perks', 'ಸೌಲಭ್ಯಗಳು ಮತ್ತು ಭತ್ಯೆಗಳು'],
  ['Company Overview', 'ಕಂಪನಿಯ ವಿವರ'],
  ['Contact Us', 'ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ'],
  ['About Us', 'ನಮ್ಮ ಬಗ್ಗೆ'],
  ['Send Inquiry', 'ಸಂದೇಶ ಕಳುಹಿಸಿ'],
  ['Your Name', 'ನಿಮ್ಮ ಹೆಸರು'],
  ['Phone Number', 'ಫೋನ್ ಸಂಖ್ಯೆ'],
  ['Subject', 'ವಿಷಯ'],
  ['Message', 'ಸಂದೇಶ'],
  ['All Rights Reserved', 'ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ'],
  ['Driver', 'ಚಾಲಕ'],
  ['Drivers', 'ಚಾಲಕರು'],
  ['Employer', 'ಉದ್ಯೋಗದಾತ'],
  ['Employers', 'ಉದ್ಯೋಗದಾತರು'],
  ['Company', 'ಕಂಪನಿ'],
  ['Companies', 'ಕಂಪನಿಗಳು'],
  ['Years', 'ವರ್ಷಗಳು'],
  ['Month', 'ತಿಂಗಳು'],
  ['Monthly', 'ಮಾಸಿಕ'],
  ['Apply', 'ಅರ್ಜಿ ಸಲ್ಲಿಸಿ'],
  ['Save', 'ಉಳಿಸಿ'],
  ['Cancel', 'ರದ್ದುಮಾಡಿ'],
  ['Submit', 'ಸಲ್ಲಿಸಿ'],
  ['Close', 'ಮುಚ್ಚಿ'],
  ['Back', 'ಹಿಂದೆ'],
  ['Next', 'ಮುಂದೆ'],
  ['Reset', 'ರೀಸೆಟ್'],
  ['Clear', 'ತೆರವುಗೊಳಿಸಿ'],
  ['Active', 'ಸಕ್ರಿಯ']
];

const PLACEHOLDER_EN_TO_KN: Record<string, string> = {
  "Job title, 'HMV', 'Cab', 'Delivery'...": "ಹುದ್ದೆ, 'HMV', 'ಕ್ಯಾಬ್', 'ಡೆಲಿವರಿ'...",
  'City (Bengaluru, Chennai...)': 'ನಗರ (ಬೆಂಗಳೂರು, ಮೈಸೂರು, ಚೆನ್ನೈ...)',
  'Search by job title, company, or location...': 'ಉದ್ಯೋಗದ ಹೆಸರು, ಕಂಪನಿ ಅಥವಾ ಸ್ಥಳದ ಮೂಲಕ ಹುಡುಕಿ...',
  'Search drivers by name, license, city, or skill...': 'ಹೆಸರು, ಲೈಸೆನ್ಸ್, ನಗರ ಅಥವಾ ಕೌಶಲ್ಯದ ಮೂಲಕ ಚಾಲಕರನ್ನು ಹುಡುಕಿ...',
  'Enter your email address': 'ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ',
  'Enter your password': 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ'
};

export function translateStringToKannada(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;

  // 1. Exact match
  if (EN_TO_KN[trimmed]) {
    return input.replace(trimmed, EN_TO_KN[trimmed]);
  }

  // 2. Dynamic Regex rules
  for (const [regex, replacer] of REGEX_KN_RULES) {
    const match = trimmed.match(regex);
    if (match) {
      const result = replacer(...match);
      return input.replace(trimmed, result);
    }
  }

  // 3. Phrase & Vocabulary replacement for composite dynamic strings
  let result = trimmed;
  let changed = false;
  for (const [enPhrase, knPhrase] of PHRASE_REPLACEMENTS) {
    if (result.includes(enPhrase)) {
      result = result.split(enPhrase).join(knPhrase);
      changed = true;
    }
  }

  if (changed) {
    return input.replace(trimmed, result);
  }

  return input;
}

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
const lastAppliedTextMap = new WeakMap<Text, string>();
const originalPlaceholderMap = new WeakMap<Element, string>();
const lastAppliedPlaceholderMap = new WeakMap<Element, string>();
const originalAttributeMap = new WeakMap<Element, Map<string, string>>();
const lastAppliedAttributeMap = new WeakMap<Element, Map<string, string>>();
let isApplyingTranslation = false;

function clearAnyLegacyGoogleTranslateCookies() {
  if (typeof document === 'undefined') return;
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const domains = [host, `.${host}`];
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      domains.push(rootDomain, `.${rootDomain}`);
    }
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    for (const d of domains) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
    }
  } catch {}
}

function applyDOMTranslation(lang: AppLanguage) {
  if (typeof document === 'undefined' || isApplyingTranslation) return;
  isApplyingTranslation = true;

  try {
    // 1. Translate or restore all DOM Text Nodes across the active page
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (!parent) continue;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || parent.closest('[data-no-translate="true"]')) {
        continue;
      }

      const currentVal = textNode.nodeValue || '';
      const trimmed = currentVal.trim();
      if (!trimmed) continue;
      const lastApplied = lastAppliedTextMap.get(textNode);
      let original = originalTextMap.get(textNode);
      if (original === undefined || (lastApplied !== undefined && currentVal !== lastApplied)) {
        // React changed this text since our last pass: use the new React value
        // as the source instead of restoring an outdated translation.
        original = currentVal;
        originalTextMap.set(textNode, original);
      }
      const next = lang === 'kn' ? translateStringToKannada(original) : original;
      lastAppliedTextMap.set(textNode, next);
      if (next !== currentVal) textNode.nodeValue = next;
    }

    // 2. Translate or restore Input & Textarea Placeholders
    const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    inputs.forEach((el) => {
      const currentPh = el.getAttribute('placeholder') || '';
      const lastApplied = lastAppliedPlaceholderMap.get(el);
      let original = originalPlaceholderMap.get(el);
      if (original === undefined || (lastApplied !== undefined && currentPh !== lastApplied)) {
        original = currentPh;
        originalPlaceholderMap.set(el, original);
      }
      const next = lang === 'kn'
        ? (PLACEHOLDER_EN_TO_KN[original] || translateStringToKannada(original))
        : original;
      lastAppliedPlaceholderMap.set(el, next);
      if (next !== currentPh) el.setAttribute('placeholder', next);
    });

    // Keep accessible labels, tooltips and image descriptions in the same
    // language as visible labels. Never rewrite values the user has typed.
    const translatableAttributes = ['aria-label', 'title', 'alt'];
    document.querySelectorAll(translatableAttributes.map(attribute => `[${attribute}]`).join(',')).forEach((el) => {
      let originals = originalAttributeMap.get(el);
      if (!originals) {
        originals = new Map<string, string>();
        originalAttributeMap.set(el, originals);
      }
      for (const attribute of translatableAttributes) {
        const current = el.getAttribute(attribute);
        if (current === null) continue;
        let applied = lastAppliedAttributeMap.get(el);
        if (!applied) {
          applied = new Map<string, string>();
          lastAppliedAttributeMap.set(el, applied);
        }
        if (!originals.has(attribute) || (applied.has(attribute) && current !== applied.get(attribute))) {
          originals.set(attribute, current);
        }
        const original = originals.get(attribute)!;
        const next = lang === 'kn' ? translateStringToKannada(original) : original;
        applied.set(attribute, next);
        if (current !== next) el.setAttribute(attribute, next);
      }
    });
  } finally {
    isApplyingTranslation = false;
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    clearAnyLegacyGoogleTranslateCookies();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'kn' ? 'kn' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (next: AppLanguage) => {
    clearAnyLegacyGoogleTranslateCookies();
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'kn' : 'en');
  };

  const t = (text: string) => {
    if (lang === 'kn') {
      return translateStringToKannada(text);
    }
    return text;
  };

  useEffect(() => {
    clearAnyLegacyGoogleTranslateCookies();
    document.documentElement.lang = lang;
    applyDOMTranslation(lang);

    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (isApplyingTranslation) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDOMTranslation(lang);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title', 'alt']
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

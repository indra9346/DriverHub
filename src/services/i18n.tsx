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

  // Mock Data Job Titles & Descriptions
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
  [/^₹\s*([\d,]+)\s*[–-]\s*₹\s*([\d,]+)\s*\/mo$/i, (_, min, max) => `₹${min} – ₹${max} / ತಿಂಗಳು`]
];

// ============================================================================
// 3. PHRASE & VOCABULARY REPLACEMENT (Translates Composite & Dynamic Data Strings)
// ============================================================================
const PHRASE_REPLACEMENTS: Array<[string, string]> = [
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
  ['All Rights Reserved', 'ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ']
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
const originalPlaceholderMap = new WeakMap<Element, string>();

// Trigger Google Website Translator combo if loaded for any remaining free-form text
function syncGoogleTranslateWidget(lang: AppLanguage) {
  try {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      const targetVal = lang === 'kn' ? 'kn' : 'en';
      if (select.value !== targetVal) {
        select.value = targetVal;
        select.dispatchEvent(new Event('change'));
      }
    }
    if (lang === 'en' && document.documentElement.classList.contains('translated-ltr')) {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      window.location.reload();
    }
  } catch {}
}

function applyDOMTranslation(lang: AppLanguage) {
  if (typeof document === 'undefined') return;

  // 1. Translate all DOM Text Nodes across the active page
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

    if (lang === 'kn') {
      const original = originalTextMap.get(textNode) ?? currentVal;
      if (!originalTextMap.has(textNode)) {
        originalTextMap.set(textNode, currentVal);
      }
      const translated = translateStringToKannada(original);
      if (translated !== currentVal) {
        textNode.nodeValue = translated;
      }
    } else {
      const original = originalTextMap.get(textNode);
      if (original !== undefined && currentVal !== original) {
        textNode.nodeValue = original;
      }
    }
  }

  // 2. Translate Input & Textarea Placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach((el) => {
    const currentPh = el.getAttribute('placeholder') || '';
    if (lang === 'kn') {
      const origPh = originalPlaceholderMap.get(el) ?? currentPh;
      if (!originalPlaceholderMap.has(el)) {
        originalPlaceholderMap.set(el, currentPh);
      }
      const translatedPh = PLACEHOLDER_EN_TO_KN[origPh] || translateStringToKannada(origPh);
      if (translatedPh !== currentPh) {
        el.setAttribute('placeholder', translatedPh);
      }
    } else {
      const origPh = originalPlaceholderMap.get(el);
      if (origPh !== undefined && currentPh !== origPh) {
        el.setAttribute('placeholder', origPh);
      }
    }
  });

  syncGoogleTranslateWidget(lang);
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
      document.cookie = `googtrans=/en/${next}; path=/`;
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

  // Inject hidden Google Website Translator script once so any arbitrary paragraph/bio also translates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.getElementById('google-translate-hidden-container')) {
      const div = document.createElement('div');
      div.id = 'google-translate-hidden-container';
      div.style.display = 'none';
      document.body.appendChild(div);

      const style = document.createElement('style');
      style.innerHTML = `
        .goog-te-banner-frame, .skiptranslate > iframe, #goog-gt-tt, .goog-te-balloon-frame {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        .goog-text-highlight {
          background: transparent !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);

      (window as any).googleTranslateElementInit = () => {
        try {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,kn',
              autoDisplay: false
            },
            'google-translate-hidden-container'
          );
          syncGoogleTranslateWidget(lang);
        } catch {}
      };

      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    applyDOMTranslation(lang);

    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        applyDOMTranslation(lang);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
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

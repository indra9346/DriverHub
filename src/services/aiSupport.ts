import { AIMessage } from '../types';

export const initialBotWelcome: AIMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  text: `Hello! 👋 I am your **Driver Hub AI Support Specialist**.\n\nHow can I help you today? You can ask me about finding driver jobs, required licenses (LMV/HMV/Commercial), employer posting rules, profile verification, or salary benchmarks.`,
  timestamp: 'Just now',
  options: [
    '🔍 How to apply for HMV truck jobs?',
    '📄 What documents do I need to upload?',
    '💼 How do employers shortlist candidates?',
    '💰 Typical driver salary in Bengaluru/Chennai',
    '🏢 How do I post a driver job vacancy?'
  ]
};

const KNOWLEDGE_BASE: { keywords: string[]; answer: string; options?: string[]; actionLink?: { text: string; url: string } }[] = [
  {
    keywords: ['hmv', 'heavy truck', 'interstate', 'truck driver', 'trailer'],
    answer: `🚛 **Heavy Motor Vehicle (HMV) & Truck Jobs**\n\n• **Eligibility**: Valid HMV driving license with commercial transport badge and minimum 2-3 years highway experience.\n• **Salary Range**: ₹25,000 to ₹45,000/month (plus interstate night allowances & trip bonuses).\n• **Required Documents**: HMV License, Aadhar Card, Police Verification, and Medical Fitness Certificate.\n\nBrowse open verified HMV postings right now:`,
    actionLink: { text: 'View HMV & Truck Jobs', url: '/jobs?category=HMV' },
    options: ['What about LMV cab driver jobs?', 'Upload my driving license', 'How to get shortlisted?']
  },
  {
    keywords: ['document', 'upload', 'resume', 'license', 'aadhar', 'pan', 'verification'],
    answer: `📄 **Document & Verification Guidelines**\n\nTo ensure 100% employer trust and quick shortlisting, please upload:\n1. **Driving License** (Front & Back clear photo or PDF)\n2. **ID Proof** (Aadhar / PAN Card)\n3. **Driver Resume** (Listing vehicle types and experience)\n4. **Police Clearance** (Optional but boosts shortlist chances by 3x)\n\nAll documents are securely encrypted in our private storage.`,
    actionLink: { text: 'Manage & Upload Documents', url: '/driver/documents' },
    options: ['Check my profile completion', 'How to apply for jobs?']
  },
  {
    keywords: ['shortlist', 'hire', 'process', 'interview', 'selection', 'status'],
    answer: `🎯 **How the Driver Hub Recruitment Process Works**\n\n1. **Apply**: Submit your profile and optional cover note to any approved vacancy.\n2. **Under Review**: The employer checks your license validity and experience.\n3. **Shortlisted**: You will receive an instant push notification + SMS alert.\n4. **Interview / Driving Test**: Employer coordinates a vehicle test drive.\n5. **Selected**: Offer confirmation and onboarding!`,
    actionLink: { text: 'Track My Applications', url: '/driver/applications' },
    options: ['Search open jobs', 'Update my profile details']
  },
  {
    keywords: ['salary', 'pay', 'rupee', 'inr', 'earnings', 'rate'],
    answer: `💰 **Standard Driver Salary Benchmarks (2026)**\n\n• **LMV / Cab / Personal Chauffeur**: ₹18,000 – ₹28,000 / month\n• **Tempo / Hyperlocal Delivery**: ₹16,000 – ₹24,000 / month\n• **School Bus / Passenger Transit**: ₹18,000 – ₹25,000 / month\n• **HMV Heavy Truck (Interstate)**: ₹25,000 – ₹38,000 / month\n• **40ft Container Trailer Driver**: ₹32,000 – ₹50,000 / month\n\n*Note: Many employers also provide PF, ESI, medical insurance, and daily trip allowances.*`,
    options: ['Find High-Paying Jobs', 'Post a Job Vacancy']
  },
  {
    keywords: ['post job', 'employer', 'company', 'hire', 'vacancy', 'candidates'],
    answer: `🏢 **Posting a Vacancy as an Employer**\n\n1. Register as an Employer and fill your company profile.\n2. Click **Post Job** and specify vehicle category, experience needed, salary, and shift timings.\n3. Your listing is verified by Driver Hub Admin within a few hours to prevent spam.\n4. Once approved, thousands of qualified drivers can apply immediately.`,
    actionLink: { text: 'Post a Driver Vacancy', url: '/employer/post-job' },
    options: ['Search Driver Talent Pool', 'Contact Support']
  },
  {
    keywords: ['contact', 'human', 'support', 'phone', 'help', 'email', 'issue'],
    answer: `📞 **Driver Hub Support Team**\n\nOur human support specialists are available Monday to Saturday (9:00 AM – 7:00 PM IST).\n\n• **Helpline**: +91 80 2200 8899\n• **Driver Support**: drivers@driverhub.in\n• **Employer Desk**: hiring@driverhub.in\n• **Office**: Electronic City, Bengaluru, Karnataka`,
    actionLink: { text: 'Contact Us Form', url: '/contact' },
    options: ['Browse Jobs', 'Go to Dashboard']
  }
];

export function getAIResponse(userText: string): AIMessage {
  const query = userText.toLowerCase();

  const match = KNOWLEDGE_BASE.find(k => k.keywords.some(kw => query.includes(kw)));

  if (match) {
    return {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      text: match.answer,
      timestamp: 'Just now',
      options: match.options,
      actionLink: match.actionLink
    };
  }

  // Fallback intelligent responder
  return {
    id: 'msg-' + Date.now(),
    sender: 'assistant',
    text: `Thank you for reaching out! Regarding **"${userText}"**:\n\nDriver Hub is India's dedicated driver recruitment network. You can explore verified driving vacancies, upload your commercial documents for instant employer trust, or post job openings directly.\n\nWould you like guidance on any of the following?`,
    timestamp: 'Just now',
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

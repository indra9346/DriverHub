/*
 * Driver Hub blog posts.
 *
 * Every post is a guide to what the Driver Hub site itself does, written from
 * the site's own screens and rules. Keep it that way: no statistics, company
 * claims, testimonials or promises that the site cannot back up. When a screen
 * or rule changes, update the post that describes it.
 *
 * This file is plain data (no React) because vite.config.ts also reads it to
 * write each post's page title, description and the sitemap at build time.
 */

export const SITE_URL = 'https://driverhub.in';

export type BlogAudience = 'Drivers' | 'Employers' | 'Everyone';

export type BlogBlock =
  | { type: 'p'; text: string }
  /** Numbered steps, in order. */
  | { type: 'steps'; items: string[] }
  /** Bullet points. */
  | { type: 'list'; items: string[] }
  /** A highlighted tip or warning. */
  | { type: 'note'; text: string }
  /** A link to a page of the site. */
  | { type: 'link'; to: string; label: string };

export interface BlogSection {
  heading: string;
  blocks: BlogBlock[];
}

export interface BlogPost {
  slug: string;
  title: string;
  /** Meta description: one or two sentences, under 160 characters. */
  description: string;
  audience: BlogAudience;
  /** YYYY-MM-DD */
  published: string;
  /** YYYY-MM-DD, when the post was last changed. */
  updated?: string;
  /**
   * Cover photo: src/assets/blog/<slug>.jpg (or .png / .webp). Until that file
   * exists the pages show a neutral placeholder with this icon. See
   * src/assets/blog/README.md for the file names and the picture prompts.
   */
  coverIcon: 'truck' | 'licence' | 'office' | 'phone';
  /** Describes the cover photo for screen readers. */
  coverAlt: string;
  intro: string;
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'find-and-apply-for-driver-jobs',
    title: 'How to find and apply for driver jobs on Driver Hub',
    description:
      'Create a driver account, search jobs by vehicle type, place and pay, apply with a short note to the employer and follow every application on Driver Hub.',
    audience: 'Drivers',
    published: '2026-11-06',
    coverIcon: 'truck',
    coverAlt: 'A truck driver in his parked cab looking at job listings on his phone',
    intro:
      'Driver Hub lists driver vacancies posted by employers. This guide follows the steps on the site, from creating your account to following up on an application.',
    sections: [
      {
        heading: 'Create your driver account',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open Register and choose "Continue as Driver".',
              'Enter your full name, your licence or vehicle category (for example Heavy Truck (HMV), LMV Chauffeur, Cab Driver, Delivery Driver or School & Staff Bus Driver) and your years of driving experience. Enter 0 if you are just starting.',
              'Add your email address, your phone number and a password of at least 6 characters.',
              'Choose your State/UT, District and Town/City, or tap "Use My Current Location" to fill them in.',
              'Tap "Register as Driver".'
            ]
          },
          {
            type: 'note',
            text: 'If the site asks you to confirm your email address, open the link sent to your inbox, then sign in.'
          },
          {
            type: 'p',
            text: 'After signing up, open My Profile in your dashboard and fill in the rest of your details. Employers see your profile details when you apply.'
          },
          { type: 'link', to: '/register?role=driver', label: 'Register as a driver' }
        ]
      },
      {
        heading: 'Search for jobs',
        blocks: [
          {
            type: 'p',
            text: 'Open Find Jobs to see the vacancies that are open now. You can search by keyword and narrow the list by driver category, location and minimum monthly salary, then sort it by "Newest first" or "Highest salary".'
          },
          {
            type: 'p',
            text: 'When you are signed in as a driver, tap the heart on a job to save it. Your saved jobs are listed under Saved Jobs in your account.'
          },
          { type: 'link', to: '/jobs', label: 'Find driver jobs' }
        ]
      },
      {
        heading: 'Apply for a job',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open the job and read its pay, location and requirements.',
              'Tap "Apply Now". If you are not signed in with a driver account, sign in first and you are brought back to the job.',
              'Check the "Applying as" box: it shows your name, licence and experience from your profile.',
              'Add an optional message to the employer, for example the vehicles you have driven, the routes you know or when you can join.',
              'Send the application.'
            ]
          },
          {
            type: 'note',
            text: 'You can apply to each job once. A job that has closed no longer accepts applications.'
          }
        ]
      },
      {
        heading: 'Follow your applications',
        blocks: [
          {
            type: 'p',
            text: 'My Applications lists every job you applied for, with a five-step progress line: 1. Applied, 2. Under Review, 3. Shortlisted, 4. Driving Test / Trial and 5. Hired. The status changes when the employer updates your application. If the employer does not go ahead, the status shows "Not Selected".'
          },
          {
            type: 'list',
            items: [
              'Use the tabs (All, In Progress, Shortlisted / Interviews, Selected / Hired, Closed) to find an application quickly.',
              'Tap "Message employer" on an application to write to the employer.',
              'You can withdraw an application while it is still in progress. Withdrawing is final: you cannot apply to that job again.'
            ]
          }
        ]
      },
      {
        heading: 'Stay safe',
        blocks: [
          {
            type: 'list',
            items: [
              'Never pay money to apply for a job, to get selected or to "reserve" a vacancy. Genuine employers do not ask for this.',
              'Confirm salary, duty hours, rest days and allowances in writing before you join.',
              'If a listing asks for money or looks fake, stop contact and report it to Driver Hub support.'
            ]
          },
          { type: 'link', to: '/safety', label: 'Read the safety guide' }
        ]
      }
    ]
  },
  {
    slug: 'upload-driving-licence-and-documents',
    title: 'Uploading your driving licence and documents on Driver Hub',
    description:
      'Which documents drivers can upload on Driver Hub, the file types allowed, and what the Pending Review, Verified and Rejected statuses mean.',
    audience: 'Drivers',
    published: '2026-11-06',
    coverIcon: 'licence',
    coverAlt: 'A driver photographing his driving licence with a phone on a car dashboard',
    intro:
      'Drivers can upload their driving licence and other documents to their Driver Hub account. A Driver Hub administrator reviews each one. This guide explains where to upload, what you can upload and what each status means.',
    sections: [
      {
        heading: 'Where to upload',
        blocks: [
          {
            type: 'p',
            text: 'Sign in with your driver account and open "Documents & License" from your dashboard menu.'
          },
          { type: 'link', to: '/driver/documents', label: 'Open my documents' }
        ]
      },
      {
        heading: 'What you can upload',
        blocks: [
          {
            type: 'list',
            items: [
              'Driving licence',
              'Resume / CV',
              'Aadhaar / ID',
              'PAN card',
              'Experience certificate',
              'Police verification',
              'Other document'
            ]
          },
          {
            type: 'p',
            text: 'Each file must be a PDF, JPG or PNG and under 5 MB. Use a clear scan or photo in which every line can be read.'
          }
        ]
      },
      {
        heading: 'How to upload a document',
        blocks: [
          {
            type: 'steps',
            items: [
              'Choose the Document Category, for example Driving licence.',
              'Tap "Select File" and pick the scan or photo.',
              'Tap "Upload Document".',
              'The document appears under Uploaded Documents with the date it was uploaded.'
            ]
          }
        ]
      },
      {
        heading: 'What the review status means',
        blocks: [
          {
            type: 'list',
            items: [
              'Pending Review: the document is uploaded and waiting for an administrator to check it.',
              'Verified: an administrator has reviewed the document and approved it.',
              'Rejected: the document was not approved. Upload a clearer or correct copy.'
            ]
          },
          {
            type: 'note',
            text: 'A Verified status means an administrator has reviewed what you uploaded. Employers should still make their own checks before you start work.'
          }
        ]
      },
      {
        heading: 'View or delete a document',
        blocks: [
          {
            type: 'list',
            items: [
              'Tap the eye button to open a document. If your browser blocks the new tab, tap the link that appears instead; it works for 1 minute.',
              'Tap the bin button to delete a document. Deleting cannot be undone.'
            ]
          }
        ]
      },
      {
        heading: 'Keep your documents and account safe',
        blocks: [
          {
            type: 'list',
            items: [
              'Upload only your own, genuine documents.',
              'Show original documents only at the final verification, and keep them with you.',
              'Never share OTPs, bank PINs or passwords with anyone, including people who say they are employers.'
            ]
          },
          { type: 'link', to: '/privacy', label: 'Who can see your details (Privacy Policy)' }
        ]
      }
    ]
  },
  {
    slug: 'post-a-driver-job-as-an-employer',
    title: 'How employers post a driver vacancy on Driver Hub',
    description:
      'Create an employer account, fill in the four-step job form, then save a draft, send the job for review or publish it, and manage the drivers who apply.',
    audience: 'Employers',
    published: '2026-11-06',
    coverIcon: 'office',
    coverAlt: 'A fleet manager at a laptop in a transport office, with delivery vans parked outside',
    intro:
      'Companies, fleet owners and private vehicle owners can list driver vacancies on Driver Hub. This guide follows the employer screens, from creating an account to choosing a driver.',
    sections: [
      {
        heading: 'Create an employer account',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open Register and choose "Continue as Employer".',
              'Enter your company or fleet name, the contact person, your industry sector, email address, phone number and a password of at least 6 characters.',
              'Choose your State/UT, District and Town/City.',
              'Tap "Register as Employer", then fill in your Company Profile.'
            ]
          },
          {
            type: 'p',
            text: 'New companies show "Verification pending" until Driver Hub verifies them.'
          },
          { type: 'link', to: '/register?role=employer', label: 'Register as an employer' }
        ]
      },
      {
        heading: 'Fill in the job form',
        blocks: [
          {
            type: 'p',
            text: 'Tap "Post a new job" ("Post Vacancy" in the phone menu). The form has four steps:'
          },
          {
            type: 'steps',
            items: [
              'Job details & Pay',
              'Driver & Vehicle Specs',
              'Description & Screening, where you can add questions for applicants',
              'Preview & Publish, where you see the listing as drivers will see it'
            ]
          }
        ]
      },
      {
        heading: 'Choose how to publish',
        blocks: [
          {
            type: 'list',
            items: [
              'Save as Org Draft: keeps the job for your team to check. No credit is used; publishing it later uses 1 job credit.',
              'Submit for Review: uses 1 job credit. Driver Hub reviews the job and it goes live after approval.',
              'Publish Live: shown only to verified companies, and uses 1 job credit.'
            ]
          },
          {
            type: 'p',
            text: 'If your company is not verified yet, new jobs go live after Driver Hub review. New employer accounts start without job credits. Your plan and credits are shown under Billing and Credits & Usage in your dashboard, and when no credit is left the form offers "View plans" or saving the job as a draft.'
          },
          {
            type: 'p',
            text: 'The Jobs page in your dashboard shows the status of each listing. If Driver Hub does not approve a listing, contact support for details.'
          }
        ]
      },
      {
        heading: 'Review the drivers who apply',
        blocks: [
          {
            type: 'p',
            text: 'Open "Applications Pipeline" to see each driver who applied, with the details from their profile and any message they wrote. Move each application along as you go: mark it under review, shortlist the candidate, mark as contacted, schedule an interview, select or mark as hired, or reject it. The driver sees each change in their own My Applications page.'
          }
        ]
      },
      {
        heading: 'Good practice when hiring',
        blocks: [
          {
            type: 'list',
            items: [
              'List only genuine vacancies with honest pay, hours and requirements, and describe the vehicle, routes and working conditions accurately.',
              'Never ask drivers to pay a fee to apply or to be hired.',
              'Check the driving licence and other documents yourself before the driver starts work.',
              'Hold driving trials in a safe place with a supervisor present.'
            ]
          },
          { type: 'link', to: '/terms', label: 'Read the Terms of Service' }
        ]
      }
    ]
  },
  {
    slug: 'install-driver-hub-app-on-your-phone',
    title: 'Install the Driver Hub app on your phone',
    description:
      'Add Driver Hub to the home screen of your Android phone or iPhone in a few taps. It is free and installs from the browser, not from an app store.',
    audience: 'Everyone',
    published: '2026-11-06',
    coverIcon: 'phone',
    coverAlt: 'A cab driver beside his car tapping an app on his phone home screen',
    intro:
      'Driver Hub can be installed on your phone straight from the browser. It then opens from its own icon on your home screen, like other apps, with the same Driver Hub account. It is free and no Play Store or App Store download is needed.',
    sections: [
      {
        heading: 'Android phones (Chrome)',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open driverhub.in in Chrome.',
              'Tap "Download App". You will find it in the phone menu (the ☰ button at the top) and in the footer at the bottom of the page.',
              'Tap "Install" in the box that appears.'
            ]
          },
          {
            type: 'p',
            text: 'If no install box appears, open the browser menu (⋮) at the top right, choose "Install app" or "Add to Home screen", then tap "Install".'
          }
        ]
      },
      {
        heading: 'iPhone (Safari)',
        blocks: [
          {
            type: 'steps',
            items: [
              'Open driverhub.in in Safari.',
              'Tap the Share button at the bottom of Safari.',
              'Choose "Add to Home Screen".',
              'Tap "Add". Driver Hub appears on your home screen.'
            ]
          }
        ]
      },
      {
        heading: 'Opened the link inside WhatsApp?',
        blocks: [
          {
            type: 'p',
            text: 'Links opened inside WhatsApp or another app open in that app\'s own browser, which cannot install Driver Hub. Open the link in Chrome (Android) or Safari (iPhone) first, then follow the steps above.'
          }
        ]
      },
      {
        heading: 'Already installed',
        blocks: [
          {
            type: 'p',
            text: 'When you open Driver Hub from the installed app, the "Download App" button is hidden. To remove the app, delete it from your home screen like any other app.'
          },
          { type: 'link', to: '/', label: 'Go to the Driver Hub home page' }
        ]
      }
    ]
  }
];

export const getBlogPost = (slug: string | undefined): BlogPost | undefined =>
  BLOG_POSTS.find(post => post.slug === slug);

/** Newest first. */
export const getSortedBlogPosts = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => b.published.localeCompare(a.published));

const blockWords = (block: BlogBlock): string[] => {
  switch (block.type) {
    case 'steps':
    case 'list':
      return block.items.join(' ').split(/\s+/);
    case 'link':
      return [];
    default:
      return block.text.split(/\s+/);
  }
};

/** Whole minutes at about 200 words a minute; at least 1. */
export const getReadingMinutes = (post: BlogPost): number => {
  const words = [post.intro, ...post.sections.map(section => section.heading)]
    .join(' ')
    .split(/\s+/)
    .concat(post.sections.flatMap(section => section.blocks.flatMap(blockWords)))
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

/** Public URL of a post. Hostinger serves folder pages with a trailing slash. */
export const blogPostUrl = (slug: string): string => `${SITE_URL}/blogs/${slug}/`;
export const BLOG_INDEX_URL = `${SITE_URL}/blogs/`;

/* Page titles, descriptions and structured data, shared by the pages and the build. */
export const BLOG_INDEX_TITLE = 'Blogs: guides for drivers and employers | Driver Hub';
export const BLOG_INDEX_DESCRIPTION =
  'Step-by-step Driver Hub guides: find and apply for driver jobs, upload your driving licence, post a driver vacancy and install the app on your phone.';

/** The post title, plus the site name when the title does not already say it. */
export const blogPostTitle = (post: BlogPost): string =>
  post.title.includes('Driver Hub') ? post.title : `${post.title} | Driver Hub`;

const PUBLISHER = {
  '@type': 'Organization',
  name: 'Driver Hub',
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-icon-1024.png` }
};

export const blogPostJsonLd = (post: BlogPost): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  datePublished: post.published,
  dateModified: post.updated || post.published,
  url: blogPostUrl(post.slug),
  mainEntityOfPage: blogPostUrl(post.slug),
  inLanguage: 'en-IN',
  author: { '@type': 'Organization', name: 'Driver Hub', url: `${SITE_URL}/` },
  publisher: PUBLISHER
});

export const blogIndexJsonLd = (): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Driver Hub Blog',
  description: BLOG_INDEX_DESCRIPTION,
  url: BLOG_INDEX_URL,
  inLanguage: 'en-IN',
  publisher: PUBLISHER,
  blogPost: getSortedBlogPosts().map(post => ({
    '@type': 'BlogPosting',
    headline: post.title,
    url: blogPostUrl(post.slug),
    datePublished: post.published
  }))
});

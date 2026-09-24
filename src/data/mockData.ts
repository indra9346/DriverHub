import { Job, DriverProfile, EmployerProfile, Application, Notification, User } from '../types';

export const initialUsers: User[] = [
  { id: 'usr-driver-1', email: 'ravi.kumar@driverhub.in', role: 'driver', status: 'active', phone: '+91 98765 43210', createdAt: '2026-08-15' },
  { id: 'usr-driver-2', email: 'suresh.m@driverhub.in', role: 'driver', status: 'active', phone: '+91 98765 00002', createdAt: '2026-08-20' },
  { id: 'usr-driver-3', email: 'anitha.p@driverhub.in', role: 'driver', status: 'active', phone: '+91 98765 00003', createdAt: '2026-08-22' },
  { id: 'usr-driver-4', email: 'manjunath.r@driverhub.in', role: 'driver', status: 'active', phone: '+91 98765 00004', createdAt: '2026-08-25' },
  { id: 'usr-driver-5', email: 'kiran.s@driverhub.in', role: 'driver', status: 'active', phone: '+91 98765 00005', createdAt: '2026-08-28' },
  { id: 'usr-driver-6', email: 'ik9893344@gmail.com', role: 'driver', status: 'active', phone: '+91 98765 00000', createdAt: '2026-09-01' },
  { id: 'usr-employer-1', email: 'deepa@bharatlogistics.in', role: 'employer', status: 'active', phone: '+91 80 2200 0001', createdAt: '2026-08-10' },
  { id: 'usr-employer-2', email: 'arjun@quickride.in', role: 'employer', status: 'active', phone: '+91 80 2200 0002', createdAt: '2026-08-12' },
  { id: 'usr-employer-3', email: 'admin@sunriseschool.in', role: 'employer', status: 'pending', phone: '+91 80 2200 0003', createdAt: '2026-09-01' },
  { id: 'usr-employer-4', email: 'karan@swiftexpress.in', role: 'employer', status: 'active', phone: '+91 44 2855 0099', createdAt: '2026-08-18' },
  { id: 'usr-admin-1', email: 'admin@driverhub.in', role: 'admin', status: 'active', phone: '+91 99000 11223', createdAt: '2026-01-01' },
];

export const initialEmployers: EmployerProfile[] = [
  {
    id: 'usr-employer-1',
    companyName: 'Bharat Logistics Pvt Ltd',
    contactPerson: 'Deepa Nair (Talent Head)',
    email: 'deepa@bharatlogistics.in',
    phone: '+91 80 2200 0001',
    industry: 'Logistics & Interstate Freight',
    location: 'Electronic City, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Plot 42, Phase 1, Electronic City, Bengaluru - 560100',
    website: 'https://bharatlogistics.example.com',
    logoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
    description: 'Leading heavy freight transportation across South & Central India with a modern fleet of 250+ GPS-tracked multi-axle trucks.',
    verified: true,
    status: 'active',
    createdAt: '2026-08-10',
  },
  {
    id: 'usr-employer-2',
    companyName: 'QuickRide Mobility Solutions',
    contactPerson: 'Arjun Rao (Operations Manager)',
    email: 'arjun@quickride.in',
    phone: '+91 80 2200 0002',
    industry: 'Urban Mobility & Fleet Services',
    location: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
    website: 'https://quickride.example.com',
    logoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=80',
    description: 'Tech-enabled corporate cab and airport transfer services providing safe, reliable, and premium chauffeured rides.',
    verified: true,
    status: 'active',
    createdAt: '2026-08-12',
  },
  {
    id: 'usr-employer-3',
    companyName: 'Sunrise International School',
    contactPerson: 'Meera Iyer (Transport Administrator)',
    email: 'admin@sunriseschool.in',
    phone: '+91 80 2200 0003',
    industry: 'Education & Student Transit',
    location: 'Kuvempunagar, Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    address: 'Survey 14, Ring Road, Kuvempunagar, Mysuru - 570023',
    website: 'https://sunriseschool.example.com',
    logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    description: 'Premier K-12 institution prioritizing child safety with dedicated fleet of GPS-equipped yellow school buses and vans.',
    verified: false,
    status: 'pending',
    createdAt: '2026-09-01',
  },
  {
    id: 'usr-employer-4',
    companyName: 'Swift Express Logistics',
    contactPerson: 'Karan Mehra',
    email: 'karan@swiftexpress.in',
    phone: '+91 44 2855 0099',
    industry: 'E-Commerce Delivery & Last Mile',
    location: 'Guindy, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Olympia Tech Park Area, Guindy, Chennai - 600032',
    website: 'https://swiftexpress.example.com',
    logoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    description: 'Rapid hyperlocal and last-mile logistics partner for premier retail and e-commerce companies across South India.',
    verified: true,
    status: 'active',
    createdAt: '2026-08-18',
  }
];

export const initialDrivers: DriverProfile[] = [
  {
    id: 'usr-driver-1',
    fullName: 'Ravi Kumar',
    phone: '+91 98765 43210',
    email: 'ravi.kumar@driverhub.in',
    location: 'Kengeri, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'HMV',
    licenseNumber: 'KA02 20180045920',
    licenseType: 'Heavy Motor Vehicle (HMV-Transport)',
    licenseExpiry: '2030-05-14',
    experienceYears: 6,
    skills: ['Interstate Freight', 'GPS Navigation', 'Night Driving', 'Pre-Trip Inspection', 'Fuel Optimization'],
    preferredLocation: 'Bengaluru / South India Intercity',
    expectedSalary: 28000,
    availability: 'Immediate',
    bio: 'Experienced heavy truck driver with 6+ years accident-free record across Karnataka, Tamil Nadu, and Maharashtra routes. Punctual, verified background, and clean license.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    resumeUrl: 'https://driverhub.in/resumes/ravi_kumar_cv.pdf',
    status: 'active',
    experiences: [
      {
        id: 'exp-1',
        driverId: 'usr-driver-1',
        companyName: 'South Freight Lines',
        roleTitle: 'Senior Long Haul Driver',
        vehicleType: '14-Wheel Ashok Leyland Truck',
        durationYears: 4,
        startDate: '2022-01',
        endDate: '2026-07',
        description: 'Transported industrial goods across Bengaluru-Chennai-Hyderabad corridor.'
      },
      {
        id: 'exp-2',
        driverId: 'usr-driver-1',
        companyName: 'Apex Cargo Movers',
        roleTitle: 'Medium Commercial Driver',
        vehicleType: 'Tata 1109 Eicher',
        durationYears: 2,
        startDate: '2020-01',
        endDate: '2021-12',
        description: 'Inter-district delivery across Karnataka State.'
      }
    ],
    documents: [
      {
        id: 'doc-1',
        driverId: 'usr-driver-1',
        name: 'Driving_License_HMV.pdf',
        type: 'driving_license',
        fileUrl: '#',
        fileSize: '1.4 MB',
        uploadDate: '2026-08-15',
        verificationStatus: 'verified'
      },
      {
        id: 'doc-2',
        driverId: 'usr-driver-1',
        name: 'Aadhar_Card_RaviKumar.pdf',
        type: 'aadhar',
        fileUrl: '#',
        fileSize: '950 KB',
        uploadDate: '2026-08-15',
        verificationStatus: 'verified'
      },
      {
        id: 'doc-3',
        driverId: 'usr-driver-1',
        name: 'Ravi_Kumar_Driver_Resume.pdf',
        type: 'resume',
        fileUrl: '#',
        fileSize: '420 KB',
        uploadDate: '2026-08-16',
        verificationStatus: 'verified'
      }
    ]
  },
  {
    id: 'usr-driver-2',
    fullName: 'Suresh M',
    phone: '+91 98765 00002',
    email: 'suresh.m@driverhub.in',
    location: 'Kuvempunagar, Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    driverCategory: 'LMV-Transport',
    licenseNumber: 'KA09 20200088123',
    licenseType: 'LMV Commercial & Yellow Badge',
    licenseExpiry: '2032-11-20',
    experienceYears: 4,
    skills: ['Defensive Driving', 'Student Safety', 'Route Planning', 'Vehicle Maintenance', 'Customer Courtesy'],
    preferredLocation: 'Mysuru / Mandya',
    expectedSalary: 20000,
    availability: 'Immediate',
    bio: 'Disciplined and polite driver with proven track record driving tourist vans and student transport. Zero traffic citations.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    resumeUrl: 'https://driverhub.in/resumes/suresh_m_cv.pdf',
    status: 'active',
    experiences: [
      {
        id: 'exp-3',
        driverId: 'usr-driver-2',
        companyName: 'Mysuru Heritage Tours',
        roleTitle: 'Tempo Traveller Chauffeur',
        vehicleType: 'Force Tempo Traveller 14-Seater',
        durationYears: 3,
        startDate: '2023-03',
        endDate: '2026-08',
        description: 'Guided tourist group transit with 5-star passenger feedback.'
      }
    ],
    documents: [
      {
        id: 'doc-4',
        driverId: 'usr-driver-2',
        name: 'Commercial_License_Suresh.pdf',
        type: 'driving_license',
        fileUrl: '#',
        fileSize: '1.2 MB',
        uploadDate: '2026-08-20',
        verificationStatus: 'verified'
      }
    ]
  },
  {
    id: 'usr-driver-3',
    fullName: 'Anitha P',
    phone: '+91 98765 00003',
    email: 'anitha.p@driverhub.in',
    location: 'BTM Layout, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'LMV',
    licenseNumber: 'KA05 20220019283',
    licenseType: 'Light Motor Vehicle (LMV Non-Transport)',
    licenseExpiry: '2042-03-15',
    experienceYears: 3,
    skills: ['City Commute', 'Automatic & Manual Transmission', 'GPS Navigation', 'VIP Etiquette', 'Punctuality'],
    preferredLocation: 'Bengaluru South / Koramangala / Whitefield',
    expectedSalary: 24000,
    availability: '15 Days',
    bio: 'Professional personal and executive chauffeur specializing in sedan and SUV handling for corporate executives and private families.',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    resumeUrl: 'https://driverhub.in/resumes/anitha_p_cv.pdf',
    status: 'active',
    experiences: [
      {
        id: 'exp-4',
        driverId: 'usr-driver-3',
        companyName: 'Elite Executive Transit',
        roleTitle: 'Corporate Chauffeur',
        vehicleType: 'Innova Crysta / Honda City',
        durationYears: 2,
        startDate: '2024-02',
        endDate: '2026-08',
        description: 'Managed executive morning and evening commute with flawless on-time record.'
      }
    ],
    documents: [
      {
        id: 'doc-5',
        driverId: 'usr-driver-3',
        name: 'Driving_License_Anitha.pdf',
        type: 'driving_license',
        fileUrl: '#',
        fileSize: '1.1 MB',
        uploadDate: '2026-08-22',
        verificationStatus: 'verified'
      }
    ]
  },
  {
    id: 'usr-driver-4',
    fullName: 'Manjunath R',
    phone: '+91 98765 00004',
    email: 'manjunath.r@driverhub.in',
    location: 'Ambattur, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    driverCategory: 'Trailer Driver',
    licenseNumber: 'TN02 20150033441',
    licenseType: 'HMV + Hazardous Cargo Endorsement',
    licenseExpiry: '2029-08-10',
    experienceYears: 9,
    skills: ['Heavy Container Transit', 'Port Clearance Operations', 'Overdimensional Cargo', 'Safety Protocols'],
    preferredLocation: 'Chennai Port / Ennore / Sriperumbudur',
    expectedSalary: 38000,
    availability: 'Immediate',
    bio: '9+ years veteran heavy container trailer pilot with extensive port logistics experience and Hazmat handling endorsement.',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    resumeUrl: 'https://driverhub.in/resumes/manjunath_cv.pdf',
    status: 'active',
    experiences: [],
    documents: []
  },
  {
    id: 'usr-driver-5',
    fullName: 'Kiran S',
    phone: '+91 98765 00005',
    email: 'kiran.s@driverhub.in',
    location: 'Rajajinagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'Delivery Driver',
    licenseNumber: 'KA04 20240099112',
    licenseType: 'MCWG / LMV',
    licenseExpiry: '2044-01-10',
    experienceYears: 1,
    skills: ['Quick Delivery', 'Route Mapping', 'Mobile App Literacy'],
    preferredLocation: 'Bengaluru West / Central',
    expectedSalary: 16000,
    availability: 'Immediate',
    bio: 'Delivery pilot with experience in parcel distribution and food delivery.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'blocked',
    experiences: [],
    documents: []
  }
];

export const initialJobs: Job[] = [
  {
    id: 'job-1',
    employerId: 'usr-employer-1',
    companyName: 'Bharat Logistics Pvt Ltd',
    companyLogo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
    title: 'Senior Heavy Truck Driver (Multi-Axle Interstate)',
    category: 'HMV',
    location: 'Electronic City, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceRequired: '3-6 Years',
    experienceMinYears: 3,
    salaryMin: 25000,
    salaryMax: 32000,
    salaryType: 'monthly',
    workingHours: 'Full-time, Rotational shifts (Day/Night)',
    employmentType: 'Full-time',
    description: 'We are seeking experienced, disciplined Heavy Motor Vehicle (HMV) drivers to operate 10-wheel to 16-wheel commercial trucks along our South-Western routes. The candidate must hold an active HMV badge and have a proven safe driving record.\n\nKey Responsibilities:\n• Safe operation and transport of industrial cargo between Bengaluru and Chennai hub.\n• Daily vehicle inspection: tire pressure, fluid levels, brakes, and safety lights.\n• Maintain accurate GPS log entries and transit trip sheets.\n• Comply with national highway speed regulations and toll protocols.',
    requiredSkills: ['Valid HMV Badge', 'Interstate Experience', 'Night Vision & Highway Driving', 'Basic Mechanical Troubleshooting'],
    requiredDocs: ['HMV Commercial Driving License', 'Aadhar Card', 'Address Proof', 'Police Clearance Certificate'],
    vacancies: 5,
    status: 'active',
    postedDate: '2026-09-02',
    applicationsCount: 4
  },
  {
    id: 'job-2',
    employerId: 'usr-employer-2',
    companyName: 'QuickRide Mobility Solutions',
    companyLogo: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=80',
    title: 'Executive Fleet Chauffeur (Sedans & SUVs)',
    category: 'Cab Driver',
    location: 'Indiranagar & Airport Corridors, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceRequired: '2+ Years',
    experienceMinYears: 2,
    salaryMin: 22000,
    salaryMax: 28000,
    salaryType: 'monthly',
    workingHours: 'Flexible 9-hour shifts with overtime allowances',
    employmentType: 'Full-time',
    description: 'QuickRide is expanding our executive fleet services. We provide company-owned automatic Innova Crysta, Honda Elevate, and EV sedans for corporate clients and premium airport transfers.\n\nBenefits:\n• Fixed salary + daily trip incentives + fuel allowance.\n• Comprehensive medical insurance cover for driver and spouse.\n• Performance and customer rating bonus up to ₹5,000/month.',
    requiredSkills: ['LMV Commercial Badge', 'Polite Communication (Kannada / English / Hindi)', 'GPS App Navigation', 'Clean Driving Track Record'],
    requiredDocs: ['LMV License', 'Aadhar Card', 'PAN Card', 'Bank Passbook'],
    vacancies: 8,
    status: 'active',
    postedDate: '2026-09-05',
    applicationsCount: 7
  },
  {
    id: 'job-3',
    employerId: 'usr-employer-3',
    companyName: 'Sunrise International School',
    companyLogo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    title: 'School Bus & Student Van Driver',
    category: 'Bus Driver',
    location: 'Kuvempunagar, Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    experienceRequired: '3+ Years',
    experienceMinYears: 3,
    salaryMin: 18000,
    salaryMax: 22000,
    salaryType: 'monthly',
    workingHours: 'Split Shift: 6:30 AM - 10:00 AM & 2:30 PM - 5:30 PM',
    employmentType: 'Full-time',
    description: 'Looking for a cautious, punctual, and child-friendly driver to operate 32-seater school buses for daily student pick-up and drop-off across Mysuru routes. Zero tolerance for speeding or aggressive driving.',
    requiredSkills: ['Heavy Passenger Vehicle (HPV) / Bus License', 'Patient & Calm Demeanor', 'Safety Protocol Adherence'],
    requiredDocs: ['Heavy Bus License', 'Police Verification Record', 'Aadhar Card', 'Medical Fitness Certificate'],
    vacancies: 2,
    status: 'active',
    postedDate: '2026-09-08',
    applicationsCount: 3
  },
  {
    id: 'job-4',
    employerId: 'usr-employer-4',
    companyName: 'Swift Express Logistics',
    companyLogo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'E-Commerce Delivery Pilot (Tata Ace / Tempo)',
    category: 'Tempo Driver',
    location: 'Guindy & OMR, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    experienceRequired: '1-3 Years',
    experienceMinYears: 1,
    salaryMin: 18000,
    salaryMax: 24000,
    salaryType: 'monthly',
    workingHours: 'Day Shift (8:00 AM - 6:00 PM), 6 days/week',
    employmentType: 'Full-time',
    description: 'Join Chennai’s fastest growing delivery network. Drive company Tata Ace / Mahindra Bolero Maxitruck to deliver bulk parcels from distribution hubs to local retail stores.',
    requiredSkills: ['LMV Commercial License', 'Chennai City Route Knowledge', 'Loading & Unloading Care', 'Mobile App Scanning'],
    requiredDocs: ['LMV License', 'Aadhar Card', 'PAN Card'],
    vacancies: 6,
    status: 'active',
    postedDate: '2026-09-10',
    applicationsCount: 5
  },
  {
    id: 'job-5',
    employerId: 'usr-employer-1',
    companyName: 'Bharat Logistics Pvt Ltd',
    companyLogo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&auto=format&fit=crop&q=80',
    title: 'Container Trailer Truck Driver (40ft Trailer)',
    category: 'Trailer Driver',
    location: 'Chennai Port to Bengaluru Inland Depot',
    city: 'Chennai',
    state: 'Tamil Nadu',
    experienceRequired: '5+ Years',
    experienceMinYears: 5,
    salaryMin: 32000,
    salaryMax: 42000,
    salaryType: 'monthly',
    workingHours: 'Full-time, Interstate transit schedule',
    employmentType: 'Full-time',
    description: 'High-earning opportunity for seasoned container trailer drivers. Responsible for pulling 40-foot shipping containers between Chennai Sea Port and Bengaluru Whitefield ICD.',
    requiredSkills: ['Trailer Endorsement License', 'Port Gate In/Out Protocols', 'Heavy Rig Reversing & Parking'],
    requiredDocs: ['HMV Trailer License', 'Port Entry Permit (if available)', 'Aadhar Card', 'Police Verification'],
    vacancies: 3,
    status: 'active',
    postedDate: '2026-08-28',
    applicationsCount: 2
  },
  {
    id: 'job-6',
    employerId: 'usr-employer-2',
    companyName: 'QuickRide Mobility Solutions',
    companyLogo: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&auto=format&fit=crop&q=80',
    title: 'Personal Family Driver (Luxury Sedans & Automatic Cars)',
    category: 'Personal Driver',
    location: 'Sadashivanagar & Malleshwaram, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    experienceRequired: '4+ Years',
    experienceMinYears: 4,
    salaryMin: 22000,
    salaryMax: 27000,
    salaryType: 'monthly',
    workingHours: '9:00 AM to 7:00 PM (Monday - Saturday)',
    employmentType: 'Full-time',
    description: 'Looking for a highly trustworthy, polite, and well-groomed personal chauffeur for a family in Sadashivanagar. Must have experience driving German and luxury vehicles (Mercedes, BMW, Audi, Fortuner).',
    requiredSkills: ['Smooth Driving Skills', 'Punctuality', 'Vehicle Washing & Maintenance', 'Discretion & Privacy'],
    requiredDocs: ['LMV License', 'Aadhar Card', '2 Verified References'],
    vacancies: 1,
    status: 'active',
    postedDate: '2026-09-11',
    applicationsCount: 6
  },
  {
    id: 'job-7',
    employerId: 'usr-employer-4',
    companyName: 'Swift Express Logistics',
    companyLogo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'Electric Delivery Van Driver (City Hyperlocal)',
    category: 'Delivery Driver',
    location: 'Hyderabad (Hitec City / Madhapur)',
    city: 'Hyderabad',
    state: 'Telangana',
    experienceRequired: '1+ Year',
    experienceMinYears: 1,
    salaryMin: 19000,
    salaryMax: 23000,
    salaryType: 'monthly',
    workingHours: 'Day Shift, 6 days/week',
    employmentType: 'Full-time',
    description: 'Drive zero-emission electric cargo vans (Tata Ace EV / Mahindra Zor Grand) for scheduled grocery and parcel drops across Cyberabad.',
    requiredSkills: ['LMV License', 'EV Charging Knowledge', 'Smartphone Operations'],
    requiredDocs: ['LMV License', 'Aadhar Card', 'Bank Account Proof'],
    vacancies: 10,
    status: 'pending',
    postedDate: '2026-09-13',
    applicationsCount: 0
  }
];

export const initialApplications: Application[] = [
  {
    id: 'app-1',
    jobId: 'job-1',
    jobTitle: 'Senior Heavy Truck Driver (Multi-Axle Interstate)',
    companyName: 'Bharat Logistics Pvt Ltd',
    driverId: 'usr-driver-1',
    driverName: 'Ravi Kumar',
    driverPhone: '+91 98765 43210',
    driverEmail: 'ravi.kumar@driverhub.in',
    driverCategory: 'HMV',
    driverExperienceYears: 6,
    driverLocation: 'Bengaluru, Karnataka',
    resumeUrl: 'https://driverhub.in/resumes/ravi_kumar_cv.pdf',
    coverMessage: 'I have 6 years experience driving 16-wheel Ashok Leyland and BharatBenz multi-axle trucks on the Bangalore-Chennai corridor.',
    status: 'shortlisted',
    appliedDate: '2026-09-03',
    updatedDate: '2026-09-04',
    employerNotes: 'Excellent experience and clean license. Scheduled for in-person driving test.',
    interviewDate: '2026-09-18 at 10:30 AM'
  },
  {
    id: 'app-2',
    jobId: 'job-2',
    jobTitle: 'Executive Fleet Chauffeur (Sedans & SUVs)',
    companyName: 'QuickRide Mobility Solutions',
    driverId: 'usr-driver-3',
    driverName: 'Anitha P',
    driverPhone: '+91 98765 00003',
    driverEmail: 'anitha.p@driverhub.in',
    driverCategory: 'LMV',
    driverExperienceYears: 3,
    driverLocation: 'Bengaluru, Karnataka',
    resumeUrl: 'https://driverhub.in/resumes/anitha_p_cv.pdf',
    coverMessage: 'Experienced executive chauffeur with clean records and fluency in English and Kannada.',
    status: 'interview',
    appliedDate: '2026-09-06',
    updatedDate: '2026-09-07',
    employerNotes: 'Strong communication skills and great executive driving background.',
    interviewDate: '2026-09-16 at 02:00 PM'
  },
  {
    id: 'app-3',
    jobId: 'job-5',
    jobTitle: 'Container Trailer Truck Driver (40ft Trailer)',
    companyName: 'Bharat Logistics Pvt Ltd',
    driverId: 'usr-driver-4',
    driverName: 'Manjunath R',
    driverPhone: '+91 98765 00004',
    driverEmail: 'manjunath.r@driverhub.in',
    driverCategory: 'Trailer Driver',
    driverExperienceYears: 9,
    driverLocation: 'Chennai, Tamil Nadu',
    resumeUrl: 'https://driverhub.in/resumes/manjunath_cv.pdf',
    status: 'under_review',
    appliedDate: '2026-09-08',
    updatedDate: '2026-09-09'
  }
];

export const initialNotifications: Notification[] = [
  // Ravi Kumar (usr-driver-1)
  {
    id: 'notif-1',
    userId: 'usr-driver-1',
    title: 'Application Shortlisted! 🎉',
    message: 'Bharat Logistics shortlisted your profile for "Senior Heavy Truck Driver". Review interview schedule.',
    type: 'application_status',
    read: false,
    createdAt: '2026-09-14 11:30',
    link: '/driver/applications'
  },
  {
    id: 'notif-2',
    userId: 'usr-driver-1',
    title: 'New Matching Job Alert 🚛',
    message: 'A new HMV vacancy matching your profile was posted in Bengaluru: Container Trailer Truck Driver.',
    type: 'job_match',
    read: true,
    createdAt: '2026-09-13 09:15',
    link: '/jobs/job-5'
  },
  // Suresh M (usr-driver-2)
  {
    id: 'notif-suresh-1',
    userId: 'usr-driver-2',
    title: 'Profile Verification Complete ✅',
    message: 'Your LMV-Transport commercial license has been verified by the RTO compliance audit.',
    type: 'system',
    read: false,
    createdAt: '2026-09-14 15:00',
    link: '/driver/documents'
  },
  {
    id: 'notif-suresh-2',
    userId: 'usr-driver-2',
    title: 'Recommended Vacancy in Mysuru 🚗',
    message: 'Sunrise School is hiring an LMV school van pilot in Kuvempunagar, Mysuru.',
    type: 'job_match',
    read: true,
    createdAt: '2026-09-12 10:20',
    link: '/jobs/job-3'
  },
  // Anitha P (usr-driver-3)
  {
    id: 'notif-anitha-1',
    userId: 'usr-driver-3',
    title: 'Interview Scheduled 🗓️',
    message: 'QuickRide Mobility scheduled an executive trial on 2026-09-16 at 02:00 PM.',
    type: 'application_status',
    read: false,
    createdAt: '2026-09-14 16:45',
    link: '/driver/applications'
  },
  // Manjunath R (usr-driver-4)
  {
    id: 'notif-manjunath-1',
    userId: 'usr-driver-4',
    title: 'Application Under Review ⏳',
    message: 'Bharat Logistics is reviewing your application for 40ft Container Trailer Driver.',
    type: 'application_status',
    read: false,
    createdAt: '2026-09-14 08:30',
    link: '/driver/applications'
  },
  // Kiran S (usr-driver-5)
  {
    id: 'notif-kiran-1',
    userId: 'usr-driver-5',
    title: 'New Hyperlocal Delivery Vacancy 🛵',
    message: 'Swift Express posted a high-incentive delivery pilot opening in Chennai.',
    type: 'job_match',
    read: false,
    createdAt: '2026-09-14 12:10',
    link: '/jobs/job-4'
  },
  // Ik (usr-driver-6)
  {
    id: 'notif-ik-1',
    userId: 'usr-driver-6',
    title: 'Welcome to Driver Hub 🛡️',
    message: 'Your HMV driver profile is live. Explore verified fleets and apply with zero agency cuts.',
    type: 'system',
    read: false,
    createdAt: '2026-09-14 18:00',
    link: '/jobs'
  },
  // Bharat Logistics / Deepa (usr-employer-1)
  {
    id: 'notif-emp1-1',
    userId: 'usr-employer-1',
    title: 'New Candidate Applied 📄',
    message: 'Ravi Kumar (6 yrs exp, HMV) applied for Senior Heavy Truck Driver position.',
    type: 'new_application',
    read: false,
    createdAt: '2026-09-14 10:00',
    link: '/employer/applications'
  },
  {
    id: 'notif-emp1-2',
    userId: 'usr-employer-1',
    title: 'New Candidate Applied 📄',
    message: 'Manjunath R (9 yrs exp, Trailer) applied for Container Trailer Truck Driver position.',
    type: 'new_application',
    read: true,
    createdAt: '2026-09-13 14:10',
    link: '/employer/applications'
  },
  // QuickRide / Arjun (usr-employer-2)
  {
    id: 'notif-emp2-1',
    userId: 'usr-employer-2',
    title: 'New Candidate Applied 📄',
    message: 'Anitha P applied for Executive Fleet Chauffeur position.',
    type: 'new_application',
    read: false,
    createdAt: '2026-09-14 11:15',
    link: '/employer/applications'
  },
  // Swift Express / Karan (usr-employer-4)
  {
    id: 'notif-emp4-1',
    userId: 'usr-employer-4',
    title: 'Job Posting Approved ✅',
    message: 'Your vacancy "Electric Delivery Van Driver" has been approved and published to the driver network.',
    type: 'system',
    read: false,
    createdAt: '2026-09-14 13:00',
    link: '/employer/jobs'
  },
  // Superadmin (usr-admin-1)
  {
    id: 'notif-admin-1',
    userId: 'usr-admin-1',
    title: 'New Job Listing Pending Review ⏳',
    message: 'Bharat Logistics Pvt Ltd submitted a new vacancy: "Container Truck Driver - Port & Logistics Operations".',
    type: 'system',
    read: false,
    createdAt: '2026-09-14 17:30',
    link: '/admin/jobs'
  },
  {
    id: 'notif-admin-2',
    userId: 'usr-admin-1',
    title: 'New Employer Verification Request 🏢',
    message: 'Sunrise International School submitted commercial transport documentation for audit.',
    type: 'system',
    read: true,
    createdAt: '2026-09-13 16:00',
    link: '/admin/employers'
  }
];

export const additionalDrivers: DriverProfile[] = [
  {
    id: 'usr-driver-7',
    fullName: 'Afnan Khan R',
    phone: '+91 98450 77211',
    email: 'afnan.khan@driverhub.in',
    location: 'Deepanjali Nagar, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'HMV',
    licenseNumber: 'KA05 20190088123',
    licenseType: 'Heavy Motor Vehicle (HMV-Transport) + Badge',
    licenseExpiry: '2032-11-20',
    experienceYears: 4,
    experienceMonths: 9,
    skills: ['Heavy Truck Driving', 'Multi-Axle Fleet', 'Highway Logistics', 'FASTag & E-Way Bill Handling', 'Fuel Efficiency'],
    languages: ['English (Good)', 'Hindi', 'Kannada', 'Urdu'],
    vehicleTypes: ['14-Wheel Truck', 'BharatBenz 2823R', 'Tata Prima'],
    currentRole: 'Senior Fleet Driver at S B International Tours & Logistics Pvt Ltd',
    previousRole: 'Heavy Commercial Driver at DitioSys Transport Pvt Ltd',
    education: 'PUC / ITI Automobile & RTO Safety Certified',
    preferredLocation: 'Bengaluru / Bangalore Region & South India',
    expectedSalary: 29000,
    availability: 'Immediate',
    nightShiftWilling: true,
    outstationWilling: true,
    cvAttached: true,
    policeVerified: true,
    lastActive: '24 Sep \'26',
    unlockCount: 22,
    bio: '4 yrs 9 mos accident-free commercial driving experience across Bengaluru, Mysuru, Chennai, and Mumbai highways.',
    status: 'active',
    experiences: [
      {
        id: 'exp-afnan-1',
        driverId: 'usr-driver-7',
        companyName: 'S B International Tours & Logistics Pvt Ltd',
        roleTitle: 'Senior Fleet Driver',
        vehicleType: 'BharatBenz 2823R Multi-Axle',
        durationYears: 3,
        startDate: '2023-01',
        endDate: 'Present',
        description: 'Interstate hub-to-hub express freight operations.'
      }
    ],
    documents: []
  },
  {
    id: 'usr-driver-8',
    fullName: 'R Baranidharan',
    phone: '+91 94441 66892',
    email: 'baranidharan.r@driverhub.in',
    location: 'Banashankari, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'Personal Driver',
    licenseNumber: 'KA01 20170039104',
    licenseType: 'LMV & LMV-TR Commercial Badge',
    licenseExpiry: '2033-04-15',
    experienceYears: 7,
    experienceMonths: 4,
    skills: ['Luxury Automatic Cars', 'VIP Protocol', 'City & Airport Transfers', ' Defensive Driving', 'GPS Navigation'],
    languages: ['Kannada', 'Tamil', 'English (Fluent)', 'Hindi'],
    vehicleTypes: ['Mercedes-Benz E-Class', 'Toyota Innova Hycross', 'BMW 5 Series', 'Fortuner'],
    currentRole: 'Executive Corporate Chauffeur at Prestige Corporate Services',
    previousRole: 'Family Personal Chauffeur at Indiranagar Residence',
    education: '12th Pass • Defensive Driving Certified',
    preferredLocation: 'Banashankari, Basavanagudi, Jayanagar, Koramangala (Bengaluru)',
    expectedSalary: 26000,
    availability: 'Immediate',
    nightShiftWilling: true,
    outstationWilling: true,
    cvAttached: true,
    policeVerified: true,
    lastActive: '24 Sep \'26',
    unlockCount: 15,
    bio: 'Well-groomed executive & family chauffeur experienced with automatic luxury sedans and MPVs.',
    status: 'active',
    experiences: [],
    documents: []
  },
  {
    id: 'usr-driver-9',
    fullName: 'Basavaraj Patil',
    phone: '+91 97312 88410',
    email: 'basavaraj.patil@driverhub.in',
    location: 'Peenya Industrial Area, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'Trailer Driver',
    licenseNumber: 'KA25 20150091822',
    licenseType: 'HMV Trailer & Hazardous Goods Endorsed',
    licenseExpiry: '2031-08-10',
    experienceYears: 11,
    experienceMonths: 2,
    skills: ['40ft Container Trailer', 'Port Clearance', 'Ghat Road Driving', 'Air Brake Maintenance', 'Long Haul Night Driving'],
    languages: ['Kannada', 'Hindi', 'Marathi', 'Telugu'],
    vehicleTypes: ['40ft Flatbed Trailer', 'Ashok Leyland 4220', 'Volvo FM 420'],
    currentRole: 'Master Trailer Operator at VRL Heavy Corridor Logistics',
    previousRole: 'Container Driver at Mangaluru Port Freight Corp',
    education: '10th SSLC + Heavy Institute Certification',
    preferredLocation: 'Peenya, Nelamangala, Hubballi, Mangaluru, Mumbai Highway',
    expectedSalary: 38000,
    availability: 'Immediate',
    nightShiftWilling: true,
    outstationWilling: true,
    cvAttached: true,
    policeVerified: true,
    lastActive: '23 Sep \'26',
    unlockCount: 31,
    bio: '11+ years heavy 40ft container and trailer specialist on Bengaluru–Mumbai–Chennai–Mangaluru port corridors.',
    status: 'active',
    experiences: [],
    documents: []
  },
  {
    id: 'usr-driver-10',
    fullName: 'Prakash Gowda H S',
    phone: '+91 99001 45231',
    email: 'prakash.gowda@driverhub.in',
    location: 'Vijayanagar, Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    driverCategory: 'Bus Driver',
    licenseNumber: 'KA09 20160022109',
    licenseType: 'HMV Passenger Bus + PSV Badge',
    licenseExpiry: '2032-02-28',
    experienceYears: 8,
    experienceMonths: 6,
    skills: ['School Bus Safety', '50-Seater Staff Bus', 'First Aid Certified', 'Student Route Compliance', 'Punctual Operations'],
    languages: ['Kannada', 'English', 'Hindi'],
    vehicleTypes: ['Swaraj Mazda School Bus', 'Ashok Leyland Viking 52-Seater', 'Force Traveller 26-Seater'],
    currentRole: 'Senior School Bus Pilot at Mysuru Public Academy',
    previousRole: 'Corporate Staff Coach Driver at Infosys Campus Transit',
    education: '12th Pass + PSV Badge & Child Safety Verified',
    preferredLocation: 'Mysuru, Mandya, South Bengaluru',
    expectedSalary: 24000,
    availability: '15 Days',
    nightShiftWilling: false,
    outstationWilling: true,
    cvAttached: true,
    policeVerified: true,
    lastActive: '24 Sep \'26',
    unlockCount: 14,
    bio: 'PSV-badged school and corporate staff bus driver with zero traffic violations and verified police clearance.',
    status: 'active',
    experiences: [],
    documents: []
  },
  {
    id: 'usr-driver-11',
    fullName: 'Mohammed Irfan',
    phone: '+91 98867 33901',
    email: 'irfan.m@driverhub.in',
    location: 'Whitefield, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'Cab Driver',
    licenseNumber: 'KA53 20200074190',
    licenseType: 'LMV Commercial (Yellow Board Badge)',
    licenseExpiry: '2035-06-18',
    experienceYears: 5,
    experienceMonths: 3,
    skills: ['IT Corridor Employee Pickup', 'EV Fleet Driving', 'Airport Duty', 'Night Roster', 'App Navigation'],
    languages: ['Hindi', 'Urdu', 'English', 'Kannada'],
    vehicleTypes: ['Maruti Ertiga CNG', 'Toyota Etios', 'BYD e6 Electric', 'Tata Tigor EV'],
    currentRole: 'Corporate Fleet Cab Driver at Lithium Urban Mobility',
    previousRole: 'Airport Transfer Driver at Meru Cabs',
    education: '10th Pass',
    preferredLocation: 'Whitefield, Marathahalli, Electronic City, Hebbal',
    expectedSalary: 25000,
    availability: 'Immediate',
    nightShiftWilling: true,
    outstationWilling: true,
    cvAttached: true,
    policeVerified: true,
    lastActive: '24 Sep \'26',
    unlockCount: 19,
    bio: 'Experienced corporate employee transport and EV cab fleet driver covering all Bengaluru tech parks.',
    status: 'active',
    experiences: [],
    documents: []
  },
  {
    id: 'usr-driver-12',
    fullName: 'Venkatesh Murthy',
    phone: '+91 96114 20984',
    email: 'venkatesh.m@driverhub.in',
    location: 'Yeshwanthpur, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    driverCategory: 'Tempo Driver',
    licenseNumber: 'KA04 20210018345',
    licenseType: 'LMV-Goods & Light Commercial (LCV)',
    licenseExpiry: '2034-09-12',
    experienceYears: 4,
    experienceMonths: 1,
    skills: ['Tata Ace / Bolero Pickup', 'FMCG Warehouse Delivery', 'Cold Chain Reefer Van', 'POD & Cash Collection'],
    languages: ['Kannada', 'Telugu', 'Hindi'],
    vehicleTypes: ['Mahindra Bolero Pik-Up', 'Tata Ace Gold', 'Ashok Leyland Bada Dost', 'Eicher Pro 2049'],
    currentRole: 'Hub Distribution Driver at BigBasket Supply Chain',
    previousRole: 'LCV Delivery Driver at Dairy Classic Cold Chain',
    education: '10th Pass',
    preferredLocation: 'Yeshwanthpur, Peenya, Rajajinagar, Yelahanka',
    expectedSalary: 22000,
    availability: 'Immediate',
    nightShiftWilling: true,
    outstationWilling: false,
    cvAttached: true,
    policeVerified: true,
    lastActive: '24 Sep \'26',
    unlockCount: 11,
    bio: 'Fast and reliable LCV / Tempo driver skilled in B2B warehouse distribution and city retail delivery.',
    status: 'active',
    experiences: [],
    documents: []
  }
];

export const initialEmployerSubscriptions: Record<string, import('../types').EmployerSubscription> = {
  'usr-employer-1': {
    employerId: 'usr-employer-1',
    planName: 'ApnaHire Enterprise Fleet Pass (Quarterly)',
    jobCredits: 8,
    dbUnlockCredits: 145,
    totalJobCredits: 10,
    totalDbUnlockCredits: 200,
    gstin: '29AAKCB0612Q1ZC',
    gstinVerified: true,
    billingCompanyName: 'BHARAT LOGISTICS INDIA PRIVATE LIMITED',
    billingAddress: 'Third Floor, Plot 42, Phase 1, Electronic City, Basaveshwara Nagar / Industrial Corridor, Bengaluru Urban, Karnataka - 560100',
    expiresAt: '2026-12-31',
    status: 'active'
  },
  'usr-employer-2': {
    employerId: 'usr-employer-2',
    planName: '2 Job Credit + 50 Driver Unlocks Package',
    jobCredits: 3,
    dbUnlockCredits: 42,
    totalJobCredits: 5,
    totalDbUnlockCredits: 50,
    gstin: '29AABCU9603R1ZM',
    gstinVerified: true,
    billingCompanyName: 'QUICKRIDE MOBILITY SOLUTIONS PRIVATE LIMITED',
    billingAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka - 560038',
    expiresAt: '2026-11-30',
    status: 'active'
  }
};

export const initialBillingTransactions: import('../types').BillingTransaction[] = [
  {
    id: 'txn-101',
    employerId: 'usr-employer-1',
    date: '15 Sep 2026',
    time: '11:20:14 AM',
    planDetails: 'Enterprise Fleet Pass (10 Job Credits + 200 Driver Unlocks)',
    appliesUntil: 'Valid until: Dec 31, 2026',
    amount: 4999,
    status: 'Success',
    invoiceId: 'INV-DH-2026-0915',
    jobCreditsAdded: 10,
    dbCreditsAdded: 200
  },
  {
    id: 'txn-102',
    employerId: 'usr-employer-1',
    date: '03 Sep 2026',
    time: '3:09:20 AM',
    planDetails: '2 Job Credit Package',
    appliesUntil: 'Ordered on: Sep 3, 2026',
    amount: 1651,
    status: 'Cancelled',
    invoiceId: 'INV-DH-2026-0903',
    jobCreditsAdded: 2,
    dbCreditsAdded: 25
  },
  {
    id: 'txn-103',
    employerId: 'usr-employer-1',
    date: '01 Sep 2026',
    time: '3:02:41 AM',
    planDetails: '2 Job Credit Package',
    appliesUntil: 'Ordered on: Sep 1, 2026',
    amount: 1651,
    status: 'Success',
    invoiceId: 'INV-DH-2026-0901',
    jobCreditsAdded: 2,
    dbCreditsAdded: 25
  },
  {
    id: 'txn-104',
    employerId: 'usr-employer-1',
    date: '21 Aug 2026',
    time: '4:15:09 PM',
    planDetails: 'Starter Driver Database Unlock Pack (50 Unlocks)',
    appliesUntil: 'Ordered on: Aug 21, 2026',
    amount: 999,
    status: 'Success',
    invoiceId: 'INV-DH-2026-0821',
    jobCreditsAdded: 1,
    dbCreditsAdded: 50
  }
];

export const initialSavedSearches: import('../types').SavedSearch[] = [
  {
    id: 'srch-1',
    employerId: 'usr-employer-1',
    title: 'HMV Heavy Truck & Multi-Axle Drivers — Bengaluru',
    category: 'HMV',
    city: 'Bengaluru',
    minExp: 3,
    mustHaveSkills: ['Interstate Freight', 'Night Driving', 'GPS Navigation'],
    createdAt: '2026-09-20',
    matchCount: 18
  },
  {
    id: 'srch-2',
    employerId: 'usr-employer-1',
    title: '40ft Container Trailer Operators (Port & Highway)',
    category: 'Trailer Driver',
    city: 'Bengaluru',
    minExp: 5,
    mustHaveSkills: ['40ft Container Trailer', 'Long Haul Night Driving'],
    createdAt: '2026-09-18',
    matchCount: 9
  },
  {
    id: 'srch-3',
    employerId: 'usr-employer-1',
    title: 'Executive Corporate Chauffeurs (Automatic SUV/Sedan)',
    category: 'Personal Driver',
    city: 'Bengaluru',
    minExp: 4,
    mustHaveSkills: ['Luxury Automatic Cars', 'VIP Protocol'],
    createdAt: '2026-09-12',
    matchCount: 14
  }
];

export const initialCandidateUnlocks: import('../types').CandidateUnlock[] = [
  {
    id: 'unl-1',
    employerId: 'usr-employer-1',
    driverId: 'usr-driver-1',
    unlockedAt: '2026-09-22 10:15',
    downloadedExcel: true
  },
  {
    id: 'unl-2',
    employerId: 'usr-employer-1',
    driverId: 'usr-driver-4',
    unlockedAt: '2026-09-23 14:30',
    downloadedExcel: false
  }
];

export const initialDirectMessages: import('../types').DirectMessage[] = [
  {
    id: 'msg-1',
    senderId: 'usr-employer-1',
    senderName: 'Deepa Nair (Bharat Logistics)',
    senderRole: 'employer',
    receiverId: 'usr-driver-1',
    receiverName: 'Ravi Kumar',
    jobId: 'job-1',
    jobTitle: 'Senior Heavy Truck Driver (Multi-Axle)',
    text: 'Hello Ravi, we reviewed your HMV license and 6 years highway experience. Can you attend a driving trial at our Electronic City Phase 1 depot tomorrow at 10:30 AM?',
    timestamp: '2026-09-24 10:15 AM',
    read: false
  },
  {
    id: 'msg-2',
    senderId: 'usr-driver-1',
    senderName: 'Ravi Kumar',
    senderRole: 'driver',
    receiverId: 'usr-employer-1',
    receiverName: 'Deepa Nair (Bharat Logistics)',
    jobId: 'job-1',
    jobTitle: 'Senior Heavy Truck Driver (Multi-Axle)',
    text: 'Namaskara Madam, yes I am available tomorrow at 10:30 AM. I will bring my original HMV license, Aadhaar, and previous experience certificates.',
    timestamp: '2026-09-24 10:42 AM',
    read: false
  },
  {
    id: 'msg-3',
    senderId: 'usr-employer-2',
    senderName: 'Arjun Rao (QuickRide Mobility)',
    senderRole: 'employer',
    receiverId: 'usr-driver-3',
    receiverName: 'Anitha P',
    jobId: 'job-2',
    jobTitle: 'Executive Corporate Cab Chauffeur',
    text: 'Hi Anitha, your background verification is complete. Please report to the Indiranagar fleet hub for vehicle handover briefing.',
    timestamp: '2026-09-23 04:20 PM',
    read: true
  }
];

// Deterministic, explainable Driver <-> Job Matching Engine (Section 36)
export function calculateDriverJobMatch(driver: DriverProfile, job: Job): {
  score: number;
  reasons: { matched: boolean; label: string }[];
} {
  const reasons: { matched: boolean; label: string }[] = [];
  let score = 0;

  // 1. Category / License match (35 pts)
  const categoryMatched =
    driver.driverCategory === job.category ||
    (job.category === 'HMV' && ['HMV', 'HMV-Transport', 'Truck Driver', 'Trailer Driver'].includes(driver.driverCategory)) ||
    (job.category === 'LMV' && ['LMV', 'LMV-Transport', 'Cab Driver', 'Personal Driver', 'Tempo Driver'].includes(driver.driverCategory));
  if (categoryMatched) {
    score += 35;
    reasons.push({ matched: true, label: `License & ${job.category} category matched` });
  } else {
    score += 15;
    reasons.push({ matched: false, label: `Requires ${job.category} specialization` });
  }

  // 2. Experience match (25 pts)
  const minExp = job.experienceMinYears ?? 2;
  if (driver.experienceYears >= minExp) {
    score += 25;
    reasons.push({ matched: true, label: `${driver.experienceYears} yrs experience meets ${minExp}+ yrs requirement` });
  } else {
    score += 10;
    reasons.push({ matched: false, label: `Experience (${driver.experienceYears} yrs) below ${minExp} yrs target` });
  }

  // 3. Location / City match (20 pts)
  const cityMatch =
    driver.city?.toLowerCase() === job.city?.toLowerCase() ||
    driver.location?.toLowerCase().includes((job.city || '').toLowerCase()) ||
    driver.preferredLocation?.toLowerCase().includes((job.city || '').toLowerCase());
  if (cityMatch) {
    score += 20;
    reasons.push({ matched: true, label: `${job.city} location matched` });
  } else {
    score += 8;
    reasons.push({ matched: false, label: `Outstation / Relocation to ${job.city}` });
  }

  // 4. Salary compatibility (20 pts)
  const expected = driver.expectedSalary || 25000;
  if (job.salaryMax >= expected) {
    score += 20;
    reasons.push({ matched: true, label: `Salary up to ₹${job.salaryMax.toLocaleString('en-IN')}/mo matches expectation` });
  } else {
    score += 12;
    reasons.push({ matched: false, label: `Max salary ₹${job.salaryMax.toLocaleString('en-IN')} slightly below ₹${expected.toLocaleString('en-IN')}` });
  }

  return {
    score: Math.min(98, Math.max(62, score)),
    reasons
  };
}


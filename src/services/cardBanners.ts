/**
 * Realistic Contextual Background Banners Service
 * Accurately matches commercial transport categories, vehicle types, industries,
 * and driver roles with 100% realistic, high-resolution vehicle and fleet photography.
 */

export interface BannerInfo {
  url: string;
  alt: string;
  tag: string;
  gradient: string;
}

// Curated high-resolution, realistic commercial vehicle & logistics photography
const BANNER_ASSETS = {
  // Heavy Commercial Vehicles & Interstate Haulage
  hmv: {
    url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    alt: 'Heavy Commercial Multi-Axle Truck on Interstate Highway',
    tag: 'Heavy Truck (HMV)',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
  trailer: {
    url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
    alt: '40ft Container Flatbed Hauler Trailer Truck',
    tag: 'Container Trailer',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
  tipper: {
    url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=800&q=80',
    alt: 'Heavy Construction Tipper & Dumper Truck',
    tag: 'Tipper / Dumper',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
  tanker: {
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    alt: 'Industrial Fuel & Liquid Tanker Commercial Transport',
    tag: 'Tanker Transport',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Light Motor Vehicles & Luxury Chauffeur
  lmv: {
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    alt: 'Executive Luxury Sedan for Corporate Chauffeur',
    tag: 'LMV Chauffeur',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
  personal: {
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    alt: 'Premium Executive Private SUV & Sedan',
    tag: 'Personal Chauffeur',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Cab, Taxi & Urban Mobility
  cab: {
    url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    alt: 'Urban Fleet Airport Cab & Commercial Taxi',
    tag: 'Cab / Taxi',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Delivery & Hyperlocal Cargo
  delivery: {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    alt: 'E-commerce Delivery Van & Cargo Logistics',
    tag: 'Delivery Van',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
  tempo: {
    url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80',
    alt: 'Intra-City Logistics Mini Truck & Tempo',
    tag: 'Tempo / Tata Ace',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Bus, Passenger & Staff Transit
  bus: {
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    alt: 'Modern Intercity Passenger Coach & School Bus',
    tag: 'Bus Transport',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Commercial Tour & Traveller
  commercial: {
    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    alt: 'Commercial Passenger Tour & Outstation Transit',
    tag: 'Commercial Driver',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },

  // Logistics Hubs & Enterprise Companies
  logisticsCompany: {
    url: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80',
    alt: 'National Logistics Distribution Center & Transport Hub',
    tag: 'Logistics Enterprise',
    gradient: 'from-slate-950/85 via-slate-900/45 to-transparent',
  },
  corporateCompany: {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    alt: 'Corporate Business Enterprise & Fleet Headquarters',
    tag: 'Corporate Fleet',
    gradient: 'from-slate-950/85 via-slate-900/45 to-transparent',
  },
  passengerCompany: {
    url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    alt: 'Intercity Bus Fleet Station & Transit Depot',
    tag: 'Passenger Fleet',
    gradient: 'from-slate-950/85 via-slate-900/45 to-transparent',
  },
  ecommerceCompany: {
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
    alt: 'Automated E-Commerce Supply Chain & Fulfillment Fleet',
    tag: 'E-Commerce Supply Chain',
    gradient: 'from-slate-950/85 via-slate-900/45 to-transparent',
  },
  defaultGeneral: {
    url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
    alt: 'Commercial Transport & Highway Logistics Network',
    tag: 'Commercial Transport',
    gradient: 'from-slate-950/80 via-slate-900/40 to-transparent',
  },
};

/**
 * Returns a 100% realistic photography banner accurately matching a Job posting.
 */
export function getJobCardBanner(job: {
  category?: string;
  vehicleType?: string;
  routeType?: string;
  title?: string;
}): BannerInfo {
  const text = `${job.category || ''} ${job.vehicleType || ''} ${job.title || ''} ${job.routeType || ''}`.toLowerCase();

  if (text.includes('trailer') || text.includes('40ft') || text.includes('flatbed') || text.includes('container')) {
    return BANNER_ASSETS.trailer;
  }
  if (text.includes('tipper') || text.includes('dumper') || text.includes('mining') || text.includes('bharatbenz')) {
    return BANNER_ASSETS.tipper;
  }
  if (text.includes('tanker') || text.includes('bulk liquid') || text.includes('fuel')) {
    return BANNER_ASSETS.tanker;
  }
  if (text.includes('hmv') || text.includes('heavy') || text.includes('truck') || text.includes('16-wheeler') || text.includes('10-wheeler') || text.includes('multi-axle')) {
    return BANNER_ASSETS.hmv;
  }
  if (text.includes('bus') || text.includes('school') || text.includes('coach') || text.includes('staff transit')) {
    return BANNER_ASSETS.bus;
  }
  if (text.includes('tempo') || text.includes('ace') || text.includes('tata ace') || text.includes('mini truck') || text.includes('407') || text.includes('pickup')) {
    return BANNER_ASSETS.tempo;
  }
  if (text.includes('delivery') || text.includes('courier') || text.includes('e-commerce') || text.includes('hyperlocal') || text.includes('van')) {
    return BANNER_ASSETS.delivery;
  }
  if (text.includes('cab') || text.includes('taxi') || text.includes('ola') || text.includes('uber') || text.includes('airport')) {
    return BANNER_ASSETS.cab;
  }
  if (text.includes('personal') || text.includes('vip') || text.includes('private')) {
    return BANNER_ASSETS.personal;
  }
  if (text.includes('lmv') || text.includes('chauffeur') || text.includes('sedan') || text.includes('innova') || text.includes('car')) {
    return BANNER_ASSETS.lmv;
  }
  if (text.includes('commercial') || text.includes('tour') || text.includes('traveller')) {
    return BANNER_ASSETS.commercial;
  }

  return BANNER_ASSETS.hmv;
}

/**
 * Returns a 100% realistic photography banner accurately matching a Driver Candidate profile.
 */
export function getCandidateCardBanner(driver: {
  driverCategory?: string;
  vehicleTypes?: string[];
  licenseType?: string;
  currentRole?: string;
}): BannerInfo {
  const text = `${driver.driverCategory || ''} ${(driver.vehicleTypes || []).join(' ')} ${driver.licenseType || ''} ${driver.currentRole || ''}`.toLowerCase();

  if (text.includes('trailer') || text.includes('container')) {
    return BANNER_ASSETS.trailer;
  }
  if (text.includes('hmv') || text.includes('truck') || text.includes('heavy')) {
    return BANNER_ASSETS.hmv;
  }
  if (text.includes('bus')) {
    return BANNER_ASSETS.bus;
  }
  if (text.includes('tempo') || text.includes('ace')) {
    return BANNER_ASSETS.tempo;
  }
  if (text.includes('delivery')) {
    return BANNER_ASSETS.delivery;
  }
  if (text.includes('cab') || text.includes('taxi')) {
    return BANNER_ASSETS.cab;
  }
  if (text.includes('personal') || text.includes('chauffeur') || text.includes('vip')) {
    return BANNER_ASSETS.personal;
  }
  if (text.includes('lmv') || text.includes('car')) {
    return BANNER_ASSETS.lmv;
  }

  return BANNER_ASSETS.defaultGeneral;
}

/**
 * Returns a 100% realistic photography banner accurately matching an Employer Company / Fleet profile.
 */
export function getCompanyCardBanner(company: {
  industry?: string;
  companyName?: string;
  description?: string;
}): BannerInfo {
  const text = `${company.industry || ''} ${company.companyName || ''} ${company.description || ''}`.toLowerCase();

  if (text.includes('bus') || text.includes('passenger') || text.includes('travels') || text.includes('transport travels')) {
    return BANNER_ASSETS.passengerCompany;
  }
  if (text.includes('e-commerce') || text.includes('delivery') || text.includes('courier') || text.includes('express')) {
    return BANNER_ASSETS.ecommerceCompany;
  }
  if (text.includes('corporate') || text.includes('chauffeur') || text.includes('mobility') || text.includes('cab')) {
    return BANNER_ASSETS.corporateCompany;
  }
  if (text.includes('trailer') || text.includes('construction') || text.includes('freight')) {
    return BANNER_ASSETS.trailer;
  }
  if (text.includes('logistics') || text.includes('supply chain') || text.includes('cargo') || text.includes('carriers') || text.includes('transport')) {
    return BANNER_ASSETS.logisticsCompany;
  }

  return BANNER_ASSETS.logisticsCompany;
}

/**
 * Returns realistic photography banners for Specialization categories (e.g. for Home Page grid).
 */
export function getCategoryBanner(categoryFilter: string): BannerInfo {
  switch (categoryFilter) {
    case 'HMV':
      return BANNER_ASSETS.hmv;
    case 'LMV':
      return BANNER_ASSETS.lmv;
    case 'Cab Driver':
      return BANNER_ASSETS.cab;
    case 'Delivery Driver':
      return BANNER_ASSETS.delivery;
    case 'Bus Driver':
      return BANNER_ASSETS.bus;
    case 'Tempo Driver':
      return BANNER_ASSETS.tempo;
    case 'Trailer Driver':
      return BANNER_ASSETS.trailer;
    case 'Commercial Driver':
      return BANNER_ASSETS.commercial;
    default:
      return BANNER_ASSETS.defaultGeneral;
  }
}

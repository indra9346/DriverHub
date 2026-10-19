/**
 * Realistic Contextual Background Banners Service
 * Accurately matches commercial transport categories, vehicle types, industries,
 * and driver roles with 100% realistic, high-resolution commercial vehicle photography.
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
    url: '/banners/heavy_freight_truck.jpg',
    alt: 'Heavy Commercial Multi-Axle Freight Truck on Highway',
    tag: 'Heavy Truck (HMV)',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  trailer: {
    url: '/banners/container_trailer_truck.jpg',
    alt: '40ft Container Flatbed Hauler Trailer Truck',
    tag: 'Container Trailer',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  tipper: {
    url: '/banners/tipper_dumper_truck.jpg',
    alt: 'Heavy Construction Tipper & Dumper Truck',
    tag: 'Tipper / Dumper',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  tanker: {
    url: '/banners/fuel_tanker_truck.jpg',
    alt: 'Industrial Fuel & Liquid Tanker Commercial Transport',
    tag: 'Tanker Transport',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Light Motor Vehicles & Luxury Chauffeur
  lmv: {
    url: '/banners/executive_chauffeur_car.jpg',
    alt: 'Executive Luxury Chauffeur Sedan & Innova Crysta',
    tag: 'LMV Chauffeur',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  personal: {
    url: '/banners/executive_chauffeur_car.jpg',
    alt: 'Executive Private Chauffeur & VIP Vehicle',
    tag: 'Personal Chauffeur',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Cab, Taxi & Urban Mobility
  cab: {
    url: '/banners/urban_cab_fleet.jpg',
    alt: 'Urban Fleet Airport Cab & Commercial Taxi',
    tag: 'Cab / Taxi',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Delivery & Hyperlocal Cargo
  delivery: {
    url: '/banners/electric_delivery_van.jpg',
    alt: 'Electric Delivery Cargo Van Logistics',
    tag: 'Delivery Van',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  tempo: {
    url: '/banners/tempo_delivery_truck.jpg',
    alt: 'Commercial Tata Ace Tempo & Mini Delivery Truck',
    tag: 'Tempo / Tata Ace',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Bus, School & Staff Transit
  bus: {
    url: '/banners/school_bus_transit.jpg',
    alt: 'School Bus & Student / Staff Transit Coach',
    tag: 'Bus / Transit',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Commercial Intercity Tour & Traveller Coach
  commercial: {
    url: '/banners/intercity_passenger_coach.jpg',
    alt: 'Intercity AC Sleeper Luxury Passenger Coach',
    tag: 'Commercial Coach',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },

  // Logistics Hubs & Enterprise Companies
  logisticsCompany: {
    url: '/banners/logistics_freight_terminal.jpg',
    alt: 'National Freight Logistics Hub & Distribution Terminal',
    tag: 'Logistics Hub',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  corporateCompany: {
    url: '/banners/executive_chauffeur_car.jpg',
    alt: 'Corporate Mobility & Executive Chauffeur Services',
    tag: 'Executive Fleet',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  passengerCompany: {
    url: '/banners/school_bus_transit.jpg',
    alt: 'Educational Campus & Student Staff Transit Fleet',
    tag: 'Transit Fleet',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  ecommerceCompany: {
    url: '/banners/ecommerce_fleet_hub.jpg',
    alt: 'E-Commerce Parcel Fulfillment Fleet & Delivery Hub',
    tag: 'E-Commerce Hub',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
  defaultGeneral: {
    url: '/banners/heavy_freight_truck.jpg',
    alt: 'Commercial Transport & Highway Logistics Network',
    tag: 'Commercial Transport',
    gradient: 'from-slate-950/80 via-slate-900/35 to-transparent',
  },
};

// Whole-word matching: plain substrings were too loose ('port' matched
// "transport", 'ola' matched "Kolar", 'van' matched "advanced", 'ace'
// matched "space", 'car' matched "cargo"). A term matches as a whole word,
// optionally plural (bus/buses, van/vans); a trailing * makes it a prefix
// match (edu* -> education, edutech).
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termPatterns = new Map<string, RegExp>();
function termPattern(term: string): RegExp {
  let pattern = termPatterns.get(term);
  if (!pattern) {
    const prefix = term.endsWith('*');
    const body = escapeRegex(prefix ? term.slice(0, -1) : term);
    pattern = new RegExp(prefix ? `\\b${body}` : `\\b${body}(?:e?s)?\\b`, 'i');
    termPatterns.set(term, pattern);
  }
  return pattern;
}
/** True when text contains any of the terms as a whole word. */
function has(text: string, ...terms: string[]): boolean {
  return terms.some(term => termPattern(term).test(text));
}

/**
 * Returns a 100% realistic photography banner accurately matching a Job posting.
 */
export function getJobCardBanner(job: {
  category?: string;
  vehicleType?: string;
  routeType?: string;
  title?: string;
}): BannerInfo {
  const cat = (job.category || '').toLowerCase();
  const text = `${job.category || ''} ${job.vehicleType || ''} ${job.title || ''} ${job.routeType || ''}`.toLowerCase();

  // 1. School Bus, Student Van & Educational Transit (highest priority)
  if (has(text, 'school', 'student', 'education') || (has(cat, 'bus') && has(text, 'van'))) {
    return BANNER_ASSETS.bus;
  }

  // 2. Heavy Specialized (Trailer, Tipper, Tanker)
  if (has(text, 'trailer', '40ft', 'flatbed', 'container', 'port')) {
    return BANNER_ASSETS.trailer;
  }
  if (has(text, 'tipper', 'dumper', 'mining', 'construction', 'quarry')) {
    return BANNER_ASSETS.tipper;
  }
  if (has(text, 'tanker', 'bulk liquid', 'fuel', 'petroleum')) {
    return BANNER_ASSETS.tanker;
  }

  // 3. Tempo / Tata Ace / Mini Truck / Pickup / Bolero
  if (has(text, 'tempo', 'tata ace', 'mini truck', '407', 'pickup', 'bolero') || (has(cat, 'tempo') && !has(text, 'bus'))) {
    return BANNER_ASSETS.tempo;
  }

  // 4. Bus & Staff Transit
  if (has(cat, 'bus') || has(text, 'bus driver', 'staff bus', 'staff transit')) {
    return BANNER_ASSETS.bus;
  }
  if (has(text, 'coach', 'sleeper', 'intercity bus', 'tourist bus')) {
    return BANNER_ASSETS.commercial;
  }

  // 5. Electric Delivery Cargo Van & Hyperlocal Parcel Cargo
  if (
    has(cat, 'delivery') ||
    has(text, 'delivery van', 'cargo van', 'hyperlocal', 'grocery', 'parcel', 'courier') ||
    (has(text, 'van') && !has(text, 'student', 'school', 'passenger', 'tour') && !has(cat, 'bus'))
  ) {
    return BANNER_ASSETS.delivery;
  }

  // 6. Cab / Taxi / Urban Mobility
  if (has(cat, 'cab') || has(text, 'cab', 'taxi', 'ola', 'uber', 'airport')) {
    return BANNER_ASSETS.cab;
  }

  // 7. Personal Chauffeur & Executive LMV
  if (has(cat, 'personal', 'lmv') || has(text, 'chauffeur', 'personal', 'vip', 'private', 'sedan', 'innova')) {
    return BANNER_ASSETS.lmv;
  }

  // 8. Heavy Motor Vehicle / Multi-axle / Highway Truck
  if (has(cat, 'hmv') || has(text, 'hmv', 'heavy', 'truck', '16-wheeler', '10-wheeler', 'multi-axle', 'interstate')) {
    return BANNER_ASSETS.hmv;
  }

  // 9. Commercial tour / traveller
  if (has(cat, 'commercial') || has(text, 'commercial', 'tour', 'traveller')) {
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

  if (has(text, 'trailer', 'container')) {
    return BANNER_ASSETS.trailer;
  }
  if (has(text, 'tipper', 'dumper', 'mining')) {
    return BANNER_ASSETS.tipper;
  }
  if (has(text, 'tanker', 'fuel')) {
    return BANNER_ASSETS.tanker;
  }
  if (has(text, 'tempo', 'ace', 'mini truck')) {
    return BANNER_ASSETS.tempo;
  }
  if (has(text, 'delivery', 'van', 'courier')) {
    return BANNER_ASSETS.delivery;
  }
  if (has(text, 'school', 'student transit')) {
    return BANNER_ASSETS.bus;
  }
  if (has(text, 'bus', 'coach', 'hpv')) {
    return BANNER_ASSETS.commercial;
  }
  if (has(text, 'cab', 'taxi')) {
    return BANNER_ASSETS.cab;
  }
  if (has(text, 'personal', 'chauffeur', 'vip', 'executive')) {
    return BANNER_ASSETS.personal;
  }
  if (has(text, 'lmv', 'car', 'sedan')) {
    return BANNER_ASSETS.lmv;
  }
  if (has(text, 'hmv', 'truck', 'heavy')) {
    return BANNER_ASSETS.hmv;
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

  // Education / Edu-tech / School & Student Transit
  if (has(text, 'edu*', 'school', 'college', 'student', 'academic*', 'sunbeam', 'sunrise')) {
    return BANNER_ASSETS.passengerCompany; // School bus & student transit coach
  }
  // Staff Transit & Corporate Shuttles
  if (has(text, 'staff transit', 'corporate staff transit', 'student & corporate')) {
    return BANNER_ASSETS.passengerCompany;
  }
  // E-Commerce & Last-Mile
  if (has(text, 'e-commerce', 'ecommerce', 'delivery', 'courier', 'express', 'swift')) {
    return BANNER_ASSETS.ecommerceCompany;
  }
  // Urban Mobility & Cabs / Taxis
  if (has(text, 'urban mobility', 'mobility', 'cab', 'taxi', 'quickride', 'ride')) {
    return BANNER_ASSETS.cab;
  }
  // Bus Fleet / Intercity Passenger Travels
  if (has(text, 'bus', 'passenger', 'travels', 'coach')) {
    return BANNER_ASSETS.commercial;
  }
  // Corporate Chauffeur / VIP Transport
  if (has(text, 'corporate', 'chauffeur', 'diplomatic', 'luxury', 'apex')) {
    return BANNER_ASSETS.corporateCompany;
  }
  // Port / Trailer / Cold Chain / Container Freight
  if (has(text, 'trailer', 'cold chain', 'reefer', 'port', 'container', 'jnpt')) {
    return BANNER_ASSETS.trailer;
  }
  // Heavy Interstate Logistics & Freight
  if (has(text, 'interstate', 'heavy freight', 'freight')) {
    return BANNER_ASSETS.hmv;
  }
  // General Logistics Hub
  if (has(text, 'logistic*', 'supply chain', 'cargo', 'carrier*', 'transport*')) {
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

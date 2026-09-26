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

  // 1. Trailer / Flatbed / Container
  if (text.includes('trailer') || text.includes('40ft') || text.includes('flatbed') || text.includes('container') || text.includes('port')) {
    return BANNER_ASSETS.trailer;
  }
  // 2. Tipper / Dumper / Mining / Construction
  if (text.includes('tipper') || text.includes('dumper') || text.includes('mining') || text.includes('construction') || text.includes('quarry')) {
    return BANNER_ASSETS.tipper;
  }
  // 3. Tanker / Bulk Liquid / Fuel
  if (text.includes('tanker') || text.includes('bulk liquid') || text.includes('fuel') || text.includes('petroleum')) {
    return BANNER_ASSETS.tanker;
  }
  // 4. Tempo / Tata Ace / Mini Truck / Pickup / Bolero
  if (text.includes('tempo') || text.includes('ace') || text.includes('tata ace') || text.includes('mini truck') || text.includes('407') || text.includes('pickup') || text.includes('bolero')) {
    return BANNER_ASSETS.tempo;
  }
  // 5. Electric / Delivery Van / Hyperlocal Parcel Cargo
  if (text.includes('van') || text.includes('delivery') || text.includes('hyperlocal') || text.includes('grocery') || text.includes('parcel') || text.includes('electric') || text.includes('courier')) {
    return BANNER_ASSETS.delivery;
  }
  // 6. Bus / School Bus / Staff Transit / Coach
  if (text.includes('school') || text.includes('student') || text.includes('staff transit')) {
    return BANNER_ASSETS.bus;
  }
  if (text.includes('bus') || text.includes('coach') || text.includes('sleeper')) {
    return BANNER_ASSETS.commercial;
  }
  // 7. Cab / Taxi / Rideshare / Airport
  if (text.includes('cab') || text.includes('taxi') || text.includes('ola') || text.includes('uber') || text.includes('airport')) {
    return BANNER_ASSETS.cab;
  }
  // 8. Personal / Chauffeur / Executive / VIP / LMV / Sedan
  if (text.includes('chauffeur') || text.includes('personal') || text.includes('vip') || text.includes('private') || text.includes('sedan') || text.includes('innova') || text.includes('lmv')) {
    return BANNER_ASSETS.lmv;
  }
  // 9. Heavy Motor Vehicle / Multi-axle / Highway Truck
  if (text.includes('hmv') || text.includes('heavy') || text.includes('truck') || text.includes('16-wheeler') || text.includes('10-wheeler') || text.includes('multi-axle') || text.includes('interstate')) {
    return BANNER_ASSETS.hmv;
  }
  // 10. Commercial tour / traveller
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
  if (text.includes('tipper') || text.includes('dumper') || text.includes('mining')) {
    return BANNER_ASSETS.tipper;
  }
  if (text.includes('tanker') || text.includes('fuel')) {
    return BANNER_ASSETS.tanker;
  }
  if (text.includes('tempo') || text.includes('ace') || text.includes('mini truck')) {
    return BANNER_ASSETS.tempo;
  }
  if (text.includes('delivery') || text.includes('van') || text.includes('courier')) {
    return BANNER_ASSETS.delivery;
  }
  if (text.includes('school') || text.includes('student transit')) {
    return BANNER_ASSETS.bus;
  }
  if (text.includes('bus') || text.includes('coach') || text.includes('hpv')) {
    return BANNER_ASSETS.commercial;
  }
  if (text.includes('cab') || text.includes('taxi')) {
    return BANNER_ASSETS.cab;
  }
  if (text.includes('personal') || text.includes('chauffeur') || text.includes('vip') || text.includes('executive')) {
    return BANNER_ASSETS.personal;
  }
  if (text.includes('lmv') || text.includes('car') || text.includes('sedan')) {
    return BANNER_ASSETS.lmv;
  }
  if (text.includes('hmv') || text.includes('truck') || text.includes('heavy')) {
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
  if (text.includes('edu') || text.includes('school') || text.includes('college') || text.includes('student') || text.includes('academic') || text.includes('sunbeam') || text.includes('sunrise')) {
    return BANNER_ASSETS.passengerCompany; // School bus & student transit coach
  }
  // Staff Transit & Corporate Shuttles
  if (text.includes('staff transit') || text.includes('corporate staff transit') || text.includes('student & corporate')) {
    return BANNER_ASSETS.passengerCompany;
  }
  // E-Commerce & Last-Mile
  if (text.includes('e-commerce') || text.includes('ecommerce') || text.includes('delivery') || text.includes('courier') || text.includes('express') || text.includes('swift')) {
    return BANNER_ASSETS.ecommerceCompany;
  }
  // Urban Mobility & Cabs / Taxis
  if (text.includes('urban mobility') || text.includes('mobility') || text.includes('cab') || text.includes('taxi') || text.includes('quickride') || text.includes('rides')) {
    return BANNER_ASSETS.cab;
  }
  // Bus Fleet / Intercity Passenger Travels
  if (text.includes('bus') || text.includes('passenger') || text.includes('travels') || text.includes('coach')) {
    return BANNER_ASSETS.commercial;
  }
  // Corporate Chauffeur / VIP Transport
  if (text.includes('corporate') || text.includes('chauffeur') || text.includes('diplomatic') || text.includes('luxury') || text.includes('apex')) {
    return BANNER_ASSETS.corporateCompany;
  }
  // Port / Trailer / Cold Chain / Container Freight
  if (text.includes('trailer') || text.includes('cold chain') || text.includes('reefer') || text.includes('port') || text.includes('container') || text.includes('jnpt')) {
    return BANNER_ASSETS.trailer;
  }
  // Heavy Interstate Logistics & Freight
  if (text.includes('interstate') || text.includes('heavy freight') || text.includes('freight')) {
    return BANNER_ASSETS.hmv;
  }
  // General Logistics Hub
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

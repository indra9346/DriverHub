/**
 * Comprehensive India Geographical & Logistics Location Directory
 * Covers all 28 States and 8 Union Territories with major cities,
 * industrial logistics corridors, transport nagars, and micro-markets.
 */

export interface LocationItem {
  state: string;
  city: string;
  area?: string;
  isHub?: boolean;
}

export interface StateData {
  state: string;
  code: string;
  region: 'South' | 'North' | 'West' | 'East' | 'Central' | 'North-East';
  isUnionTerritory?: boolean;
  majorCities: string[];
}

export const ALL_INDIAN_STATES: StateData[] = [
  // SOUTH INDIA
  {
    state: 'Karnataka',
    code: 'KA',
    region: 'South',
    majorCities: ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Chikkaballapur', 'Kolar', 'Tumakuru', 'Davanagere', 'Kalaburagi', 'Ballari', 'Shimoga', 'Hassan', 'Udupi', 'Bidar', 'Hosapete', 'Raichur']
  },
  {
    state: 'Tamil Nadu',
    code: 'TN',
    region: 'South',
    majorCities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Hosur', 'Kanchipuram', 'Nagercoil', 'Thanjavur']
  },
  {
    state: 'Telangana',
    code: 'TS',
    region: 'South',
    majorCities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Siddipet', 'Mancherial']
  },
  {
    state: 'Andhra Pradesh',
    code: 'AP',
    region: 'South',
    majorCities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Vizianagaram']
  },
  {
    state: 'Kerala',
    code: 'KL',
    region: 'South',
    majorCities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram', 'Kasargod']
  },
  {
    state: 'Puducherry',
    code: 'PY',
    region: 'South',
    isUnionTerritory: true,
    majorCities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam']
  },

  // WEST INDIA
  {
    state: 'Maharashtra',
    code: 'MH',
    region: 'West',
    majorCities: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Navi Mumbai', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded', 'Jalgaon', 'Akola', 'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur']
  },
  {
    state: 'Gujarat',
    code: 'GJ',
    region: 'West',
    majorCities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari', 'Morbi', 'Bharuch', 'Vapi', 'Mehsana', 'Bhuj', 'Porbandar']
  },
  {
    state: 'Goa',
    code: 'GA',
    region: 'West',
    majorCities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda']
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    region: 'West',
    isUnionTerritory: true,
    majorCities: ['Daman', 'Diu', 'Silvassa']
  },

  // NORTH INDIA
  {
    state: 'Delhi NCR',
    code: 'DL',
    region: 'North',
    isUnionTerritory: true,
    majorCities: ['New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Noida', 'Greater Noida', 'Gurugram', 'Faridabad', 'Ghaziabad']
  },
  {
    state: 'Uttar Pradesh',
    code: 'UP',
    region: 'North',
    majorCities: ['Lucknow', 'Kanpur', 'Noida', 'Greater Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj (Allahabad)', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Faizabad (Ayodhya)', 'Jhansi', 'Mathura']
  },
  {
    state: 'Haryana',
    code: 'HR',
    region: 'North',
    majorCities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Rewari', 'Manesar']
  },
  {
    state: 'Punjab',
    code: 'PB',
    region: 'North',
    majorCities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali (SAS Nagar)', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga', 'Abohar']
  },
  {
    state: 'Rajasthan',
    code: 'RJ',
    region: 'North',
    majorCities: ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Neemrana', 'Bhiwadi']
  },
  {
    state: 'Uttarakhand',
    code: 'UK',
    region: 'North',
    majorCities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Pantnagar']
  },
  {
    state: 'Himachal Pradesh',
    code: 'HP',
    region: 'North',
    majorCities: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Baddi', 'Kullu', 'Manali', 'Bilaspur', 'Hamirpur', 'Una']
  },
  {
    state: 'Jammu & Kashmir',
    code: 'JK',
    region: 'North',
    isUnionTerritory: true,
    majorCities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Samba']
  },
  {
    state: 'Chandigarh',
    code: 'CH',
    region: 'North',
    isUnionTerritory: true,
    majorCities: ['Chandigarh']
  },
  {
    state: 'Ladakh',
    code: 'LA',
    region: 'North',
    isUnionTerritory: true,
    majorCities: ['Leh', 'Kargil']
  },

  // EAST & CENTRAL INDIA
  {
    state: 'West Bengal',
    code: 'WB',
    region: 'East',
    majorCities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Bardhaman', 'Malda', 'Baharampur', 'Haldia']
  },
  {
    state: 'Bihar',
    code: 'BR',
    region: 'East',
    majorCities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Chapra']
  },
  {
    state: 'Odisha',
    code: 'OD',
    region: 'East',
    majorCities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda', 'Paradeep']
  },
  {
    state: 'Jharkhand',
    code: 'JH',
    region: 'East',
    majorCities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar']
  },
  {
    state: 'Madhya Pradesh',
    code: 'MP',
    region: 'Central',
    majorCities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Pithampur', 'Singrauli']
  },
  {
    state: 'Chhattisgarh',
    code: 'CG',
    region: 'Central',
    majorCities: ['Raipur', 'Bhilai-Durg', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur']
  },

  // NORTH-EAST INDIA
  {
    state: 'Assam',
    code: 'AS',
    region: 'North-East',
    majorCities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon']
  },
  {
    state: 'Tripura',
    code: 'TR',
    region: 'North-East',
    majorCities: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar']
  },
  {
    state: 'Meghalaya',
    code: 'ML',
    region: 'North-East',
    majorCities: ['Shillong', 'Tura', 'Jowai', 'Nongpoh']
  },
  {
    state: 'Manipur',
    code: 'MN',
    region: 'North-East',
    majorCities: ['Imphal', 'Churachandpur', 'Thoubal']
  },
  {
    state: 'Nagaland',
    code: 'NL',
    region: 'North-East',
    majorCities: ['Dimapur', 'Kohima', 'Mokokchung']
  },
  {
    state: 'Mizoram',
    code: 'MZ',
    region: 'North-East',
    majorCities: ['Aizawl', 'Lunglei', 'Champhai']
  },
  {
    state: 'Arunachal Pradesh',
    code: 'AR',
    region: 'North-East',
    majorCities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang']
  },
  {
    state: 'Sikkim',
    code: 'SK',
    region: 'North-East',
    majorCities: ['Gangtok', 'Namchi', 'Geyzing']
  },
  {
    state: 'Andaman & Nicobar',
    code: 'AN',
    region: 'East',
    isUnionTerritory: true,
    majorCities: ['Port Blair']
  },
  {
    state: 'Lakshadweep',
    code: 'LD',
    region: 'South',
    isUnionTerritory: true,
    majorCities: ['Kavaratti']
  }
];

/**
 * Prominent Local Areas & Logistics Hubs per Major Tier-1 / Tier-2 City
 */
export const CITY_AREAS_MAP: Record<string, string[]> = {
  'Bengaluru': [
    'Electronic City Phase 1 & 2', 'Whitefield / ITPL', 'Peenya Industrial Area',
    'Koramangala', 'Indiranagar', 'Yeshwanthpur & APMC Yard', 'Majestic / Central Station',
    'Hebbal & Airport Road', 'Bommasandra Industrial Area', 'Bidadi Auto Cluster',
    'Nelamangala Highway Hub', 'Hoskote Industrial Corridor', 'Devanahalli Airport Cargo',
    'BTM Layout & Silk Board', 'Kengeri & Mysore Road', 'Bannerghatta Road', 'Jayanagar',
    'Rajajinagar', 'Marathahalli & Bellandur', 'Yelahanka'
  ],
  'Mumbai': [
    'Andheri East / SEEPZ', 'Navi Mumbai (Vashi / Mahape)', 'Thane (Wagle Estate)',
    'Bhiwandi Logistics Hub', 'Bandra Kurla Complex (BKC)', 'Goregaon & Malad',
    'JNPT Port / Nhava Sheva', 'Borivali & Dahisar', 'Kurla & Chembur', 'Kalyan-Dombivli',
    'Panvel Transport Hub', 'Taloja Industrial MIDC', 'Dadar & Lower Parel', 'Chhatrapati Shivaji Airport Hub'
  ],
  'Delhi NCR': [
    'Gurugram Cyber City & Udyog Vihar', 'Manesar Auto Corridor', 'Noida Sector 62 & 63 Hub',
    'Greater Noida Express Cargo', 'Okhla Industrial Area', 'Connaught Place & Central Delhi',
    'Dwarka & IGI Airport Cargo', 'Anand Vihar Transport Depot', 'Karol Bagh & Jhandewalan',
    'Faridabad Industrial Hub', 'Ghaziabad Sahibabad MIDC', 'Kashmere Gate ISBT', 'Mayapuri Industrial'
  ],
  'Chennai': [
    'Guindy & Ekkatuthangal', 'Sriperumbudur Auto Hub', 'Ambattur Industrial Estate',
    'T. Nagar & Central', 'Velachery & OMR IT Corridor', 'Chennai Port Harbor Zone',
    'Poonamallee Transport Hub', 'Madhavaram Truck Terminal', 'Sholinganallur',
    'Maraimalai Nagar Auto Cluster', 'Ennore Port Cargo Area', 'Perungudi'
  ],
  'Hyderabad': [
    'Gachibowli & HITEC City', 'Shamshabad Airport Logistics Zone', 'Secunderabad & Cantonment',
    'Medchal Transport Corridor', 'Kukatpally & Miyapur', 'Uppal Industrial Area',
    'Patancheru Industrial Cluster', 'Kothapet & LB Nagar', 'Balanagar & Sanathnagar',
    'Jubilee Hills & Banjara Hills', 'Cherlapally Freight Depot'
  ],
  'Pune': [
    'Hinjewadi IT Park Phase 1-3', 'Chakan Auto & Industrial Hub', 'Pimpri-Chinchwad (PCMC)',
    'Hadapsar & Magarpatta', 'Bhosari MIDC', 'Viman Nagar & Nagar Road', 'Talegaon Logistics Park',
    'Ranjangaon MIDC', 'Kothrud & Swargate', 'Wakad & Baner'
  ],
  'Kolkata': [
    'Salt Lake Sector V', 'New Town Rajarhat', 'Howrah Railway & Cargo Hub', 'Dankuni Logistics Park',
    'Taratala Industrial Area', 'Park Street & Central', 'Dum Dum Airport Zone', 'Kolkata Port Khidirpur'
  ],
  'Ahmedabad': [
    'Sanand Auto Industrial Corridor', 'Changodar Logistics Hub', 'Naroda GIDC',
    'Vatva Industrial Area', 'SG Highway & Prahladnagar', 'Odhav GIDC', 'Sardar Vallabhbhai Airport Hub'
  ],
  'Surat': [
    'Hazira Port & Heavy Industrial Belt', 'Sachin GIDC', 'Pandesara Industrial Estate', 'Ring Road Textile Market'
  ],
  'Jaipur': [
    'Sitapura Industrial Area', 'Vishwakarma Industrial Area (VKIA)', 'Mansarovar', 'Transport Nagar Highway Hub', 'Mahapura SEZ'
  ],
  'Lucknow': [
    'Transport Nagar (TP Nagar)', 'Amausi Industrial & Airport Area', 'Gomti Nagar', 'Chinhat Industrial Area', 'Alambagh'
  ],
  'Kochi': [
    'Vallarpadam Container Terminal', 'Kalamassery Industrial Belt', 'Kakkanad Infopark', 'Willingdon Island Port', 'Aluva Transport Hub'
  ],
  'Mysuru': [
    'Hebbal Industrial Area', 'Hootagalli Industrial Estate', 'Kuvempunagar', 'Nanjangud Industrial Corridor', 'Vijayanagar'
  ],
  'Hubballi-Dharwad': [
    'Gokul Road Industrial Estate', 'Tarihal Industrial Area', 'Belur Industrial Hub', 'APMC Amargol Transport Nagar'
  ]
};

/**
 * Top Logistics & Driver Skill Categories for Indian Fleet & Transport Operations
 */
export const POPULAR_INDIAN_SKILLS = [
  'Interstate Highway Freight',
  'Night Shift Long Haul',
  'Automatic & Manual Transmission',
  'FASTag & Toll Clearance',
  'GPS App & Route Navigation',
  'Pre-Trip Vehicle Safety Inspection',
  'EV Commercial Driving (Electric Van/Bus)',
  'Hill & Ghat Road Driving',
  'Container Trailer Reversing & Docking',
  'Heavy Multi-Axle Truck (10-16 Wheeler)',
  'Corporate VIP Chauffeur Protocol',
  'School Student Transit Safety',
  'Cold Chain Refrigerated Van',
  'Hazchem / Hazardous Cargo Certified',
  'Automotive Breakdown Troubleshooting'
];

/**
 * Search locations across States, Cities and Areas
 */
export function searchIndianLocations(query: string): LocationItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: LocationItem[] = [];

  // Search by state
  for (const s of ALL_INDIAN_STATES) {
    if (s.state.toLowerCase().includes(q) || s.code.toLowerCase() === q) {
      results.push({ state: s.state, city: s.majorCities[0] || s.state, isHub: true });
    }
    // Search by city
    for (const city of s.majorCities) {
      if (city.toLowerCase().includes(q)) {
        results.push({ state: s.state, city });
      }
    }
  }

  // Search by micro-area
  for (const [city, areas] of Object.entries(CITY_AREAS_MAP)) {
    const parentState = ALL_INDIAN_STATES.find(s => s.majorCities.includes(city))?.state || 'India';
    for (const area of areas) {
      if (area.toLowerCase().includes(q)) {
        results.push({ state: parentState, city, area });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter(item => {
    const key = `${item.area || ''}-${item.city}-${item.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

/**
 * Get all cities in India as a flat sorted list
 */
export function getAllIndianCities(): { city: string; state: string }[] {
  const list: { city: string; state: string }[] = [];
  for (const state of ALL_INDIAN_STATES) {
    for (const city of state.majorCities) {
      list.push({ city, state: state.state });
    }
  }
  return list;
}

import { STATE_DISTRICTS_DIRECTORY } from '../services/indiaLocationService';

/**
 * Get cities and districts for a specific state
 */
export function getCitiesForState(stateName: string): string[] {
  const found = ALL_INDIAN_STATES.find(
    s => s.state.toLowerCase() === stateName.toLowerCase() || s.code.toLowerCase() === stateName.toLowerCase()
  );
  const baseCities = found ? found.majorCities : [];
  const stateDistricts = STATE_DISTRICTS_DIRECTORY[found?.state || stateName]?.districts || [];
  return Array.from(new Set([...baseCities, ...stateDistricts]));
}

/**
 * Get areas for a specific city
 */
export function getAreasForCity(cityName: string): string[] {
  return CITY_AREAS_MAP[cityName] || [
    `${cityName} Central`,
    `${cityName} Industrial Corridor`,
    `${cityName} Bypass Transport Hub`,
    `${cityName} Ring Road`
  ];
}

export interface SearchRoleItem {
  title: string;
  category: string;
  subtitle: string;
  aliases?: string[];
}

export const POPULAR_SEARCH_ROLES: SearchRoleItem[] = [
  { title: 'Heavy Truck (HMV) Driver', category: 'HMV', subtitle: 'Multi-axle, interstate & container transport', aliases: ['hmv', 'truck', 'heavy', 'lorry', 'multi-axle', 'trailer'] },
  { title: 'Personal & LMV Chauffeur', category: 'LMV', subtitle: 'Corporate sedans, luxury cars & private family', aliases: ['lmv', 'chauffeur', 'car', 'personal driver', 'innova'] },
  { title: 'Cab & Taxi Driver', category: 'Cab Driver', subtitle: 'App-based ride hailing, airport & local taxi', aliases: ['cab', 'taxi', 'ola', 'uber', 'commercial cab'] },
  { title: 'Hyperlocal E-Commerce Delivery Rider', category: 'Delivery Driver', subtitle: 'Last-mile parcels, food & 2/3-wheeler cargo', aliases: ['delivery', 'courier', 'parcel', 'amazon', 'flipkart', 'swiggy', 'zomato'] },
  { title: 'School Bus & Student Van Driver', category: 'Bus Driver', subtitle: 'Passenger transit, institutional & campus shuttle', aliases: ['bus', 'school bus', 'van', 'staff bus', 'passenger'] },
  { title: '40ft Container Trailer Driver', category: 'Trailer Driver', subtitle: 'Port clearing, heavy haulage & container logistics', aliases: ['trailer', 'container', '40ft', 'port', 'haulage'] },
  { title: 'Cement & Bulk Goods Bulker Driver', category: 'HMV', subtitle: 'Flyash, cement & pneumatic dry bulk transport', aliases: ['bulker', 'bulk', 'cement bulker', 'flyash'] },
  { title: 'Tata Ace & Intra-City Tempo Driver', category: 'Tempo Driver', subtitle: 'Intra-city distribution, FMCG & local cargo', aliases: ['tempo', 'tata ace', 'chota hathi', 'dost', 'pickup', 'lcv'] },
  { title: 'Petroleum & Gas Tanker Driver', category: 'HMV', subtitle: 'Hazardous cargo, fuel & chemical bulk tanker', aliases: ['tanker', 'petrol tanker', 'chemical tanker', 'hazardous'] },
  { title: 'Mining Dumper & Tipper Driver', category: 'HMV', subtitle: 'Aggregate, earthmoving, quarry & civil projects', aliases: ['tipper', 'dumper', 'mining', 'construction'] },
  { title: 'Airport Shuttle & Chauffeur Pilot', category: 'LMV', subtitle: 'VIP transport, hotel luxury fleet & transfers', aliases: ['airport', 'vip', 'hotel', 'shuttle'] },
  { title: 'Electric Vehicle (EV) Fleet Pilot', category: 'Delivery Driver', subtitle: 'Green logistics, EV vans & smart battery transport', aliases: ['ev', 'electric', 'ev cargo'] },
];

export const POPULAR_INDIAN_LOCATIONS = [
  { city: 'Anantapur', state: 'Andhra Pradesh', label: 'Anantapur, Andhra Pradesh' },
  { city: 'Bengaluru', state: 'Karnataka', label: 'Bengaluru, Karnataka' },
  { city: 'Chennai', state: 'Tamil Nadu', label: 'Chennai, Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana', label: 'Hyderabad, Telangana' },
  { city: 'Mumbai', state: 'Maharashtra', label: 'Mumbai, Maharashtra' },
  { city: 'Delhi NCR', state: 'Delhi NCR', label: 'Delhi NCR (Gurugram/Noida)' },
  { city: 'Pune', state: 'Maharashtra', label: 'Pune, Maharashtra' },
  { city: 'Mysuru', state: 'Karnataka', label: 'Mysuru, Karnataka' },
  { city: 'Ahmedabad', state: 'Gujarat', label: 'Ahmedabad, Gujarat' },
  { city: 'Kolkata', state: 'West Bengal', label: 'Kolkata, West Bengal' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', label: 'Visakhapatnam, Andhra Pradesh' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', label: 'Vijayawada, Andhra Pradesh' },
  { city: 'Kochi', state: 'Kerala', label: 'Kochi, Kerala' },
  { city: 'Coimbatore', state: 'Tamil Nadu', label: 'Coimbatore, Tamil Nadu' },
  { city: 'Hubballi-Dharwad', state: 'Karnataka', label: 'Hubballi-Dharwad, Karnataka' },
  { city: 'Jaipur', state: 'Rajasthan', label: 'Jaipur, Rajasthan' },
  { city: 'Chandigarh', state: 'Punjab', label: 'Chandigarh / Mohali' },
  { city: 'Lucknow', state: 'Uttar Pradesh', label: 'Lucknow, Uttar Pradesh' },
  { city: 'Surat', state: 'Gujarat', label: 'Surat, Gujarat' },
  { city: 'Indore', state: 'Madhya Pradesh', label: 'Indore, Madhya Pradesh' },
];

export function getSearchRoleSuggestions(
  query: string, 
  extraJobTitles: { title: string; category?: string; company?: string }[] = []
): { title: string; category?: string; subtitle: string; source?: 'job' | 'role' }[] {
  const q = query.trim().toLowerCase();
  
  if (!q) {
    return POPULAR_SEARCH_ROLES.slice(0, 6).map(r => ({
      title: r.title,
      category: r.category,
      subtitle: r.subtitle,
      source: 'role'
    }));
  }

  const results: { title: string; category?: string; subtitle: string; source?: 'job' | 'role' }[] = [];
  const seen = new Set<string>();

  // 1. Check live job titles first
  for (const job of extraJobTitles) {
    if (
      job.title.toLowerCase().includes(q) ||
      (job.category && job.category.toLowerCase().includes(q)) ||
      (job.company && job.company.toLowerCase().includes(q))
    ) {
      const key = job.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          title: job.title,
          category: job.category,
          subtitle: job.company ? `Active Vacancy • ${job.company}` : 'Active Vacancy',
          source: 'job'
        });
      }
    }
  }

  // 2. Check popular standardized roles
  for (const r of POPULAR_SEARCH_ROLES) {
    const key = r.title.toLowerCase();
    if (seen.has(key)) continue;

    const matchesTitle = r.title.toLowerCase().includes(q);
    const matchesCategory = r.category.toLowerCase().includes(q);
    const matchesSubtitle = r.subtitle.toLowerCase().includes(q);
    const matchesAlias = r.aliases?.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()));

    if (matchesTitle || matchesCategory || matchesSubtitle || matchesAlias) {
      seen.add(key);
      results.push({
        title: r.title,
        category: r.category,
        subtitle: r.subtitle,
        source: 'role'
      });
    }
  }

  return results.slice(0, 8);
}

export function getSearchLocationSuggestions(query: string): { city: string; state: string; label: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_INDIAN_LOCATIONS.slice(0, 8);

  const popularMatches = POPULAR_INDIAN_LOCATIONS.filter(l =>
    l.city.toLowerCase().includes(q) ||
    l.state.toLowerCase().includes(q) ||
    l.label.toLowerCase().includes(q)
  );

  const otherMatches: { city: string; state: string; label: string }[] = [];
  const seen = new Set(popularMatches.map(p => `${p.city.toLowerCase()}|${p.state.toLowerCase()}`));

  for (const st of ALL_INDIAN_STATES) {
    if (st.state.toLowerCase().includes(q)) {
      const primaryCity = st.majorCities[0] || st.state;
      const key = `${primaryCity.toLowerCase()}|${st.state.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        otherMatches.push({ city: primaryCity, state: st.state, label: `${primaryCity}, ${st.state}` });
      }
    }
    for (const city of st.majorCities) {
      if (city.toLowerCase().includes(q)) {
        const key = `${city.toLowerCase()}|${st.state.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          otherMatches.push({ city, state: st.state, label: `${city}, ${st.state}` });
        }
      }
    }
  }

  for (const [stateName, info] of Object.entries(STATE_DISTRICTS_DIRECTORY)) {
    for (const dist of info.districts) {
      if (dist.toLowerCase().includes(q) || stateName.toLowerCase().includes(q)) {
        const cleanCity = dist.replace(/\s*\([^)]*\)/, '').trim();
        const key = `${cleanCity.toLowerCase()}|${stateName.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          otherMatches.push({ city: cleanCity, state: stateName, label: `${dist}, ${stateName}` });
        }
      }
    }
  }

  return [...popularMatches, ...otherMatches].slice(0, 10);
}


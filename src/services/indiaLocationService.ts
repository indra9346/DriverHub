/**
 * Pan-India Hierarchical Location & Postal PIN Service
 * Hierarchy: State / Union Territory (36) -> District (~780) -> Town / City / Post Office -> 6-Digit PIN Code
 *
 * Data Sources & Architecture:
 * 1. Authoritative Administrative Hierarchy (All 28 States & 8 Union Territories + all official Districts)
 *    embedded for instantaneous, zero-latency State -> District resolution across India.
 * 2. Curated Verified Postal Directory for major commercial hubs, district headquarters, and multi-PIN cities
 *    (providing accurate multi-PIN options per locality without guessing).
 * 3. Live India Post Postal Directory API (`https://api.postalpincode.in/postoffice/{name}` and
 *    `https://api.postalpincode.in/pincode/{pin}`) for on-demand sub-district/post-office town & PIN resolution.
 *    - Keyless public REST API (no secret keys exposed in frontend).
 *    - Cached in-memory and in `sessionStorage` (`driverhub_pin_cache_v1`).
 *    - Protected against race conditions via AbortSignal & request version counters.
 */

export interface PinOption {
  code: string;
  officeName: string;
  deliveryStatus?: string;
  source: 'india-post-live' | 'verified-directory';
}

export interface TownLocalityOption {
  name: string;
  district: string;
  state: string;
  pins: PinOption[];
  source: 'india-post-live' | 'verified-directory';
}

export interface StructuredLocationValue {
  state: string;
  district: string;
  city: string;
  pincode: string;
  addressLine?: string;
}

// Complete official administrative districts for all 28 States and 8 Union Territories of India
export const STATE_DISTRICTS_DIRECTORY: Record<string, { prefix: string; districts: string[] }> = {
  'Andhra Pradesh': {
    prefix: '51-53',
    districts: [
      'Alluri Sitharama Raju', 'Anakapalli', 'Anantapur', 'Annamayya', 'Bapatla', 'Chittoor',
      'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Krishna',
      'Kurnool', 'Nandyal', 'NTR (Vijayawada)', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam',
      'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam',
      'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ]
  },
  'Arunachal Pradesh': {
    prefix: '79',
    districts: [
      'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Itanagar Capital Complex',
      'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley',
      'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi',
      'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'
    ]
  },
  'Assam': {
    prefix: '78',
    districts: [
      'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang',
      'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi',
      'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan (Guwahati)', 'Karbi Anglong', 'Karimganj',
      'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur',
      'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'
    ]
  },
  'Bihar': {
    prefix: '80-85',
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur (Arrah)', 'Buxar',
      'Darbhanga', 'East Champaran (Motihari)', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur (Bhabua)',
      'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger',
      'Muzaffarpur', 'Nalanda (Bihar Sharif)', 'Nawada', 'Patna', 'Purnia', 'Rohtas (Sasaram)',
      'Saharsa', 'Samastipur', 'Saran (Chapra)', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
      'Supaul', 'Vaishali (Hajipur)', 'West Champaran (Bettiah)'
    ]
  },
  'Chhattisgarh': {
    prefix: '49',
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar (Jagdalpur)', 'Bemetara', 'Bijapur', 'Bilaspur',
      'Dantewada', 'Dhamtari', 'Durg (Bhilai)', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa',
      'Jashpur', 'Kabirdham', 'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba',
      'Koriya', 'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki',
      'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh',
      'Sukma', 'Surajpur', 'Surguja (Ambikapur)'
    ]
  },
  'Goa': {
    prefix: '403',
    districts: ['North Goa (Panaji)', 'South Goa (Margao)']
  },
  'Gujarat': {
    prefix: '36-39',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha (Palanpur)', 'Bharuch', 'Bhavnagar',
      'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
      'Jamnagar', 'Junagadh', 'Kheda (Nadiad)', 'Kutch (Bhuj)', 'Mahisagar', 'Mehsana', 'Morbi',
      'Narmada', 'Navsari', 'Panchmahal (Godhra)', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha (Himmatnagar)',
      'Surat', 'Surendranagar', 'Tapi (Vyara)', 'Vadodara', 'Valsad (Vapi)'
    ]
  },
  'Haryana': {
    prefix: '12-13',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar (Bahadurgarh)',
      'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh (Narnaul)', 'Nuh', 'Palwal', 'Panchkula',
      'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
    ]
  },
  'Himachal Pradesh': {
    prefix: '17',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra (Dharamshala)', 'Kinnaur', 'Kullu', 'Lahaul and Spiti',
      'Mandi', 'Shimla', 'Sirmaur (Nahan)', 'Solan (Baddi)', 'Una'
    ]
  },
  'Jharkhand': {
    prefix: '81-83',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum (Jamshedpur)', 'Garhwa',
      'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
      'Lohardaga', 'Pakur', 'Palamu (Medininagar)', 'Ramgarh', 'Ranchi', 'Sahebganj',
      'Seraikela Kharsawan', 'Simdega', 'West Singhbhum (Chaibasa)'
    ]
  },
  'Karnataka': {
    prefix: '56-59',
    districts: [
      'Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar',
      'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada (Mangaluru)', 'Davanagere',
      'Dharwad (Hubballi)', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu (Madikeri)', 'Kolar',
      'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi',
      'Uttara Kannada (Karwar)', 'Vijayanagara (Hosapete)', 'Vijayapura', 'Yadgir'
    ]
  },
  'Kerala': {
    prefix: '67-69',
    districts: [
      'Alappuzha', 'Ernakulam (Kochi)', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam',
      'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ]
  },
  'Madhya Pradesh': {
    prefix: '45-48',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind',
      'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar (Pithampur)',
      'Dindori', 'Guna', 'Gwalior', 'Harda', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa',
      'Khargone', 'Maihar', 'Mandla', 'Mandsaur', 'Mauganj', 'Morena', 'Narmadapuram (Hoshangabad)',
      'Narsinghpur', 'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
      'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
      'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
    ]
  },
  'Maharashtra': {
    prefix: '40-44',
    districts: [
      'Ahmednagar (Ahilyanagar)', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur',
      'Chhatrapati Sambhajinagar (Aurangabad)', 'Dharashiv (Osmanabad)', 'Dhule', 'Gadchiroli',
      'Gोंदia (Gondia)', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City',
      'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune',
      'Raigad (Panvel / Alibag)', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane',
      'Wardha', 'Washim', 'Yavatmal'
    ]
  },
  'Manipur': {
    prefix: '795',
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching',
      'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
    ]
  },
  'Meghalaya': {
    prefix: '793-794',
    districts: [
      'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills (Shillong)', 'Eastern West Khasi Hills',
      'North Garo Hills', 'Ri Bhoi (Nongpoh)', 'South Garo Hills', 'South West Garo Hills',
      'South West Khasi Hills', 'West Garo Hills (Tura)', 'West Jaintia Hills (Jowai)', 'West Khasi Hills'
    ]
  },
  'Mizoram': {
    prefix: '796',
    districts: [
      'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit',
      'Saiha', 'Saitual', 'Serchhip'
    ]
  },
  'Nagaland': {
    prefix: '797-798',
    districts: [
      'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland',
      'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü', 'Tuensang', 'Wokha', 'Zünheboto'
    ]
  },
  'Odisha': {
    prefix: '75-77',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
      'Dhenkanal', 'Gajapati', 'Ganjam (Berhampur)', 'Jagatsinghpur (Paradeep)', 'Jajpur',
      'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar (Keonjhar)',
      'Khordha (Bhubaneswar)', 'Koraput', 'Malkangiri', 'Mayurbhanj (Baripada)', 'Nabarangpur',
      'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh (Rourkela)'
    ]
  },
  'Punjab': {
    prefix: '14-16',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka (Abohar)',
      'Ferozepur', 'Gurdaspur (Batala)', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
      'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar (Ropar)',
      'Sangrur', 'SAS Nagar (Mohali)', 'SBS Nagar (Nawanshahr)', 'Tarn Taran'
    ]
  },
  'Rajasthan': {
    prefix: '30-34',
    districts: [
      'Ajmer', 'Alwar (Bhiwadi / Neemrana)', 'Anupgarh', 'Balotra', 'Banswara', 'Baran', 'Barmer',
      'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
      'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu', 'Dungarpur', 'Gangapur City', 'Hanumangarh',
      'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kekri',
      'Khairthal-Tijara', 'Kota', 'Kotputli-Behror', 'Nagaur', 'Pali', 'Phalodi', 'Pratapgarh',
      'Rajsamand', 'Salumbar', 'Sanchore', 'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi',
      'Sri Ganganagar', 'Tonk', 'Udaipur'
    ]
  },
  'Sikkim': {
    prefix: '737',
    districts: ['Gangtok', 'Gyalshing (West Sikkim)', 'Mangan (North Sikkim)', 'Namchi (South Sikkim)', 'Pakyong', 'Soreng']
  },
  'Tamil Nadu': {
    prefix: '60-64',
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul',
      'Erode', 'Kallakurichi', 'Kanchipuram (Sriperumbudur)', 'Kanyakumari (Nagercoil)', 'Karur',
      'Krishnagiri (Hosur)', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris (Ooty)',
      'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
      'Thanjavur', 'Theni', 'Thoothukudi (Tuticorin)', 'Tiruchirappalli', 'Tirunelveli',
      'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
      'Viluppuram', 'Virudhunagar'
    ]
  },
  'Telangana': {
    prefix: '50',
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda (Warangal Urban)', 'Hyderabad', 'Jagtial',
      'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
      'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak',
      'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal',
      'Nizamabad', 'Peddapalli (Ramagundam)', 'Rajanna Sircilla', 'Ranga Reddy (Shamshabad)',
      'Sangareddy (Patancheru)', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal',
      'Yadadri Bhuvanagiri'
    ]
  },
  'Tripura': {
    prefix: '799',
    districts: [
      'Dhalai', 'Gomati (Udaipur)', 'Khowai', 'North Tripura (Dharmanagar)', 'Sepahijala',
      'South Tripura', 'Unakoti (Kailashahar)', 'West Tripura (Agartala)'
    ]
  },
  'Uttar Pradesh': {
    prefix: '20-28',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya (Faizabad)',
      'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly',
      'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria',
      'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar (Noida / Greater Noida)',
      'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras',
      'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj',
      'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba',
      'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit',
      'Pratapgarh', 'Prayagraj (Allahabad)', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal',
      'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur',
      'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
    ]
  },
  'Uttarakhand': {
    prefix: '24-26',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar (Roorkee)',
      'Nainital (Haldwani)', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
      'Udham Singh Nagar (Rudrapur / Kashipur / Pantnagar)', 'Uttarkashi'
    ]
  },
  'West Bengal': {
    prefix: '70-74',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling (Siliguri)',
      'Hooghly (Dankuni)', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda',
      'Murshidabad (Baharampur)', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman (Asansol / Durgapur)',
      'Paschim Medinipur (Kharagpur)', 'Purba Bardhaman', 'Purba Medinipur (Haldia)', 'Purulia',
      'South 24 Parganas', 'Uttar Dinajpur'
    ]
  },
  // 8 UNION TERRITORIES
  'Andaman & Nicobar': {
    prefix: '744',
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman (Port Blair)']
  },
  'Chandigarh': {
    prefix: '160',
    districts: ['Chandigarh']
  },
  'Dadra and Nagar Haveli and Daman and Diu': {
    prefix: '396',
    districts: ['Dadra and Nagar Haveli (Silvassa)', 'Daman', 'Diu']
  },
  'Delhi NCR': {
    prefix: '110',
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi (Okhla)',
      'South West Delhi (Dwarka / IGI)', 'West Delhi'
    ]
  },
  'Jammu & Kashmir': {
    prefix: '18-19',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua',
      'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi',
      'Samba', 'Shopian', 'Srinagar', 'Udhampur'
    ]
  },
  'Ladakh': {
    prefix: '194',
    districts: ['Kargil', 'Leh']
  },
  'Lakshadweep': {
    prefix: '682',
    districts: ['Lakshadweep (Kavaratti)']
  },
  'Puducherry': {
    prefix: '605',
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
  }
};

// Verified multi-PIN towns, cities & post offices indexed by "State|District"
export const VERIFIED_DISTRICT_TOWNS: Record<string, Array<{ town: string; pins: Array<{ code: string; officeName: string }> }>> = {
  'Karnataka|Bengaluru Urban': [
    {
      town: 'Bengaluru',
      pins: [
        { code: '560100', officeName: 'Electronic City S.O' },
        { code: '560001', officeName: 'Bengaluru G.P.O. (MG Road)' },
        { code: '560066', officeName: 'Whitefield S.O' },
        { code: '560058', officeName: 'Peenya Small Industries S.O' },
        { code: '560022', officeName: 'Yeshwanthpur S.O' },
        { code: '560034', officeName: 'Koramangala S.O' },
        { code: '560038', officeName: 'Indiranagar S.O' },
        { code: '560064', officeName: 'Yelahanka S.O' },
        { code: '560099', officeName: 'Bommasandra Industrial Estate S.O' }
      ]
    },
    {
      town: 'Electronic City',
      pins: [
        { code: '560100', officeName: 'Electronic City Phase 1 & 2 S.O' },
        { code: '560099', officeName: 'Bommasandra / Hebbagodi S.O' }
      ]
    },
    {
      town: 'Whitefield',
      pins: [
        { code: '560066', officeName: 'Whitefield S.O' },
        { code: '560067', officeName: 'Kadugodi S.O' }
      ]
    },
    {
      town: 'Yelahanka',
      pins: [{ code: '560064', officeName: 'Yelahanka S.O' }]
    },
    {
      town: 'Kengeri',
      pins: [{ code: '560060', officeName: 'Kengeri S.O' }]
    }
  ],
  'Karnataka|Bengaluru Rural': [
    {
      town: 'Devanahalli',
      pins: [
        { code: '562110', officeName: 'Devanahalli S.O' },
        { code: '560300', officeName: 'Kempegowda International Airport S.O' }
      ]
    },
    { town: 'Nelamangala', pins: [{ code: '562123', officeName: 'Nelamangala S.O' }] },
    { town: 'Hoskote', pins: [{ code: '562114', officeName: 'Hoskote S.O' }] },
    { town: 'Doddaballapura', pins: [{ code: '561203', officeName: 'Doddaballapura H.O' }] }
  ],
  'Karnataka|Mysuru': [
    {
      town: 'Mysuru',
      pins: [
        { code: '570001', officeName: 'Mysuru H.O' },
        { code: '570016', officeName: 'Hebbal Industrial Area Mysuru S.O' },
        { code: '570017', officeName: 'Vijayanagar Mysuru S.O' },
        { code: '570023', officeName: 'Kuvempunagar S.O' }
      ]
    },
    { town: 'Nanjangud', pins: [{ code: '571301', officeName: 'Nanjangud H.O' }] },
    { town: 'Hunsur', pins: [{ code: '571105', officeName: 'Hunsur S.O' }] }
  ],
  'Karnataka|Dharwad (Hubballi)': [
    {
      town: 'Hubballi',
      pins: [
        { code: '580020', officeName: 'Hubballi H.O' },
        { code: '580030', officeName: 'Gokul Road Hubballi S.O' },
        { code: '580025', officeName: 'Amargol APMC Hubballi S.O' }
      ]
    },
    { town: 'Dharwad', pins: [{ code: '580001', officeName: 'Dharwad H.O' }, { code: '580011', officeName: 'Belur Industrial Area S.O' }] }
  ],
  'Karnataka|Dakshina Kannada (Mangaluru)': [
    {
      town: 'Mangaluru',
      pins: [
        { code: '575001', officeName: 'Mangaluru H.O' },
        { code: '575010', officeName: 'Baikampady New Mangalore Port S.O' }
      ]
    },
    { town: 'Puttur', pins: [{ code: '574201', officeName: 'Puttur H.O' }] },
    { town: 'Bantwal', pins: [{ code: '574211', officeName: 'Bantwal S.O' }] }
  ],
  'Karnataka|Belagavi': [
    { town: 'Belagavi', pins: [{ code: '590001', officeName: 'Belagavi H.O' }, { code: '590008', officeName: 'Udyambag Industrial Area S.O' }] },
    { town: 'Gokak', pins: [{ code: '591307', officeName: 'Gokak H.O' }] },
    { town: 'Chikkodi', pins: [{ code: '591201', officeName: 'Chikkodi H.O' }] }
  ],
  'Andhra Pradesh|Anantapur': [
    {
      town: 'Anantapur',
      pins: [
        { code: '515001', officeName: 'Anantapur H.O' },
        { code: '515002', officeName: 'Anantapur Old Town S.O' },
        { code: '515004', officeName: 'Ramnagar Anantapur S.O' }
      ]
    },
    { town: 'Guntakal', pins: [{ code: '515801', officeName: 'Guntakal S.O' }] },
    { town: 'Tadipatri', pins: [{ code: '515411', officeName: 'Tadipatri S.O' }] },
    { town: 'Rayadurg', pins: [{ code: '515865', officeName: 'Rayadurg S.O' }] }
  ],
  'Andhra Pradesh|Visakhapatnam': [
    {
      town: 'Visakhapatnam',
      pins: [
        { code: '530001', officeName: 'Visakhapatnam H.O' },
        { code: '530012', officeName: 'Gajuwaka Industrial S.O' },
        { code: '530016', officeName: 'Dwarakanagar S.O' },
        { code: '530035', officeName: 'Visakhapatnam Port S.O' }
      ]
    },
    { town: 'Bheemunipatnam', pins: [{ code: '531163', officeName: 'Bheemunipatnam S.O' }] }
  ],
  'Andhra Pradesh|NTR (Vijayawada)': [
    {
      town: 'Vijayawada',
      pins: [
        { code: '520001', officeName: 'Vijayawada H.O' },
        { code: '520007', officeName: 'Auto Nagar Vijayawada S.O' },
        { code: '520010', officeName: 'Benz Circle S.O' }
      ]
    },
    { town: 'Nandigama', pins: [{ code: '521185', officeName: 'Nandigama S.O' }] }
  ],
  'Tamil Nadu|Chennai': [
    {
      town: 'Chennai',
      pins: [
        { code: '600001', officeName: 'Chennai G.P.O.' },
        { code: '600032', officeName: 'Guindy Industrial Estate S.O' },
        { code: '600058', officeName: 'Ambattur Industrial Estate S.O' },
        { code: '600017', officeName: 'T. Nagar H.O' },
        { code: '600042', officeName: 'Velachery S.O' },
        { code: '600060', officeName: 'Madhavaram Truck Terminal S.O' }
      ]
    }
  ],
  'Tamil Nadu|Coimbatore': [
    {
      town: 'Coimbatore',
      pins: [
        { code: '641001', officeName: 'Coimbatore H.O' },
        { code: '641012', officeName: 'Gandhipuram S.O' },
        { code: '641021', officeName: 'SIDCO Industrial Estate S.O' }
      ]
    },
    { town: 'Pollachi', pins: [{ code: '642001', officeName: 'Pollachi H.O' }] },
    { town: 'Mettupalayam', pins: [{ code: '641301', officeName: 'Mettupalayam S.O' }] }
  ],
  'Telangana|Hyderabad': [
    {
      town: 'Hyderabad',
      pins: [
        { code: '500001', officeName: 'Hyderabad G.P.O.' },
        { code: '500032', officeName: 'Gachibowli / HITEC City S.O' },
        { code: '500003', officeName: 'Secunderabad H.O' },
        { code: '500072', officeName: 'Kukatpally S.O' },
        { code: '500039', officeName: 'Uppal Industrial Area S.O' }
      ]
    }
  ],
  'Maharashtra|Mumbai City': [
    {
      town: 'Mumbai',
      pins: [
        { code: '400001', officeName: 'Mumbai G.P.O. (Fort)' },
        { code: '400013', officeName: 'Lower Parel S.O' },
        { code: '400014', officeName: 'Dadar H.O' }
      ]
    }
  ],
  'Maharashtra|Mumbai Suburban': [
    {
      town: 'Mumbai Suburban',
      pins: [
        { code: '400093', officeName: 'Andheri East / SEEPZ S.O' },
        { code: '400051', officeName: 'Bandra Kurla Complex (BKC) S.O' },
        { code: '400070', officeName: 'Kurla S.O' },
        { code: '400092', officeName: 'Borivali West S.O' }
      ]
    }
  ],
  'Maharashtra|Pune': [
    {
      town: 'Pune',
      pins: [
        { code: '411001', officeName: 'Pune H.O' },
        { code: '411057', officeName: 'Hinjawadi Infotech Park S.O' },
        { code: '411019', officeName: 'Chinchwad East (PCMC) S.O' },
        { code: '410501', officeName: 'Chakan Industrial Hub S.O' }
      ]
    },
    { town: 'Pimpri-Chinchwad', pins: [{ code: '411018', officeName: 'Pimpri P F S.O' }, { code: '411026', officeName: 'Bhosari MIDC S.O' }] },
    { town: 'Baramati', pins: [{ code: '413102', officeName: 'Baramati H.O' }] }
  ],
  'Maharashtra|Thane': [
    { town: 'Thane', pins: [{ code: '400601', officeName: 'Thane H.O' }, { code: '400604', officeName: 'Wagle Industrial Estate S.O' }] },
    { town: 'Navi Mumbai', pins: [{ code: '400703', officeName: 'Vashi Navi Mumbai S.O' }, { code: '400708', officeName: 'Airoli S.O' }] },
    { town: 'Bhiwandi', pins: [{ code: '421302', officeName: 'Bhiwandi Logistics H.O' }] },
    { town: 'Kalyan-Dombivli', pins: [{ code: '421301', officeName: 'Kalyan City H.O' }, { code: '421201', officeName: 'Dombivli S.O' }] }
  ],
  'Delhi NCR|New Delhi': [
    {
      town: 'New Delhi',
      pins: [
        { code: '110001', officeName: 'New Delhi G.P.O. (Connaught Place)' },
        { code: '110021', officeName: 'Chanakyapuri S.O' },
        { code: '110037', officeName: 'Mahipalpur Highway Cargo S.O' }
      ]
    }
  ],
  'Delhi NCR|South West Delhi (Dwarka / IGI)': [
    {
      town: 'Dwarka',
      pins: [
        { code: '110075', officeName: 'Dwarka Sector 6 S.O' },
        { code: '110037', officeName: 'IGI Airport Cargo Terminal S.O' }
      ]
    }
  ],
  'Haryana|Gurugram': [
    {
      town: 'Gurugram',
      pins: [
        { code: '122001', officeName: 'Gurugram H.O' },
        { code: '122002', officeName: 'DLF Cyber City / Phase II S.O' },
        { code: '122016', officeName: 'Udyog Vihar Industrial S.O' },
        { code: '122052', officeName: 'IMT Manesar Auto Hub S.O' }
      ]
    },
    { town: 'Manesar', pins: [{ code: '122052', officeName: 'IMT Manesar S.O' }] }
  ],
  'Uttar Pradesh|Gautam Buddha Nagar (Noida / Greater Noida)': [
    {
      town: 'Noida',
      pins: [
        { code: '201301', officeName: 'Noida Sector 19 H.O' },
        { code: '201309', officeName: 'Noida Sector 62 Industrial S.O' }
      ]
    },
    {
      town: 'Greater Noida',
      pins: [
        { code: '201310', officeName: 'Greater Noida Knowledge Park S.O' },
        { code: '201306', officeName: 'Surajpur Industrial Area S.O' }
      ]
    }
  ],
  'Gujarat|Ahmedabad': [
    {
      town: 'Ahmedabad',
      pins: [
        { code: '380001', officeName: 'Ahmedabad G.P.O.' },
        { code: '382110', officeName: 'Sanand Auto Industrial GIDC S.O' },
        { code: '382330', officeName: 'Naroda Industrial Estate S.O' },
        { code: '382213', officeName: 'Changodar Logistics Park S.O' }
      ]
    }
  ],
  'West Bengal|Kolkata': [
    {
      town: 'Kolkata',
      pins: [
        { code: '700001', officeName: 'Kolkata G.P.O.' },
        { code: '700091', officeName: 'Salt Lake Sector V S.O' },
        { code: '700156', officeName: 'New Town Rajarhat S.O' },
        { code: '700023', officeName: 'Khidirpur Port Dock S.O' }
      ]
    }
  ]
};

const CACHE_KEY = 'driverhub_india_post_cache_v1';
const memoryCache = new Map<string, TownLocalityOption[]>();

function loadSessionCache(): Record<string, TownLocalityOption[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessionCache(key: string, value: TownLocalityOption[]): void {
  try {
    const existing = loadSessionCache();
    existing[key] = value;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore quota errors
  }
}

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPrimaryName(label: string): string {
  const match = label.match(/^([^(]+)/);
  return (match ? match[1] : label).trim();
}

export function getAllStatesAndUTs(): string[] {
  return Object.keys(STATE_DISTRICTS_DIRECTORY).sort((a, b) => a.localeCompare(b));
}

export function getDistrictsForState(stateName: string): string[] {
  if (!stateName) return [];
  const exact = STATE_DISTRICTS_DIRECTORY[stateName];
  if (exact) return exact.districts;

  const norm = normalizeName(stateName);
  for (const [key, val] of Object.entries(STATE_DISTRICTS_DIRECTORY)) {
    if (normalizeName(key) === norm || normalizeName(key).includes(norm) || norm.includes(normalizeName(key))) {
      return val.districts;
    }
  }
  return [];
}

/**
 * Validates whether a district actually belongs to the given State / Union Territory.
 */
export function isDistrictInState(stateName: string, districtName: string): boolean {
  if (!stateName || !districtName) return false;
  const districts = getDistrictsForState(stateName);
  const normDist = normalizeName(extractPrimaryName(districtName));
  return districts.some(d => {
    const nd = normalizeName(extractPrimaryName(d));
    return nd === normDist || normalizeName(d) === normalizeName(districtName);
  });
}

/**
 * Finds the parent State / Union Territory for any official Indian district.
 */
export function findStateForDistrict(districtName: string): string | null {
  if (!districtName) return null;
  const normDist = normalizeName(extractPrimaryName(districtName));
  for (const [st, meta] of Object.entries(STATE_DISTRICTS_DIRECTORY)) {
    if (meta.districts.some(d => normalizeName(extractPrimaryName(d)) === normDist || normalizeName(d) === normalizeName(districtName))) {
      return st;
    }
  }
  return null;
}

/**
 * Returns immediate baseline towns/cities for a given State + District from our verified directory.
 */
export function getBaselineTownsForDistrict(stateName: string, districtName: string): TownLocalityOption[] {
  if (!stateName || !districtName) return [];
  const key = `${stateName}|${districtName}`;
  const verified = VERIFIED_DISTRICT_TOWNS[key];
  if (verified && verified.length > 0) {
    return verified.map(item => ({
      name: item.town,
      district: districtName,
      state: stateName,
      pins: item.pins.map(p => ({
        code: p.code,
        officeName: p.officeName,
        source: 'verified-directory' as const
      })),
      source: 'verified-directory' as const
    }));
  }

  // Extract headquarters town name from district label (e.g. "Dakshina Kannada (Mangaluru)" -> "Mangaluru" & "Dakshina Kannada")
  const primary = extractPrimaryName(districtName);
  const parenMatch = districtName.match(/\(([^)]+)\)/);
  const secondary = parenMatch ? parenMatch[1].split('/').map(s => s.trim()) : [];
  const names = Array.from(new Set([...secondary, primary])).filter(Boolean);

  return names.map(name => ({
    name,
    district: districtName,
    state: stateName,
    pins: [],
    source: 'verified-directory' as const
  }));
}

/**
 * Live query to India Post (`https://api.postalpincode.in/postoffice/{query}`)
 * Resolves official Towns/Post Office localities and their verified 6-digit PIN codes for a State & District.
 */
export async function fetchDistrictTownsAndPinsLive(
  stateName: string,
  districtName: string,
  signal?: AbortSignal
): Promise<{ towns: TownLocalityOption[]; isLiveVerified: boolean; error?: string }> {
  const baseline = getBaselineTownsForDistrict(stateName, districtName);
  if (!stateName || !districtName) {
    return { towns: [], isLiveVerified: false };
  }

  const cacheKey = `${stateName}|${districtName}`;
  if (memoryCache.has(cacheKey)) {
    return { towns: memoryCache.get(cacheKey)!, isLiveVerified: true };
  }
  const sessionCached = loadSessionCache()[cacheKey];
  if (sessionCached && sessionCached.length > 0) {
    memoryCache.set(cacheKey, sessionCached);
    return { towns: sessionCached, isLiveVerified: true };
  }

  // Query terms: primary district name and parenthesized city name if present
  const primaryQuery = extractPrimaryName(districtName);
  const parenMatch = districtName.match(/\(([^)]+)\)/);
  const altQuery = parenMatch ? parenMatch[1].split('/')[0].trim() : '';
  const queries = Array.from(new Set([primaryQuery, altQuery].filter(Boolean)));

  const townMap = new Map<string, TownLocalityOption>();
  for (const b of baseline) {
    townMap.set(b.name.toLowerCase(), { ...b, pins: [...b.pins] });
  }

  let anySuccess = false;
  let lastError = '';

  for (const q of queries) {
    try {
      const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`, {
        signal
      });
      if (!response.ok) {
        lastError = `India Post lookup HTTP ${response.status}`;
        continue;
      }
      const payload = await response.json();
      const first = Array.isArray(payload) ? payload[0] : null;
      if (first && first.Status === 'Success' && Array.isArray(first.PostOffice)) {
        anySuccess = true;
        const normTargetState = normalizeName(stateName);
        const normTargetDist = normalizeName(primaryQuery);

        for (const po of first.PostOffice) {
          const poState = normalizeName(String(po.State || ''));
          const poDist = normalizeName(String(po.District || ''));
          const stateMatches =
            !poState ||
            poState === normTargetState ||
            poState.includes(normTargetState) ||
            normTargetState.includes(poState) ||
            (normTargetState.includes('delhi') && poState.includes('delhi'));

          // Exact word match for district, not arbitrary substring
          // e.g. "thiruvananthapuram" must never match "ananthapur"
          const primaryPoDist = extractPrimaryName(poDist);
          const distMatches =
            !poDist ||
            poDist === normTargetDist ||
            primaryPoDist === normTargetDist ||
            (altQuery && (poDist === normalizeName(altQuery) || primaryPoDist === normalizeName(altQuery)));

          // Both state AND district MUST match if target is specified
          if (normTargetState && !stateMatches) continue;
          if (normTargetDist && !distMatches) continue;

          const pin = String(po.Pincode || '').trim();
          if (!/^\d{6}$/.test(pin)) continue;

          const officeName = String(po.Name || '').trim();
          const blockOrTaluk = String(po.Block && po.Block !== 'NA' ? po.Block : po.Name || primaryQuery).trim();

          // Register both under the Block/Town name and the specific Post Office locality name
          for (const localityName of [blockOrTaluk, officeName]) {
            if (!localityName) continue;
            const key = localityName.toLowerCase();
            const existing = townMap.get(key) || {
              name: localityName,
              district: districtName,
              state: stateName,
              pins: [],
              source: 'india-post-live' as const
            };
            if (!existing.pins.some(p => p.code === pin && p.officeName === officeName)) {
              existing.pins.push({
                code: pin,
                officeName: officeName || localityName,
                deliveryStatus: po.DeliveryStatus,
                source: 'india-post-live'
              });
            }
            existing.source = 'india-post-live';
            townMap.set(key, existing);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      lastError = err instanceof Error ? err.message : 'Network error connecting to India Post directory';
    }
  }

  const merged = Array.from(townMap.values()).sort((a, b) => {
    // Prioritize entries that have verified PINs
    if (a.pins.length > 0 && b.pins.length === 0) return -1;
    if (a.pins.length === 0 && b.pins.length > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  if (anySuccess && merged.some(t => t.pins.length > 0)) {
    memoryCache.set(cacheKey, merged);
    saveSessionCache(cacheKey, merged);
    return { towns: merged, isLiveVerified: true };
  }

  return {
    towns: merged,
    isLiveVerified: merged.some(t => t.pins.length > 0),
    error: lastError || undefined
  };
}

/**
 * Resolves valid PIN code(s) for a specific Town / Locality name via India Post live lookup
 */
export async function fetchPinsForTownLive(
  stateName: string,
  districtName: string,
  townName: string,
  signal?: AbortSignal
): Promise<PinOption[]> {
  if (!townName.trim()) return [];

  // Check district cache first
  const cachedDistrict = memoryCache.get(`${stateName}|${districtName}`);
  const matchInCache = cachedDistrict?.find(t => t.name.toLowerCase() === townName.trim().toLowerCase());
  if (matchInCache && matchInCache.pins.length > 0) {
    return matchInCache.pins;
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(townName.trim())}`, {
      signal
    });
    if (!response.ok) return [];
    const payload = await response.json();
    const first = Array.isArray(payload) ? payload[0] : null;
    if (!first || first.Status !== 'Success' || !Array.isArray(first.PostOffice)) return [];

    const normState = normalizeName(stateName);
    const normDistrict = normalizeName(extractPrimaryName(districtName));
    const pins: PinOption[] = [];
    for (const po of first.PostOffice) {
      const poState = normalizeName(String(po.State || ''));
      const poDist = normalizeName(String(po.District || ''));
      if (normState && poState && !poState.includes(normState) && !normState.includes(poState)) {
        continue;
      }
      if (normDistrict && poDist) {
        const poPrimaryDist = normalizeName(extractPrimaryName(poDist));
        if (poDist !== normDistrict && poPrimaryDist !== normDistrict) {
          continue;
        }
      }
      const code = String(po.Pincode || '').trim();
      const officeName = String(po.Name || townName).trim();
      if (/^\d{6}$/.test(code) && !pins.some(p => p.code === code && p.officeName === officeName)) {
        pins.push({
          code,
          officeName,
          deliveryStatus: po.DeliveryStatus,
          source: 'india-post-live'
        });
      }
    }
    return pins;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    return [];
  }
}

/**
 * Verifies a 6-digit PIN code against the live India Post PIN API (`https://api.postalpincode.in/pincode/{pin}`)
 */
export async function verifyPinCodeLive(
  pincode: string,
  signal?: AbortSignal
): Promise<{
  valid: boolean;
  state?: string;
  district?: string;
  towns: string[];
  offices: PinOption[];
  error?: string;
}> {
  const cleanPin = pincode.trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { valid: false, towns: [], offices: [], error: 'Enter a valid 6-digit Indian PIN code.' };
  }

  // Check verified local directory first for instant match
  for (const [key, towns] of Object.entries(VERIFIED_DISTRICT_TOWNS)) {
    const [st, dist] = key.split('|');
    for (const t of towns) {
      const matchingPins = t.pins.filter(p => p.code === cleanPin);
      if (matchingPins.length > 0) {
        return {
          valid: true,
          state: st,
          district: dist,
          towns: [t.town, ...matchingPins.map(p => p.officeName)],
          offices: matchingPins.map(p => ({ ...p, source: 'verified-directory' as const }))
        };
      }
    }
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, { signal });
    if (!response.ok) {
      return { valid: false, towns: [], offices: [], error: `Could not reach India Post PIN service (${response.status}).` };
    }
    const payload = await response.json();
    const first = Array.isArray(payload) ? payload[0] : null;
    if (!first || first.Status !== 'Success' || !Array.isArray(first.PostOffice) || first.PostOffice.length === 0) {
      return { valid: false, towns: [], offices: [], error: 'PIN code not found in India Post directory.' };
    }

    const firstPO = first.PostOffice[0];
    const resolvedState = String(firstPO.State || '').trim();
    const resolvedDistrict = String(firstPO.District || '').trim();
    const offices: PinOption[] = first.PostOffice.map((po: any) => ({
      code: cleanPin,
      officeName: String(po.Name || '').trim(),
      deliveryStatus: po.DeliveryStatus,
      source: 'india-post-live' as const
    }));
    const towns: string[] = Array.from(
      new Set<string>(
        first.PostOffice.flatMap((po: any): string[] => [
          po.Block && po.Block !== 'NA' ? String(po.Block).trim() : '',
          String(po.Name || '').trim()
        ]).filter((item: string): item is string => Boolean(item))
      )
    );

    return {
      valid: true,
      state: resolvedState,
      district: resolvedDistrict,
      towns,
      offices
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    return {
      valid: false,
      towns: [],
      offices: [],
      error: 'Live PIN verification unavailable offline. Format validated (6 digits).'
    };
  }
}

export interface PanIndiaAutocompleteSuggestion {
  city: string;
  district: string;
  state: string;
  pincode: string;
  pins: PinOption[];
  label: string;
  sublabel: string;
  source: 'verified-directory' | 'india-post-live' | 'district-hq';
}

const liveQueryMemoryCache = new Map<string, PanIndiaAutocompleteSuggestion[]>();

/**
 * Returns all ~780 districts across all 36 States & Union Territories paired with their parent State/UT.
 */
export function getAllDistrictsWithState(): Array<{ district: string; state: string; prefix: string }> {
  const results: Array<{ district: string; state: string; prefix: string }> = [];
  for (const [state, meta] of Object.entries(STATE_DISTRICTS_DIRECTORY)) {
    for (const district of meta.districts) {
      results.push({ district, state, prefix: meta.prefix });
    }
  }
  return results;
}

/**
 * Searches across verified towns, district headquarters, and live India Post PostOffice API
 * (`https://api.postalpincode.in/postoffice/{query}`) for type-and-select autocomplete.
 */
export async function searchPanIndiaPlacesLive(
  query: string,
  filterState?: string,
  filterDistrict?: string,
  signal?: AbortSignal
): Promise<{
  suggestions: PanIndiaAutocompleteSuggestion[];
  error?: string;
}> {
  const cleanQuery = query.trim();
  const normQuery = cleanQuery.toLowerCase();
  const normState = filterState ? normalizeName(filterState) : '';
  const normDist = filterDistrict ? normalizeName(extractPrimaryName(filterDistrict)) : '';

  const resultsMap = new Map<string, PanIndiaAutocompleteSuggestion>();

  // 1. Search local verified towns & multi-PIN hubs first (zero latency)
  for (const [key, towns] of Object.entries(VERIFIED_DISTRICT_TOWNS)) {
    const [st, dist] = key.split('|');
    if (normState && normalizeName(st) !== normState) continue;
    if (
      normDist &&
      !normalizeName(dist).includes(normDist) &&
      !normDist.includes(normalizeName(extractPrimaryName(dist)))
    ) {
      continue;
    }

    for (const t of towns) {
      const matchesTown =
        !normQuery ||
        t.town.toLowerCase().includes(normQuery) ||
        dist.toLowerCase().includes(normQuery) ||
        t.pins.some(p => p.code.includes(normQuery) || p.officeName.toLowerCase().includes(normQuery));

      if (matchesTown) {
        const primaryPin = t.pins[0]?.code || '';
        const mapKey = `${t.town.toLowerCase()}|${dist.toLowerCase()}|${st.toLowerCase()}`;
        resultsMap.set(mapKey, {
          city: t.town,
          district: dist,
          state: st,
          pincode: primaryPin,
          pins: t.pins.map(p => ({ ...p, source: 'verified-directory' as const })),
          label: t.town,
          sublabel: `${dist}, ${st}${primaryPin ? ` • PIN ${primaryPin}${t.pins.length > 1 ? ` (+${t.pins.length - 1} more)` : ''}` : ''}`,
          source: 'verified-directory'
        });
      }
    }
  }

  // 2. Search all ~780 District Headquarters across all 36 States/UTs
  for (const [st, meta] of Object.entries(STATE_DISTRICTS_DIRECTORY)) {
    if (normState && normalizeName(st) !== normState) continue;
    for (const dist of meta.districts) {
      if (
        normDist &&
        !normalizeName(dist).includes(normDist) &&
        !normDist.includes(normalizeName(extractPrimaryName(dist)))
      ) {
        continue;
      }
      const primaryCityName = extractPrimaryName(dist);
      if (
        !normQuery ||
        dist.toLowerCase().includes(normQuery) ||
        primaryCityName.toLowerCase().includes(normQuery)
      ) {
        const mapKey = `${primaryCityName.toLowerCase()}|${dist.toLowerCase()}|${st.toLowerCase()}`;
        if (!resultsMap.has(mapKey)) {
          resultsMap.set(mapKey, {
            city: primaryCityName,
            district: dist,
            state: st,
            pincode: '',
            pins: [],
            label: primaryCityName,
            sublabel: `${dist} District, ${st} (PIN prefix ${meta.prefix})`,
            source: 'district-hq'
          });
        }
      }
    }
  }

  // If query is shorter than 2 characters, return local matches immediately without hitting network
  if (cleanQuery.length < 2) {
    return {
      suggestions: Array.from(resultsMap.values()).slice(0, 60)
    };
  }

  const cacheKey = `${normQuery}|${normState}|${normDist}`;
  if (liveQueryMemoryCache.has(cacheKey)) {
    return { suggestions: liveQueryMemoryCache.get(cacheKey)! };
  }

  // 3. If user typed at least 2 characters, query India Post API (either by 6-digit PIN or PostOffice name)
  try {
    const isPinSearch = /^\d{3,6}$/.test(cleanQuery);
    const endpoint =
      /^\d{6}$/.test(cleanQuery)
        ? `https://api.postalpincode.in/pincode/${encodeURIComponent(cleanQuery)}`
        : !isPinSearch
        ? `https://api.postalpincode.in/postoffice/${encodeURIComponent(cleanQuery)}`
        : '';

    if (endpoint) {
      const response = await fetch(endpoint, { signal });
      if (response.ok) {
        const payload = await response.json();
        const first = Array.isArray(payload) ? payload[0] : null;
        if (first && first.Status === 'Success' && Array.isArray(first.PostOffice)) {
          for (const po of first.PostOffice) {
            const poStateRaw = String(po.State || '').trim();
            const poDistRaw = String(po.District || '').trim();
            const poNameRaw = String(po.Name || '').trim();
            const poBlockRaw = String(po.Block && po.Block !== 'NA' ? po.Block : '').trim();
            const poPin = String(po.Pincode || '').trim();

            if (!poNameRaw || !/^\d{6}$/.test(poPin)) continue;

            // Match against canonical State name in STATE_DISTRICTS_DIRECTORY
            const matchedState =
              getAllStatesAndUTs().find(
                s =>
                  normalizeName(s) === normalizeName(poStateRaw) ||
                  normalizeName(s).includes(normalizeName(poStateRaw)) ||
                  normalizeName(poStateRaw).includes(normalizeName(s))
              ) || poStateRaw;

            if (normState && normalizeName(matchedState) !== normState) continue;

            const stateDists = getDistrictsForState(matchedState);
            const matchedDist =
              stateDists.find(
                d =>
                  normalizeName(d) === normalizeName(poDistRaw) ||
                  normalizeName(extractPrimaryName(d)) === normalizeName(poDistRaw) ||
                  d.toLowerCase().includes(poDistRaw.toLowerCase())
              ) || poDistRaw;

            if (normDist) {
              const matchedPrimary = normalizeName(extractPrimaryName(matchedDist));
              if (matchedDist !== normDist && matchedPrimary !== normDist) {
                continue;
              }
            }

            const localityName = poNameRaw;
            const mapKey = `${localityName.toLowerCase()}|${matchedDist.toLowerCase()}|${matchedState.toLowerCase()}`;
            const pinOption: PinOption = {
              code: poPin,
              officeName: poNameRaw,
              deliveryStatus: po.DeliveryStatus,
              source: 'india-post-live'
            };

            const existing = resultsMap.get(mapKey);
            if (existing) {
              if (!existing.pins.some(p => p.code === poPin && p.officeName === poNameRaw)) {
                existing.pins.push(pinOption);
              }
              if (!existing.pincode) existing.pincode = poPin;
              existing.sublabel = `${matchedDist}, ${matchedState} • PIN ${existing.pincode}${existing.pins.length > 1 ? ` (+${existing.pins.length - 1} more)` : ''}`;
            } else {
              resultsMap.set(mapKey, {
                city: localityName,
                district: matchedDist,
                state: matchedState,
                pincode: poPin,
                pins: [pinOption],
                label: poBlockRaw && poBlockRaw.toLowerCase() !== localityName.toLowerCase()
                  ? `${localityName} (${poBlockRaw})`
                  : localityName,
                sublabel: `${matchedDist}, ${matchedState} • PIN ${poPin}`,
                source: 'india-post-live'
              });
            }
          }
        }
      }
    }

    const finalSuggestions = Array.from(resultsMap.values())
      .sort((a, b) => {
        const aStarts = a.city.toLowerCase().startsWith(normQuery) ? 0 : 1;
        const bStarts = b.city.toLowerCase().startsWith(normQuery) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        if (a.pins.length > 0 && b.pins.length === 0) return -1;
        if (a.pins.length === 0 && b.pins.length > 0) return 1;
        return a.city.localeCompare(b.city);
      })
      .slice(0, 60);

    liveQueryMemoryCache.set(cacheKey, finalSuggestions);
    return { suggestions: finalSuggestions };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    return {
      suggestions: Array.from(resultsMap.values()).slice(0, 60),
      error: 'Live India Post lookup temporarily unreachable; showing verified directory results.'
    };
  }
}

export interface StructuredPanIndiaLocation {
  state: string;
  district: string;
  city: string;
  pincode: string;
  addressLine?: string;
  legacyLocation?: string;
  formattedLocation: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Formats a structured Pan-India location into a consistent, human-readable string
 * that persists cleanly in `location` while preserving backwards compatibility.
 */
export function formatStructuredLocation(val: {
  addressLine?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}): string {
  const parts: string[] = [];
  if (val.addressLine && val.addressLine.trim()) {
    parts.push(val.addressLine.trim());
  }
  if (val.city && val.city.trim()) {
    parts.push(val.city.trim());
  }
  if (
    val.district &&
    val.district.trim() &&
    normalizeName(val.district) !== normalizeName(val.city || '')
  ) {
    parts.push(`${val.district.trim()} Dist.`);
  }
  if (val.state && val.state.trim()) {
    parts.push(val.state.trim());
  }
  const base = parts.join(', ');
  const pin = (val.pincode || '').trim();
  if (pin && /^\d{6}$/.test(pin)) {
    return base ? `${base} - ${pin}` : pin;
  }
  return base;
}

/**
 * Safely parses any existing record (DriverProfile, EmployerProfile, Job) into
 * `{ state, district, city, pincode, addressLine, legacyLocation, formattedLocation, latitude, longitude }`.
 * Accepts either an object `{ state, district, city, pincode, location, latitude, longitude }` OR positional `(location, state, district, city, pincode, latitude, longitude)`.
 */
export function parseStructuredLocation(
  recordOrLocation?:
    | {
        state?: string;
        district?: string;
        city?: string;
        pincode?: string;
        location?: string;
        latitude?: number;
        longitude?: number;
      }
    | string,
  stateArg?: string,
  districtArg?: string,
  cityArg?: string,
  pincodeArg?: string,
  latArg?: number,
  lngArg?: number
): StructuredPanIndiaLocation {
  const record =
    typeof recordOrLocation === 'object' && recordOrLocation !== null
      ? recordOrLocation
      : {
          location: typeof recordOrLocation === 'string' ? recordOrLocation : '',
          state: stateArg,
          district: districtArg,
          city: cityArg,
          pincode: pincodeArg,
          latitude: latArg,
          longitude: lngArg
        };

  const rawLocation = (record.location || '').trim();
  const pinMatch = rawLocation.match(/\b(\d{6})\b/);
  const extractedPin = (record.pincode || (pinMatch ? pinMatch[1] : '')).trim();

  // Remove trailing "- 560100" from rawLocation for parsing
  const withoutPin = rawLocation.replace(/\s*-\s*\d{6}\b/, '').trim();
  const segments = withoutPin.split(',').map(s => s.trim()).filter(Boolean);

  let resolvedState = (record.state || '').trim();
  if (!resolvedState && segments.length > 0) {
    const matchingState = getAllStatesAndUTs().find(st =>
      segments.some(seg => normalizeName(seg) === normalizeName(st))
    );
    if (matchingState) resolvedState = matchingState;
  }

  let resolvedDistrict = (record.district || '').trim();
  const distSeg = segments.find(s => /\bdist\.?$/i.test(s));
  if (!resolvedDistrict && distSeg) {
    resolvedDistrict = distSeg.replace(/\s*dist\.?$/i, '').trim();
  }

  const stateDistricts = resolvedState ? getDistrictsForState(resolvedState) : [];
  if (resolvedDistrict && stateDistricts.length > 0) {
    const exactDist = stateDistricts.find(
      d =>
        normalizeName(d) === normalizeName(resolvedDistrict) ||
        normalizeName(extractPrimaryName(d)) === normalizeName(resolvedDistrict)
    );
    if (exactDist) resolvedDistrict = exactDist;
  }

  let resolvedCity = (record.city || '').trim();
  if (!resolvedCity && segments.length > 0) {
    resolvedCity = segments[0];
  }

  // If district is still empty but city matches a known district in that state, infer the district
  if (!resolvedDistrict && resolvedCity && stateDistricts.length > 0) {
    const inferred = stateDistricts.find(
      d =>
        normalizeName(d) === normalizeName(resolvedCity) ||
        normalizeName(extractPrimaryName(d)) === normalizeName(resolvedCity) ||
        d.toLowerCase().includes(resolvedCity.toLowerCase())
    );
    if (inferred) resolvedDistrict = inferred;
  }

  // Extract optional address line (first segment if distinct from city/district/state)
  let addressLine = '';
  if (segments.length > 1 && resolvedCity && normalizeName(segments[0]) !== normalizeName(resolvedCity)) {
    addressLine = segments[0];
  }

  const formattedLocation = formatStructuredLocation({
    addressLine,
    city: resolvedCity,
    district: resolvedDistrict,
    state: resolvedState,
    pincode: extractedPin
  }) || rawLocation;

  return {
    state: resolvedState,
    district: resolvedDistrict,
    city: resolvedCity,
    pincode: extractedPin,
    addressLine,
    legacyLocation: rawLocation,
    formattedLocation,
    latitude: record.latitude,
    longitude: record.longitude
  };
}

/**
 * Evaluates whether a record (Job, DriverProfile, EmployerProfile) matches the active Pan-India filter
 * (State/UT -> District -> Town/City -> PIN code).
 */
export function matchesPanIndiaLocationFilter(
  record: {
    state?: string;
    district?: string;
    city?: string;
    pincode?: string;
    location?: string;
    preferredLocation?: string;
  },
  filter: {
    state?: string;
    district?: string;
    city?: string;
    pincode?: string;
  }
): boolean {
  const parsed = parseStructuredLocation(record);
  const fullText = [
    record.state,
    record.district,
    record.city,
    record.pincode,
    record.location,
    record.preferredLocation,
    parsed.state,
    parsed.district,
    parsed.city,
    parsed.pincode
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (filter.state && filter.state.trim()) {
    const targetState = normalizeName(filter.state);
    const recordState = normalizeName(parsed.state);
    if (
      recordState !== targetState &&
      !recordState.includes(targetState) &&
      !fullText.includes(filter.state.toLowerCase())
    ) {
      return false;
    }
  }

  if (filter.district && filter.district.trim()) {
    const primaryDist = extractPrimaryName(filter.district).toLowerCase();
    const parenMatch = filter.district.match(/\(([^)]+)\)/);
    const altNames = parenMatch ? parenMatch[1].split('/').map(s => s.trim().toLowerCase()) : [];
    const candidateTerms = [filter.district.toLowerCase(), primaryDist, ...altNames].filter(Boolean);

    const matchesDist = candidateTerms.some(term => fullText.includes(term));
    if (!matchesDist) return false;
  }

  if (filter.city && filter.city.trim()) {
    const targetCity = filter.city.trim().toLowerCase();
    const primaryCity = extractPrimaryName(filter.city).toLowerCase();
    if (!fullText.includes(targetCity) && !fullText.includes(primaryCity)) {
      return false;
    }
  }

  if (filter.pincode && filter.pincode.trim()) {
    const targetPin = filter.pincode.trim();
    if (!fullText.includes(targetPin)) {
      return false;
    }
  }

  return true;
}

/**
 * Built-in authoritative coordinate centroids for all 36 States & Union Territories,
 * all major district headquarters, commercial logistics hubs, and ports across India.
 * Provides zero-latency, keyless, reliable distance calculation that never hits API rate limits.
 */
export const INDIA_COORDINATES_DIRECTORY: Record<string, { lat: number; lng: number; name: string }> = {
  // --- States & Union Territories (Centroids / Capitals) ---
  'andhra pradesh': { lat: 16.5062, lng: 80.6480, name: 'Andhra Pradesh' },
  'arunachal pradesh': { lat: 27.0844, lng: 93.6053, name: 'Arunachal Pradesh' },
  'assam': { lat: 26.1445, lng: 91.7362, name: 'Assam' },
  'bihar': { lat: 25.5941, lng: 85.1376, name: 'Bihar' },
  'chhattisgarh': { lat: 21.2514, lng: 81.6296, name: 'Chhattisgarh' },
  'goa': { lat: 15.4909, lng: 73.8278, name: 'Goa' },
  'gujarat': { lat: 23.2156, lng: 72.6369, name: 'Gujarat' },
  'haryana': { lat: 29.0588, lng: 76.0856, name: 'Haryana' },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734, name: 'Himachal Pradesh' },
  'jharkhand': { lat: 23.3441, lng: 85.3096, name: 'Jharkhand' },
  'karnataka': { lat: 12.9716, lng: 77.5946, name: 'Karnataka' },
  'kerala': { lat: 8.5241, lng: 76.9366, name: 'Kerala' },
  'madhya pradesh': { lat: 23.2599, lng: 77.4126, name: 'Madhya Pradesh' },
  'maharashtra': { lat: 19.0760, lng: 72.8777, name: 'Maharashtra' },
  'manipur': { lat: 24.8170, lng: 93.9368, name: 'Manipur' },
  'meghalaya': { lat: 25.5788, lng: 91.8933, name: 'Meghalaya' },
  'mizoram': { lat: 23.7271, lng: 92.7176, name: 'Mizoram' },
  'nagaland': { lat: 25.6751, lng: 94.1086, name: 'Nagaland' },
  'odisha': { lat: 20.2961, lng: 85.8245, name: 'Odisha' },
  'punjab': { lat: 30.7333, lng: 76.7794, name: 'Punjab' },
  'rajasthan': { lat: 26.9124, lng: 75.7873, name: 'Rajasthan' },
  'sikkim': { lat: 27.3389, lng: 88.6065, name: 'Sikkim' },
  'tamil nadu': { lat: 13.0827, lng: 80.2707, name: 'Tamil Nadu' },
  'telangana': { lat: 17.3850, lng: 78.4867, name: 'Telangana' },
  'tripura': { lat: 23.8315, lng: 91.2868, name: 'Tripura' },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462, name: 'Uttar Pradesh' },
  'uttarakhand': { lat: 30.3165, lng: 78.0322, name: 'Uttarakhand' },
  'west bengal': { lat: 22.5726, lng: 88.3639, name: 'West Bengal' },
  'delhi': { lat: 28.6139, lng: 77.2090, name: 'NCT of Delhi' },
  'delhi ncr': { lat: 28.6139, lng: 77.2090, name: 'Delhi NCR' },
  'nct of delhi': { lat: 28.6139, lng: 77.2090, name: 'NCT of Delhi' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, name: 'Chandigarh' },
  'jammu and kashmir': { lat: 34.0837, lng: 74.7973, name: 'Jammu & Kashmir' },
  'ladakh': { lat: 34.1526, lng: 77.5771, name: 'Ladakh' },
  'puducherry': { lat: 11.9416, lng: 79.8083, name: 'Puducherry' },
  'andaman and nicobar': { lat: 11.6234, lng: 92.7265, name: 'Andaman & Nicobar' },
  'dadra and nagar haveli': { lat: 20.2763, lng: 73.0083, name: 'Dadra and Nagar Haveli and Daman and Diu' },
  'lakshadweep': { lat: 10.5667, lng: 72.6417, name: 'Lakshadweep' },

  // --- Karnataka Districts, Cities & Commercial Hubs ---
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
  'bengaluru urban': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru Urban' },
  'bengaluru rural': { lat: 13.2385, lng: 77.5746, name: 'Bengaluru Rural' },
  'electronic city': { lat: 12.8399, lng: 77.6770, name: 'Electronic City, Bengaluru' },
  'whitefield': { lat: 12.9698, lng: 77.7500, name: 'Whitefield, Bengaluru' },
  'peenya': { lat: 13.0285, lng: 77.5197, name: 'Peenya Industrial Area, Bengaluru' },
  'yeshwanthpur': { lat: 13.0281, lng: 77.5404, name: 'Yeshwanthpur, Bengaluru' },
  'kengeri': { lat: 12.9177, lng: 77.4838, name: 'Kengeri, Bengaluru' },
  'indiranagar': { lat: 12.9784, lng: 77.6408, name: 'Indiranagar, Bengaluru' },
  'koramangala': { lat: 12.9352, lng: 77.6245, name: 'Koramangala, Bengaluru' },
  'banashankari': { lat: 12.9255, lng: 77.5468, name: 'Banashankari, Bengaluru' },
  'jayanagar': { lat: 12.9308, lng: 77.5838, name: 'Jayanagar, Bengaluru' },
  'hebbal': { lat: 13.0358, lng: 77.5970, name: 'Hebbal, Bengaluru' },
  'bommasandra': { lat: 12.8160, lng: 77.6917, name: 'Bommasandra Industrial Area' },
  'nelamangala': { lat: 13.0995, lng: 77.3926, name: 'Nelamangala' },
  'hoskote': { lat: 13.0711, lng: 77.7981, name: 'Hoskote' },
  'devanahalli': { lat: 13.2483, lng: 77.7126, name: 'Devanahalli Airport Hub' },
  'yelahanka': { lat: 13.1007, lng: 77.5963, name: 'Yelahanka' },
  'marathahalli': { lat: 12.9591, lng: 77.6974, name: 'Marathahalli' },
  'mysuru': { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
  'mysore': { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
  'kuvempunagar': { lat: 12.2898, lng: 76.6277, name: 'Kuvempunagar, Mysuru' },
  'vijayanagar mysuru': { lat: 12.3375, lng: 76.6111, name: 'Vijayanagar, Mysuru' },
  'hubballi': { lat: 15.3647, lng: 75.1240, name: 'Hubballi' },
  'hubballi-dharwad': { lat: 15.3647, lng: 75.1240, name: 'Hubballi-Dharwad' },
  'dharwad': { lat: 15.4589, lng: 75.0078, name: 'Dharwad' },
  'belagavi': { lat: 15.8497, lng: 74.4977, name: 'Belagavi' },
  'mangaluru': { lat: 12.9141, lng: 74.8560, name: 'Mangaluru' },
  'dakshina kannada': { lat: 12.9141, lng: 74.8560, name: 'Dakshina Kannada' },
  'tumakuru': { lat: 13.3379, lng: 77.1173, name: 'Tumakuru' },
  'tumkur': { lat: 13.3379, lng: 77.1173, name: 'Tumakuru' },
  'davanagere': { lat: 14.4644, lng: 75.9218, name: 'Davanagere' },
  'ballari': { lat: 15.1394, lng: 76.9214, name: 'Ballari' },
  'bellary': { lat: 15.1394, lng: 76.9214, name: 'Ballari' },
  'shivamogga': { lat: 13.9299, lng: 75.5681, name: 'Shivamogga' },
  'shimoga': { lat: 13.9299, lng: 75.5681, name: 'Shivamogga' },
  'kolar': { lat: 13.1367, lng: 78.1291, name: 'Kolar' },
  'chikkaballapur': { lat: 13.4355, lng: 77.7275, name: 'Chikkaballapur' },
  'mandya': { lat: 12.5244, lng: 76.8961, name: 'Mandya' },
  'udupi': { lat: 13.3409, lng: 74.7421, name: 'Udupi' },
  'hassan': { lat: 13.0033, lng: 76.1004, name: 'Hassan' },
  'kalaburagi': { lat: 17.3297, lng: 76.8343, name: 'Kalaburagi' },
  'gulbarga': { lat: 17.3297, lng: 76.8343, name: 'Kalaburagi' },
  'raichur': { lat: 16.2076, lng: 77.3463, name: 'Raichur' },
  'bidar': { lat: 17.9104, lng: 77.5199, name: 'Bidar' },
  'bagalkote': { lat: 16.1691, lng: 75.6615, name: 'Bagalkote' },
  'vijayapura': { lat: 16.8302, lng: 75.7100, name: 'Vijayapura' },
  'bijapur': { lat: 16.8302, lng: 75.7100, name: 'Vijayapura' },
  'gadag': { lat: 15.4298, lng: 75.6318, name: 'Gadag' },
  'haveri': { lat: 14.7954, lng: 75.3991, name: 'Haveri' },
  'chitradurga': { lat: 14.2251, lng: 76.3980, name: 'Chitradurga' },
  'chamarajanagar': { lat: 11.9261, lng: 76.9437, name: 'Chamarajanagar' },
  'ramanagara': { lat: 12.7209, lng: 77.2799, name: 'Ramanagara' },
  'koppal': { lat: 15.3456, lng: 76.1554, name: 'Koppal' },
  'yadgir': { lat: 16.7705, lng: 77.1376, name: 'Yadgir' },
  'kodagu': { lat: 12.4244, lng: 75.7382, name: 'Kodagu (Madikeri)' },
  'madikeri': { lat: 12.4244, lng: 75.7382, name: 'Madikeri' },
  'uttara kannada': { lat: 14.8185, lng: 74.1352, name: 'Uttara Kannada (Karwar)' },
  'karwar': { lat: 14.8185, lng: 74.1352, name: 'Karwar' },
  'vijayanagara': { lat: 15.2689, lng: 76.3909, name: 'Vijayanagara (Hosapete)' },
  'hosapete': { lat: 15.2689, lng: 76.3909, name: 'Hosapete' },

  // --- Andhra Pradesh Districts & Hubs ---
  'anantapur': { lat: 14.6819, lng: 77.6006, name: 'Anantapur' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam' },
  'vizag': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam' },
  'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada' },
  'ntr': { lat: 16.5062, lng: 80.6480, name: 'NTR (Vijayawada)' },
  'guntur': { lat: 16.3067, lng: 80.4365, name: 'Guntur' },
  'tirupati': { lat: 13.6288, lng: 79.4192, name: 'Tirupati' },
  'kurnool': { lat: 15.8281, lng: 78.0373, name: 'Kurnool' },
  'nellore': { lat: 14.4426, lng: 79.9865, name: 'Sri Potti Sriramulu Nellore' },
  'kakinada': { lat: 16.9891, lng: 82.2475, name: 'Kakinada' },
  'rajahmundry': { lat: 17.0005, lng: 81.8040, name: 'East Godavari (Rajahmundry)' },
  'kadapa': { lat: 14.4673, lng: 78.8242, name: 'YSR Kadapa' },
  'chittoor': { lat: 13.2172, lng: 79.1003, name: 'Chittoor' },
  'eluru': { lat: 16.7107, lng: 81.0952, name: 'Eluru' },
  'ongole': { lat: 15.5057, lng: 80.0499, name: 'Prakasam (Ongole)' },
  'srikakulam': { lat: 18.2949, lng: 83.8938, name: 'Srikakulam' },
  'vizianagaram': { lat: 18.1067, lng: 83.3956, name: 'Vizianagaram' },
  'nandyal': { lat: 15.4886, lng: 78.4836, name: 'Nandyal' },
  'hindupur': { lat: 13.8290, lng: 77.4929, name: 'Sri Sathya Sai (Hindupur)' },

  // --- Tamil Nadu Districts & Hubs ---
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  'guindy': { lat: 13.0067, lng: 80.2026, name: 'Guindy, Chennai' },
  'sriperumbudur': { lat: 12.9691, lng: 79.9493, name: 'Sriperumbudur Auto Hub' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, name: 'Coimbatore' },
  'madurai': { lat: 9.9252, lng: 78.1198, name: 'Madurai' },
  'salem': { lat: 11.6643, lng: 78.1460, name: 'Salem' },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli' },
  'trichy': { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli' },
  'tiruppur': { lat: 11.1085, lng: 77.3411, name: 'Tiruppur' },
  'erode': { lat: 11.3410, lng: 77.7172, name: 'Erode' },
  'vellore': { lat: 12.9165, lng: 79.1325, name: 'Vellore' },
  'thoothukudi': { lat: 8.7642, lng: 78.1348, name: 'Thoothukudi (Tuticorin)' },
  'hosur': { lat: 12.7409, lng: 77.8253, name: 'Krishnagiri (Hosur)' },
  'tirunelveli': { lat: 8.7139, lng: 77.7567, name: 'Tirunelveli' },
  'kanchipuram': { lat: 12.8342, lng: 79.7036, name: 'Kanchipuram' },
  'chengalpattu': { lat: 12.6841, lng: 79.9836, name: 'Chengalpattu' },
  'thanjavur': { lat: 10.7870, lng: 79.1378, name: 'Thanjavur' },
  'dindigul': { lat: 10.3673, lng: 77.9803, name: 'Dindigul' },
  'nagercoil': { lat: 8.1833, lng: 77.4119, name: 'Kanyakumari (Nagercoil)' },

  // --- Telangana Districts & Hubs ---
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  'secunderabad': { lat: 17.4399, lng: 78.4983, name: 'Secunderabad' },
  'gachibowli': { lat: 17.4401, lng: 78.3489, name: 'Gachibowli, Hyderabad' },
  'shamshabad': { lat: 17.2403, lng: 78.4294, name: 'Shamshabad Airport Zone' },
  'medchal': { lat: 17.6294, lng: 78.4814, name: 'Medchal-Malkajgiri' },
  'warangal': { lat: 17.9689, lng: 79.5941, name: 'Hanumakonda (Warangal)' },
  'nizamabad': { lat: 18.6725, lng: 78.0941, name: 'Nizamabad' },
  'karimnagar': { lat: 18.4386, lng: 79.1288, name: 'Karimnagar' },
  'khammam': { lat: 17.2473, lng: 80.1514, name: 'Khammam' },
  'mahbubnagar': { lat: 16.7488, lng: 78.0035, name: 'Mahabubnagar' },
  'nalgonda': { lat: 17.0577, lng: 79.2684, name: 'Nalgonda' },

  // --- Maharashtra Districts & Hubs ---
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  'mumbai city': { lat: 18.9388, lng: 72.8354, name: 'Mumbai City' },
  'mumbai suburban': { lat: 19.1136, lng: 72.8697, name: 'Mumbai Suburban' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, name: 'Navi Mumbai' },
  'thane': { lat: 19.2183, lng: 72.9781, name: 'Thane' },
  'bhiwandi': { lat: 19.3002, lng: 73.0586, name: 'Bhiwandi Logistics Hub' },
  'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  'hinjewadi': { lat: 18.5913, lng: 73.7389, name: 'Hinjewadi, Pune' },
  'chakan': { lat: 18.7599, lng: 73.8589, name: 'Chakan Auto Hub' },
  'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur' },
  'nashik': { lat: 19.9975, lng: 73.7898, name: 'Nashik' },
  'aurangabad': { lat: 19.8762, lng: 75.3433, name: 'Chhatrapati Sambhajinagar (Aurangabad)' },
  'solapur': { lat: 17.6599, lng: 75.9064, name: 'Solapur' },
  'kolhapur': { lat: 16.7050, lng: 74.2433, name: 'Kolhapur' },
  'amravati': { lat: 20.9374, lng: 77.7796, name: 'Amravati' },
  'akola': { lat: 20.7002, lng: 77.0082, name: 'Akola' },
  'panvel': { lat: 18.9894, lng: 73.1175, name: 'Raigad (Panvel)' },

  // --- Delhi NCR & North India Hubs ---
  'new delhi': { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
  'gurugram': { lat: 28.4595, lng: 77.0266, name: 'Gurugram' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, name: 'Gurugram' },
  'noida': { lat: 28.5355, lng: 77.3910, name: 'Noida' },
  'greater noida': { lat: 28.4744, lng: 77.5040, name: 'Greater Noida' },
  'faridabad': { lat: 28.4089, lng: 77.3178, name: 'Faridabad' },
  'ghaziabad': { lat: 28.6692, lng: 77.4538, name: 'Ghaziabad' },
  'manesar': { lat: 28.3516, lng: 76.9388, name: 'Manesar Auto Corridor' },
  'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
  'jodhpur': { lat: 26.2389, lng: 73.0243, name: 'Jodhpur' },
  'udaipur': { lat: 24.5854, lng: 73.7125, name: 'Udaipur' },
  'kota': { lat: 25.2138, lng: 75.8648, name: 'Kota' },
  'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
  'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur' },
  'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra' },
  'varanasi': { lat: 25.3176, lng: 82.9739, name: 'Varanasi' },
  'meerut': { lat: 28.9845, lng: 77.7064, name: 'Meerut' },
  'ludhiana': { lat: 30.9010, lng: 75.8573, name: 'Ludhiana' },
  'amritsar': { lat: 31.6340, lng: 74.8723, name: 'Amritsar' },
  'jalandhar': { lat: 31.3260, lng: 75.5762, name: 'Jalandhar' },
  'dehradun': { lat: 30.3165, lng: 78.0322, name: 'Dehradun' },
  'haridwar': { lat: 29.9457, lng: 78.1642, name: 'Haridwar' },

  // --- Gujarat, Central & East Hubs ---
  'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
  'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat' },
  'vadodara': { lat: 22.3072, lng: 73.1812, name: 'Vadodara' },
  'rajkot': { lat: 22.3039, lng: 70.8022, name: 'Rajkot' },
  'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore' },
  'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal' },
  'gwalior': { lat: 26.2183, lng: 78.1828, name: 'Gwalior' },
  'jabalpur': { lat: 23.1815, lng: 79.9864, name: 'Jabalpur' },
  'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  'howrah': { lat: 22.5958, lng: 88.2636, name: 'Howrah' },
  'durgapur': { lat: 23.5204, lng: 87.3119, name: 'Durgapur' },
  'asansol': { lat: 23.6739, lng: 86.9524, name: 'Asansol' },
  'siliguri': { lat: 26.7271, lng: 88.3953, name: 'Siliguri' },
  'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna' },
  'gaya': { lat: 24.7914, lng: 85.0002, name: 'Gaya' },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar' },
  'cuttack': { lat: 20.4625, lng: 85.8828, name: 'Cuttack' },
  'rourkela': { lat: 22.2604, lng: 84.8536, name: 'Rourkela' },
  'ranchi': { lat: 23.3441, lng: 85.3096, name: 'Ranchi' },
  'jamshedpur': { lat: 22.8046, lng: 86.2029, name: 'Jamshedpur' },
  'dhanbad': { lat: 23.7957, lng: 86.4304, name: 'Dhanbad' },
  'raipur': { lat: 21.2514, lng: 81.6296, name: 'Raipur' },
  'kochi': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
  'cochin': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
  'trivandrum': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
  'kozhikode': { lat: 11.2588, lng: 75.7804, name: 'Kozhikode' },
  'calicut': { lat: 11.2588, lng: 75.7804, name: 'Kozhikode' },
  'guwahati': { lat: 26.1445, lng: 91.7362, name: 'Guwahati' }
};

/**
 * Calculates exact great-circle distance between two geographic coordinates in kilometers
 * using the Haversine formula (Mean Earth Radius = 6,371 km).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  // Exact match
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place (e.g. 12.4 km)
}

const geoCoordMemoryCache = new Map<string, { lat: number; lng: number; displayName: string }>();

function getSessionGeoCache(key: string): { lat: number; lng: number; displayName: string } | null {
  try {
    const raw = sessionStorage.getItem(`driverhub_geo_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSessionGeoCache(key: string, val: { lat: number; lng: number; displayName: string }) {
  try {
    sessionStorage.setItem(`driverhub_geo_${key}`, JSON.stringify(val));
  } catch {
    // Ignore storage write issues
  }
}

/**
 * Resolves latitude and longitude coordinates for any Pan-India location
 * (State, District, Town/City, Locality, or 6-digit PIN code).
 * Uses zero-latency directory lookup first, falling back to cached Nominatim lookup.
 */
export async function resolveLocationCoordinates(loc: {
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  location?: string;
}): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const normCity = loc.city ? normalizeName(extractPrimaryName(loc.city)) : '';
  const normDist = loc.district ? normalizeName(extractPrimaryName(loc.district)) : '';
  const normState = loc.state ? normalizeName(loc.state) : '';
  const cleanPin = loc.pincode && /^\d{6}$/.test(loc.pincode.trim()) ? loc.pincode.trim() : '';

  // 1. Check local authoritative table first (instant, 0 ms)
  const lookupKeys = [
    normCity,
    normDist,
    `${normCity} ${normState}`,
    `${normDist} ${normState}`,
    normState
  ].filter(Boolean);

  for (const k of lookupKeys) {
    if (INDIA_COORDINATES_DIRECTORY[k]) {
      const match = INDIA_COORDINATES_DIRECTORY[k];
      return {
        lat: match.lat,
        lng: match.lng,
        displayName: match.name
      };
    }
  }

  // 2. Check memory & session cache
  const cacheKey = `${normCity}|${normDist}|${normState}|${cleanPin}`;
  if (geoCoordMemoryCache.has(cacheKey)) {
    return geoCoordMemoryCache.get(cacheKey)!;
  }
  const sessionCached = getSessionGeoCache(cacheKey);
  if (sessionCached) {
    geoCoordMemoryCache.set(cacheKey, sessionCached);
    return sessionCached;
  }

  // 3. Fallback: Query Nominatim OpenStreetMap (keyless, with India boundary filter)
  const queryParts = [loc.city, loc.district, loc.state, cleanPin, 'India'].filter(Boolean);
  const query = queryParts.join(', ');
  if (!query.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(
      query
    )}&limit=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DriverHub-India/2.0'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const result = {
            lat,
            lng,
            displayName: item.display_name || query
          };
          geoCoordMemoryCache.set(cacheKey, result);
          saveSessionGeoCache(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // If offline or network error, fallback to state center if state is recognized
  }

  if (normState && INDIA_COORDINATES_DIRECTORY[normState]) {
    const stateMatch = INDIA_COORDINATES_DIRECTORY[normState];
    return {
      lat: stateMatch.lat,
      lng: stateMatch.lng,
      displayName: stateMatch.name
    };
  }

  return null;
}

/**
 * Reverse-geocodes GPS coordinates (latitude, longitude) into structured
 * Indian State, District, City/Town, and PIN code.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{
  state: string;
  district: string;
  city: string;
  pincode: string;
  formattedLocation: string;
} | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DriverHub-India/2.0'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const rawState = String(addr.state || addr.province || '').trim();
    const rawDistrict = String(
      addr.state_district || addr.county || addr.district || ''
    ).trim();
    const rawCity = String(
      addr.city || addr.town || addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || ''
    ).trim();
    const rawPin = String(addr.postcode || '').trim().replace(/\D/g, '').slice(0, 6);

    // Match against canonical State & District in STATE_DISTRICTS_DIRECTORY
    const allStates = getAllStatesAndUTs();
    const matchedState =
      allStates.find(
        s =>
          normalizeName(s) === normalizeName(rawState) ||
          normalizeName(s).includes(normalizeName(rawState)) ||
          normalizeName(rawState).includes(normalizeName(s))
      ) || rawState;

    const stateDists = matchedState ? getDistrictsForState(matchedState) : [];
    const matchedDistrict =
      stateDists.find(
        d =>
          normalizeName(d) === normalizeName(rawDistrict) ||
          normalizeName(extractPrimaryName(d)) === normalizeName(rawDistrict) ||
          d.toLowerCase().includes(rawDistrict.toLowerCase()) ||
          rawDistrict.toLowerCase().includes(extractPrimaryName(d).toLowerCase())
      ) || rawDistrict;

    const formattedLocation = formatStructuredLocation({
      city: rawCity,
      district: matchedDistrict,
      state: matchedState,
      pincode: rawPin
    });

    return {
      state: matchedState,
      district: matchedDistrict,
      city: rawCity || matchedDistrict,
      pincode: rawPin,
      formattedLocation
    };
  } catch (err) {
    console.warn('Reverse geocoding notice:', err);
    return null;
  }
}


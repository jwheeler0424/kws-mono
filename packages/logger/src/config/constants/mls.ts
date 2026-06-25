export const RESOURCE_NAMING = {
  Property: {
    ExpandableResources: ['Media', 'Rooms', 'UnitTypes'],
    Description: 'Property Resource. This resource contains all listings for sale or lease.',
  },
  Member: {
    ExpandableResources: ['Media'],
    Description: 'Member Resource',
  },
  Office: {
    ExpandableResources: ['Media'],
    Description: 'Office Resource',
  },

  OpenHouse: {
    ExpandableResources: [],
    Description: 'OpenHouse Resource',
  },

  Lookup: {
    ExpandableResources: [],
    Description: 'Lookup Resource',
  },
} as const;

export const RESOURCE = Object.keys(RESOURCE_NAMING) as (keyof typeof RESOURCE_NAMING)[];

export const ORIGINATING_SYSTEM = {
  actris: 'ACTRIS MLS',
  carolina: 'Canopy MLS',
  eciar: 'East Central Iowa Multiple Listing Service Inc.',
  flinthills: 'Flint Hills MLS',
  scranton: 'Greater Scranton Board of REALTORS®',
  nira: 'Northwest Indiana REALTORS® Association (formerly GNIAR)',
  hmls: 'Heartland Multiple Listing Service, Inc.',
  highland: 'Highland Lakes Association of REALTORS®',
  ires: 'IRES MLS',
  irmls: 'Indiana Regional MLS',
  lbor: 'Lawrence Board of REALTORS®',
  lsar: 'Lake Superior Area REALTORS®',
  lascruces: 'Southern New Mexico MLS',
  maris2: 'MARIS MLS (NEW)',
  mfrmls: 'My Florida Regional MLS DBA Stellar MLS',
  mibor: 'MIBOR REALTOR® Association',
  mlsok: 'MLSOK',
  mred: 'MRED Midwest Real Estate Data',
  neirbr: 'Northeast Iowa Regional Board of REALTORS®',
  nocoast: 'NoCoast MLS',
  northstar: 'NorthstarMLS®',
  nwmls: 'Northwest MLS',
  onekey2: 'OneKey® MLS',
  paar: 'Prescott Area Association of REALTORS®',
  pacmls: 'PACMLS',
  pikewayne: 'Pike/Wayne Association of REALTORS®',
  prairie: 'Mid-Kansas MLS (Prairie Land REALTORS®)',
  ranw: 'REALTOR® Association Northeast Wisconsin',
  realtrac: 'RealTracs',
  rt: 'RT RealTracs',
  recolorado: 'REcolorado',
  rmlsa: 'RMLS Alliance',
  rrar: 'Reelfoot Regional Association of REALTORS®',
  sarmls: 'Spokane Association of REALTORS®',
  sckansas: 'South Central Kansas MLS',
  somo: 'Southern Missouri Regional MLS (SOMO)',
  spartanburg: 'Spartanburg Board of REALTORS®',
  sunflower: 'Sunflower MLS',
} as const;

export const ORIGINATING_SYSTEM_NAMES = Object.keys(
  ORIGINATING_SYSTEM,
) as (keyof typeof ORIGINATING_SYSTEM)[];

export const STANDARD_STATUS_ENUM = {
  Active: { value: 1, standardName: 'Active' },
  ActiveUnderContract: { value: 2, standardName: 'Active Under Contract' },
  Canceled: { value: 3, standardName: 'Canceled' },
  Closed: { value: 4, standardName: 'Closed' },
  ComingSoon: { value: 5, standardName: 'Coming Soon' },
  Delete: { value: 6, standardName: 'Delete' },
  Expired: { value: 7, standardName: 'Expired' },
  Hold: { value: 8, standardName: 'Hold' },
  Incomplete: { value: 9, standardName: 'Incomplete' },
  Pending: { value: 10, standardName: 'Pending' },
  Withdrawn: { value: 11, standardName: 'Withdrawn' },
} as const;

export const STANDARD_STATUS = Object.keys(
  STANDARD_STATUS_ENUM,
) as (keyof typeof STANDARD_STATUS_ENUM)[];

export const PROPERTY_TYPE_ENUM = {
  BusinessOpportunity: { value: 1, standardName: 'Business Opportunity' },
  CommercialLease: { value: 2, standardName: 'Commercial Lease' },
  CommercialSale: { value: 3, standardName: 'Commercial Sale' },
  Farm: { value: 4, standardName: 'Farm' },
  Land: { value: 5, standardName: 'Land' },
  ManufacturedInPark: { value: 6, standardName: 'Manufactured In Park' },
  Residential: { value: 7, standardName: 'Residential' },
  ResidentialIncome: { value: 8, standardName: 'Residential Income' },
  ResidentialLease: { value: 9, standardName: 'Residential Lease' },
} as const;

export const PROPERTY_TYPE = Object.keys(PROPERTY_TYPE_ENUM) as (keyof typeof PROPERTY_TYPE_ENUM)[];

export const KEY_FIELDS = {
  ACT: ORIGINATING_SYSTEM.actris,
  CAR: ORIGINATING_SYSTEM.carolina,
  ECR: ORIGINATING_SYSTEM.eciar,
  FHR: ORIGINATING_SYSTEM.flinthills,
  GSB: ORIGINATING_SYSTEM.scranton,
  NRA: ORIGINATING_SYSTEM.nira,
  HMS: ORIGINATING_SYSTEM.hmls,
  HLM: ORIGINATING_SYSTEM.highland,
  IRE: ORIGINATING_SYSTEM.ires,
  IRM: ORIGINATING_SYSTEM.irmls,
  LCN: ORIGINATING_SYSTEM.lascruces,
  LBR: ORIGINATING_SYSTEM.lbor,
  LSA: ORIGINATING_SYSTEM.lsar,
  MIS: ORIGINATING_SYSTEM.maris2,
  MBR: ORIGINATING_SYSTEM.mibor,
  MFR: ORIGINATING_SYSTEM.mfrmls,
  MRD: ORIGINATING_SYSTEM.mred,
  NBR: ORIGINATING_SYSTEM.neirbr,
  NOC: ORIGINATING_SYSTEM.nocoast,
  NST: ORIGINATING_SYSTEM.northstar,
  NWM: ORIGINATING_SYSTEM.nwmls,
  OKC: ORIGINATING_SYSTEM.mlsok,
  KEY: ORIGINATING_SYSTEM.onekey2,
  PAR: ORIGINATING_SYSTEM.paar,
  PAC: ORIGINATING_SYSTEM.pacmls,
  PWB: ORIGINATING_SYSTEM.pikewayne,
  PRA: ORIGINATING_SYSTEM.prairie,
  RAN: ORIGINATING_SYSTEM.ranw,
  REC: ORIGINATING_SYSTEM.recolorado,
  RMA: ORIGINATING_SYSTEM.rmlsa,
  RRA: ORIGINATING_SYSTEM.rrar,
  RTC: ORIGINATING_SYSTEM.rt,
  SAR: ORIGINATING_SYSTEM.sarmls,
  SCK: ORIGINATING_SYSTEM.sckansas,
  SOM: ORIGINATING_SYSTEM.somo,
  SPN: ORIGINATING_SYSTEM.spartanburg,
  SUN: ORIGINATING_SYSTEM.sunflower,
} as const;

export const KEY_FIELDS_PREFIX = Object.keys(KEY_FIELDS) as (keyof typeof KEY_FIELDS)[];

export const LOCAL_FIELDS = {
  ACT_: ORIGINATING_SYSTEM.actris,
  CAR_: ORIGINATING_SYSTEM.carolina,
  ECR_: ORIGINATING_SYSTEM.eciar,
  FHR_: ORIGINATING_SYSTEM.flinthills,
  GSB_: ORIGINATING_SYSTEM.scranton,
  NRA_: ORIGINATING_SYSTEM.nira,
  HMS_: ORIGINATING_SYSTEM.hmls,
  HLM_: ORIGINATING_SYSTEM.highland,
  IRE_: ORIGINATING_SYSTEM.ires,
  IRM_: ORIGINATING_SYSTEM.irmls,
  LCN_: ORIGINATING_SYSTEM.lascruces,
  LBR_: ORIGINATING_SYSTEM.lbor,
  LSA_: ORIGINATING_SYSTEM.lsar,
  MIS_: ORIGINATING_SYSTEM.maris2,
  MBR_: ORIGINATING_SYSTEM.mibor,
  MFR_: ORIGINATING_SYSTEM.mfrmls,
  MRD_: ORIGINATING_SYSTEM.mred,
  NBR_: ORIGINATING_SYSTEM.neirbr,
  NOC_: ORIGINATING_SYSTEM.nocoast,
  NST_: ORIGINATING_SYSTEM.northstar,
  NWM_: ORIGINATING_SYSTEM.nwmls,
  OKC_: ORIGINATING_SYSTEM.mlsok,
  KEY_: ORIGINATING_SYSTEM.onekey2,
  PAR_: ORIGINATING_SYSTEM.paar,
  PAC_: ORIGINATING_SYSTEM.pacmls,
  PWB_: ORIGINATING_SYSTEM.pikewayne,
  PRA_: ORIGINATING_SYSTEM.prairie,
  RAN_: ORIGINATING_SYSTEM.ranw,
  REC_: ORIGINATING_SYSTEM.recolorado,
  RMA_: ORIGINATING_SYSTEM.rmlsa,
  RRA_: ORIGINATING_SYSTEM.rrar,
  RTC_: ORIGINATING_SYSTEM.rt,
  SAR_: ORIGINATING_SYSTEM.sarmls,
  SCK_: ORIGINATING_SYSTEM.sckansas,
  SOM_: ORIGINATING_SYSTEM.somo,
  SPN_: ORIGINATING_SYSTEM.spartanburg,
  SUN_: ORIGINATING_SYSTEM.sunflower,
} as const;

export const LOCAL_FIELDS_PREFIX = Object.keys(LOCAL_FIELDS) as (keyof typeof LOCAL_FIELDS)[];

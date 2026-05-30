import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');
const fundamentalsPath = join(dataDir, 'fundamentals.json');
const nodeScoresPath = join(dataDir, 'node_scores.json');

const BVP = 'https://www.bvp.com/atlas/roadmap-the-ai-data-center-stack';
const OECD = 'https://www.oecd.org/en/publications/competition-in-artificial-intelligence-infrastructure_623d1874-en/full-report/component-5.html';
const MCKINSEY = 'https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-cost-of-compute-a-7-trillion-dollar-race-to-scale-data-centers';

const CLUSTERS = [
  {
    id: 'raw_materials',
    label: 'Raw Materials & Mining',
    shortLabel: 'Raw Mat',
    order: 0,
    desc: 'Upstream producers of copper, aluminum, lithium, rare earths, and other industrial metals and materials feeding power equipment, semiconductors, and infrastructure.',
  },
  {
    id: 'utilities_power',
    label: 'Utilities & Grid',
    shortLabel: 'Grid',
    order: 1,
    desc: 'Regulated utilities and IPPs providing generation and transmission capacity; includes grid operators whose interconnect queues and grid upgrades gate AI DC buildout.',
  },
  {
    id: 'power_electrical',
    label: 'Power & Electrical Equipment',
    shortLabel: 'Power Eq',
    order: 2,
    desc: 'Transformers, switchgear, breakers, MV/LV gear, UPS, busways; the middle mile of power from substation to rack. Structural bottleneck due to long lead times.',
  },
  {
    id: 'cooling_thermal',
    label: 'Cooling & Thermal',
    shortLabel: 'Cooling',
    order: 3,
    desc: 'Liquid cooling, chillers, heat exchangers, air handling, and thermal management systems needed for high-density AI racks.',
  },
  {
    id: 'data_center_infra',
    label: 'Data Center Infrastructure',
    shortLabel: 'DC Infra',
    order: 4,
    desc: 'Colocation REITs and dedicated DC operators providing buildings, campuses, and basic MEP infrastructure for hyperscalers.',
  },
  {
    id: 'semi_fabrication',
    label: 'Semiconductor Fabrication',
    shortLabel: 'Fabs',
    order: 5,
    desc: 'Foundries and IDMs that manufacture logic and memory wafers (advanced and trailing-edge) for AI servers.',
  },
  {
    id: 'semi_equipment',
    label: 'Semi Equipment & Lithography',
    shortLabel: 'Semi Eq',
    order: 6,
    desc: 'Tool makers (EUV, deposition, etch, metrology, test) required to expand wafer capacity; often the upstream constraint on fab output.',
  },
  {
    id: 'packaging_osat',
    label: 'Advanced Packaging & OSAT',
    shortLabel: 'Packaging',
    order: 7,
    desc: 'OSATs and in-house advanced packaging (CoWoS, InFO, HBM stacking, 2.5D/3D) that assemble dies into usable packages for GPUs, memory, and key ICs.',
  },
  {
    id: 'memory_storage',
    label: 'Memory & Storage',
    shortLabel: 'Memory',
    order: 8,
    desc: 'DRAM, HBM, NAND, SSD/HDD vendors and storage systems used in AI servers and data centers. HBM is increasingly a binding constraint on GPU shipments.',
  },
  {
    id: 'ai_accel_compute',
    label: 'AI Accelerators & Compute',
    shortLabel: 'AI Compute',
    order: 9,
    desc: 'GPUs and AI accelerators plus closely linked custom AI ASICs (training/inference), including key accelerator IP vendors.',
  },
  {
    id: 'networking_optical',
    label: 'Networking & Optical',
    shortLabel: 'Networking',
    order: 10,
    desc: 'Data-center networking: switches, NICs, copper/optical interconnect, transceivers used in AI clusters and DCI.',
  },
  {
    id: 'contract_manufacturing',
    label: 'Contract Manufacturing (EMS)',
    shortLabel: 'EMS',
    order: 11,
    desc: 'EMS/ODM/CMs assembling servers, racks, and sometimes full systems (including white box for hyperscalers).',
  },
  {
    id: 'hyperscaler_cloud',
    label: 'Hyperscaler & Cloud Platforms',
    shortLabel: 'Hyperscaler',
    order: 12,
    desc: 'Hyperscale cloud providers and large internet platforms building and operating AI data centers and exposing compute, storage, and platform services.',
  },
  {
    id: 'ai_model_labs',
    label: 'AI Model Labs',
    shortLabel: 'Model Labs',
    order: 13,
    desc: 'Frontier and leading model/API providers training large models and selling access via APIs and platforms, independent (or semi-independent) of hyperscalers.',
  },
  {
    id: 'enterprise_software',
    label: 'Enterprise Software & SaaS',
    shortLabel: 'Enterprise',
    order: 14,
    desc: 'Horizontal and vertical SaaS platforms embedding AI into workflows (CRM, ERP, analytics, observability, etc.).',
  },
  {
    id: 'digital_advertising',
    label: 'Digital Advertising & Media',
    shortLabel: 'Ads',
    order: 15,
    desc: 'Online ad platforms and related measurement/optimization players monetizing engagement and attention, increasingly with AI-driven targeting and creative.',
  },
  {
    id: 'industrial_automation',
    label: 'Industrial & Automation',
    shortLabel: 'Industrial',
    order: 16,
    desc: 'Industrial automation / building automation vendors, plus DC-adjacent automation (facility controls, smart manufacturing, industrial AI).',
  },
];

/** Cluster-level score baselines (0–100); companies jitter around these. */
const CLUSTER_SCORE_BASELINES = {
  raw_materials: { value: 38, importance: 55, pricing: 42, subst: 45, capital: 50, central: 52 },
  utilities_power: { value: 48, importance: 72, pricing: 55, subst: 35, capital: 78, central: 70 },
  power_electrical: { value: 62, importance: 78, pricing: 68, subst: 40, capital: 65, central: 74 },
  cooling_thermal: { value: 58, importance: 74, pricing: 62, subst: 42, capital: 60, central: 68 },
  data_center_infra: { value: 60, importance: 70, pricing: 58, subst: 45, capital: 72, central: 66 },
  semi_fabrication: { value: 65, importance: 80, pricing: 60, subst: 38, capital: 82, central: 76 },
  semi_equipment: { value: 82, importance: 85, pricing: 75, subst: 28, capital: 70, central: 80 },
  packaging_osat: { value: 70, importance: 78, pricing: 65, subst: 35, capital: 68, central: 74 },
  memory_storage: { value: 84, importance: 88, pricing: 72, subst: 32, capital: 75, central: 82 },
  ai_accel_compute: { value: 90, importance: 92, pricing: 85, subst: 30, capital: 55, central: 88 },
  networking_optical: { value: 68, importance: 76, pricing: 65, subst: 40, capital: 52, central: 72 },
  contract_manufacturing: { value: 35, importance: 58, pricing: 38, subst: 55, capital: 45, central: 55 },
  hyperscaler_cloud: { value: 86, importance: 90, pricing: 70, subst: 42, capital: 88, central: 90 },
  ai_model_labs: { value: 80, importance: 82, pricing: 68, subst: 45, capital: 50, central: 78 },
  enterprise_software: { value: 72, importance: 75, pricing: 62, subst: 50, capital: 40, central: 70 },
  digital_advertising: { value: 78, importance: 78, pricing: 70, subst: 48, capital: 42, central: 72 },
  industrial_automation: { value: 45, importance: 58, pricing: 52, subst: 50, capital: 48, central: 54 },
};

function jitter(base, spread = 8) {
  return Math.min(100, Math.max(0, base + (Math.random() * spread * 2 - spread)));
}

function safeReadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeTicker(t) {
  return String(t ?? '').trim().toUpperCase();
}

function computeClusterFundamentals(clusterId, companyNodes) {
  const rows = companyNodes
    .filter((n) => n.clusterId === clusterId)
    .filter((n) => !(Array.isArray(n.tags) && n.tags.includes('illustrative')))
    .map((n) => n.fundamentals)
    .filter(Boolean);

  const pes = rows.map((r) => r.pe).filter((x) => Number.isFinite(x));
  const revs = rows.map((r) => r.revenueTTM).filter((x) => Number.isFinite(x));
  const sampleSize = Math.max(pes.length, revs.length);

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined);
  const sum = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) : undefined);

  return {
    avgPe: avg(pes),
    avgRevenueTTM: avg(revs),
    totalRevenueTTM: sum(revs),
    sampleSize: sampleSize || undefined,
  };
}

function scoresFromBaseline(baseline) {
  return {
    importanceScore: jitter(baseline.importance, 6),
    pricingPowerScore: jitter(baseline.pricing, 6),
    substitutabilityScore: jitter(baseline.subst, 6),
    capitalIntensityScore: jitter(baseline.capital, 6),
    valueCaptureScore: jitter(baseline.value, 6),
    centralityScore: jitter(baseline.central, 6),
  };
}

const SCORE_KEYS = [
  'importanceScore',
  'pricingPowerScore',
  'substitutabilityScore',
  'capitalIntensityScore',
  'valueCaptureScore',
  'centralityScore',
];

function scoresForNode(nodeId, researchScores, baseline) {
  const fromResearch = researchScores?.byNodeId?.[nodeId];
  if (fromResearch) {
    const out = {};
    for (const k of SCORE_KEYS) {
      if (typeof fromResearch[k] === 'number') out[k] = fromResearch[k];
    }
    if (Object.keys(out).length > 0) return out;
  }
  return scoresFromBaseline(baseline);
}

/**
 * @typedef {{ ticker: string, name: string, desc: string, roles?: string[], illustrative?: boolean }} CompanyDef
 */

/** @type {Record<string, CompanyDef[]>} */
const COMPANIES_BY_CLUSTER = {
  raw_materials: [
    { ticker: 'FCX', name: 'Freeport-McMoRan', desc: 'Copper mining; AI power and interconnect demand driver.' },
    { ticker: 'SCCO', name: 'Southern Copper', desc: 'Major copper producer exposed to electrification.' },
    { ticker: 'TECK', name: 'Teck Resources', desc: 'Diversified miner with copper growth projects.' },
    { ticker: 'RIO', name: 'Rio Tinto', desc: 'Global miner; copper and aluminum for infrastructure.' },
    { ticker: 'BHP', name: 'BHP Group', desc: 'Diversified; copper and energy transition metals.' },
    { ticker: 'MP', name: 'MP Materials', desc: 'Rare earth materials for motors and generators.' },
    { ticker: 'AA', name: 'Alcoa', desc: 'Aluminum supply for enclosures and busways.' },
    { ticker: 'SQM', name: 'SQM', desc: 'Lithium supply for UPS and grid storage.' },
    { ticker: 'ALB', name: 'Albemarle', desc: 'Lithium and bromine specialties.' },
  ],
  utilities_power: [
    { ticker: 'NEE', name: 'NextEra Energy', desc: 'Renewables and regulated utility; power for campuses.' },
    { ticker: 'DUK', name: 'Duke Energy', desc: 'Southeast utility with data center load growth.' },
    { ticker: 'SO', name: 'Southern Company', desc: 'Regulated utility in high-growth power markets.' },
    { ticker: 'ENPH', name: 'Enphase Energy', desc: 'Distributed solar and storage inverters.' },
    { ticker: 'FSLR', name: 'First Solar', desc: 'Utility-scale solar module manufacturer.' },
    { ticker: 'CEG', name: 'Constellation Energy', desc: 'Nuclear and clean power for 24/7 load.' },
    { ticker: 'VST', name: 'Vistra', desc: 'Power generation and retail in ERCOT/PJM.' },
    { ticker: 'AES', name: 'AES Corporation', desc: 'Global power platform and renewables.' },
  ],
  power_electrical: [
    { ticker: 'ETN', name: 'Eaton', desc: 'Power distribution, UPS, and electrical gear.', roles: ['power_electrical', 'industrial_automation'] },
    { ticker: 'GEV', name: 'GE Vernova', desc: 'Gas turbines, grid equipment, transformers.' },
    { ticker: 'HUBB', name: 'Hubbell', desc: 'Electrical components and grid solutions.' },
    { ticker: 'ABB', name: 'ABB Ltd', desc: 'Electrification and automation for data centers.', roles: ['power_electrical', 'industrial_automation'] },
    { ticker: 'SIE', name: 'Siemens', desc: 'Grid, building tech, and industrial electrification.', roles: ['power_electrical', 'industrial_automation'] },
    { ticker: 'NVT', name: 'nVent Electric', desc: 'Enclosures, busbars, and cooling interfaces.' },
    { ticker: 'POWL', name: 'Powell Industries', desc: 'Custom electrical equipment and switchgear.' },
    { ticker: 'EMR', name: 'Emerson Electric', desc: 'Power and thermal management systems.', roles: ['power_electrical', 'industrial_automation'] },
  ],
  cooling_thermal: [
    { ticker: 'VRT', name: 'Vertiv', desc: 'Thermal management and critical power for AI racks.' },
    { ticker: 'JCI', name: 'Johnson Controls', desc: 'Building HVAC and cooling systems.' },
    { ticker: 'TT', name: 'Trane Technologies', desc: 'Commercial HVAC and chillers.' },
    { ticker: 'LII', name: 'Lennox International', desc: 'Climate control equipment.' },
    { ticker: 'MOD', name: 'Modine Manufacturing', desc: 'Thermal management components.' },
  ],
  data_center_infra: [
    { ticker: 'EQIX', name: 'Equinix', desc: 'Interconnection-focused colocation REIT.' },
    { ticker: 'DLR', name: 'Digital Realty', desc: 'Hyperscale and enterprise colocation.' },
    { ticker: 'AMT', name: 'American Tower', desc: 'Tower and edge data infrastructure.' },
    { ticker: 'IRM', name: 'Iron Mountain', desc: 'Storage and emerging data center footprint.' },
    {
      ticker: 'CONE',
      name: 'CyrusOne',
      desc: 'Colocation operator (private post-KKR/GIP; illustrative node).',
      illustrative: true,
    },
  ],
  semi_fabrication: [
    { ticker: 'TSM', name: 'TSMC', desc: 'Dominant advanced foundry for AI accelerators.' },
    {
      ticker: 'INTC',
      name: 'Intel',
      desc: 'IDM and foundry aspirant for AI and server CPUs.',
      roles: ['semi_fabrication', 'ai_accel_compute'],
    },
    { ticker: 'GFS', name: 'GlobalFoundries', desc: 'Specialty and mature node manufacturing.' },
    { ticker: 'UMC', name: 'UMC', desc: 'Taiwan foundry for mixed-signal and mature nodes.' },
    { ticker: 'SSNLF', name: 'Samsung Electronics', desc: 'Memory and logic foundry competitor.' },
  ],
  semi_equipment: [
    { ticker: 'ASML', name: 'ASML', desc: 'EUV monopoly for leading-edge nodes.' },
    { ticker: 'AMAT', name: 'Applied Materials', desc: 'Deposition and etch breadth.' },
    { ticker: 'LRCX', name: 'Lam Research', desc: 'Etch and clean for advanced nodes.' },
    { ticker: 'KLAC', name: 'KLA Corporation', desc: 'Process control and inspection.' },
    { ticker: 'ONTO', name: 'Onto Innovation', desc: 'Metrology and lithography overlay.' },
    { ticker: 'TER', name: 'Teradyne', desc: 'Test equipment for advanced packages.' },
  ],
  packaging_osat: [
    { ticker: 'AMKR', name: 'Amkor Technology', desc: 'Large OSAT; advanced packaging for AI devices.' },
    { ticker: 'ASX', name: 'ASE Technology', desc: "World's largest OSAT; CoWoS and advanced packaging." },
    { ticker: 'JCET', name: 'JCET Group', desc: 'Large OSAT; packaging for logic and memory.' },
    { ticker: 'CAMT', name: 'Camtek', desc: 'Inspection/metrology for advanced packaging.' },
  ],
  memory_storage: [
    { ticker: 'MU', name: 'Micron Technology', desc: 'HBM and DRAM for AI servers.' },
    { ticker: '000660.KS', name: 'SK hynix', desc: 'HBM leader supplying accelerators.' },
    { ticker: 'WDC', name: 'Western Digital', desc: 'NAND and storage platforms.' },
    { ticker: 'SNDK', name: 'SanDisk', desc: 'Consumer NAND brand under WDC umbrella.' },
    { ticker: 'STX', name: 'Seagate', desc: 'HDD and mass storage for cold tiers.' },
    { ticker: 'PSTG', name: 'Pure Storage', desc: 'Enterprise flash and AI-ready arrays.' },
    { ticker: 'NTAP', name: 'NetApp', desc: 'Hybrid cloud storage software/hardware.' },
  ],
  ai_accel_compute: [
    { ticker: 'NVDA', name: 'NVIDIA', desc: 'Dominant AI GPU and CUDA ecosystem.' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'MI accelerators and EPYC host CPUs.' },
    {
      ticker: 'AVGO',
      name: 'Broadcom',
      desc: 'Custom AI ASICs and high-speed networking silicon.',
      roles: ['ai_accel_compute', 'networking_optical'],
    },
    { ticker: 'MRVL', name: 'Marvell Technology', desc: 'Custom AI silicon and electro-optics.' },
    { ticker: 'QCOM', name: 'Qualcomm', desc: 'Edge AI and datacenter inference SOCs.' },
    { ticker: 'ARM', name: 'Arm Holdings', desc: 'IP licensing for efficient AI CPUs.' },
  ],
  networking_optical: [
    { ticker: 'ANET', name: 'Arista Networks', desc: 'Dominant AI cluster Ethernet switching.' },
    { ticker: 'CSCO', name: 'Cisco Systems', desc: 'Data center switching and optics.' },
    { ticker: 'COHR', name: 'Coherent', desc: 'Optical components and transceivers.' },
    { ticker: 'LITE', name: 'Lumentum', desc: 'Lasers and optical communications.' },
    { ticker: 'APH', name: 'Amphenol', desc: 'Copper and optical interconnect.' },
    { ticker: 'CIEN', name: 'Ciena', desc: 'Optical transport and DCI.' },
    { ticker: 'JNPR', name: 'Juniper Networks', desc: 'Routing and switching (HPE deal).' },
  ],
  contract_manufacturing: [
    { ticker: 'FLEX', name: 'Flex Ltd', desc: 'EMS for servers and subsystems.' },
    { ticker: 'JBL', name: 'Jabil', desc: 'Contract manufacturing at scale.' },
    { ticker: 'CLS', name: 'Celestica', desc: 'Enterprise and cloud hardware manufacturing.' },
    { ticker: 'FII', name: 'Foxconn Industrial Internet', desc: 'Server and rack assembly.' },
  ],
  hyperscaler_cloud: [
    {
      ticker: 'AMZN',
      name: 'Amazon',
      desc: 'AWS and largest AI capex spender.',
      roles: ['hyperscaler_cloud', 'digital_advertising'],
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft',
      desc: 'Azure, OpenAI partnership, Copilot stack.',
      roles: ['hyperscaler_cloud', 'enterprise_software'],
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet',
      desc: 'GCP, TPU, Gemini, and ads monetization.',
      roles: ['hyperscaler_cloud', 'digital_advertising'],
    },
    {
      ticker: 'META',
      name: 'Meta Platforms',
      desc: 'Llama, ads AI, and massive GPU fleet.',
      roles: ['hyperscaler_cloud', 'digital_advertising'],
    },
    {
      ticker: 'ORCL',
      name: 'Oracle',
      desc: 'OCI GPU cloud growth.',
      roles: ['hyperscaler_cloud', 'enterprise_software'],
    },
    { ticker: 'IBM', name: 'IBM', desc: 'Enterprise hybrid cloud and Watsonx.' },
    { ticker: 'BABA', name: 'Alibaba', desc: 'China cloud and AI investment.' },
    { ticker: 'TCEHY', name: 'Tencent', desc: 'China hyperscaler and gaming AI.' },
  ],
  ai_model_labs: [
    { ticker: 'OPENAI', name: 'OpenAI', desc: 'Frontier models and API monetization (private; illustrative).', illustrative: true },
    { ticker: 'ANTHROPIC', name: 'Anthropic', desc: 'Claude models and enterprise APIs (private; illustrative).', illustrative: true },
    { ticker: 'MISTRAL', name: 'Mistral AI', desc: 'European open and commercial models (private; illustrative).', illustrative: true },
    { ticker: 'XAI', name: 'xAI', desc: 'Grok and Colossus training infrastructure (private; illustrative).', illustrative: true },
    { ticker: 'COHERE', name: 'Cohere', desc: 'Enterprise-focused LLM APIs (private; illustrative).', illustrative: true },
  ],
  enterprise_software: [
    { ticker: 'CRM', name: 'Salesforce', desc: 'CRM and Agentforce AI.' },
    { ticker: 'NOW', name: 'ServiceNow', desc: 'Workflow automation with AI.' },
    { ticker: 'ADBE', name: 'Adobe', desc: 'Creative and document AI.' },
    { ticker: 'WDAY', name: 'Workday', desc: 'HR/finance enterprise AI.' },
    { ticker: 'SNOW', name: 'Snowflake', desc: 'Data cloud for AI pipelines.' },
    { ticker: 'PLTR', name: 'Palantir', desc: 'Gov/commercial AI platforms.' },
    {
      ticker: 'AI',
      name: 'C3.ai',
      desc: 'Enterprise AI application software (not a frontier model lab).',
    },
    { ticker: 'SAP', name: 'SAP', desc: 'ERP embedded AI copilots.' },
    { ticker: 'DDOG', name: 'Datadog', desc: 'Observability for AI workloads.' },
    { ticker: 'MDB', name: 'MongoDB', desc: 'Document DB for AI apps.' },
  ],
  digital_advertising: [
    { ticker: 'TTD', name: 'Trade Desk', desc: 'Programmatic ad infrastructure.' },
    { ticker: 'APP', name: 'AppLovin', desc: 'Mobile ads with ML optimization.' },
    { ticker: 'PINS', name: 'Pinterest', desc: 'Visual discovery ads.' },
    { ticker: 'SNAP', name: 'Snap', desc: 'Short-form ads and AR.' },
  ],
  industrial_automation: [
    { ticker: 'ROK', name: 'Rockwell Automation', desc: 'Factory controls and automation.' },
    { ticker: 'HON', name: 'Honeywell', desc: 'Building and industrial controls.' },
    { ticker: 'SIEGY', name: 'Siemens AG', desc: 'Industrial software and automation (ADR).' },
    { ticker: 'SU.PA', name: 'Schneider Electric', desc: 'Power and building management for facilities and DCs.' },
  ],
};

const clusterEdgeTemplates = [
  {
    source: 'raw_materials',
    target: 'power_electrical',
    edgeType: 'physical_dependency',
    lag: '12-36 months',
    strength: 0.72,
    description: 'Metals and materials are required for transformers, switchgear, and other electrical equipment used to connect data centers to the grid.',
    evidence: [BVP],
  },
  {
    source: 'raw_materials',
    target: 'semi_fabrication',
    edgeType: 'physical_dependency',
    lag: '12-36 months',
    strength: 0.68,
    description: 'Silicon, specialty gases, and metals are core inputs to wafer fabrication.',
    evidence: [OECD],
  },
  {
    source: 'utilities_power',
    target: 'power_electrical',
    edgeType: 'power_flow',
    lag: '12-24 months',
    strength: 0.78,
    description: 'Grid and generation expansion requires new transformers and grid hardware to step and distribute power.',
    evidence: [BVP, MCKINSEY],
  },
  {
    source: 'utilities_power',
    target: 'data_center_infra',
    edgeType: 'power_flow',
    lag: '24-60 months',
    strength: 0.82,
    description: 'Interconnection delays and grid constraints gate bringing new AI data centers online.',
    evidence: [BVP, MCKINSEY],
  },
  {
    source: 'utilities_power',
    target: 'cooling_thermal',
    edgeType: 'power_flow',
    lag: '12-36 months',
    strength: 0.7,
    description: 'Cooling systems for high-density AI racks materially increase power draw and depend on adequate utility supply.',
    evidence: [BVP],
  },
  {
    source: 'power_electrical',
    target: 'data_center_infra',
    edgeType: 'physical_dependency',
    lag: '12-36 months',
    strength: 0.8,
    description: 'Substations, switchgear, and campus power distribution are required before DCs can operate.',
    evidence: [BVP],
  },
  {
    source: 'power_electrical',
    target: 'cooling_thermal',
    edgeType: 'power_flow',
    lag: '0-12 months',
    strength: 0.75,
    description: 'Electrical systems feed chillers, pumps, and liquid cooling; higher rack densities raise cooling power proportionally.',
    evidence: [BVP],
  },
  {
    source: 'cooling_thermal',
    target: 'data_center_infra',
    edgeType: 'physical_dependency',
    lag: '0-12 months',
    strength: 0.76,
    description: 'Adequate thermal systems are necessary for operating data centers safely at AI rack densities.',
    evidence: [BVP],
  },
  {
    source: 'cooling_thermal',
    target: 'ai_accel_compute',
    edgeType: 'physical_dependency',
    lag: '0-12 months',
    strength: 0.74,
    description: 'AI accelerators at high power densities require advanced cooling at rack and chip level.',
    evidence: [BVP],
  },
  {
    source: 'data_center_infra',
    target: 'hyperscaler_cloud',
    edgeType: 'capacity_translation',
    lag: '12-36 months',
    strength: 0.88,
    description: 'Additional DC capacity enables cloud regions and zones; colos and DC REITs enable hyperscaler expansion.',
    evidence: [BVP, MCKINSEY],
  },
  {
    source: 'semi_equipment',
    target: 'semi_fabrication',
    edgeType: 'bottleneck_constraint',
    lag: '18-48 months',
    strength: 0.85,
    description: 'Tool availability and long lead times constrain how quickly fabs can add advanced-node wafer capacity.',
    evidence: [OECD],
  },
  {
    source: 'semi_fabrication',
    target: 'semi_equipment',
    edgeType: 'commercial_flow',
    lag: '6-24 months',
    strength: 0.72,
    description: 'Fabs purchase equipment; capex cycles at fabs drive revenues for tool vendors.',
    evidence: [OECD],
  },
  {
    source: 'semi_fabrication',
    target: 'packaging_osat',
    edgeType: 'capacity_translation',
    lag: '6-24 months',
    strength: 0.83,
    description: 'More wafers require more advanced packaging capacity (CoWoS, 2.5D/3D) to turn them into usable devices.',
    evidence: [OECD],
  },
  {
    source: 'semi_fabrication',
    target: 'memory_storage',
    edgeType: 'capacity_translation',
    lag: '6-24 months',
    strength: 0.8,
    description: 'DRAM/HBM/NAND output depends on wafer capacity.',
    evidence: [OECD],
  },
  {
    source: 'packaging_osat',
    target: 'memory_storage',
    edgeType: 'physical_dependency',
    lag: '3-18 months',
    strength: 0.84,
    description: 'Advanced packaging is needed for HBM stacks and high-performance memory modules.',
    evidence: [OECD],
  },
  {
    source: 'packaging_osat',
    target: 'ai_accel_compute',
    edgeType: 'physical_dependency',
    lag: '3-18 months',
    strength: 0.82,
    description: 'Advanced packaging (HBM-on-package, CoWoS) is required to assemble usable AI accelerators.',
    evidence: [OECD],
  },
  {
    source: 'memory_storage',
    target: 'ai_accel_compute',
    edgeType: 'bottleneck_constraint',
    lag: '6-24 months',
    strength: 0.88,
    description: 'HBM supply is a critical binding constraint on GPU shipments; under-supply caps effective accelerator capacity.',
    evidence: [OECD, MCKINSEY],
  },
  {
    source: 'ai_accel_compute',
    target: 'contract_manufacturing',
    edgeType: 'capacity_translation',
    lag: '3-12 months',
    strength: 0.86,
    description: 'GPU and accelerator chips must be integrated into boards and servers by EMS/ODMs.',
    evidence: [OECD],
  },
  {
    source: 'contract_manufacturing',
    target: 'hyperscaler_cloud',
    edgeType: 'commercial_flow',
    lag: '3-18 months',
    strength: 0.78,
    description: 'EMS/ODMs supply complete servers/racks to hyperscalers and labs, enabling cluster buildouts.',
    evidence: [BVP],
  },
  {
    source: 'ai_accel_compute',
    target: 'networking_optical',
    edgeType: 'data_flow',
    lag: '0-18 months',
    strength: 0.8,
    description: 'Scaling AI clusters increases demand for high-bandwidth switches, NICs, and optical/copper interconnect.',
    evidence: [BVP],
  },
  {
    source: 'networking_optical',
    target: 'contract_manufacturing',
    edgeType: 'physical_dependency',
    lag: '3-18 months',
    strength: 0.7,
    description: 'Network hardware is often assembled by EMS/ODMs alongside servers/racks.',
    evidence: [BVP],
  },
  {
    source: 'networking_optical',
    target: 'hyperscaler_cloud',
    edgeType: 'data_flow',
    lag: '0-18 months',
    strength: 0.76,
    description: 'High-capacity networking and DCI fabric are required for hyperscaler AI cluster operations.',
    evidence: [BVP],
  },
  {
    source: 'networking_optical',
    target: 'ai_model_labs',
    edgeType: 'data_flow',
    lag: '0-18 months',
    strength: 0.68,
    description: 'Frontier labs depend on high-bandwidth interconnect and DCI, especially when spanning colos/hyperscalers.',
    evidence: [BVP],
  },
  {
    source: 'memory_storage',
    target: 'hyperscaler_cloud',
    edgeType: 'capacity_translation',
    lag: '6-24 months',
    strength: 0.74,
    description: 'Additional DRAM/NAND supply is required to populate servers and storage systems backing AI workloads.',
    evidence: [MCKINSEY],
  },
  {
    source: 'hyperscaler_cloud',
    target: 'ai_model_labs',
    edgeType: 'commercial_flow',
    lag: '0-12 months',
    strength: 0.82,
    description: 'Labs rent compute and storage from hyperscalers (or partner with them) for training and serving models.',
    evidence: [BVP],
  },
  {
    source: 'hyperscaler_cloud',
    target: 'enterprise_software',
    edgeType: 'commercial_flow',
    lag: '0-24 months',
    strength: 0.84,
    description: 'SaaS vendors consume cloud GPUs, storage, and managed services to build AI features.',
    evidence: [BVP],
  },
  {
    source: 'hyperscaler_cloud',
    target: 'digital_advertising',
    edgeType: 'revenue_capture',
    lag: '0-36 months',
    strength: 0.8,
    description: 'Hyperscaler AI infrastructure underpins ad ranking, targeting, and measurement; ad revenue is a major monetization endpoint.',
    evidence: [BVP, MCKINSEY],
  },
  {
    source: 'ai_model_labs',
    target: 'enterprise_software',
    edgeType: 'data_flow',
    lag: '0-12 months',
    strength: 0.86,
    description: 'Enterprise SaaS integrates APIs and models (embeddings, copilots, agents) from labs.',
    evidence: [BVP],
  },
  {
    source: 'ai_model_labs',
    target: 'digital_advertising',
    edgeType: 'revenue_capture',
    lag: '0-24 months',
    strength: 0.72,
    description: 'Models improve ad relevance, creative generation, and campaign optimization for ad platforms.',
    evidence: [BVP],
  },
  {
    source: 'ai_accel_compute',
    target: 'ai_model_labs',
    edgeType: 'commercial_flow',
    lag: '0-24 months',
    strength: 0.7,
    description: 'Labs procure GPUs/accelerators directly (or via cloud), driving demand for accelerator vendors.',
    evidence: [BVP],
  },
  {
    source: 'enterprise_software',
    target: 'digital_advertising',
    edgeType: 'revenue_capture',
    lag: '0-24 months',
    strength: 0.48,
    description: 'Some enterprise tools feed marketing automation and CDPs that influence ad spend (weaker link).',
    evidence: [BVP],
  },
  {
    source: 'industrial_automation',
    target: 'power_electrical',
    edgeType: 'commercial_flow',
    lag: '0-24 months',
    strength: 0.65,
    description: 'Industrial automation vendors rely on electrical gear and sometimes co-sell integrated power + control solutions.',
    evidence: [BVP],
  },
];

const seen = new Set();
const companyNodes = [];
const fundamentalsJson = safeReadJson(fundamentalsPath);
const byTicker = fundamentalsJson?.byTicker ?? {};
const fundamentalsAsOf = fundamentalsJson?.asOf;
const fundamentalsSource = fundamentalsJson?.source;
const researchScores = safeReadJson(nodeScoresPath);
for (const cluster of CLUSTERS) {
  const list = COMPANIES_BY_CLUSTER[cluster.id] ?? [];
  const baseline = CLUSTER_SCORE_BASELINES[cluster.id];
  for (const co of list) {
    const id = co.ticker.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = [cluster.id];
    if (co.illustrative) tags.push('illustrative');
    const t = normalizeTicker(co.ticker);
    const f = byTicker?.[t];
    const fundamentals =
      f && !f.error
        ? {
            pe: typeof f.pe === 'number' ? f.pe : undefined,
            revenueTTM: typeof f.revenueTTM === 'number' ? f.revenueTTM : undefined,
            marketCap: typeof f.marketCap === 'number' ? f.marketCap : undefined,
            currency: f.currency ? String(f.currency) : undefined,
            source: fundamentalsSource ? String(fundamentalsSource) : undefined,
            asOf: fundamentalsAsOf ? String(fundamentalsAsOf) : undefined,
          }
        : undefined;
    companyNodes.push({
      id,
      label: co.name,
      shortLabel: co.ticker,
      nodeType: 'company',
      clusterId: cluster.id,
      isCluster: false,
      ticker: co.ticker,
      description: co.desc,
      roles: co.roles ?? [],
      fundamentals,
      timeToScale: 'N/A',
      geography: 'Global',
      exampleCompanies: [],
      evidence: co.illustrative
        ? [`Illustrative / private entity mapped to ${cluster.label}.`]
        : [`Public company mapped to ${cluster.label} cluster.`],
      tags,
      relatedMetrics: { marketCapTier: co.ticker.length < 6 ? 'large' : 'mid' },
      ...scoresForNode(id, researchScores, baseline),
    });
  }
}

const clusterNodes = CLUSTERS.map((c) => {
  const baseline = CLUSTER_SCORE_BASELINES[c.id];
  const agg = computeClusterFundamentals(c.id, companyNodes);
  return {
    id: c.id,
    label: c.label,
    shortLabel: c.shortLabel,
    nodeType: 'cluster',
    clusterId: c.id,
    isCluster: true,
    description: c.desc,
    roles: [],
    fundamentals:
      agg.sampleSize || (fundamentalsSource && fundamentalsAsOf)
        ? {
            ...agg,
            source: fundamentalsSource ? String(fundamentalsSource) : undefined,
            asOf: fundamentalsAsOf ? String(fundamentalsAsOf) : undefined,
          }
        : undefined,
    timeToScale: 'N/A',
    geography: 'Global',
    exampleCompanies: [],
    evidence: [`Industry cluster: ${c.label}`],
    tags: ['cluster'],
    relatedMetrics: { valueChainOrder: c.order },
    ...scoresForNode(c.id, researchScores, baseline),
  };
});

const edges = clusterEdgeTemplates.map((t, i) => ({
  id: `ce_${i}`,
  source: t.source,
  target: t.target,
  edgeType: t.edgeType,
  strength: t.strength,
  directionality: 'directed',
  lag: t.lag,
  description: t.description,
  flowType: 'inter_cluster',
  evidence: t.evidence,
}));

const scenarios = [
  {
    id: 'base',
    label: 'Base AI Buildout',
    description: 'Broad capex cycle; clusters along the chain expand in parallel.',
    nodeScoreOverrides: {},
    highlightNodeIds: [],
    highlightEdgeTypes: [],
  },
];

const curatedPaths = [
  {
    id: 'p1',
    label: 'Raw Materials → Hyperscaler',
    startNodeId: 'raw_materials',
    endNodeId: 'hyperscaler_cloud',
    description: 'Copper and inputs through infra to cloud capex.',
  },
  {
    id: 'p2',
    label: 'Semi Equipment → AI Compute',
    startNodeId: 'semi_equipment',
    endNodeId: 'ai_accel_compute',
    description: 'Tooling and packaging enabling GPU shipments.',
  },
  {
    id: 'p3',
    label: 'Hyperscaler → Digital Ads',
    startNodeId: 'hyperscaler_cloud',
    endNodeId: 'digital_advertising',
    description: 'Cloud AI investment monetized via ads platforms.',
  },
];

const allNodes = [...clusterNodes, ...companyNodes];
console.log(`Clusters: ${clusterNodes.length}, Companies: ${companyNodes.length}, Total: ${allNodes.length}, Edges: ${edges.length}`);

mkdirSync(dataDir, { recursive: true });
const clustersOut = CLUSTERS.map((c) => {
  const agg = computeClusterFundamentals(c.id, companyNodes);
  return {
    id: c.id,
    label: c.label,
    shortLabel: c.shortLabel,
    order: c.order,
    desc: c.desc,
    fundamentals:
      agg.sampleSize || (fundamentalsSource && fundamentalsAsOf)
        ? {
            ...agg,
            source: fundamentalsSource ? String(fundamentalsSource) : undefined,
            asOf: fundamentalsAsOf ? String(fundamentalsAsOf) : undefined,
          }
        : undefined,
  };
});
writeFileSync(join(dataDir, 'clusters.json'), JSON.stringify(clustersOut, null, 2));
writeFileSync(join(dataDir, 'nodes.json'), JSON.stringify(allNodes, null, 2));
writeFileSync(join(dataDir, 'edges.json'), JSON.stringify(edges, null, 2));
writeFileSync(join(dataDir, 'scenarios.json'), JSON.stringify(scenarios, null, 2));
writeFileSync(join(dataDir, 'curatedPaths.json'), JSON.stringify(curatedPaths, null, 2));

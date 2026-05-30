import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');

const LAYERS = [
  'RawInputs', 'GridPower', 'Facilities', 'Cooling', 'Semiconductor',
  'Packaging', 'Compute', 'Networking', 'Cloud', 'Model', 'Application', 'Monetization',
];

function scores(base) {
  const jitter = (n, v = 8) => Math.min(100, Math.max(0, n + (Math.random() * v * 2 - v)));
  return {
    importanceScore: jitter(base.importance ?? 50),
    bottleneckScore: jitter(base.bottleneck ?? 40),
    pricingPowerScore: jitter(base.pricing ?? 45),
    substitutabilityScore: jitter(base.subst ?? 55),
    capitalIntensityScore: jitter(base.capital ?? 50),
    valueCaptureScore: jitter(base.value ?? 45),
    centralityScore: jitter(base.central ?? 50),
  };
}

const nodeDefs = [
  // Raw Inputs
  { id: 'copper', label: 'Copper', shortLabel: 'Cu', layer: 'RawInputs', nodeType: 'material', desc: 'Primary conductor for power distribution, busbars, and high-speed DAC interconnect within facilities.', companies: ['FCX', 'SCCO'], exposure: { FCX: 0.7, SCCO: 0.6 }, tags: ['commodity', 'metal'], b: { bottleneck: 55, capital: 35 } },
  { id: 'silicon_wafers', label: 'Silicon Wafers', shortLabel: 'Si Wafer', layer: 'RawInputs', nodeType: 'material', desc: 'Substrate input for semiconductor fabrication and advanced logic/memory production.', companies: ['SUMCO', 'SHIN'], exposure: { '005930.KS': 0.3 }, tags: ['semi-input'], b: { bottleneck: 60, capital: 70 } },
  { id: 'rare_earths', label: 'Rare Earth Magnets', shortLabel: 'REE', layer: 'RawInputs', nodeType: 'material', desc: 'Permanent magnets for motors, generators, and certain cooling pump systems.', companies: ['MP', 'LYC.AX'], tags: ['geopolitical'], b: { bottleneck: 65 } },
  { id: 'industrial_water', label: 'Industrial Water Supply', shortLabel: 'Water', layer: 'RawInputs', nodeType: 'infrastructure', desc: 'Cooling and process water for fabs, campuses, and evaporative systems.', companies: [], tags: ['utilities'], b: { bottleneck: 45 } },
  { id: 'natural_gas', label: 'Natural Gas / Backup Generation', shortLabel: 'Gas', layer: 'RawInputs', nodeType: 'material', desc: 'On-site backup and peaker generation fuel for grid-constrained campuses.', companies: ['GE', 'GEV'], exposure: { GEV: 0.5 }, tags: ['energy'], b: {} },

  // Grid / Power
  { id: 'grid_capacity', label: 'Grid Capacity', shortLabel: 'Grid Cap', layer: 'GridPower', nodeType: 'constraint', desc: 'Available MW interconnect capacity at utility scale; primary constraint on new AI campuses.', companies: ['NEE', 'DUK', 'SO'], tags: ['bottleneck'], b: { bottleneck: 85, value: 70, central: 80 } },
  { id: 'utility_interconnect', label: 'Utility Interconnect', shortLabel: 'Interconnect', layer: 'GridPower', nodeType: 'infrastructure', desc: 'High-voltage tie-in, switchgear, and multi-year utility approval process for hyperscale loads.', companies: ['ETN', 'GEV'], exposure: { ETN: 0.6, GEV: 0.5 }, tags: ['permitting'], b: { bottleneck: 80, capital: 75 } },
  { id: 'ppas', label: 'Power Purchase Agreements', shortLabel: 'PPAs', layer: 'GridPower', nodeType: 'service', desc: 'Long-term contracted power for data centers; shapes effective $/kWh and build timing.', companies: ['AMZN', 'MSFT', 'GOOGL'], tags: ['contract'], b: { value: 55 } },
  { id: 'substations', label: 'Substations', shortLabel: 'Substation', layer: 'GridPower', nodeType: 'infrastructure', desc: 'Step-down and distribution nodes feeding campus MV infrastructure.', companies: ['ETN', 'ABB', 'SIE'], exposure: { ETN: 0.7 }, tags: [], b: { bottleneck: 70, capital: 80 } },
  { id: 'transformers', label: 'Large Power Transformers', shortLabel: 'Xfmr', layer: 'GridPower', nodeType: 'component', desc: 'Long-lead MV/LV transformers; critical path item in power-constrained regions.', companies: ['ETN', 'GEV', 'HUBB'], exposure: { ETN: 0.65, GEV: 0.55 }, tags: ['lead-time'], b: { bottleneck: 78, capital: 85 } },
  { id: 'ups_systems', label: 'UPS / Battery Storage', shortLabel: 'UPS', layer: 'GridPower', nodeType: 'system', desc: 'Ride-through and power quality for IT loads; bridges grid events to generator transfer.', companies: ['VRT', 'ETN'], exposure: { VRT: 0.8 }, tags: [], b: { capital: 70 } },
  { id: 'generators', label: 'Backup Generators', shortLabel: 'Genset', layer: 'GridPower', nodeType: 'system', desc: 'Diesel/gas backup for tier III/IV uptime requirements.', companies: ['CAT', 'CMI'], tags: [], b: {} },
  { id: 'mv_distribution', label: 'MV Distribution', shortLabel: 'MV Dist', layer: 'GridPower', nodeType: 'infrastructure', desc: 'Medium-voltage distribution across campus to white space.', companies: ['ETN', 'SIE'], tags: [], b: {} },

  // Facilities
  { id: 'land_acquisition', label: 'Land Acquisition', shortLabel: 'Land', layer: 'Facilities', nodeType: 'infrastructure', desc: 'Site selection with power, fiber, water, and regulatory feasibility.', companies: ['AMZN', 'MSFT', 'GOOGL', 'META'], tags: ['real-estate'], b: { capital: 60 } },
  { id: 'site_permitting', label: 'Site Permitting', shortLabel: 'Permits', layer: 'Facilities', nodeType: 'constraint', desc: 'Environmental and zoning approvals; can delay campus energization by years.', companies: [], tags: ['regulatory'], b: { bottleneck: 72, capital: 40 } },
  { id: 'data_center_shell', label: 'Data Center Shell', shortLabel: 'Shell', layer: 'Facilities', nodeType: 'infrastructure', desc: 'Building envelope, structural, and white-space ready shell for IT deployment.', companies: ['EQIX', 'DLR'], tags: [], b: { capital: 75 } },
  { id: 'server_racks', label: 'Server Racks', shortLabel: 'Racks', layer: 'Facilities', nodeType: 'component', desc: 'Physical enclosure, power whips, and airflow containment for dense AI racks.', companies: ['VRT', 'ETN'], exposure: { VRT: 0.5 }, tags: [], b: {} },
  { id: 'physical_security', label: 'Physical Security', shortLabel: 'Security', layer: 'Facilities', nodeType: 'system', desc: 'Perimeter and access control for high-value compute campuses.', companies: [], tags: [] },

  // Cooling
  { id: 'liquid_cooling', label: 'Liquid Cooling (Direct-to-Chip)', shortLabel: 'Liq Cool', layer: 'Cooling', nodeType: 'system', desc: 'Direct liquid cooling for high-TDP GPU racks; unlocks rack density and PUE.', companies: ['VRT', 'ETN'], exposure: { VRT: 0.75 }, tags: ['thermal'], b: { bottleneck: 68, value: 60 } },
  { id: 'chillers', label: 'Chillers', shortLabel: 'Chiller', layer: 'Cooling', nodeType: 'component', desc: 'Central plant refrigeration for heat rejection at campus scale.', companies: ['VRT', 'JCI'], exposure: { VRT: 0.6 }, tags: [], b: { capital: 70 } },
  { id: 'cooling_pumps', label: 'Cooling Pumps', shortLabel: 'Pumps', layer: 'Cooling', nodeType: 'component', desc: 'Circulation for CDU loops and facility water systems.', companies: ['ETN', 'GEV'], tags: [], b: {} },
  { id: 'cdus', label: 'Coolant Distribution Units', shortLabel: 'CDU', layer: 'Cooling', nodeType: 'system', desc: 'Rack-level heat exchange between facility water and chip loops.', companies: ['VRT'], exposure: { VRT: 0.65 }, tags: [], b: { bottleneck: 62 } },
  { id: 'crah_units', label: 'CRAH / Air Cooling', shortLabel: 'CRAH', layer: 'Cooling', nodeType: 'system', desc: 'Supplemental air cooling for mixed-density halls.', companies: ['VRT'], tags: [], b: {} },
  { id: 'heat_rejection', label: 'Heat Rejection / Cooling Towers', shortLabel: 'Heat Rej', layer: 'Cooling', nodeType: 'infrastructure', desc: 'Final heat sink to atmosphere; water consumption constraint in some regions.', companies: ['VRT'], tags: ['water'], b: { bottleneck: 55 } },

  // Semiconductor
  { id: 'semiconductor_fab', label: 'Semiconductor Fab Capacity', shortLabel: 'Fab', layer: 'Semiconductor', nodeType: 'infrastructure', desc: 'Leading-edge wafer fabrication capacity for logic and memory.', companies: ['TSM', 'INTC', 'SSNLF'], exposure: { TSM: 0.9 }, tags: ['capex'], b: { bottleneck: 75, capital: 95, value: 80 } },
  { id: 'lithography', label: 'EUV Lithography', shortLabel: 'EUV', layer: 'Semiconductor', nodeType: 'constraint', desc: 'Extreme ultraviolet lithography tools gating advanced node ramps.', companies: ['ASML'], exposure: { ASML: 0.95 }, tags: ['oligopoly'], b: { bottleneck: 90, subst: 15, value: 85 } },
  { id: 'advanced_packaging', label: 'Advanced Packaging (CoWoS)', shortLabel: 'Packaging', layer: 'Semiconductor', nodeType: 'system', desc: '2.5D/3D packaging enabling GPU+HBM integration.', companies: ['TSM', 'AMKR'], exposure: { TSM: 0.85 }, tags: [], b: { bottleneck: 82, value: 75 } },

  // Packaging / Memory
  { id: 'hbm', label: 'High Bandwidth Memory (HBM)', shortLabel: 'HBM', layer: 'Packaging', nodeType: 'component', desc: 'Stacked memory for AI accelerators; binding constraint on GPU shipments.', companies: ['MU', '000660.KS', 'SSNLF'], exposure: { MU: 0.7, '000660.KS': 0.85 }, tags: ['memory'], b: { bottleneck: 88, value: 80, subst: 25 } },
  { id: 'dram', label: 'DRAM', shortLabel: 'DRAM', layer: 'Packaging', nodeType: 'component', desc: 'System memory for training and inference clusters.', companies: ['MU', '000660.KS'], exposure: { MU: 0.75 }, tags: [], b: { bottleneck: 55 } },
  { id: 'nand_storage', label: 'NAND Flash', shortLabel: 'NAND', layer: 'Packaging', nodeType: 'component', desc: 'Checkpoint and dataset storage for training pipelines.', companies: ['MU', 'WDC'], tags: [], b: {} },
  { id: 'hbm_packaging', label: 'HBM Stack Packaging', shortLabel: 'HBM Pkg', layer: 'Packaging', nodeType: 'system', desc: 'TSV and stack bonding for HBM dies.', companies: ['TSM', 'AMKR'], tags: [], b: { bottleneck: 80 } },
  { id: 'interposers', label: 'Silicon Interposers', shortLabel: 'Interposer', layer: 'Packaging', nodeType: 'component', desc: 'Bridge die for HBM-GPU connectivity in advanced packages.', companies: ['TSM'], exposure: { TSM: 0.7 }, tags: [], b: {} },

  // Compute
  { id: 'gpus', label: 'AI GPUs / Accelerators', shortLabel: 'GPU', layer: 'Compute', nodeType: 'component', desc: 'Primary compute unit for training and inference at scale.', companies: ['NVDA', 'AMD', 'AVGO'], exposure: { NVDA: 0.95, AMD: 0.6 }, tags: ['compute'], b: { bottleneck: 70, value: 85, central: 90 } },
  { id: 'cpus', label: 'Host CPUs', shortLabel: 'CPU', layer: 'Compute', nodeType: 'component', desc: 'General-purpose host processors for orchestration and mixed workloads.', companies: ['INTC', 'AMD'], exposure: { AMD: 0.5, INTC: 0.55 }, tags: [], b: {} },
  { id: 'ai_accelerators', label: 'Custom AI Accelerators (TPU/Trainium)', shortLabel: 'ASIC', layer: 'Compute', nodeType: 'component', desc: 'Hyperscaler-designed accelerators reducing merchant GPU dependence.', companies: ['GOOGL', 'AMZN'], exposure: { GOOGL: 0.7, AMZN: 0.65 }, tags: [], b: { value: 70, subst: 40 } },
  { id: 'gpu_modules', label: 'GPU Modules / SXM', shortLabel: 'GPU Mod', layer: 'Compute', nodeType: 'system', desc: 'Integrated module form factor including HBM for rack deployment.', companies: ['NVDA'], exposure: { NVDA: 0.9 }, tags: [], b: { bottleneck: 75 } },
  { id: 'cluster_compute', label: 'Cluster Compute', shortLabel: 'Cluster', layer: 'Compute', nodeType: 'cluster', isSupernode: true, desc: 'Aggregated training and inference compute capacity.', companies: [], tags: ['cluster'], b: { central: 85 } },

  // Networking
  { id: 'nics', label: 'SmartNICs / DPUs', shortLabel: 'NIC', layer: 'Networking', nodeType: 'component', desc: 'Network offload and east-west traffic for distributed training.', companies: ['AVGO', 'NVDA', 'AMD'], exposure: { AVGO: 0.7 }, tags: [], b: {} },
  { id: 'switches', label: 'Data Center Switches', shortLabel: 'Switch', layer: 'Networking', nodeType: 'component', desc: 'Spine-leaf fabric for AI cluster scale-out.', companies: ['ANET', 'AVGO', 'CSCO'], exposure: { ANET: 0.8, AVGO: 0.5 }, tags: [], b: { bottleneck: 60, value: 65 } },
  { id: 'optical_transceivers', label: 'Optical Transceivers', shortLabel: 'Optics', layer: 'Networking', nodeType: 'component', desc: 'High-speed optical links for rack-to-rack and campus interconnect.', companies: ['COHR', 'LITE', 'AVGO'], exposure: { COHR: 0.75 }, tags: [], b: { bottleneck: 65 } },
  { id: 'dac_cables', label: 'Copper DAC Cables', shortLabel: 'DAC', layer: 'Networking', nodeType: 'component', desc: 'Short-reach copper interconnect within racks; copper intensity per GPU rack.', companies: ['APH', 'AAOI'], exposure: { APH: 0.6 }, tags: ['copper'], b: {} },
  { id: 'storage_systems', label: 'Distributed Storage', shortLabel: 'Storage', layer: 'Networking', nodeType: 'system', desc: 'Parallel filesystems and object storage for training data.', companies: ['NTAP', 'PSTG'], tags: [], b: {} },
  { id: 'infiniband', label: 'InfiniBand / RDMA Fabric', shortLabel: 'IB', layer: 'Networking', nodeType: 'system', desc: 'Low-latency cluster networking for large-scale training.', companies: ['NVDA', 'AVGO'], exposure: { NVDA: 0.7 }, tags: [], b: { bottleneck: 68 } },

  // Cloud
  { id: 'hyperscaler_regions', label: 'Hyperscaler Regions', shortLabel: 'Regions', layer: 'Cloud', nodeType: 'infrastructure', desc: 'Geographically distributed cloud regions with power, fiber, and capacity.', companies: ['AMZN', 'MSFT', 'GOOGL', 'META'], exposure: { AMZN: 0.8, MSFT: 0.8, GOOGL: 0.75, META: 0.7 }, tags: [], b: { value: 75, capital: 90 } },
  { id: 'gpu_cloud', label: 'GPU Cloud / IaaS', shortLabel: 'GPU Cloud', layer: 'Cloud', nodeType: 'service', desc: 'Rentable GPU capacity for startups and enterprises.', companies: ['AMZN', 'MSFT', 'GOOGL', 'ORCL'], tags: [], b: { value: 70 } },
  { id: 'orchestration', label: 'Cluster Orchestration (K8s/Slurm)', shortLabel: 'Orch', layer: 'Cloud', nodeType: 'service', desc: 'Job scheduling and resource management across AI clusters.', companies: ['AMZN', 'MSFT'], tags: [], b: { subst: 70 } },
  { id: 'training_clusters', label: 'Large-Scale Training Clusters', shortLabel: 'Train Clust', layer: 'Cloud', nodeType: 'system', desc: '100k+ GPU-equivalent training footprints for foundation models.', companies: ['MSFT', 'GOOGL', 'META', 'AMZN'], tags: [], b: { capital: 95 } },
  { id: 'inference_infra', label: 'Inference Infrastructure', shortLabel: 'Infer Infra', layer: 'Cloud', nodeType: 'system', desc: 'Low-latency serving stack for production AI workloads.', companies: ['AMZN', 'MSFT'], tags: [], b: { value: 65 } },
  { id: 'cluster_power', label: 'Power Systems Cluster', shortLabel: 'Power', layer: 'GridPower', nodeType: 'cluster', isSupernode: true, parentId: undefined, desc: 'Aggregated grid-to-white-space power chain.', companies: [], tags: ['cluster'], b: {} },

  // Model
  { id: 'foundation_models', label: 'Foundation Models', shortLabel: 'FMs', layer: 'Model', nodeType: 'capability', desc: 'Large pretrained models requiring massive training capex.', companies: ['MSFT', 'GOOGL', 'META', 'OPENAI'], exposure: { MSFT: 0.6 }, tags: [], b: { value: 80 } },
  { id: 'inference_apis', label: 'Inference APIs', shortLabel: 'APIs', layer: 'Model', nodeType: 'service', desc: 'Token-based model access monetized per request.', companies: ['OPENAI', 'GOOGL', 'AMZN', 'ANTHROPIC'], tags: [], b: { value: 75 } },
  { id: 'model_training', label: 'Model Training Pipeline', shortLabel: 'Training', layer: 'Model', nodeType: 'system', desc: 'End-to-end pretraining, fine-tuning, and alignment compute.', companies: ['NVDA', 'MSFT'], tags: [], b: {} },
  { id: 'open_source_models', label: 'Open-Weight Models', shortLabel: 'OSS FM', layer: 'Model', nodeType: 'capability', desc: 'Commoditizing model layer; shifts value to apps and infra.', companies: ['META'], exposure: { META: 0.4 }, tags: [], b: { subst: 75 } },

  // Application
  { id: 'copilots', label: 'Enterprise Copilots', shortLabel: 'Copilot', layer: 'Application', nodeType: 'service', desc: 'Embedded AI assistants in productivity suites.', companies: ['MSFT', 'GOOGL'], exposure: { MSFT: 0.85 }, tags: [], b: { value: 70 } },
  { id: 'coding_agents', label: 'Coding Agents', shortLabel: 'Code AI', layer: 'Application', nodeType: 'service', desc: 'AI-assisted software development tools.', companies: ['MSFT', 'GOOGL', 'OPENAI'], tags: [], b: { value: 65 } },
  { id: 'enterprise_search', label: 'Enterprise Search / RAG', shortLabel: 'RAG', layer: 'Application', nodeType: 'service', desc: 'Retrieval-augmented generation over corporate knowledge.', companies: ['MSFT', 'GOOGL', 'CRM'], tags: [], b: {} },
  { id: 'ad_ranking', label: 'Ad Ranking / Personalization', shortLabel: 'Ad Rank', layer: 'Application', nodeType: 'capability', desc: 'ML-driven ad selection and conversion optimization.', companies: ['META', 'GOOGL', 'AMZN'], exposure: { META: 0.9 }, tags: [], b: { value: 80 } },
  { id: 'automation_workflows', label: 'Automation Workflows', shortLabel: 'Auto Flow', layer: 'Application', nodeType: 'service', desc: 'Agentic process automation across enterprise back-office.', companies: ['CRM', 'NOW', 'MSFT'], tags: [], b: { value: 60 } },
  { id: 'recommendation_systems', label: 'Recommendation Systems', shortLabel: 'RecSys', layer: 'Application', nodeType: 'capability', desc: 'Feed and content ranking at consumer scale.', companies: ['META', 'GOOGL', 'NFLX'], tags: [], b: {} },

  // Monetization
  { id: 'meta_ads', label: 'Meta Ads Revenue', shortLabel: 'Meta Ads', layer: 'Monetization', nodeType: 'revenue_stream', desc: 'AI-enhanced ad targeting and monetization at Meta scale.', companies: ['META'], exposure: { META: 0.95 }, tags: ['ads'], b: { value: 90 } },
  { id: 'saas_productivity', label: 'SaaS Productivity Uplift', shortLabel: 'SaaS AI', layer: 'Monetization', nodeType: 'revenue_stream', desc: 'Incremental ARPU from AI tiers in productivity software.', companies: ['MSFT', 'GOOGL'], exposure: { MSFT: 0.8 }, tags: [], b: { value: 75 } },
  { id: 'api_revenue', label: 'API / Token Revenue', shortLabel: 'API Rev', layer: 'Monetization', nodeType: 'revenue_stream', desc: 'Direct monetization of model inference via API pricing.', companies: ['OPENAI', 'GOOGL', 'AMZN'], tags: [], b: { value: 85 } },
  { id: 'cloud_ai_revenue', label: 'Cloud AI Services Revenue', shortLabel: 'Cloud AI', layer: 'Monetization', nodeType: 'revenue_stream', desc: 'Hyperscaler AI services attached to core cloud.', companies: ['AMZN', 'MSFT', 'GOOGL'], tags: [], b: { value: 80 } },
  { id: 'automation_value', label: 'Enterprise Automation Value', shortLabel: 'Auto Value', layer: 'Monetization', nodeType: 'revenue_stream', desc: 'Labor savings and throughput gains from AI automation.', companies: ['CRM', 'NOW'], tags: [], b: { value: 65 } },
  { id: 'cluster_monetization', label: 'Monetization Cluster', shortLabel: 'Monetize', layer: 'Monetization', nodeType: 'cluster', isSupernode: true, desc: 'Downstream revenue capture nodes.', companies: [], tags: ['cluster'], b: {} },

  // Additional depth nodes
  { id: 'pcb_assembly', label: 'PCB / Motherboard Assembly', shortLabel: 'PCB', layer: 'Packaging', nodeType: 'component', desc: 'Board-level integration of accelerators, memory, and power delivery.', companies: ['APH', 'FLEX'], tags: [], b: {} },
  { id: 'power_delivery', label: 'VRM / Power Delivery', shortLabel: 'VRM', layer: 'Compute', nodeType: 'component', desc: 'Voltage regulation for high-current GPU modules.', companies: ['AVGO', 'NVDA'], tags: [], b: {} },
  { id: 'fiber_backbone', label: 'Fiber Backbone', shortLabel: 'Fiber', layer: 'Networking', nodeType: 'infrastructure', desc: 'Campus and metro fiber for cloud region connectivity.', companies: ['EQIX', 'AMT'], tags: [], b: {} },
  { id: 'edge_inference', label: 'Edge Inference', shortLabel: 'Edge', layer: 'Application', nodeType: 'service', desc: 'On-device and edge deployment reducing cloud inference load.', companies: ['AAPL', 'QCOM'], tags: [], b: { subst: 65 } },
  { id: 'data_labeling', label: 'Data Labeling / Curation', shortLabel: 'Labels', layer: 'Model', nodeType: 'service', desc: 'Human and synthetic data pipelines for model quality.', companies: [], tags: [], b: {} },
  { id: 'alignment_compute', label: 'RLHF / Alignment Compute', shortLabel: 'RLHF', layer: 'Model', nodeType: 'system', desc: 'Post-training alignment consuming additional GPU cycles.', companies: ['OPENAI', 'ANTHROPIC'], tags: [], b: {} },
  { id: 'sovereign_ai', label: 'Sovereign AI Clouds', shortLabel: 'Sov AI', layer: 'Cloud', nodeType: 'service', desc: 'National/regional AI clouds with localized supply chains.', companies: [], tags: ['geopolitical'], b: {} },
  { id: 'neocloud', label: 'GPU Neocloud Providers', shortLabel: 'Neocloud', layer: 'Cloud', nodeType: 'service', desc: 'Specialized GPU hosting (CoreWeave, Lambda, etc.).', companies: [], tags: [], b: { value: 55 } },
  { id: 'enterprise_adoption', label: 'Enterprise AI Adoption', shortLabel: 'Ent Adopt', layer: 'Application', nodeType: 'capability', desc: 'Rate of enterprise rollout; gates monetization realization.', companies: ['MSFT', 'CRM'], tags: [], b: { bottleneck: 50, value: 70 } },
  { id: 'inference_efficiency', label: 'Inference Efficiency Gains', shortLabel: 'Infer Eff', layer: 'Model', nodeType: 'capability', desc: 'Algorithmic and hardware efficiency reducing $/token.', companies: ['NVDA', 'GOOGL'], tags: [], b: { subst: 80, value: 60 } },
  { id: 'model_distillation', label: 'Model Distillation', shortLabel: 'Distill', layer: 'Model', nodeType: 'capability', desc: 'Smaller models derived from large teachers; shifts compute mix.', companies: ['META', 'GOOGL'], tags: [], b: {} },
  { id: 'ai_safety_compute', label: 'Safety / Eval Compute', shortLabel: 'Safety', layer: 'Model', nodeType: 'system', desc: 'Red-team and eval workloads atop base training.', companies: ['OPENAI', 'ANTHROPIC'], tags: [], b: {} },
  { id: 'cooling_fluids', label: 'Dielectric / Coolant Fluids', shortLabel: 'Fluid', layer: 'Cooling', nodeType: 'material', desc: 'Specialty fluids for immersion and two-phase cooling.', companies: ['VRT'], tags: [], b: { bottleneck: 55 } },
  { id: 'battery_metals', label: 'Battery Metals (UPS)', shortLabel: 'Li/Co', layer: 'RawInputs', nodeType: 'material', desc: 'Lithium and related inputs for large UPS deployments.', companies: ['ALB', 'SQM'], tags: [], b: {} },
  { id: 'concrete_steel', label: 'Construction Materials', shortLabel: 'Build Mat', layer: 'Facilities', nodeType: 'material', desc: 'Structural inputs for shell and civil works.', companies: [], tags: [], b: { capital: 50 } },
  { id: 'hvac_controls', label: 'Building Controls / BMS', shortLabel: 'BMS', layer: 'Facilities', nodeType: 'system', desc: 'Building management integrating cooling and power telemetry.', companies: ['SIE', 'JCI'], tags: [], b: {} },
  { id: 'chiplet_design', label: 'Chiplet Architecture', shortLabel: 'Chiplet', layer: 'Semiconductor', nodeType: 'capability', desc: 'Modular die design affecting yield and packaging demand.', companies: ['AMD', 'INTC', 'TSM'], tags: [], b: {} },
];

// Assign supernode children
const clusterChildren = {
  cluster_power: ['grid_capacity', 'utility_interconnect', 'substations', 'transformers'],
  cluster_compute: ['gpus', 'hbm', 'gpu_modules', 'training_clusters'],
  cluster_monetization: ['meta_ads', 'saas_productivity', 'api_revenue', 'cloud_ai_revenue'],
};

const nodes = nodeDefs.map((d) => {
  const s = scores(d.b || {});
  const yearMetrics = {};
  if (['grid_capacity', 'utility_interconnect', 'hbm', 'gpus', 'transformers', 'liquid_cooling', 'meta_ads', 'inference_apis'].includes(d.id)) {
    for (let y = 2024; y <= 2030; y++) {
      const t = (y - 2024) / 6;
      yearMetrics[y] = {
        bottleneckScore: Math.min(100, s.bottleneckScore + t * (d.id === 'hbm' ? 12 : d.id === 'gpus' ? -8 : 10)),
        importanceScore: Math.min(100, s.importanceScore + t * 8),
        valueCaptureScore: Math.min(100, s.valueCaptureScore + t * 6),
      };
    }
  }
  return {
    id: d.id,
    label: d.label,
    shortLabel: d.shortLabel,
    nodeType: d.nodeType,
    layer: d.layer,
    description: d.desc,
    timeToScale: d.isSupernode ? 'N/A' : '12-36 months',
    capacityUnit: d.nodeType === 'material' ? 'tonnes/MW' : d.nodeType === 'component' ? 'units' : undefined,
    geography: ['grid_capacity', 'utility_interconnect', 'land_acquisition'].includes(d.id) ? 'US-centric' : 'Global',
    exampleCompanies: d.companies || [],
    companyExposure: d.exposure,
    evidence: [`Analyst synthesis: ${d.label} role in AI value chain.`],
    tags: d.tags || [],
    relatedMetrics: { capexIntensity: s.capitalIntensityScore },
    isSupernode: d.isSupernode || false,
    collapsed: d.isSupernode ? true : undefined,
    metricsByYear: Object.keys(yearMetrics).length ? yearMetrics : undefined,
    ...s,
  };
});

// Add parentId for cluster children
for (const [parent, children] of Object.entries(clusterChildren)) {
  for (const cid of children) {
    const n = nodes.find((x) => x.id === cid);
    if (n) n.parentId = parent;
  }
}

const edgeTemplates = [
  ['copper', 'substations', 'physical_dependency', 'power_flow'],
  ['copper', 'dac_cables', 'physical_dependency', 'commercial_flow'],
  ['copper', 'mv_distribution', 'physical_dependency', 'power_flow'],
  ['silicon_wafers', 'semiconductor_fab', 'physical_dependency', 'capacity_translation'],
  ['semiconductor_fab', 'advanced_packaging', 'capacity_translation', 'physical_dependency'],
  ['lithography', 'semiconductor_fab', 'bottleneck_constraint', 'physical_dependency'],
  ['advanced_packaging', 'hbm_packaging', 'capacity_translation', 'physical_dependency'],
  ['hbm_packaging', 'hbm', 'capacity_translation', 'physical_dependency'],
  ['hbm', 'gpu_modules', 'physical_dependency', 'bottleneck_constraint'],
  ['hbm', 'gpus', 'bottleneck_constraint', 'physical_dependency'],
  ['gpus', 'gpu_modules', 'physical_dependency', 'capacity_translation'],
  ['gpus', 'gpu_cloud', 'capacity_translation', 'commercial_flow'],
  ['gpus', 'training_clusters', 'capacity_translation', 'physical_dependency'],
  ['grid_capacity', 'utility_interconnect', 'bottleneck_constraint', 'power_flow'],
  ['utility_interconnect', 'substations', 'power_flow', 'physical_dependency'],
  ['substations', 'transformers', 'power_flow', 'physical_dependency'],
  ['transformers', 'mv_distribution', 'power_flow', 'physical_dependency'],
  ['mv_distribution', 'data_center_shell', 'power_flow', 'physical_dependency'],
  ['ppas', 'grid_capacity', 'commercial_flow', 'capacity_translation'],
  ['land_acquisition', 'site_permitting', 'bottleneck_constraint', 'physical_dependency'],
  ['site_permitting', 'data_center_shell', 'bottleneck_constraint', 'physical_dependency'],
  ['data_center_shell', 'server_racks', 'physical_dependency', 'capacity_translation'],
  ['server_racks', 'liquid_cooling', 'physical_dependency', 'capacity_translation'],
  ['liquid_cooling', 'cdus', 'physical_dependency', 'capacity_translation'],
  ['cdus', 'gpus', 'physical_dependency', 'capacity_translation'],
  ['chillers', 'liquid_cooling', 'physical_dependency', 'power_flow'],
  ['cooling_pumps', 'cdus', 'physical_dependency', 'power_flow'],
  ['heat_rejection', 'chillers', 'physical_dependency', 'power_flow'],
  ['industrial_water', 'heat_rejection', 'physical_dependency', 'physical_dependency'],
  ['natural_gas', 'generators', 'physical_dependency', 'power_flow'],
  ['generators', 'ups_systems', 'power_flow', 'physical_dependency'],
  ['ups_systems', 'server_racks', 'power_flow', 'physical_dependency'],
  ['nics', 'training_clusters', 'data_flow', 'physical_dependency'],
  ['switches', 'infiniband', 'data_flow', 'physical_dependency'],
  ['optical_transceivers', 'switches', 'physical_dependency', 'capacity_translation'],
  ['dac_cables', 'gpus', 'physical_dependency', 'data_flow'],
  ['infiniband', 'training_clusters', 'data_flow', 'physical_dependency'],
  ['storage_systems', 'model_training', 'data_flow', 'physical_dependency'],
  ['hyperscaler_regions', 'gpu_cloud', 'capacity_translation', 'commercial_flow'],
  ['gpu_cloud', 'inference_apis', 'commercial_flow', 'capacity_translation'],
  ['orchestration', 'training_clusters', 'data_flow', 'commercial_flow'],
  ['training_clusters', 'foundation_models', 'capacity_translation', 'data_flow'],
  ['foundation_models', 'inference_apis', 'capacity_translation', 'data_flow'],
  ['inference_apis', 'copilots', 'commercial_flow', 'data_flow'],
  ['inference_apis', 'coding_agents', 'commercial_flow', 'data_flow'],
  ['copilots', 'saas_productivity', 'revenue_capture', 'commercial_flow'],
  ['coding_agents', 'saas_productivity', 'revenue_capture', 'commercial_flow'],
  ['ad_ranking', 'meta_ads', 'revenue_capture', 'commercial_flow'],
  ['foundation_models', 'ad_ranking', 'data_flow', 'competitive_dependency'],
  ['gpus', 'ad_ranking', 'capacity_translation', 'data_flow'],
  ['meta_ads', 'cluster_monetization', 'revenue_capture', 'commercial_flow'],
  ['api_revenue', 'cluster_monetization', 'revenue_capture', 'commercial_flow'],
  ['inference_apis', 'api_revenue', 'revenue_capture', 'commercial_flow'],
  ['enterprise_search', 'enterprise_adoption', 'commercial_flow', 'data_flow'],
  ['enterprise_adoption', 'saas_productivity', 'revenue_capture', 'commercial_flow'],
  ['site_permitting', 'enterprise_adoption', 'bottleneck_constraint', 'competitive_dependency'],
  ['automation_workflows', 'automation_value', 'revenue_capture', 'commercial_flow'],
  ['open_source_models', 'enterprise_adoption', 'competitive_dependency', 'data_flow'],
  ['inference_efficiency', 'inference_infra', 'capacity_translation', 'competitive_dependency'],
  ['inference_infra', 'api_revenue', 'revenue_capture', 'commercial_flow'],
  ['cloud_ai_revenue', 'hyperscaler_regions', 'revenue_capture', 'commercial_flow'],
  ['gpu_cloud', 'cloud_ai_revenue', 'revenue_capture', 'commercial_flow'],
  ['neocloud', 'gpu_cloud', 'commercial_flow', 'competitive_dependency'],
  ['ai_accelerators', 'training_clusters', 'competitive_dependency', 'capacity_translation'],
  ['ai_accelerators', 'gpus', 'competitive_dependency', 'commercial_flow'],
  ['dram', 'training_clusters', 'physical_dependency', 'capacity_translation'],
  ['nand_storage', 'storage_systems', 'physical_dependency', 'capacity_translation'],
  ['fiber_backbone', 'hyperscaler_regions', 'physical_dependency', 'data_flow'],
  ['alignment_compute', 'foundation_models', 'capacity_translation', 'data_flow'],
  ['model_distillation', 'inference_efficiency', 'competitive_dependency', 'data_flow'],
  ['copper', 'transformers', 'physical_dependency', 'power_flow'],
  ['battery_metals', 'ups_systems', 'physical_dependency', 'physical_dependency'],
  ['concrete_steel', 'data_center_shell', 'physical_dependency', 'physical_dependency'],
  ['cooling_fluids', 'liquid_cooling', 'physical_dependency', 'commercial_flow'],
  ['chiplet_design', 'advanced_packaging', 'capacity_translation', 'competitive_dependency'],
  ['pcb_assembly', 'gpu_modules', 'physical_dependency', 'capacity_translation'],
  ['power_delivery', 'gpus', 'physical_dependency', 'capacity_translation'],
  ['recommendation_systems', 'meta_ads', 'revenue_capture', 'data_flow'],
  ['edge_inference', 'inference_infra', 'competitive_dependency', 'data_flow'],
  ['sovereign_ai', 'hyperscaler_regions', 'commercial_flow', 'competitive_dependency'],
  ['data_labeling', 'foundation_models', 'data_flow', 'physical_dependency'],
  ['hvac_controls', 'liquid_cooling', 'data_flow', 'physical_dependency'],
  ['rare_earths', 'cooling_pumps', 'physical_dependency', 'physical_dependency'],
  ['physical_security', 'data_center_shell', 'physical_dependency', 'commercial_flow'],
  ['crah_units', 'server_racks', 'physical_dependency', 'power_flow'],
  ['interposers', 'hbm', 'physical_dependency', 'bottleneck_constraint'],
  ['cpus', 'orchestration', 'physical_dependency', 'data_flow'],
  ['cpus', 'server_racks', 'physical_dependency', 'capacity_translation'],
];

// Layer chain edges
const layerOrder = LAYERS;
const layerNodes = {};
for (const n of nodes) {
  if (!layerNodes[n.layer]) layerNodes[n.layer] = [];
  layerNodes[n.layer].push(n.id);
}

let edgeId = 0;
const edges = [];

function addEdge(source, target, edgeType, flowType, strength = 0.6) {
  if (!nodes.find((n) => n.id === source) || !nodes.find((n) => n.id === target)) return;
  edges.push({
    id: `e_${edgeId++}`,
    source,
    target,
    edgeType,
    strength: strength + Math.random() * 0.3,
    directionality: 'directed',
    lag: '0-24 months',
    description: `${source} → ${target}`,
    flowType,
    scenarioSensitivity: {
      power_bottleneck: edgeType === 'power_flow' ? 1.5 : 1,
      hbm_shortage: source === 'hbm' || target === 'hbm' ? 1.8 : 1,
    },
    evidence: [],
  });
}

for (const [s, t, et, ft] of edgeTemplates) {
  addEdge(s, t, et, ft);
}

// Cross-layer weak links
for (let i = 0; i < layerOrder.length - 1; i++) {
  const from = layerNodes[layerOrder[i]]?.[0];
  const to = layerNodes[layerOrder[i + 1]]?.[0];
  if (from && to) addEdge(from, to, 'capacity_translation', 'commercial_flow', 0.35);
}

// More intra-layer and cross links to reach ~280 edges
const allIds = nodes.map((n) => n.id);
for (let i = 0; i < 220; i++) {
  const a = allIds[Math.floor(Math.random() * allIds.length)];
  const b = allIds[Math.floor(Math.random() * allIds.length)];
  if (a === b) continue;
  const na = nodes.find((n) => n.id === a);
  const nb = nodes.find((n) => n.id === b);
  const li = layerOrder.indexOf(na.layer);
  const lj = layerOrder.indexOf(nb.layer);
  if (lj <= li || lj - li > 3) continue;
  const types = ['capacity_translation', 'commercial_flow', 'data_flow', 'physical_dependency'];
  addEdge(a, b, types[Math.floor(Math.random() * types.length)], 'commercial_flow', 0.25 + Math.random() * 0.3);
}

// Additional weak cross-links (forward in layer stack only)
for (let i = 0; i < 180; i++) {
  const a = allIds[Math.floor(Math.random() * allIds.length)];
  const b = allIds[Math.floor(Math.random() * allIds.length)];
  if (a === b) continue;
  const na = nodes.find((n) => n.id === a);
  const nb = nodes.find((n) => n.id === b);
  if (layerOrder.indexOf(nb.layer) <= layerOrder.indexOf(na.layer)) continue;
  const types = ['capacity_translation', 'commercial_flow', 'data_flow', 'competitive_dependency'];
  addEdge(a, b, types[i % types.length], 'commercial_flow', 0.2 + Math.random() * 0.25);
}

const scenarios = [
  { id: 'base', label: 'Base AI Buildout', description: 'Steady hyperscaler capex with moderate bottlenecks in power and HBM.', nodeScoreOverrides: {}, highlightNodeIds: [], highlightEdgeTypes: [] },
  { id: 'power_bottleneck', label: 'Power Bottleneck', description: 'Utility interconnect delays dominate; grid nodes spike in bottleneck score.', nodeScoreOverrides: { grid_capacity: { bottleneckScore: 98 }, utility_interconnect: { bottleneckScore: 95 }, transformers: { bottleneckScore: 90 } }, highlightNodeIds: ['grid_capacity', 'utility_interconnect', 'transformers', 'substations'], highlightEdgeTypes: ['power_flow', 'bottleneck_constraint'] },
  { id: 'gpu_abundance', label: 'GPU Abundance', description: 'Supply catches demand; GPU bottleneck eases, value shifts downstream.', nodeScoreOverrides: { gpus: { bottleneckScore: 35, substitutabilityScore: 60 }, hbm: { bottleneckScore: 50 } }, highlightNodeIds: ['gpus', 'inference_apis', 'api_revenue'], highlightEdgeTypes: ['revenue_capture'] },
  { id: 'hbm_shortage', label: 'HBM Shortage', description: 'Memory packaging constrains accelerator shipments.', nodeScoreOverrides: { hbm: { bottleneckScore: 98 }, hbm_packaging: { bottleneckScore: 95 }, gpu_modules: { bottleneckScore: 88 } }, highlightNodeIds: ['hbm', 'hbm_packaging', 'advanced_packaging', 'gpus'], highlightEdgeTypes: ['bottleneck_constraint', 'physical_dependency'] },
  { id: 'monetization_shortfall', label: 'Monetization Shortfall', description: 'Enterprise adoption lags infrastructure build; revenue nodes underperform.', nodeScoreOverrides: { enterprise_adoption: { bottleneckScore: 75 }, meta_ads: { valueCaptureScore: 45 }, saas_productivity: { valueCaptureScore: 40 } }, highlightNodeIds: ['enterprise_adoption', 'meta_ads', 'saas_productivity'], highlightEdgeTypes: ['revenue_capture'] },
  { id: 'inference_efficiency', label: 'Inference Efficiency Breakthrough', description: 'Algorithmic efficiency reduces compute demand per token.', nodeScoreOverrides: { inference_efficiency: { importanceScore: 95 }, gpus: { valueCaptureScore: 55 }, inference_infra: { substitutabilityScore: 70 } }, highlightNodeIds: ['inference_efficiency', 'model_distillation', 'inference_infra'], highlightEdgeTypes: ['competitive_dependency', 'data_flow'] },
  { id: 'delayed_interconnect', label: 'Delayed Utility Interconnects', description: 'Permitting and transformer lead times extend campus timelines.', nodeScoreOverrides: { site_permitting: { bottleneckScore: 85 }, utility_interconnect: { bottleneckScore: 92 }, transformers: { bottleneckScore: 88 } }, highlightNodeIds: ['site_permitting', 'utility_interconnect', 'land_acquisition'], highlightEdgeTypes: ['bottleneck_constraint'] },
];

const curatedPaths = [
  { id: 'p1', label: 'Copper → Meta Ads', startNodeId: 'copper', endNodeId: 'meta_ads', description: 'Physical copper through power, compute, ads ranking to Meta revenue.' },
  { id: 'p2', label: 'Grid Capacity → Microsoft Copilot', startNodeId: 'grid_capacity', endNodeId: 'copilots', description: 'Power constraint through cloud to enterprise copilot monetization.' },
  { id: 'p3', label: 'HBM → OpenAI API Revenue', startNodeId: 'hbm', endNodeId: 'api_revenue', description: 'Memory bottleneck through GPUs and APIs to token revenue.' },
  { id: 'p4', label: 'Site Permitting → Enterprise AI Adoption', startNodeId: 'site_permitting', endNodeId: 'enterprise_adoption', description: 'Regulatory delay slowing downstream enterprise rollout.' },
  { id: 'p5', label: 'Liquid Cooling → Hyperscaler Inference Margin', startNodeId: 'liquid_cooling', endNodeId: 'inference_infra', description: 'Thermal infrastructure enabling dense inference economics.' },
  { id: 'p6', label: 'Optical Interconnect → Model Training Throughput', startNodeId: 'optical_transceivers', endNodeId: 'model_training', description: 'Network optics enabling distributed training scale.' },
];

mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'nodes.json'), JSON.stringify(nodes, null, 2));
writeFileSync(join(dataDir, 'edges.json'), JSON.stringify(edges, null, 2));
writeFileSync(join(dataDir, 'scenarios.json'), JSON.stringify(scenarios, null, 2));
writeFileSync(join(dataDir, 'curatedPaths.json'), JSON.stringify(curatedPaths, null, 2));
console.log(`Generated ${nodes.length} nodes, ${edges.length} edges`);

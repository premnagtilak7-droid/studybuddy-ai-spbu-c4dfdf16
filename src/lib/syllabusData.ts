// Local syllabus database for auto-seeding units & topics when a subject is added.
// Lookup key = `${board}:${classLevel}:${normalized subject name}`.
// Boards: cbse, icse. Class levels: 9, 10, 11, 12. Plus "engineering" generic fallback.

export type PresetTopic = { name: string; priority?: "high" | "medium" | "low" };
export type PresetUnit = { name: string; topics: PresetTopic[] };
export type PresetSubject = {
  aliases: string[]; // normalized lowercase subject names that should match
  units: PresetUnit[];
};

const u = (name: string, topics: string[]): PresetUnit => ({
  name,
  topics: topics.map((t) => ({ name: t, priority: "medium" as const })),
});

// ────────────── CBSE Class 12 ──────────────

const cbse12Maths: PresetSubject = {
  aliases: ["mathematics", "maths", "math"],
  units: [
    u("Relations & Functions", ["Types of Relations", "Types of Functions", "Composition & Invertible Functions", "Binary Operations", "Inverse Trigonometric Functions"]),
    u("Algebra — Matrices", ["Matrix Operations", "Transpose & Symmetric Matrices", "Elementary Operations", "Invertible Matrices"]),
    u("Algebra — Determinants", ["Properties of Determinants", "Area of Triangle", "Minors & Cofactors", "Adjoint & Inverse", "Solving Linear Equations"]),
    u("Calculus — Continuity & Differentiability", ["Continuity", "Differentiability", "Chain Rule", "Implicit & Logarithmic Differentiation", "Mean Value Theorems"]),
    u("Calculus — Applications of Derivatives", ["Rate of Change", "Increasing/Decreasing Functions", "Tangents & Normals", "Maxima & Minima", "Approximations"]),
    u("Calculus — Integrals", ["Integration by Substitution", "Integration by Parts", "Partial Fractions", "Definite Integrals", "Properties of Definite Integrals"]),
    u("Calculus — Applications of Integrals", ["Area Under Curves", "Area Between Two Curves"]),
    u("Calculus — Differential Equations", ["Order & Degree", "Variable Separable", "Homogeneous DE", "Linear DE", "Formation of DE"]),
    u("Vectors", ["Vector Algebra", "Dot Product", "Cross Product", "Scalar Triple Product"]),
    u("Three Dimensional Geometry", ["Direction Cosines & Ratios", "Equation of Line", "Equation of Plane", "Angle between Lines & Planes", "Shortest Distance"]),
    u("Linear Programming", ["LPP Formulation", "Graphical Method", "Feasible Region", "Optimal Solutions"]),
    u("Probability", ["Conditional Probability", "Bayes' Theorem", "Random Variables", "Bernoulli Trials & Binomial Distribution"]),
  ],
};

const cbse12Physics: PresetSubject = {
  aliases: ["physics"],
  units: [
    u("Electric Charges & Fields", ["Coulomb's Law", "Electric Field & Lines", "Electric Flux", "Gauss's Law & Applications", "Electric Dipole"]),
    u("Electrostatic Potential & Capacitance", ["Electric Potential", "Equipotential Surfaces", "Capacitors & Combinations", "Energy Stored in Capacitor", "Dielectrics"]),
    u("Current Electricity", ["Ohm's Law & Resistivity", "Drift Velocity", "Kirchhoff's Laws", "Wheatstone Bridge", "Potentiometer", "Cells & EMF"]),
    u("Moving Charges & Magnetism", ["Biot-Savart Law", "Ampere's Circuital Law", "Force on Moving Charge", "Cyclotron", "Force between Parallel Wires"]),
    u("Magnetism & Matter", ["Bar Magnet & Earth's Magnetism", "Magnetic Properties of Materials", "Hysteresis"]),
    u("Electromagnetic Induction", ["Faraday's Laws", "Lenz's Law", "Self & Mutual Inductance", "AC Generator"]),
    u("Alternating Current", ["AC Voltage & Current", "RLC Circuits", "Resonance", "Power in AC Circuits", "Transformers"]),
    u("Electromagnetic Waves", ["Displacement Current", "EM Spectrum", "Properties of EM Waves"]),
    u("Ray Optics & Optical Instruments", ["Reflection & Refraction", "Total Internal Reflection", "Lens Formula", "Optical Instruments", "Prism & Dispersion"]),
    u("Wave Optics", ["Huygens Principle", "Interference & Young's Experiment", "Diffraction", "Polarisation"]),
    u("Dual Nature of Radiation & Matter", ["Photoelectric Effect", "Einstein's Equation", "de Broglie Wavelength", "Davisson-Germer Experiment"]),
    u("Atoms & Nuclei", ["Bohr Model", "Hydrogen Spectrum", "Nuclear Composition", "Radioactivity", "Nuclear Fission & Fusion"]),
    u("Semiconductor Electronics", ["Intrinsic & Extrinsic Semiconductors", "p-n Junction Diode", "Rectifiers", "Transistors", "Logic Gates"]),
  ],
};

const cbse12Chemistry: PresetSubject = {
  aliases: ["chemistry"],
  units: [
    u("Solid State", ["Classification of Solids", "Crystal Lattices & Unit Cells", "Packing in Solids", "Imperfections", "Electrical & Magnetic Properties"]),
    u("Solutions", ["Types of Solutions", "Concentration Units", "Raoult's Law", "Colligative Properties", "Van't Hoff Factor"]),
    u("Electrochemistry", ["Redox Reactions", "Electrochemical Cells", "Nernst Equation", "Conductance", "Electrolysis & Faraday's Laws", "Batteries & Fuel Cells"]),
    u("Chemical Kinetics", ["Rate of Reaction", "Order & Molecularity", "Integrated Rate Equations", "Arrhenius Equation", "Collision Theory"]),
    u("Surface Chemistry", ["Adsorption", "Catalysis", "Colloids", "Emulsions"]),
    u("General Principles of Isolation of Elements", ["Occurrence of Metals", "Concentration of Ores", "Extraction", "Refining"]),
    u("p-Block Elements", ["Group 15 Elements", "Group 16 Elements", "Group 17 Elements", "Group 18 Elements"]),
    u("d and f Block Elements", ["Transition Elements", "Properties of First Series", "Lanthanoids", "Actinoids"]),
    u("Coordination Compounds", ["Werner's Theory", "Nomenclature", "Isomerism", "VBT & CFT", "Applications"]),
    u("Haloalkanes & Haloarenes", ["Nomenclature", "Preparation Methods", "Reactions of Haloalkanes", "Reactions of Haloarenes"]),
    u("Alcohols, Phenols & Ethers", ["Preparation of Alcohols", "Properties of Alcohols", "Phenols", "Ethers"]),
    u("Aldehydes, Ketones & Carboxylic Acids", ["Preparation Methods", "Nucleophilic Addition", "Oxidation & Reduction", "Carboxylic Acids"]),
    u("Amines", ["Classification & Preparation", "Physical & Chemical Properties", "Diazonium Salts"]),
    u("Biomolecules", ["Carbohydrates", "Proteins", "Nucleic Acids", "Vitamins & Hormones"]),
    u("Polymers", ["Classification", "Addition Polymerisation", "Condensation Polymerisation", "Biodegradable Polymers"]),
    u("Chemistry in Everyday Life", ["Drugs & Their Classification", "Chemicals in Food", "Cleansing Agents"]),
  ],
};

const cbse12Biology: PresetSubject = {
  aliases: ["biology", "bio"],
  units: [
    u("Reproduction", ["Reproduction in Organisms", "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health"]),
    u("Genetics & Evolution", ["Principles of Inheritance", "Molecular Basis of Inheritance", "Evolution"]),
    u("Biology in Human Welfare", ["Human Health & Disease", "Strategies for Food Production", "Microbes in Human Welfare"]),
    u("Biotechnology", ["Principles & Processes", "Biotechnology Applications"]),
    u("Ecology", ["Organisms & Populations", "Ecosystem", "Biodiversity & Conservation", "Environmental Issues"]),
  ],
};

const cbse12English: PresetSubject = {
  aliases: ["english", "english core"],
  units: [
    u("Reading", ["Unseen Passages", "Note Making & Summary"]),
    u("Writing", ["Notice & Invitation", "Letters (Formal/Informal)", "Article & Report Writing"]),
    u("Grammar", ["Tenses", "Modals", "Reported Speech", "Editing"]),
    u("Flamingo — Prose", ["The Last Lesson", "Lost Spring", "Deep Water", "The Rattrap", "Indigo", "Poets & Pancakes", "The Interview", "Going Places"]),
    u("Flamingo — Poetry", ["My Mother at Sixty-Six", "An Elementary School Classroom", "Keeping Quiet", "A Thing of Beauty", "Aunt Jennifer's Tigers"]),
    u("Vistas (Supplementary)", ["The Third Level", "The Tiger King", "Journey to the End of the Earth", "The Enemy", "On the Face of It", "Memories of Childhood"]),
  ],
};

// ────────────── CBSE Class 11 ──────────────

const cbse11Maths: PresetSubject = {
  aliases: ["mathematics", "maths", "math"],
  units: [
    u("Sets & Functions", ["Sets", "Relations & Functions", "Trigonometric Functions"]),
    u("Algebra", ["Complex Numbers", "Linear Inequalities", "Permutations & Combinations", "Binomial Theorem", "Sequences & Series"]),
    u("Coordinate Geometry", ["Straight Lines", "Conic Sections", "3D Geometry Intro"]),
    u("Calculus", ["Limits", "Derivatives"]),
    u("Mathematical Reasoning", ["Statements", "Logical Connectives"]),
    u("Statistics & Probability", ["Measures of Dispersion", "Probability"]),
  ],
};

const cbse11Physics: PresetSubject = {
  aliases: ["physics"],
  units: [
    u("Physical World & Measurement", ["Units & Measurements", "Dimensional Analysis"]),
    u("Kinematics", ["Motion in Straight Line", "Motion in a Plane", "Projectile Motion"]),
    u("Laws of Motion", ["Newton's Laws", "Friction", "Circular Motion"]),
    u("Work, Energy & Power", ["Work-Energy Theorem", "Conservation of Energy", "Power"]),
    u("Rotational Motion", ["Centre of Mass", "Torque & Angular Momentum", "Moment of Inertia"]),
    u("Gravitation", ["Kepler's Laws", "Gravitational Potential", "Satellites"]),
    u("Properties of Matter", ["Elasticity", "Fluid Mechanics", "Surface Tension"]),
    u("Thermodynamics", ["Laws of Thermodynamics", "Heat Engines", "Kinetic Theory"]),
    u("Oscillations & Waves", ["SHM", "Wave Motion", "Sound Waves"]),
  ],
};

const cbse11Chemistry: PresetSubject = {
  aliases: ["chemistry"],
  units: [
    u("Some Basic Concepts of Chemistry", ["Mole Concept", "Stoichiometry"]),
    u("Structure of Atom", ["Atomic Models", "Quantum Numbers", "Electronic Configuration"]),
    u("Classification of Elements & Periodicity", ["Modern Periodic Table", "Periodic Trends"]),
    u("Chemical Bonding", ["Ionic & Covalent Bond", "VSEPR Theory", "Hybridisation", "MOT"]),
    u("States of Matter", ["Gas Laws", "Liquefaction", "Liquid State"]),
    u("Thermodynamics", ["First Law", "Enthalpy", "Entropy & Gibbs Energy"]),
    u("Equilibrium", ["Chemical Equilibrium", "Ionic Equilibrium", "pH & Buffers"]),
    u("Redox Reactions", ["Oxidation Number", "Balancing Redox", "Electrochemical Cells"]),
    u("Hydrogen & s-Block", ["Hydrogen", "Group 1 & 2 Elements"]),
    u("p-Block (Group 13 & 14)", ["Group 13", "Group 14"]),
    u("Organic Chemistry Basics", ["IUPAC Nomenclature", "Isomerism", "Reaction Mechanisms"]),
    u("Hydrocarbons", ["Alkanes", "Alkenes", "Alkynes", "Aromatic Hydrocarbons"]),
    u("Environmental Chemistry", ["Atmospheric Pollution", "Water Pollution"]),
  ],
};

const cbse11Biology: PresetSubject = {
  aliases: ["biology", "bio"],
  units: [
    u("Diversity of Living World", ["Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom"]),
    u("Structural Organisation", ["Morphology of Flowering Plants", "Anatomy of Plants", "Structural Organisation in Animals"]),
    u("Cell Structure & Function", ["Cell: The Unit of Life", "Biomolecules", "Cell Cycle & Cell Division"]),
    u("Plant Physiology", ["Photosynthesis", "Respiration in Plants", "Plant Growth & Development"]),
    u("Human Physiology", ["Digestion & Absorption", "Breathing & Exchange of Gases", "Body Fluids & Circulation", "Excretory Products", "Locomotion", "Neural Control", "Chemical Coordination"]),
  ],
};

// ────────────── CBSE Class 9-10 (Maths/Science/SST already covered in templates) ──────────────

const cbse10Maths: PresetSubject = {
  aliases: ["mathematics", "maths", "math"],
  units: [
    u("Real Numbers", ["Euclid's Division Lemma", "Fundamental Theorem of Arithmetic", "Irrational Numbers"]),
    u("Polynomials", ["Zeros & Coefficients", "Division Algorithm"]),
    u("Pair of Linear Equations", ["Graphical Method", "Substitution & Elimination", "Cross Multiplication"]),
    u("Quadratic Equations", ["Factorisation", "Quadratic Formula", "Nature of Roots"]),
    u("Arithmetic Progressions", ["nth Term", "Sum of n Terms"]),
    u("Triangles", ["Similarity", "BPT Theorem", "Pythagoras Theorem"]),
    u("Coordinate Geometry", ["Distance Formula", "Section Formula", "Area of Triangle"]),
    u("Trigonometry", ["Ratios", "Identities", "Heights & Distances"]),
    u("Circles", ["Tangent to Circle", "Number of Tangents"]),
    u("Areas Related to Circles", ["Sector & Segment", "Areas of Combinations"]),
    u("Surface Areas & Volumes", ["Combinations of Solids", "Conversion of Solids"]),
    u("Statistics & Probability", ["Mean/Median/Mode", "Probability"]),
  ],
};

const cbse10Science: PresetSubject = {
  aliases: ["science"],
  units: [
    u("Chemical Reactions & Equations", ["Types of Reactions", "Balancing", "Corrosion & Rancidity"]),
    u("Acids, Bases & Salts", ["Properties", "pH Scale", "Common Salts"]),
    u("Metals & Non-metals", ["Reactivity Series", "Ionic Compounds", "Extraction"]),
    u("Carbon & Its Compounds", ["Covalent Bonding", "Homologous Series", "Important Compounds"]),
    u("Life Processes", ["Nutrition", "Respiration", "Transportation", "Excretion"]),
    u("Control & Coordination", ["Nervous System", "Hormones in Animals & Plants"]),
    u("Reproduction", ["Asexual & Sexual", "Reproductive Health"]),
    u("Heredity & Evolution", ["Mendel's Laws", "Evolution"]),
    u("Light", ["Reflection", "Refraction", "Lenses"]),
    u("Human Eye & Colourful World", ["Eye Defects", "Dispersion", "Scattering"]),
    u("Electricity", ["Ohm's Law", "Resistance", "Series & Parallel"]),
    u("Magnetic Effects of Current", ["Magnetic Field", "Electromagnetic Induction", "Domestic Circuits"]),
    u("Our Environment", ["Ecosystem", "Ozone Depletion", "Waste Management"]),
  ],
};

// ────────────── Engineering / Generic University ──────────────

const genericEngineering: PresetSubject = {
  aliases: ["__engineering_default__"], // matched as fallback
  units: [
    u("Unit 1: Introduction & Fundamentals", ["Overview", "Basic Concepts", "Key Terminology"]),
    u("Unit 2: Core Principles", ["Theoretical Foundations", "Important Theorems", "Worked Examples"]),
    u("Unit 3: Methods & Techniques", ["Standard Methods", "Problem-solving Approaches", "Case Studies"]),
    u("Unit 4: Applications", ["Real-world Applications", "Design Considerations", "Industry Examples"]),
    u("Unit 5: Advanced Topics", ["Advanced Concepts", "Modern Developments", "Research Trends"]),
    u("Unit 6: Review & Practice", ["Numerical Problems", "Previous Year Questions", "Mock Tests"]),
  ],
};

// Specific known engineering subjects
const engineeringSubjects: PresetSubject[] = [
  {
    aliases: ["bee", "basic electrical engineering"],
    units: [
      u("DC Circuits", ["Ohm's & Kirchhoff's Laws", "Mesh & Nodal Analysis", "Network Theorems", "Star-Delta Transformation"]),
      u("AC Fundamentals", ["Sinusoidal Sources", "RMS & Average Values", "Phasor Representation", "RLC Series & Parallel"]),
      u("Three-Phase Systems", ["Star & Delta Connections", "Power in 3-Phase", "Power Measurement"]),
      u("Magnetic Circuits & Transformers", ["Magnetic Circuits", "Single-Phase Transformer", "Auto-transformers", "Losses & Efficiency"]),
      u("Electrical Machines", ["DC Machines", "Induction Motors", "Synchronous Machines"]),
      u("Electrical Installations", ["Wiring Systems", "Earthing", "Safety & Protection", "Tariffs"]),
    ],
  },
  {
    aliases: ["advanced calculus", "engineering mathematics", "engineering maths", "calculus"],
    units: [
      u("Differential Calculus", ["Limits & Continuity", "Differentiation Rules", "Mean Value Theorems", "Taylor & Maclaurin Series"]),
      u("Partial Differentiation", ["Partial Derivatives", "Euler's Theorem", "Jacobians", "Maxima & Minima"]),
      u("Integral Calculus", ["Definite & Indefinite Integrals", "Beta & Gamma Functions", "Reduction Formulae"]),
      u("Multiple Integrals", ["Double Integrals", "Triple Integrals", "Change of Order", "Applications"]),
      u("Vector Calculus", ["Gradient, Divergence, Curl", "Line Integrals", "Surface & Volume Integrals", "Green's, Stokes' & Gauss Theorems"]),
      u("Differential Equations", ["First Order ODE", "Higher Order Linear ODE", "Applications"]),
    ],
  },
  {
    aliases: ["engineering graphics", "engineering drawing"],
    units: [
      u("Introduction & Standards", ["Drawing Instruments", "BIS Conventions", "Lettering & Dimensioning"]),
      u("Engineering Curves", ["Conic Sections", "Cycloidal Curves", "Involutes & Spirals"]),
      u("Orthographic Projections", ["Projection of Points", "Projection of Lines", "Projection of Planes"]),
      u("Projection of Solids", ["Prisms & Pyramids", "Cylinders & Cones", "Sections of Solids"]),
      u("Development of Surfaces", ["Parallel Line Method", "Radial Line Method", "Triangulation Method"]),
      u("Isometric Projections", ["Isometric Scale", "Isometric Views", "Conversion from Orthographic"]),
    ],
  },
  {
    aliases: ["python", "programming in python", "python programming"],
    units: [
      u("Python Basics", ["Installation & IDEs", "Variables & Data Types", "Operators", "Input/Output"]),
      u("Control Flow", ["Conditionals", "Loops", "Break/Continue", "Comprehensions"]),
      u("Functions & Modules", ["Function Definition", "Arguments & Scope", "Lambda Functions", "Modules & Packages"]),
      u("Data Structures", ["Lists & Tuples", "Dictionaries & Sets", "Strings", "Iterators & Generators"]),
      u("OOP in Python", ["Classes & Objects", "Inheritance", "Polymorphism", "Magic Methods"]),
      u("Files, Exceptions & Libraries", ["File I/O", "Exception Handling", "NumPy & Pandas Intro", "Matplotlib Intro"]),
    ],
  },
];

// ────────────── Lookup ──────────────

type ClassKey = "9" | "10" | "11" | "12";
type BoardKey = "cbse" | "icse";

const CBSE_BY_CLASS: Record<ClassKey, PresetSubject[]> = {
  "9": [cbse10Maths, cbse10Science, cbse12English],
  "10": [cbse10Maths, cbse10Science, cbse12English],
  "11": [cbse11Maths, cbse11Physics, cbse11Chemistry, cbse11Biology, cbse12English],
  "12": [cbse12Maths, cbse12Physics, cbse12Chemistry, cbse12Biology, cbse12English],
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ");
}

export type SyllabusContext = {
  educationType?: string | null;
  classLevel?: string | number | null;
  board?: string | null;
};

export function findPresetUnits(subjectName: string, ctx: SyllabusContext = {}): PresetUnit[] | null {
  const norm = normalize(subjectName);
  if (!norm) return null;

  const classKey = ctx.classLevel != null ? String(ctx.classLevel).replace(/[^0-9]/g, "") : "";
  const isSchool = ctx.educationType === "school" || ["9", "10", "11", "12"].includes(classKey);
  const board = (ctx.board || "").toLowerCase().includes("icse") ? "icse" : "cbse";

  // 1) Class-based CBSE/ICSE lookup
  if (isSchool && (classKey === "9" || classKey === "10" || classKey === "11" || classKey === "12") && board === "cbse") {
    const list = CBSE_BY_CLASS[classKey as ClassKey];
    const found = list.find((s) => s.aliases.some((a) => a === norm || norm.includes(a)));
    if (found) return found.units;
  }

  // 2) Engineering specific
  const engHit = engineeringSubjects.find((s) => s.aliases.some((a) => a === norm || norm.includes(a)));
  if (engHit) return engHit.units;

  // 3) Generic engineering fallback for undergraduate/postgraduate
  if (ctx.educationType === "undergraduate" || ctx.educationType === "postgraduate") {
    return genericEngineering.units;
  }

  return null;
}

export function describePreset(units: PresetUnit[]): string {
  const topics = units.reduce((a, u) => a + u.topics.length, 0);
  return `${units.length} units · ${topics} topics`;
}

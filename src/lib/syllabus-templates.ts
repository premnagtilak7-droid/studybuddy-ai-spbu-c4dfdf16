// Pre-built syllabus templates for all education types

export type SubtopicTemplate = {
  name: string;
  difficulty: "easy" | "medium" | "hard";
};

export type TopicTemplate = {
  name: string;
  priority: "high" | "medium" | "low";
  subtopics?: SubtopicTemplate[];
};

export type UnitTemplate = {
  name: string;
  topics: TopicTemplate[];
};

export type SubjectTemplate = {
  name: string;
  code: string;
  units: UnitTemplate[];
};

export type TemplateCategory = {
  label: string;
  description: string;
  subjects: SubjectTemplate[];
};

// ──────────── SCHOOL TEMPLATES ────────────

const schoolMaths10: SubjectTemplate = {
  name: "Mathematics", code: "MATH",
  units: [
    { name: "Real Numbers", topics: [
      { name: "Euclid's Division Lemma", priority: "high", subtopics: [{ name: "HCF using division", difficulty: "medium" }] },
      { name: "Fundamental Theorem of Arithmetic", priority: "high" },
      { name: "Irrational Numbers", priority: "medium" },
      { name: "Rational & Decimal Expansions", priority: "medium" },
    ]},
    { name: "Polynomials", topics: [
      { name: "Zeros of a Polynomial", priority: "high" },
      { name: "Relationship between Zeros & Coefficients", priority: "high" },
      { name: "Division Algorithm", priority: "medium" },
    ]},
    { name: "Linear Equations", topics: [
      { name: "Pair of Linear Equations", priority: "high" },
      { name: "Graphical Method", priority: "medium" },
      { name: "Substitution & Elimination", priority: "high" },
      { name: "Cross Multiplication", priority: "medium" },
    ]},
    { name: "Quadratic Equations", topics: [
      { name: "Factorization Method", priority: "high" },
      { name: "Completing the Square", priority: "medium" },
      { name: "Quadratic Formula", priority: "high" },
      { name: "Nature of Roots", priority: "high" },
    ]},
    { name: "Arithmetic Progressions", topics: [
      { name: "nth Term of AP", priority: "high" },
      { name: "Sum of n Terms", priority: "high" },
      { name: "Applications of AP", priority: "medium" },
    ]},
    { name: "Triangles", topics: [
      { name: "Similarity of Triangles", priority: "high" },
      { name: "BPT Theorem", priority: "high" },
      { name: "Pythagoras Theorem", priority: "high" },
    ]},
  ],
};

const schoolScience10: SubjectTemplate = {
  name: "Science", code: "SCI",
  units: [
    { name: "Chemical Reactions", topics: [
      { name: "Types of Chemical Reactions", priority: "high" },
      { name: "Balancing Equations", priority: "high" },
      { name: "Corrosion & Rancidity", priority: "medium" },
    ]},
    { name: "Acids, Bases & Salts", topics: [
      { name: "Properties of Acids & Bases", priority: "high" },
      { name: "pH Scale", priority: "high" },
      { name: "Salts & their Preparation", priority: "medium" },
    ]},
    { name: "Life Processes", topics: [
      { name: "Nutrition", priority: "high" },
      { name: "Respiration", priority: "high" },
      { name: "Transportation", priority: "medium" },
      { name: "Excretion", priority: "medium" },
    ]},
    { name: "Electricity", topics: [
      { name: "Ohm's Law", priority: "high" },
      { name: "Resistance & Resistivity", priority: "high" },
      { name: "Series & Parallel Circuits", priority: "high" },
      { name: "Electric Power", priority: "medium" },
    ]},
    { name: "Light", topics: [
      { name: "Reflection", priority: "high" },
      { name: "Refraction", priority: "high" },
      { name: "Lenses & Mirror Formula", priority: "high" },
    ]},
    { name: "Environment", topics: [
      { name: "Ecosystem", priority: "medium" },
      { name: "Ozone Depletion", priority: "low" },
      { name: "Waste Management", priority: "low" },
    ]},
  ],
};

const schoolEnglish: SubjectTemplate = {
  name: "English", code: "ENG",
  units: [
    { name: "Reading Comprehension", topics: [
      { name: "Unseen Passages", priority: "high" },
      { name: "Note Making", priority: "medium" },
    ]},
    { name: "Writing Skills", topics: [
      { name: "Letter Writing", priority: "high" },
      { name: "Essay Writing", priority: "high" },
      { name: "Notice & Article", priority: "medium" },
    ]},
    { name: "Grammar", topics: [
      { name: "Tenses", priority: "high" },
      { name: "Active & Passive Voice", priority: "high" },
      { name: "Direct & Indirect Speech", priority: "high" },
      { name: "Clauses", priority: "medium" },
    ]},
    { name: "Literature - Prose", topics: [
      { name: "Chapter Summaries", priority: "high" },
      { name: "Character Analysis", priority: "medium" },
      { name: "Important Questions", priority: "high" },
    ]},
    { name: "Literature - Poetry", topics: [
      { name: "Poem Analysis", priority: "high" },
      { name: "Figures of Speech", priority: "medium" },
    ]},
    { name: "Supplementary Reader", topics: [
      { name: "Story Summaries", priority: "medium" },
      { name: "Theme Analysis", priority: "medium" },
    ]},
  ],
};

const schoolSocialStudies: SubjectTemplate = {
  name: "Social Studies", code: "SST",
  units: [
    { name: "History", topics: [
      { name: "Nationalism in India", priority: "high" },
      { name: "French Revolution", priority: "high" },
      { name: "Industrial Revolution", priority: "medium" },
    ]},
    { name: "Geography", topics: [
      { name: "Resources & Development", priority: "high" },
      { name: "Agriculture", priority: "medium" },
      { name: "Minerals & Energy", priority: "medium" },
    ]},
    { name: "Civics", topics: [
      { name: "Democracy & Diversity", priority: "high" },
      { name: "Political Parties", priority: "medium" },
      { name: "Federalism", priority: "high" },
    ]},
    { name: "Economics", topics: [
      { name: "Development", priority: "high" },
      { name: "Money & Credit", priority: "medium" },
      { name: "Globalisation", priority: "medium" },
    ]},
  ],
};

const schoolHindi: SubjectTemplate = {
  name: "Hindi", code: "HIN",
  units: [
    { name: "गद्य खंड", topics: [
      { name: "पाठ सारांश", priority: "high" },
      { name: "प्रश्न-उत्तर", priority: "high" },
    ]},
    { name: "काव्य खंड", topics: [
      { name: "कविता व्याख्या", priority: "high" },
      { name: "भाव प्रश्न", priority: "medium" },
    ]},
    { name: "व्याकरण", topics: [
      { name: "संधि", priority: "high" },
      { name: "समास", priority: "high" },
      { name: "मुहावरे व लोकोक्तियाँ", priority: "medium" },
      { name: "पत्र लेखन", priority: "medium" },
    ]},
    { name: "लेखन", topics: [
      { name: "निबंध", priority: "high" },
      { name: "अनुच्छेद", priority: "medium" },
    ]},
  ],
};

// ──────────── JEE TEMPLATES ────────────

const jeePhysics: SubjectTemplate = {
  name: "Physics", code: "PHY",
  units: [
    { name: "Mechanics", topics: [
      { name: "Kinematics", priority: "high", subtopics: [
        { name: "Motion in 1D", difficulty: "easy" },
        { name: "Projectile Motion", difficulty: "medium" },
        { name: "Relative Motion", difficulty: "hard" },
      ]},
      { name: "Laws of Motion", priority: "high", subtopics: [
        { name: "Newton's Laws", difficulty: "medium" },
        { name: "Friction", difficulty: "medium" },
        { name: "Circular Motion", difficulty: "hard" },
      ]},
      { name: "Work, Energy & Power", priority: "high" },
      { name: "Rotational Motion", priority: "high", subtopics: [
        { name: "Moment of Inertia", difficulty: "hard" },
        { name: "Angular Momentum", difficulty: "hard" },
        { name: "Rolling Motion", difficulty: "hard" },
      ]},
      { name: "Gravitation", priority: "medium" },
    ]},
    { name: "Waves & Thermodynamics", topics: [
      { name: "SHM", priority: "high" },
      { name: "Waves", priority: "high" },
      { name: "Thermodynamics", priority: "high" },
      { name: "Kinetic Theory of Gases", priority: "medium" },
      { name: "Heat Transfer", priority: "medium" },
    ]},
    { name: "Electrodynamics", topics: [
      { name: "Electrostatics", priority: "high" },
      { name: "Current Electricity", priority: "high" },
      { name: "Capacitors", priority: "high" },
      { name: "Magnetism", priority: "high" },
      { name: "Electromagnetic Induction", priority: "high" },
    ]},
    { name: "Optics", topics: [
      { name: "Ray Optics", priority: "high" },
      { name: "Wave Optics", priority: "high" },
      { name: "Optical Instruments", priority: "low" },
    ]},
    { name: "Modern Physics", topics: [
      { name: "Photoelectric Effect", priority: "high" },
      { name: "Atomic Structure", priority: "medium" },
      { name: "Nuclear Physics", priority: "medium" },
      { name: "Semiconductor Devices", priority: "medium" },
    ]},
  ],
};

const jeeChemistry: SubjectTemplate = {
  name: "Chemistry", code: "CHEM",
  units: [
    { name: "Physical Chemistry", topics: [
      { name: "Mole Concept & Stoichiometry", priority: "high" },
      { name: "Atomic Structure", priority: "high" },
      { name: "Chemical Bonding", priority: "high" },
      { name: "Thermodynamics & Thermochemistry", priority: "high" },
      { name: "Equilibrium", priority: "high" },
      { name: "Electrochemistry", priority: "high" },
      { name: "Chemical Kinetics", priority: "high" },
    ]},
    { name: "Inorganic Chemistry", topics: [
      { name: "Periodic Table & Properties", priority: "high" },
      { name: "s-Block Elements", priority: "medium" },
      { name: "p-Block Elements", priority: "high" },
      { name: "d & f Block Elements", priority: "medium" },
      { name: "Coordination Compounds", priority: "high" },
      { name: "Qualitative Analysis", priority: "medium" },
    ]},
    { name: "Organic Chemistry", topics: [
      { name: "GOC & Isomerism", priority: "high" },
      { name: "Hydrocarbons", priority: "high" },
      { name: "Alkyl Halides", priority: "high" },
      { name: "Alcohols & Ethers", priority: "high" },
      { name: "Aldehydes & Ketones", priority: "high" },
      { name: "Carboxylic Acids", priority: "medium" },
      { name: "Amines", priority: "medium" },
      { name: "Biomolecules & Polymers", priority: "low" },
    ]},
  ],
};

const jeeMaths: SubjectTemplate = {
  name: "Mathematics", code: "MATH",
  units: [
    { name: "Algebra", topics: [
      { name: "Quadratic Equations", priority: "high" },
      { name: "Complex Numbers", priority: "high" },
      { name: "Sequences & Series", priority: "high" },
      { name: "Permutations & Combinations", priority: "high" },
      { name: "Binomial Theorem", priority: "medium" },
      { name: "Matrices & Determinants", priority: "high" },
    ]},
    { name: "Calculus", topics: [
      { name: "Limits & Continuity", priority: "high" },
      { name: "Differentiation", priority: "high" },
      { name: "Application of Derivatives", priority: "high" },
      { name: "Indefinite Integration", priority: "high" },
      { name: "Definite Integration", priority: "high" },
      { name: "Differential Equations", priority: "high" },
    ]},
    { name: "Coordinate Geometry", topics: [
      { name: "Straight Lines", priority: "high" },
      { name: "Circles", priority: "high" },
      { name: "Parabola", priority: "high" },
      { name: "Ellipse", priority: "medium" },
      { name: "Hyperbola", priority: "medium" },
    ]},
    { name: "Trigonometry", topics: [
      { name: "Trigonometric Ratios & Identities", priority: "high" },
      { name: "Trigonometric Equations", priority: "high" },
      { name: "Inverse Trigonometry", priority: "medium" },
      { name: "Properties of Triangles", priority: "medium" },
    ]},
    { name: "Vectors & 3D", topics: [
      { name: "Vectors", priority: "high" },
      { name: "3D Geometry", priority: "high" },
    ]},
    { name: "Probability & Statistics", topics: [
      { name: "Probability", priority: "high" },
      { name: "Statistics", priority: "medium" },
    ]},
  ],
};

// ──────────── NEET TEMPLATES ────────────

const neetBiology: SubjectTemplate = {
  name: "Biology", code: "BIO",
  units: [
    { name: "Cell Biology", topics: [
      { name: "Cell Structure", priority: "high" },
      { name: "Cell Division", priority: "high" },
      { name: "Biomolecules", priority: "high" },
    ]},
    { name: "Genetics & Evolution", topics: [
      { name: "Mendelian Genetics", priority: "high" },
      { name: "Molecular Basis of Inheritance", priority: "high" },
      { name: "Evolution", priority: "medium" },
    ]},
    { name: "Human Physiology", topics: [
      { name: "Digestion & Absorption", priority: "high" },
      { name: "Breathing & Gas Exchange", priority: "high" },
      { name: "Circulation", priority: "high" },
      { name: "Excretion", priority: "high" },
      { name: "Neural Control", priority: "high" },
      { name: "Endocrine System", priority: "medium" },
    ]},
    { name: "Plant Physiology", topics: [
      { name: "Photosynthesis", priority: "high" },
      { name: "Respiration in Plants", priority: "medium" },
      { name: "Plant Growth", priority: "medium" },
      { name: "Transport in Plants", priority: "medium" },
    ]},
    { name: "Ecology & Environment", topics: [
      { name: "Organisms & Populations", priority: "high" },
      { name: "Ecosystem", priority: "high" },
      { name: "Biodiversity", priority: "medium" },
      { name: "Environmental Issues", priority: "low" },
    ]},
    { name: "Reproduction", topics: [
      { name: "Sexual Reproduction in Plants", priority: "high" },
      { name: "Human Reproduction", priority: "high" },
      { name: "Reproductive Health", priority: "medium" },
    ]},
  ],
};

// ──────────── UPSC TEMPLATES ────────────

const upscGS1: SubjectTemplate = {
  name: "GS Paper 1", code: "GS1",
  units: [
    { name: "Indian Heritage & Culture", topics: [
      { name: "Art Forms", priority: "high" },
      { name: "Literature", priority: "medium" },
      { name: "Architecture", priority: "medium" },
    ]},
    { name: "Modern Indian History", topics: [
      { name: "Freedom Struggle", priority: "high" },
      { name: "Post-Independence India", priority: "high" },
      { name: "Social Reform Movements", priority: "medium" },
    ]},
    { name: "World History", topics: [
      { name: "World Wars", priority: "high" },
      { name: "Colonization & Decolonization", priority: "high" },
      { name: "Industrial Revolution", priority: "medium" },
    ]},
    { name: "Indian Geography", topics: [
      { name: "Physical Geography of India", priority: "high" },
      { name: "Economic Geography", priority: "high" },
      { name: "Climate & Monsoons", priority: "medium" },
    ]},
    { name: "World Geography", topics: [
      { name: "Geomorphology", priority: "medium" },
      { name: "Oceanography", priority: "medium" },
      { name: "Climatology", priority: "medium" },
    ]},
    { name: "Indian Society", topics: [
      { name: "Diversity", priority: "high" },
      { name: "Women & Population Issues", priority: "high" },
      { name: "Urbanization", priority: "medium" },
    ]},
  ],
};

const upscGS2: SubjectTemplate = {
  name: "GS Paper 2", code: "GS2",
  units: [
    { name: "Indian Constitution", topics: [
      { name: "Historical Background", priority: "high" },
      { name: "Fundamental Rights & DPSP", priority: "high" },
      { name: "Amendment Process", priority: "medium" },
    ]},
    { name: "Governance", topics: [
      { name: "Government Policies", priority: "high" },
      { name: "E-Governance", priority: "medium" },
      { name: "Transparency & Accountability", priority: "high" },
    ]},
    { name: "Social Justice", topics: [
      { name: "Welfare Schemes", priority: "high" },
      { name: "Health & Education", priority: "high" },
      { name: "Vulnerable Sections", priority: "medium" },
    ]},
    { name: "International Relations", topics: [
      { name: "India & Neighbours", priority: "high" },
      { name: "International Organizations", priority: "high" },
      { name: "Bilateral Relations", priority: "medium" },
    ]},
  ],
};

const upscGS3: SubjectTemplate = {
  name: "GS Paper 3", code: "GS3",
  units: [
    { name: "Indian Economy", topics: [
      { name: "Planning & Liberalization", priority: "high" },
      { name: "Inclusive Growth", priority: "high" },
      { name: "Budgeting", priority: "medium" },
      { name: "Agriculture & Food Processing", priority: "high" },
    ]},
    { name: "Science & Technology", topics: [
      { name: "IT & Space", priority: "high" },
      { name: "Nuclear Technology", priority: "medium" },
      { name: "Biotechnology", priority: "medium" },
    ]},
    { name: "Environment & Ecology", topics: [
      { name: "Conservation", priority: "high" },
      { name: "Biodiversity", priority: "high" },
      { name: "Climate Change", priority: "high" },
      { name: "Environmental Laws", priority: "medium" },
    ]},
    { name: "Internal Security", topics: [
      { name: "Terrorism & Extremism", priority: "high" },
      { name: "Cyber Security", priority: "high" },
      { name: "Border Management", priority: "medium" },
    ]},
  ],
};

const upscGS4: SubjectTemplate = {
  name: "GS Paper 4 (Ethics)", code: "GS4",
  units: [
    { name: "Ethics & Human Interface", topics: [
      { name: "Ethics & Morality", priority: "high" },
      { name: "Attitude & Aptitude", priority: "high" },
      { name: "Emotional Intelligence", priority: "medium" },
    ]},
    { name: "Public Administration Ethics", topics: [
      { name: "Ethical Governance", priority: "high" },
      { name: "Probity in Governance", priority: "high" },
      { name: "Corruption", priority: "medium" },
    ]},
    { name: "Case Studies", topics: [
      { name: "Case Study Approach", priority: "high" },
      { name: "Ethical Dilemmas", priority: "high" },
    ]},
  ],
};

const upscEssay: SubjectTemplate = {
  name: "Essay", code: "ESS",
  units: [
    { name: "Philosophy & Society", topics: [
      { name: "Social Issues", priority: "high" },
      { name: "Philosophical Topics", priority: "medium" },
    ]},
    { name: "Economy & Polity", topics: [
      { name: "Economic Topics", priority: "high" },
      { name: "Political Topics", priority: "high" },
    ]},
    { name: "Science & Culture", topics: [
      { name: "Science & Technology", priority: "medium" },
      { name: "Culture & Heritage", priority: "medium" },
    ]},
    { name: "Essay Writing Practice", topics: [
      { name: "Structure & Framework", priority: "high" },
      { name: "Content Building", priority: "high" },
    ]},
  ],
};

// ──────────── CAT TEMPLATES ────────────

const catQuant: SubjectTemplate = {
  name: "Quantitative Aptitude", code: "QA",
  units: [
    { name: "Arithmetic", topics: [
      { name: "Percentages", priority: "high" },
      { name: "Profit & Loss", priority: "high" },
      { name: "SI & CI", priority: "high" },
      { name: "Ratio & Proportion", priority: "high" },
      { name: "Time & Work", priority: "high" },
      { name: "Time, Speed & Distance", priority: "high" },
      { name: "Mixtures & Alligations", priority: "medium" },
    ]},
    { name: "Algebra", topics: [
      { name: "Linear Equations", priority: "high" },
      { name: "Quadratic Equations", priority: "high" },
      { name: "Inequalities", priority: "medium" },
      { name: "Functions & Graphs", priority: "medium" },
      { name: "Logarithms", priority: "medium" },
    ]},
    { name: "Number System", topics: [
      { name: "Divisibility & Remainders", priority: "high" },
      { name: "HCF & LCM", priority: "high" },
      { name: "Factors", priority: "medium" },
      { name: "Base System", priority: "low" },
    ]},
    { name: "Geometry & Mensuration", topics: [
      { name: "Triangles & Polygons", priority: "high" },
      { name: "Circles", priority: "high" },
      { name: "Mensuration (Area & Volume)", priority: "high" },
      { name: "Coordinate Geometry", priority: "medium" },
    ]},
    { name: "Modern Maths", topics: [
      { name: "Permutations & Combinations", priority: "high" },
      { name: "Probability", priority: "high" },
      { name: "Set Theory", priority: "medium" },
    ]},
  ],
};

const catVARC: SubjectTemplate = {
  name: "VARC", code: "VARC",
  units: [
    { name: "Reading Comprehension", topics: [
      { name: "Science & Tech Passages", priority: "high" },
      { name: "Social Science Passages", priority: "high" },
      { name: "Abstract & Philosophy Passages", priority: "high" },
      { name: "Business & Economics Passages", priority: "medium" },
    ]},
    { name: "Verbal Ability", topics: [
      { name: "Para Jumbles", priority: "high" },
      { name: "Para Summary", priority: "high" },
      { name: "Odd Sentence Out", priority: "high" },
      { name: "Sentence Completion", priority: "medium" },
    ]},
    { name: "Vocabulary & Grammar", topics: [
      { name: "Vocabulary Building", priority: "medium" },
      { name: "Grammar Rules", priority: "medium" },
      { name: "Critical Reasoning", priority: "high" },
    ]},
  ],
};

const catDILR: SubjectTemplate = {
  name: "DILR", code: "DILR",
  units: [
    { name: "Data Interpretation", topics: [
      { name: "Tables & Charts", priority: "high" },
      { name: "Bar & Line Graphs", priority: "high" },
      { name: "Pie Charts", priority: "high" },
      { name: "Caselets", priority: "high" },
    ]},
    { name: "Logical Reasoning", topics: [
      { name: "Arrangements", priority: "high" },
      { name: "Puzzles", priority: "high" },
      { name: "Binary Logic", priority: "medium" },
      { name: "Games & Tournaments", priority: "high" },
      { name: "Networks & Routes", priority: "medium" },
    ]},
    { name: "Advanced Sets", topics: [
      { name: "Venn Diagrams", priority: "medium" },
      { name: "Cubes & Dice", priority: "medium" },
      { name: "Maxima-Minima based sets", priority: "high" },
    ]},
  ],
};

// ──────────── SSC/BANKING TEMPLATES ────────────

const sscReasoning: SubjectTemplate = {
  name: "Reasoning", code: "RSN",
  units: [
    { name: "Verbal Reasoning", topics: [
      { name: "Analogy", priority: "high" },
      { name: "Classification", priority: "high" },
      { name: "Series (Number/Letter)", priority: "high" },
      { name: "Coding-Decoding", priority: "high" },
      { name: "Blood Relations", priority: "medium" },
      { name: "Direction Sense", priority: "medium" },
    ]},
    { name: "Non-Verbal Reasoning", topics: [
      { name: "Pattern Recognition", priority: "high" },
      { name: "Mirror & Water Images", priority: "medium" },
      { name: "Paper Folding", priority: "medium" },
      { name: "Figure Completion", priority: "medium" },
    ]},
    { name: "Logical Reasoning", topics: [
      { name: "Syllogisms", priority: "high" },
      { name: "Statements & Assumptions", priority: "high" },
      { name: "Seating Arrangement", priority: "high" },
      { name: "Order & Ranking", priority: "medium" },
    ]},
  ],
};

const sscEnglish: SubjectTemplate = {
  name: "English", code: "ENG",
  units: [
    { name: "Grammar", topics: [
      { name: "Error Spotting", priority: "high" },
      { name: "Fill in the Blanks", priority: "high" },
      { name: "Sentence Improvement", priority: "high" },
      { name: "Active/Passive Voice", priority: "medium" },
      { name: "Direct/Indirect Speech", priority: "medium" },
    ]},
    { name: "Vocabulary", topics: [
      { name: "Synonyms & Antonyms", priority: "high" },
      { name: "Idioms & Phrases", priority: "high" },
      { name: "One Word Substitution", priority: "medium" },
      { name: "Spelling Correction", priority: "medium" },
    ]},
    { name: "Comprehension", topics: [
      { name: "Reading Comprehension", priority: "high" },
      { name: "Cloze Test", priority: "high" },
      { name: "Para Jumbles", priority: "medium" },
    ]},
  ],
};

const sscMaths: SubjectTemplate = {
  name: "Quantitative Aptitude", code: "QA",
  units: [
    { name: "Arithmetic", topics: [
      { name: "Number System", priority: "high" },
      { name: "Percentage", priority: "high" },
      { name: "Ratio & Proportion", priority: "high" },
      { name: "Average", priority: "high" },
      { name: "Profit & Loss", priority: "high" },
      { name: "SI & CI", priority: "high" },
      { name: "Time & Work", priority: "high" },
      { name: "Speed, Distance & Time", priority: "high" },
    ]},
    { name: "Algebra & Geometry", topics: [
      { name: "Algebraic Expressions", priority: "high" },
      { name: "Geometry (Lines, Angles, Triangles)", priority: "high" },
      { name: "Mensuration", priority: "high" },
      { name: "Trigonometry", priority: "high" },
    ]},
    { name: "Data Interpretation", topics: [
      { name: "Tables", priority: "medium" },
      { name: "Bar & Pie Charts", priority: "medium" },
      { name: "Line Graphs", priority: "medium" },
    ]},
  ],
};

const sscGK: SubjectTemplate = {
  name: "General Awareness", code: "GK",
  units: [
    { name: "Static GK", topics: [
      { name: "History", priority: "high" },
      { name: "Geography", priority: "high" },
      { name: "Indian Polity", priority: "high" },
      { name: "Economics", priority: "medium" },
      { name: "Science", priority: "medium" },
    ]},
    { name: "Current Affairs", topics: [
      { name: "National News", priority: "high" },
      { name: "International News", priority: "medium" },
      { name: "Sports", priority: "low" },
      { name: "Awards & Honours", priority: "medium" },
    ]},
    { name: "Banking/Financial Awareness", topics: [
      { name: "Banking Terms & Concepts", priority: "high" },
      { name: "RBI & Monetary Policy", priority: "high" },
      { name: "Government Schemes", priority: "medium" },
    ]},
  ],
};

// ──────────── GATE TEMPLATES ────────────

const gateCSE: SubjectTemplate = {
  name: "Computer Science (GATE)", code: "CSE",
  units: [
    { name: "Data Structures & Algorithms", topics: [
      { name: "Arrays & Linked Lists", priority: "high" },
      { name: "Trees & Graphs", priority: "high" },
      { name: "Sorting & Searching", priority: "high" },
      { name: "Dynamic Programming", priority: "high" },
    ]},
    { name: "Operating Systems", topics: [
      { name: "Process Management", priority: "high" },
      { name: "Memory Management", priority: "high" },
      { name: "Deadlocks", priority: "high" },
      { name: "File Systems", priority: "medium" },
    ]},
    { name: "DBMS", topics: [
      { name: "Relational Model", priority: "high" },
      { name: "SQL", priority: "high" },
      { name: "Normalization", priority: "high" },
      { name: "Transactions", priority: "medium" },
    ]},
    { name: "Computer Networks", topics: [
      { name: "OSI & TCP/IP", priority: "high" },
      { name: "Network Layer", priority: "high" },
      { name: "Transport Layer", priority: "high" },
    ]},
    { name: "Theory of Computation", topics: [
      { name: "Finite Automata", priority: "high" },
      { name: "Context-Free Grammars", priority: "high" },
      { name: "Turing Machines", priority: "medium" },
    ]},
    { name: "Discrete Mathematics", topics: [
      { name: "Propositional Logic", priority: "high" },
      { name: "Graph Theory", priority: "high" },
      { name: "Combinatorics", priority: "medium" },
    ]},
  ],
};

// ──────────── EXPORT ALL TEMPLATES ────────────

export const SYLLABUS_TEMPLATES: Record<string, TemplateCategory[]> = {
  school: [
    {
      label: "Class 9-10 (CBSE/ICSE)",
      description: "Standard subjects for secondary school",
      subjects: [schoolMaths10, schoolScience10, schoolEnglish, schoolSocialStudies, schoolHindi],
    },
  ],
  competitive_exam: [
    {
      label: "JEE (Main + Advanced)",
      description: "Physics, Chemistry, Mathematics for IIT JEE",
      subjects: [jeePhysics, jeeChemistry, jeeMaths],
    },
    {
      label: "NEET",
      description: "Physics, Chemistry, Biology for medical entrance",
      subjects: [
        { ...jeePhysics, units: jeePhysics.units.slice(0, 4) }, // Skip some deep physics
        { ...jeeChemistry },
        neetBiology,
      ],
    },
    {
      label: "UPSC CSE",
      description: "General Studies papers for Civil Services",
      subjects: [upscGS1, upscGS2, upscGS3, upscGS4, upscEssay],
    },
    {
      label: "CAT / MBA Entrance",
      description: "Quant, VARC, DILR for MBA entrance exams",
      subjects: [catQuant, catVARC, catDILR],
    },
    {
      label: "SSC / Banking",
      description: "Reasoning, English, Maths, GK for government exams",
      subjects: [sscReasoning, sscEnglish, sscMaths, sscGK],
    },
    {
      label: "GATE (Computer Science)",
      description: "CS/IT syllabus for GATE exam",
      subjects: [gateCSE],
    },
  ],
  undergraduate: [
    {
      label: "Engineering (General)",
      description: "Common first-year engineering subjects",
      subjects: [
        { name: "Engineering Mathematics", code: "EM", units: [
          { name: "Differential Calculus", topics: [{ name: "Limits & Continuity", priority: "high" }, { name: "Differentiation", priority: "high" }, { name: "Applications", priority: "medium" }] },
          { name: "Integral Calculus", topics: [{ name: "Integration Methods", priority: "high" }, { name: "Definite Integrals", priority: "high" }, { name: "Applications of Integration", priority: "medium" }] },
          { name: "Linear Algebra", topics: [{ name: "Matrices", priority: "high" }, { name: "Eigenvalues", priority: "high" }, { name: "Vector Spaces", priority: "medium" }] },
          { name: "Differential Equations", topics: [{ name: "First Order ODE", priority: "high" }, { name: "Higher Order ODE", priority: "high" }, { name: "PDE Introduction", priority: "medium" }] },
        ]},
        { name: "Engineering Physics", code: "EP", units: [
          { name: "Optics", topics: [{ name: "Interference", priority: "high" }, { name: "Diffraction", priority: "high" }, { name: "Laser", priority: "medium" }] },
          { name: "Quantum Mechanics", topics: [{ name: "Wave-Particle Duality", priority: "high" }, { name: "Schrödinger Equation", priority: "high" }] },
          { name: "Solid State Physics", topics: [{ name: "Crystal Structure", priority: "high" }, { name: "Band Theory", priority: "medium" }] },
        ]},
      ],
    },
  ],
  postgraduate: [],
  professional: [],
  self_learning: [],
};

// Helper: count total topics in a template
export function countTemplateTopics(template: SubjectTemplate): number {
  return template.units.reduce((acc, u) => acc + u.topics.length, 0);
}

export function countTemplateSubtopics(template: SubjectTemplate): number {
  return template.units.reduce((acc, u) =>
    acc + u.topics.reduce((a, t) => a + (t.subtopics?.length || 0), 0), 0);
}

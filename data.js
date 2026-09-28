// ─────────────────────────────────────────────────────────────
// Timetable dataset — transcribed from the 10 official VibeCraft
// timetable PDFs (SRMIST Trichy, School of EEE, Odd Sem 2026-27).
// The "I year Time Table SEEE.pdf" contains 6 first-year sections.
//
// grid: Mon..Fri → 9 periods (index 0 = period 1). null = free / lunch.
// Lab cells map to the course that owns the lab hours:
//   "DLMS/EEC lab" → the matching J-course, "B-Proj" → slot B,
//   "LAB-xxx" → the section's lab course (L).
// ─────────────────────────────────────────────────────────────

const SEMESTER = { start: "2026-08-29", end: "2026-11-29" };

// Tamil Nadu Govt holidays 2026 that fall on weekdays inside the semester.
// (Deepavali, 8 Nov 2026, is a Sunday.) Editable in the UI.
const DEFAULT_HOLIDAYS = [
  { date: "2026-09-04", name: "Krishna Jayanthi" },
  { date: "2026-09-14", name: "Vinayakar Chathurthi" },
  { date: "2026-10-02", name: "Gandhi Jayanthi" },
  { date: "2026-10-19", name: "Ayutha Pooja" },
  { date: "2026-10-20", name: "Vijaya Dashami" },
];

const PERIODS_UPPER = [ // II–IV year
  ["09:00", "09:50"], ["09:50", "10:40"], ["10:50", "11:40"], ["11:40", "12:30"],
  ["12:30", "13:20"], ["13:20", "14:10"], ["14:10", "15:00"], ["15:10", "16:00"], ["16:00", "16:50"],
];
const PERIODS_FIRST = [ // I year
  ["09:00", "09:50"], ["09:55", "10:45"], ["10:50", "11:40"], ["11:45", "12:35"],
  ["12:35", "13:30"], ["13:30", "14:20"], ["14:25", "15:15"], ["15:20", "16:10"], ["16:15", "17:05"],
];

const _ = null;

// Shared first-year subject catalogue
const FY = {
  GER:  { code: "21LEH104T", name: "German" },
  JAP:  { code: "21LEH105T", name: "Japanese", faculty: "Mr. Nadeem" },
  PHE:  { code: "21GNH101J", name: "Philosophy of Engineering" },
  CAL:  { code: "21MAB102T", name: "Advanced Calculus and Complex Analysis" },
  CHE:  { code: "21CYB101J", name: "Chemistry (incl. lab)" },
  PCB:  { code: "21BTB102J", name: "Electronic System and PCB Design" },
  PPS:  { code: "21CSS101J", name: "Programming for Problem Solving (incl. lab)" },
  WS:   { code: "21MES101L", name: "Basic Civil and Mechanical Workshop" },
  APT:  { code: "21PDM102L", name: "General Aptitude" },
  NSS:  { code: "21GNM102L", name: "NSS" },
  BIO:  { code: "21BTB103T", name: "Biology" },
  EC:   { code: "21EEC101J", name: "Electrical Circuits" },
  CELL: { code: "21BTC105T", name: "Cell Biology" },
  BCH:  { code: "21BTC101T", name: "Biochemistry" },
  HPA:  { code: "21BTB104T", name: "Biology: Human Physiology and Anatomy" },
  YOGA: { code: "21GNM101L", name: "Physical and Mental Health using Yoga" },
};
function fy(map) { // pick first-year subjects + attach faculty
  const out = {};
  for (const [k, fac] of Object.entries(map)) out[k] = { ...FY[k], faculty: fac || FY[k].faculty || "" };
  return out;
}

const SECTIONS = [
  // ───────────── I YEAR ─────────────
  {
    id: "I-ECE-A", name: "I ECE-A", year: "I Year", semester: "I Semester", venue: "IST 602", periods: PERIODS_FIRST,
    subjects: fy({ GER: "Mr. Selva", PHE: "Dr. R. Aarthi", CAL: "Dr. R. Ragul", CHE: "Dr. P. Pachamuthu", PCB: "Dr. U. Shajith Ali",
      PPS: "Dr. A. Rama Prasath", WS: "Dr. N.S. Balaji / Dr. M. Kumaran", APT: "Mr. Sivanandhan", NSS: "Dr. R. Manickam", BIO: "Dr. M. Jaya Priya" }),
    grid: {
      Mon: ["PHE", "PHE", "CHE", "CAL", _, "CHE", "CHE", "BIO", "APT"],
      Tue: ["PCB", "CHE", "CAL", "PPS", _, "WS", "WS", "WS", "WS"],
      Wed: ["CHE", "PHE", "PPS", _, _, "PPS", "PPS", "PCB", "PCB"],
      Thu: ["GER", "GER", "GER", "CAL", _, "APT", "APT", "NSS", "NSS"],
      Fri: ["PPS", "CAL", "PCB", "CHE", _, "BIO", "GER", "GER", "GER"],
    },
  },
  {
    id: "I-ECE-B", name: "I ECE-B", year: "I Year", semester: "I Semester", venue: "IST 602", periods: PERIODS_FIRST,
    subjects: fy({ GER: "Mr. Selva", PHE: "Dr. R. Aarthi", CAL: "Dr. M. Deepa", CHE: "Dr. N. Prabhu", PCB: "Dr. U. Shajith Ali",
      PPS: "Dr. A. Rama Prasath", WS: "Dr. Modasir MD Khan / Mr. M. Karthikeyan", APT: "Mrs. Thenmozhi", NSS: "Dr. R. Manickam", BIO: "Dr. M. Jaya Priya" }),
    grid: {
      Mon: ["APT", "PCB", "CHE", "CHE", _, "PHE", "PHE", "CHE", "CAL"],
      Tue: ["WS", "WS", "WS", "WS", _, "BIO", "CHE", "CAL", "PPS"],
      Wed: ["PCB", "PPS", "APT", "APT", "PPS", _, "CHE", "PHE", "PPS"],
      Thu: ["NSS", "NSS", "BIO", "CAL", _, "PPS", "GER", "GER", "GER"],
      Fri: ["PCB", "PCB", _, "GER", "GER", "GER", _, "CHE", "CAL"],
    },
  },
  {
    id: "I-EEE", name: "I EEE", year: "I Year", semester: "I Semester", venue: "IST 602", periods: PERIODS_FIRST,
    subjects: fy({ GER: "Mr. Selva", PHE: "Dr. R. Aarthi", CAL: "Dr. M. Deepa", CHE: "Dr. N. Prabhu", EC: "Dr. Dheepanchakkravarthy",
      PPS: "Dr. A. Rama Prasath", WS: "Dr. Modasir MD Khan / Mr. M. Karthikeyan", APT: "Mrs. Thenmozhi", NSS: "Dr. R. Manickam", BIO: "Dr. M. Jaya Priya" }),
    grid: {
      Mon: ["APT", "EC", "CHE", "CHE", _, "PHE", "PHE", "CHE", "CAL"],
      Tue: ["WS", "WS", "WS", "WS", _, "BIO", "CHE", "CAL", "PPS"],
      Wed: ["EC", "PPS", "APT", "APT", "PPS", _, "CHE", "PHE", "PPS"],
      Thu: ["NSS", "NSS", "BIO", "CAL", _, "PPS", "GER", "GER", "GER"],
      Fri: ["EC", "EC", _, "GER", "GER", "GER", _, "CHE", "CAL"],
    },
  },
  {
    id: "I-ECE-DS", name: "I ECE-DS", year: "I Year", semester: "I Semester", venue: "IST 502", periods: PERIODS_FIRST,
    subjects: fy({ GER: "Mr. Selva", PHE: "Dr. R. Ramesh", CAL: "Dr. Pandiyarajan", CHE: "Dr. Ujjwala", PCB: "Dr. V.N. Senthil Kumaran",
      PPS: "Mrs. R. Sharanya", WS: "Dr. Sakthibalan / Dr. MD Modasir Khan", APT: "Mr. Sivanandhan", NSS: "Dr. R. Manickam", BIO: "Dr. M. Maria Leena" }),
    grid: {
      Mon: ["BIO", "APT", "PCB", "PCB", _, "PHE", "PHE", "CHE", "CAL"],
      Tue: ["CHE", "CHE", "NSS", "NSS", _, "PCB", "CHE", "CAL", "PPS"],
      Wed: ["APT", "APT", "CAL", _, "PPS", "PPS", "CHE", "PHE", "PPS"],
      Thu: ["BIO", "CAL", "PPS", "GER", "GER", "GER", _, "PCB", "CHE"],
      Fri: ["GER", "GER", "GER", _, _, "WS", "WS", "WS", "WS"],
    },
  },
  {
    id: "I-BT-B", name: "I Biotech-B", year: "I Year", semester: "I Semester", venue: "IST 702", periods: PERIODS_FIRST,
    subjects: fy({ JAP: "Mr. Nadeem", PHE: "Dr. J. Ramya Parkavi", CAL: "Dr. R. Suresh", CHE: "Dr. R. Logudurai", PPS: "Dr. B. Chitradevi",
      CELL: "Dr. Daniel Paul", BCH: "Dr. M. Jaya Priya", WS: "Dr. R. Manimaran / Dr. R. Ramesh", APT: "Mr. Sivanandhan", YOGA: "Ms. Balasivapriya" }),
    grid: {
      Mon: ["CELL", "YOGA", "YOGA", "BCH", _, "PHE", "PHE", "CAL", "CHE"],
      Tue: ["APT", "APT", "CELL", "BCH", _, _, "CHE", "CAL", "PPS"],
      Wed: ["WS", "WS", "WS", "WS", _, "PPS", "CHE", "PHE", "PPS"],
      Thu: ["CHE", "CHE", "CAL", "CELL", _, "CHE", "JAP", "JAP", "JAP"],
      Fri: ["BCH", "APT", "CAL", "JAP", "JAP", "JAP", _, "PPS", "PPS"],
    },
  },
  {
    id: "I-BME", name: "I Biomedical Engg", year: "I Year", semester: "I Semester", venue: "IST 702", periods: PERIODS_FIRST,
    subjects: fy({ JAP: "Mr. Nadeem", PHE: "Dr. J. Ramya Parkavi", CAL: "Dr. R. Suresh", CHE: "Dr. R. Logudurai", PPS: "Dr. B. Chitradevi",
      HPA: "", WS: "Dr. R. Manimaran / Dr. R. Ramesh", APT: "Mr. Sivanandhan", YOGA: "Ms. Balasivapriya" }),
    grid: {
      Mon: [_, "YOGA", "YOGA", "HPA", _, "PHE", "PHE", "CAL", "CHE"],
      Tue: ["APT", "APT", _, _, _, _, "CHE", "CAL", "PPS"],
      Wed: ["WS", "WS", "WS", "WS", _, "PPS", "CHE", "PHE", "PPS"],
      Thu: ["CHE", "CHE", "CAL", "HPA", _, "CHE", "JAP", "JAP", "JAP"],
      Fri: [_, "APT", "CAL", "JAP", "JAP", "JAP", _, "PPS", "PPS"],
    },
  },

  // ───────────── II YEAR ─────────────
  {
    id: "II-BME", name: "II BME", year: "II Year", semester: "III Semester", venue: "IST 602 / FN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB201T", name: "Transforms and Boundary Value Problems", faculty: "Dr. A. Manickam" },
      B: { code: "21BMC202T", name: "Biomedical Signals and Systems", faculty: "Dr. Senthil Kumaran V N" },
      C: { code: "21BMC203J", name: "Electric and Electronic Circuits (incl. lab)", faculty: "Dr. Prabin Kumar Bera" },
      D: { code: "21BMC204J", name: "Digital Logic for Medical Systems (incl. lab)", faculty: "Dr. G. Gifta" },
      E: { code: "21PYS202T", name: "Medical Physics", faculty: "Dr. D. Rajeswari" },
      F: { code: "21LEM201T", name: "Professional Ethics", faculty: "Dr. H. SriBhuvaneshwari" },
      G: { code: "21LEM202T", name: "Universal Human Values-II", faculty: "Mrs. N. Suganthi" },
      H: { code: "21PDM201L", name: "Verbal Reasoning", faculty: "CDC" },
      I: { code: "21PDH201T", name: "Social Engineering", faculty: "Mrs. Francis Arockiya Mary" },
    },
    grid: {
      Mon: ["E", "C", "I", "I", _, "D", "D", _, _],
      Tue: ["C", "E", "B", "A", _, "H", "H", _, _],
      Wed: ["B", "D", "A", _, _, "H", "G", _, _],
      Thu: ["A", "E", "B", "D", _, _, _, "C", "C"],
      Fri: ["F", "A", "C", "D", _, _, _, "G", "G"],
    },
  },
  {
    id: "II-ECE-DS-A", name: "II ECE-DS A", year: "II Year", semester: "III Semester", venue: "IST 416 / FN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB201T", name: "Transforms and Boundary Value Problems", faculty: "Dr. C. Arun Kumar" },
      B: { code: "21ECC201T", name: "Solid State Devices", faculty: "Dr. Jeevanantham S" },
      C: { code: "21CSS201T", name: "Computer Organization and Architecture", faculty: "Dr. P. Murugapandiyan" },
      D: { code: "21ECC203T", name: "Digital Logic Design", faculty: "Dr. S. Krishnakumar" },
      E: { code: "21ECC205T", name: "Electromagnetic Theory and Interference", faculty: "Dr. V. Bharathi" },
      F: { code: "21LEM201T", name: "Professional Ethics", faculty: "Dr. Jothi M" },
      G: { code: "21LEM202T", name: "Universal Human Values-II", faculty: "Mrs. N. Suganthi" },
      H: { code: "21PDM201L", name: "Verbal Reasoning", faculty: "CDC" },
      I: { code: "21PDH209T", name: "Social Engineering", faculty: "Mrs. D. Lavanya" },
      L: { code: "21ECC211L", name: "Devices and Digital IC Laboratory", faculty: "Dr. Jeevanantham S / Dr. V. Bharathi" },
    },
    grid: {
      Mon: ["E", "A", "I", "I", _, "G", "G", "L", "L"],
      Tue: ["C", "A", "E", "D", _, "G", _, "H", "H"],
      Wed: ["A", "B", "C", "D", _, _, "H", _, _],
      Thu: ["B", "C", "A", "F", _, "L", "L", _, _],
      Fri: ["D", "B", "E", "C", _, _, _, _, _],
    },
  },
  {
    id: "II-ECE-DS-B", name: "II ECE-DS B", year: "II Year", semester: "III Semester", venue: "IST 411 / AN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB201T", name: "Transforms and Boundary Value Problems", faculty: "New Faculty 3" },
      B: { code: "21ECC201T", name: "Solid State Devices", faculty: "Dr. Jeevanantham S" },
      C: { code: "21CSS201T", name: "Computer Organization and Architecture", faculty: "Dr. P. Murugapandiyan" },
      D: { code: "21ECC203T", name: "Digital Logic Design", faculty: "Dr. S. Krishnakumar" },
      E: { code: "21ECC205T", name: "Electromagnetic Theory and Interference", faculty: "Dr. V. Bharathi" },
      F: { code: "21LEM201T", name: "Professional Ethics", faculty: "Dr. K. Vigneshwaran" },
      G: { code: "21LEM202T", name: "Universal Human Values-II", faculty: "Mrs. D. Lavanya" },
      H: { code: "21PDM201L", name: "Verbal Reasoning", faculty: "CDC" },
      I: { code: "21PDH209T", name: "Social Engineering", faculty: "Mrs. D. Lavanya" },
      L: { code: "21ECC211L", name: "Devices and Digital IC Laboratory", faculty: "Dr. S. Krishnakumar" },
    },
    grid: {
      Mon: [_, _, "L", "L", _, "D", "B", "C", "I"],
      Tue: ["L", "L", _, _, _, "C", "D", "E", "A"],
      Wed: ["G", _, _, _, _, "I", "E", "A", "D"],
      Thu: ["G", "G", "H", "H", _, "A", "C", "B", "E"],
      Fri: ["H", _, _, _, _, "F", "A", "B", "C"],
    },
  },

  // ───────────── III YEAR ─────────────
  {
    id: "III-BME", name: "III BME", year: "III Year", semester: "V Semester", venue: "IST 211 / AN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB301T", name: "Probability and Statistics", faculty: "Dr. K. M. Karuppusamy" },
      B: { code: "21BMC302J", name: "Microcontrollers and Its Application in Medicine (incl. lab)", faculty: "Dr. K. Vigneshwaran" },
      C: { code: "21BMC301J", name: "Biomedical Signal Processing (incl. lab)", faculty: "Dr. V.N. Senthilkumaran" },
      D: { code: "21BME266T", name: "Biometrics", faculty: "Dr. G. Gifta" },
      E: { code: "21ECO103T", name: "Modern Wireless Communication System", faculty: "Dr. Vaishnavi" },
      F: { code: "21BMC303T", name: "Principles of Medical Imaging", faculty: "Dr. N. Prasana Venkatesh" },
      G: { code: "21PDM301L", name: "Analytical and Logical Thinking Skills", faculty: "CDC" },
      H: { code: "21LEM301T", name: "Indian Art Form", faculty: "Dr. G. Gifta" },
      I: { code: "21GNP301L", name: "Community Connect", faculty: "Dr. J. Jencia / Dr. N. Prasanna Venkatesh" },
    },
    grid: {
      Mon: ["G", "G", "B", "B", _, "E", "B", "F", "H"],
      Tue: ["C", "C", "G", _, _, "C", "D", "A", "B"],
      Wed: [_, _, _, _, _, "C", "A", "F", "D"],
      Thu: [_, _, _, "I", _, "A", "C", "E", "B"],
      Fri: ["I", _, _, _, _, "F", "A", "D", "E"],
    },
  },
  {
    id: "III-ECE-A", name: "III ECE-A", year: "III Year", semester: "V Semester", venue: "IST 518 / FN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB302T", name: "Discrete Mathematics", faculty: "New Faculty 3" },
      B: { code: "21ECC301P", name: "Microprocessor, Microcontroller & Interfacing Techniques", faculty: "Dr. M. Manikandan" },
      C: { code: "21ECC303T", name: "VLSI Design and Technology", faculty: "Dr. M. Jothi" },
      D: { code: "21ECE468T", name: "System and Network on Chip", faculty: "Dr. V. Manikandan" },
      E: { code: "21CSO355T", name: "Machine Learning for All", faculty: "Dr. J. Jencia" },
      F: { code: "21GNP301L", name: "Community Connect", faculty: "Dr. V. Rajesh / Dr. V. Bharathi" },
      G: { code: "21PDM301L", name: "Analytical and Logical Thinking Skills", faculty: "CDC" },
      H: { code: "21LEM301T", name: "Indian Art Form", faculty: "Dr. K. Vigneshwaran" },
      L: { code: "21ECC311L", name: "VLSI Design / Microprocessor Laboratory", faculty: "Dr. M. Jothi, Dr. P. Murugapandiyan / Dr. V. Manikandan" },
    },
    grid: {
      Mon: ["E", "B", "B", "A", _, "G", "G", _, _],
      Tue: ["H", "D", "B", "B", _, _, "G", _, _],
      Wed: ["C", "A", "D", "F", _, _, _, "L", "L"],
      Thu: ["A", "E", "C", "F", _, _, _, _, _],
      Fri: ["D", "A", "E", "C", _, "L", "L", _, _],
    },
  },
  {
    id: "III-ECE-B", name: "III ECE-B", year: "III Year", semester: "V Semester", venue: "IST 518 / AN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB302T", name: "Discrete Mathematics", faculty: "Dr. M. Thanga Rejini" },
      B: { code: "21ECC301P", name: "Microprocessor, Microcontroller & Interfacing Techniques", faculty: "Mrs. B. Abirami" },
      C: { code: "21ECC303T", name: "VLSI Design and Technology", faculty: "Dr. R. Vinoth Raj" },
      D: { code: "21ECE468T", name: "System and Network on Chip", faculty: "Dr. V. Manikandan" },
      E: { code: "21CSO355T", name: "Machine Learning for All", faculty: "Dr. J. Jencia" },
      F: { code: "21GNP301L", name: "Community Connect", faculty: "Dr. H. Sudharsan / Ms. T. Swetha" },
      G: { code: "21PDM301L", name: "Analytical and Logical Thinking Skills", faculty: "CDC" },
      H: { code: "21LEM301T", name: "Indian Art Form", faculty: "Dr. A. Anand" },
      L: { code: "21ECC311L", name: "VLSI Design / Microprocessor Laboratory", faculty: "Dr. Sreenivasa Ijada Rao / Dr. B. DeviSri & Dr. Prassanna Venkatesh" },
    },
    grid: {
      Mon: ["L", "L", _, _, _, "E", "B", "A", "D"],
      Tue: ["G", "G", _, _, _, "F", "B", "D", "C"],
      Wed: ["G", _, _, _, _, "B", "B", "A", "H"],
      Thu: ["L", "L", _, _, _, "A", "C", "E", "F"],
      Fri: [_, _, _, _, _, "C", "A", "E", "D"],
    },
  },
  {
    id: "III-ECE-DS", name: "III ECE-DS", year: "III Year", semester: "V Semester", venue: "IST 519 / FN", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21MAB302T", name: "Discrete Mathematics", faculty: "New Faculty 2" },
      B: { code: "21ECC301P", name: "Microprocessor, Microcontroller & Interfacing Techniques", faculty: "Mrs. B. Abirami" },
      C: { code: "21ECC303T", name: "VLSI Design and Technology", faculty: "Dr. R. Vinoth Raj" },
      D: { code: "21CSO355T", name: "Machine Learning for All", faculty: "Dr. Chitra Devi" },
      E: { code: "21ECE371T", name: "Database Design and Management", faculty: "Dr. S. Saraswathi" },
      F: { code: "21GNP301L", name: "Community Connect", faculty: "Dr. S. Jeevanantham / Dr. V. Manikandan" },
      G: { code: "21PDM301L", name: "Analytical and Logical Thinking Skills", faculty: "CDC" },
      H: { code: "21LEM301T", name: "Indian Art Form", faculty: "Dr. Prabin Kumar Bera" },
      L: { code: "21ECC311L", name: "VLSI Design / Microprocessor Laboratory", faculty: "Dr. R. Vinothraj / Dr. H. Sri Bhuvaneshwari" },
    },
    grid: {
      Mon: ["E", "B", "C", "A", _, _, _, _, _],
      Tue: ["C", "B", "D", "F", _, "L", "L", _, _],
      Wed: ["H", "B", "A", "C", _, _, _, "G", "G"],
      Thu: ["A", "D", "E", "F", _, _, _, _, _],
      Fri: ["D", "A", "E", "B", _, "G", _, "L", "L"],
    },
  },

  // ───────────── IV YEAR ─────────────
  {
    id: "IV-ECE-A", name: "IV ECE-A", year: "IV Year", semester: "VII Semester", venue: "IST 225", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21GNH401T", name: "Behavioural Psychology", faculty: "Dr. A. Anand" },
      B: { code: "21ECC401T", name: "Wireless Communication and Antenna Systems", faculty: "Dr. K. Vigneshwaran" },
      C: { code: "21ECC402P", name: "Computer Communication and Network Security (incl. lab)", faculty: "Dr. S. Jeevanantham · Lab: Mrs. T. Swetha" },
      D: { code: "21ECE461T", name: "Semiconductor Memory Design", faculty: "Dr. H. SriBhuvaneshwari" },
      E: { code: "21ECE463T", name: "Scripting Language for Electronic Design Automation", faculty: "Dr. Sreenivasa Rao Ijada" },
      F: { code: "21CSO355T", name: "Machine Learning for All", faculty: "Dr. N. Prasanna Venkatesh" },
    },
    grid: {
      Mon: ["C", _, "A", "D", _, _, _, _, _],
      Tue: ["C", "D", "B", "F", _, _, _, _, _],
      Wed: ["B", "C", "E", "F", _, _, _, _, _],
      Thu: ["F", "A", "E", "B", _, _, _, _, _],
      Fri: ["C", "A", "D", "E", _, _, _, _, _],
    },
  },
  {
    id: "IV-ECE-B", name: "IV ECE-B", year: "IV Year", semester: "VII Semester", venue: "IST 227", periods: PERIODS_UPPER,
    subjects: {
      A: { code: "21GNH401T", name: "Behavioural Psychology", faculty: "Dr. A. Annand" },
      B: { code: "21ECC401T", name: "Wireless Communication and Antenna Systems", faculty: "Dr. K. Vigneshwaran" },
      C: { code: "21ECC402P", name: "Computer Communication and Network Security (incl. lab)", faculty: "Dr. R. Rajasekar · Lab: Ms. T. Swetha" },
      D: { code: "21ECE461T", name: "Semiconductor Memory Design", faculty: "Dr. H. SriBhuvaneshwari" },
      E: { code: "21ECE463T", name: "Scripting Language for Electronic Design Automation", faculty: "Dr. Sreenivasa Rao Ijada" },
      F: { code: "21CSO355T", name: "Machine Learning for All", faculty: "Dr. N. Prasanna Venkatesh" },
    },
    grid: {
      Mon: ["C", "A", "E", "F", _, _, _, _, _],
      Tue: ["C", "E", "F", "B", _, _, _, _, _],
      Wed: ["C", "D", "A", "B", _, _, _, _, _],
      Thu: ["D", "B", "C", "A", _, _, _, _, _],
      Fri: ["E", "D", "F", _, _, _, _, _, _],
    },
  },
];

if (typeof module !== "undefined") module.exports = { SECTIONS, SEMESTER, DEFAULT_HOLIDAYS };

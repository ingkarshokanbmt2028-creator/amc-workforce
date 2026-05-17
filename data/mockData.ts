/**
 * mockData.ts — Real AMC employee list (2026)
 * Pulled from the official AMC_EMPLOYEE_LIST_2026 spreadsheet
 */

import { Employee, AttendanceRecord, CreditBalance, Department, ShiftType } from "@/types/attendance";

export const mockDepartments: Department[] = [
  { id: "dept-1", name: "Administration" },
  { id: "dept-2", name: "Allied Health" },
  { id: "dept-3", name: "Auxiliary" },
  { id: "dept-4", name: "Medicine" },
  { id: "dept-5", name: "Nursing & Midwifery" },
  { id: "dept-6", name: "Pharmacy" },
];

const REAL_STAFF: { dept_id: string; dept_name: string; first: string; last: string; staff_id: string; position: string; is_head: boolean }[] = [
  { dept_id: "dept-1", dept_name: "Administration", first: "EUNICE", last: "AKORFA TOGOH", staff_id: "AMC/ACC/ADM/044", position: "Accounting Manager", is_head: true },
  { dept_id: "dept-1", dept_name: "Administration", first: "DORIS", last: "APPIAH EWUSI", staff_id: "AMC/ACC/ADM/053", position: "Quality Assurance & Learning & Dev\'T Head", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "MOSES", last: "CLOCUH", staff_id: "AMC/ACC/ADM/001", position: "Health Service Administrator", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "PRISCILLA", last: "SACKEY", staff_id: "AMC/ACC/ADM/005", position: "Administrative  Assistant - Front Desk", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ELLEN", last: "EKEWORM", staff_id: "AMC/ACC/ADM/006", position: "Administrative  Assistant - Front Desk", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "MICHAEL", last: "ANKOMAH", staff_id: "AMC/ACC/ADM/017", position: "Billing & Claims Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "NUELLA", last: "ANYELEY ODONKOR", staff_id: "AMC/ACC/ADM/019", position: "Billing & Claims Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "THELMA", last: "AKUSHIKA NUTAKOR", staff_id: "AMC/ACC/ADM/023", position: "Medical Co-Ordinator", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "HONORE", last: "TASSI FOLLY KOUASSI", staff_id: "AMC/ACC/ADM/026", position: "Maintenance Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "JOSEPHINE", last: "AFIA SOLEY", staff_id: "AMC/ACC/ADM/029", position: "Accounting Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "BRIDGET", last: "ABRA MORTEY", staff_id: "AMC/ACC/ADM/031", position: "Client Service Associate", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ELIZABETH", last: "SENA NYADROH", staff_id: "AMC/ACC/ADM/032", position: "Accounts Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "REBECCA", last: "OHUI MACCARTHY", staff_id: "AMC/ACC/ADM/035", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "CHRISTOPHER", last: "ODEI", staff_id: "AMC/ACC/ADM/036", position: "Human Resource Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "VALERIE", last: "AMEXO", staff_id: "AMC/ACC/ADM/038", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "RITA", last: "POKUA BOAKYE", staff_id: "AMC/ACC/ADM/039", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "GLORIA", last: "AMENUKU", staff_id: "AMC/ACC/ADM/041", position: "Procurement Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ROSELINE", last: "GADAGOE", staff_id: "AMC/ACC/ADM/042", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "GERTRUDE", last: "EXORNAM AGBEGOE", staff_id: "AMC/ACC/ADM/043", position: "Accounts Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "JOSEPH", last: "FOSU ESSEL", staff_id: "AMC/ACC/ADM/045", position: "Systems & It Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "STANLEY", last: "QUARTEY", staff_id: "AMC/ACC/ADM/047", position: "Business Development & Sales", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "SINARE", last: "RAJI", staff_id: "AMC/ACC/ADM/048", position: "Accounts Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "SARAH", last: "AMONORKIE AMANATEY", staff_id: "AMC/ACC/ADM/050", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "DENNIS", last: "HORSEY", staff_id: "AMC/ACC/ADM/051", position: "Accounts Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "MARY", last: "OSAAH OWUSU", staff_id: "AMC/ACC/ADM/052", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "NOBLE", last: "ELIKPLIM OPARE", staff_id: "AMC/ACC/ADM/054", position: "Senior Business Dev\'T & Sales Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "SHEFALI", last: "BHADAURIA", staff_id: "AMC/ACC/ADM/055", position: "Operational Comp & Excellence Maneger", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "VIVIAN", last: "RENNER", staff_id: "AMC/ACC/ADM/056", position: "Biomedical Engineer Senior Field Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ADRIANA", last: "BRENDA ADOM", staff_id: "AMC/ACC/ADM/057", position: "Client Service Executive", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ALFRED", last: "MENSAH", staff_id: "AMC/ACC/ADM/058", position: "Accounts Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "RICHARD", last: "MORTEY", staff_id: "AMC/ACC/ADM/060", position: "Facilities Management Assistant - Biomedical", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "JOHN", last: "AGBENYENYAH", staff_id: "AMC/ACC/ADM/061", position: "Facilities Management Assistant", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "EMMANUEL", last: "KWESI OWUSU", staff_id: "AMC/ACC/ADM/062", position: "Store Officer", is_head: false },
  { dept_id: "dept-1", dept_name: "Administration", first: "ENOCK", last: "YEBOAH", staff_id: "AMC/ACC/ADM/063", position: "Store Assitant", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "BENJAMIN", last: "KONNEY AKUETTEH", staff_id: "AMC/ACC/ALI/010", position: "Laboratory Manager", is_head: true },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "JANET", last: "BREW-YALLEY", staff_id: "AMC/ACC/ALI/003", position: "Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "DAVID", last: "TEI", staff_id: "AMC/ACC/ALI/006", position: "Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "COLLINS", last: "AMPONSAH", staff_id: "AMC/ACC/ALI/009", position: "Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "STEPHANE", last: "ASARE-BOATENG", staff_id: "AMC/ACC/ALI/011", position: "Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "SALFORD", last: "ISSAH", staff_id: "AMC/ACC/ALI/015", position: "Emt Paramedic", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "STANLEY", last: "EWORDAFE", staff_id: "AMC/ACC/ALI/016", position: "Emt Paramedic", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "ISAAC", last: "TETTEH", staff_id: "AMC/ACC/ALI/017", position: "Emt Paramedic", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "EBENEZER", last: "KETOR", staff_id: "AMC/ACC/ALI/018", position: "Emt Paramedic", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "EDEM", last: "MOSES AGGOR", staff_id: "AMC/ACC/ALI/020", position: "Radiographer", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "EMMANUEL", last: "SIKA TETTEH", staff_id: "AMC/ACC/ALI/022", position: "Medical Laboratory Scientist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "KWAME", last: "DELASI GALLEY", staff_id: "AMC/ACC/ALI/023", position: "Medical Laboratory Scientist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "RAPHAEL", last: "AGBESI AKORLI", staff_id: "AMC/ACC/ALI/024", position: "Medical Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "FARIDA", last: "SANNI SULLEY", staff_id: "AMC/ACC/ALI/026", position: "Radiographer", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "BOAMAH,", last: "BENEDICT NYANKSON", staff_id: "AMC/ACC/ALI/027", position: "Medical Laboratory Technologist", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "MATHEW", last: "THOMAS", staff_id: "AMC/ACC/ALI/028", position: "Radiographer", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "SAMUEL", last: "OSEI SACKEY", staff_id: "AMC/ACC/ALI/029", position: "Senior Sonographer", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "ANDREWS", last: "APPIAH ASANTE", staff_id: "AMC/ACC/ALI/030", position: "Dietician", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "FLORENCE", last: "NAYO", staff_id: "AMC/ACC/ALI/031", position: "Diet Cook", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "EVELYN", last: "NANKANI", staff_id: "AMC/ACC/ALI/032", position: "Diet Cook", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "SEBASTIAN", last: "SEBIN", staff_id: "AMC/ACC/ALI/035", position: "Radiographer", is_head: false },
  { dept_id: "dept-2", dept_name: "Allied Health", first: "LUTHER", last: "KPAKPA QUARTEY", staff_id: "AMC/ACC/ALI/036", position: "Med Phlebotomist", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "FRANCIS", last: "BISSUE", staff_id: "AMC/ACC/AUX/003", position: "Office Assistant - Logistics", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "GRACE", last: "APPIAH", staff_id: "AMC/ACC/AUX/005", position: "Caterer\'S Assistant", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "OPPONG,", last: "THERESA", staff_id: "AMC/ACC/AUX/006", position: "Caterer", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "JONATHAN", last: "CALEB KOTEY", staff_id: "AMC/ACC/AUX/008", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "JOSEPH", last: "BONDZIE AIDOO", staff_id: "AMC/ACC/AUX/009", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "PATRICK", last: "DAMPSON", staff_id: "AMC/ACC/AUX/011", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "MOHAMMED", last: "AHMED", staff_id: "AMC/ACC/AUX/012", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "TIMOTHY", last: "DARBAH", staff_id: "AMC/ACC/AUX/013", position: "Security Guard Supervisor", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "ABIGAIL", last: "AKU ADOTEY-NYANU", staff_id: "AMC/ACC/AUX/014", position: "Caterer", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "JOSEPH", last: "SACKEY", staff_id: "AMC/ACC/AUX/015", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "ISHAQUE", last: "OBIRI-ASAMOAH", staff_id: "AMC/ACC/AUX/016", position: "Office Assistant - Transport & Logistics", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "EMMANUEL", last: "ASANTE", staff_id: "AMC/ACC/AUX/017", position: "Office Assistant - Transport & Logistics", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "MICHAEL", last: "ATSYOR", staff_id: "AMC/ACC/AUX/018", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "ALBERT", last: "KOOMSON", staff_id: "AMC/ACC/AUX/019", position: "Security Guard", is_head: false },
  { dept_id: "dept-3", dept_name: "Auxiliary", first: "ALEXANDER", last: "KOOMSON", staff_id: "AMC/ACC/AUX/020", position: "Security Guard", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "CYNTHIA", last: "OPOKU- AKOTO", staff_id: "AMC/GRP/MED/001", position: "Family Physician - Ceo", is_head: true },
  { dept_id: "dept-4", dept_name: "Medicine", first: "OBED", last: "OKOE ALLOTEY-BABINGTON", staff_id: "AMC/GRP/MED/002", position: "Anaesthetist Specialist - Hmd", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "NYANYUIE", last: "KODJO LOVI", staff_id: "AMC/ACC/MED/001", position: "Physician Specialist - Hospitalist", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "HARRIET", last: "ALORIBASUA KANLISI", staff_id: "AMC/ACC/MED/003", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "SHARON", last: "MARTEKIE SACKEY", staff_id: "AMC/ACC/MED/004", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "JOSEF", last: "WEWOLI AVEREYIREH", staff_id: "AMC/ACC/MED/010", position: "Senior Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "ERNEST", last: "JUNIOR BOACHIE", staff_id: "AMC/ACC/MED/011", position: "Senior Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "NATHANIEL", last: "RUSSEL NII AYITEY ATTOH", staff_id: "AMC/ACC/MED/013", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "JEFFREY", last: "PARKER", staff_id: "AMC/ACC/MED/016", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "EMMANUEL", last: "LOUIS INTERFUL (JNR)", staff_id: "AMC/ACC/MED/019", position: "Senior Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "NANA", last: "AKUA OKAI NTONI", staff_id: "AMC/ACC/MED/020", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "TAMUNOIBIM", last: "COOKEY", staff_id: "AMC/ACC/MED/021", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "NAZEEFA", last: "YAKUBU", staff_id: "AMC/ACC/MED/023", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "LOREEN", last: "SOPHIA ACKON", staff_id: "AMC/ACC/MED/024", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "SARAH", last: "FAAKOR TOSEAFA", staff_id: "AMC/ACC/MED/025", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "ISAAC", last: "OPOKU FOFIE", staff_id: "AMC/ACC/MED/026", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "RAPHAELA", last: "AGYARKO", staff_id: "AMC/ACC/MED/027", position: "Medical Officer", is_head: false },
  { dept_id: "dept-4", dept_name: "Medicine", first: "AKOSUA", last: "ANANE-DARKO", staff_id: "AMC/ACC/MED/028", position: "Medical Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "VIDA", last: "AYEGBE", staff_id: "AMC/ACC/NUR/001", position: "Nursing Director", is_head: true },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "EMMANUEL", last: "TAMPAH-NAAH", staff_id: "AMC/ACC/NUR/013", position: "Deputy Nursing Director", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "COMFORT", last: "BAWAH", staff_id: "AMC/ACC/NUR/020", position: "Principal Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANITA", last: "LEBENE AZAGLO-TAY", staff_id: "AMC/ACC/NUR/024", position: "Principal Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "OLIVIA", last: "ATSUPUI NUWORKPOR", staff_id: "AMC/ACC/NUR/027", position: "Principal Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "THERESA", last: "DEDE TISEI", staff_id: "AMC/ACC/NUR/031", position: "Principal Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "RITA", last: "AGBEMENU", staff_id: "AMC/ACC/NUR/039", position: "Deputy Nursing Director", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MARGARET", last: "AYIM", staff_id: "AMC/ACC/NUR/005", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JOYCE", last: "ZUREK", staff_id: "AMC/ACC/NUR/006", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "SANDRA", last: "OTCHERE", staff_id: "AMC/ACC/NUR/007", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JAHEL", last: "DODOO", staff_id: "AMC/ACC/NUR/008", position: "Senior Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "CHRISTIANA", last: "BREW-COFIE", staff_id: "AMC/ACC/NUR/009", position: "Senior Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GODWIN", last: "AGBEWU", staff_id: "AMC/ACC/NUR/010", position: "Deputy Certified Registered Anaesthetist", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MUSTAPHA", last: "ABUBAKAR", staff_id: "AMC/ACC/NUR/012", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "LINDA", last: "ABOAGYEWAA OHENE", staff_id: "AMC/ACC/NUR/018", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "IVY", last: "NYAMEKYE AYITEY", staff_id: "AMC/ACC/NUR/021", position: "Senior Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "RAMATU", last: "MUSAH", staff_id: "AMC/ACC/NUR/022", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GLORIA", last: "ANNAN", staff_id: "AMC/ACC/NUR/025", position: "Senior Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GODWIN", last: "KWAME TORNYEAVA", staff_id: "AMC/ACC/NUR/029", position: "Senior Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANNA", last: "GYEKYE-QUANSAH", staff_id: "AMC/ACC/NUR/035", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANITA", last: "BANAALEH", staff_id: "AMC/ACC/NUR/037", position: "Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MERCY", last: "OPPONG", staff_id: "AMC/ACC/NUR/038", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "RHODA", last: "ACKON", staff_id: "AMC/ACC/NUR/040", position: "Staff Midwife", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JOSEPHINE", last: "TUFFOUR HINSON", staff_id: "AMC/ACC/NUR/044", position: "Midwifery Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GIFTY", last: "SEFAKOR ATTOR", staff_id: "AMC/ACC/NUR/045", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "AKUA", last: "FREMPONG ASAMOAH", staff_id: "AMC/ACC/NUR/046", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "HILDA", last: "OFOSUAH AGYAPONG", staff_id: "AMC/ACC/NUR/050", position: "Nursing Assistant", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JOSEPHINE", last: "AWUKUBEA YEBOAH", staff_id: "AMC/ACC/NUR/042", position: "Senior Certified Registered Aneasthetist", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "LETICIA", last: "KAKI ADADE", staff_id: "AMC/ACC/NUR/052", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "CALVIN", last: "NOBLE ANANE", staff_id: "AMC/ACC/NUR/053", position: "Senior Nursing Officer - Theatre", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "DZIDZOR", last: "ABLAH KPODO-TAY", staff_id: "AMC/ACC/NUR/054", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "DEBORAH", last: "REHOBOTH QUARTEY", staff_id: "AMC/ACC/NUR/055", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "PONJIN,", last: "JOSEPH MABITAAB", staff_id: "AMC/ACC/NUR/057", position: "Senior Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "LYDIA", last: "POKUAH ASAMOAH", staff_id: "AMC/ACC/NUR/059", position: "Staff Midwife", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "RICHARD", last: "OBLIE ARMAH", staff_id: "AMC/ACC/NUR/060", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "EMMANUEL", last: "POWERS GYAMFI", staff_id: "AMC/ACC/NUR/061", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "BISMARK", last: "OPOKU YEBOAH", staff_id: "AMC/ACC/NUR/062", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "LYDIA", last: "LISA CUDJOE", staff_id: "AMC/ACC/NUR/064", position: "Pno - Critical Care", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "AMA", last: "SERWAH OTENG", staff_id: "AMC/ACC/NUR/065", position: "Sno - Critical Care", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GLORIA", last: "LOUISA TETTEH", staff_id: "AMC/ACC/NUR/067", position: "Pno - Critical Care", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "DEBORAH", last: "AKORKOR MENSAH", staff_id: "AMC/ACC/NUR/068", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "CASSANDRA", last: "MENSAH", staff_id: "AMC/ACC/NUR/069", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JEMIMAH", last: "DZIEDZORM AFI AGBODZAH", staff_id: "AMC/ACC/NUR/070", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "PERFECT", last: "ESINAM SEDOFIA", staff_id: "AMC/ACC/NUR/071", position: "Health Assistant Preventive", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "DANIEL", last: "ASSUAH", staff_id: "AMC/ACC/NUR/072", position: "Senior Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "EMMANUELLA", last: "BOAKYE-YIADOM", staff_id: "AMC/ACC/NUR/073", position: "Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "HILDAGARD", last: "ACQUAH", staff_id: "AMC/ACC/NUR/074", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "JOHN", last: "ATUKUMAH", staff_id: "AMC/ACC/NUR/075", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANITA", last: "OSEI", staff_id: "AMC/ACC/NUR/076", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "LUCKY", last: "ACQUAH-BAIDOO", staff_id: "AMC/ACC/NUR/077", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MERCY", last: "DERY", staff_id: "AMC/ACC/NUR/078", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANGELA", last: "YEVU", staff_id: "AMC/ACC/NUR/079", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MAVIS", last: "OPOKUA-MIREKU", staff_id: "AMC/ACC/NUR/080", position: "Midwifery Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "DANIEL", last: "D\'ALMEIDA", staff_id: "AMC/ACC/NUR/081", position: "Pno-Peri Operative", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "CECILIA", last: "DEDE AKAKPO", staff_id: "AMC/ACC/NUR/082", position: "Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "GODSON", last: "ANNIPAH", staff_id: "AMC/ACC/NUR/083", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ROSINA", last: "AMPOMAH", staff_id: "AMC/ACC/NUR/084", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "EUGENE", last: "DODZI TAMAKLOE", staff_id: "AMC/ACC/NUR/086", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MORDA", last: "HABIBATU SULEMANA", staff_id: "AMC/ACC/NUR/088", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "MERCY", last: "AMI ADDOH", staff_id: "AMC/ACC/NUR/089", position: "Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANTOINETTE", last: "NYAMEKYE ADDAE", staff_id: "AMC/ACC/NUR/090", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ANTOINETTE", last: "AKOSUA AVORYI", staff_id: "AMC/ACC/NUR/091", position: "Nursing Officer", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ELIZABETH", last: "KONADU", staff_id: "AMC/ACC/NUR/092", position: "Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ETHEL", last: "BAIDOO-KONDUAH", staff_id: "AMC/ACC/NUR/093", position: "Senior Staff Nurse", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ELIZABETH", last: "ANGELEY AKO-NAI", staff_id: "AMC/ACC/NUR/094", position: "Senior Staff Midwife", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "ETHEL", last: "KPORTI", staff_id: "AMC/ACC/NUR/087", position: "Health Assistant Clinical", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "IRENE", last: "BOTCHWAY", staff_id: "AMC/ACC/NUR/095", position: "Pno - Specialist & Surgical Serv Clinical Coordinator", is_head: false },
  { dept_id: "dept-5", dept_name: "Nursing & Midwifery", first: "EVA", last: "WOLISO", staff_id: "AMC/ACC/NUR/096", position: "Midwifery Officer", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "DOROTHY", last: "ASARE", staff_id: "AMC/ACC/PHA/001", position: "Pharmacy - Mca", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "JOSEPHINE", last: "ODURO", staff_id: "AMC/ACC/PHA/002", position: "Pharmacy - Mca", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "MARRIETE", last: "ABU SARPONG", staff_id: "AMC/ACC/PHA/004", position: "Senior Pharmacist", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "PHOEBE", last: "EYRAM TIAH", staff_id: "AMC/ACC/PHA/006", position: "Pharmacy - Technician", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "ANDREWS", last: "BOAMPONG BOAKYE", staff_id: "AMC/ACC/PHA/007", position: "Pharmacy - Technician", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "SIMEON", last: "BOAKYE YIADOM", staff_id: "AMC/ACC/PHA/008", position: "Pharmacy - Technician", is_head: false },
  { dept_id: "dept-6", dept_name: "Pharmacy", first: "YEBOAH,", last: "MABEL AMPOFOA", staff_id: "AMC/ACC/PHA/009", position: "D-Pharmacist", is_head: false },
];

function generateEmployees(): Employee[] {
  return REAL_STAFF.map((s, i) => ({
    id:                 `emp-${i + 1}`,
    department_id:      s.dept_id,
    department_name:    s.dept_name,
    emp_code:           s.staff_id,
    first_name:         s.first,
    last_name:          s.last,
    position:           s.position,
    is_department_head: s.is_head,
  }));
}

// Shift definitions: startH/startM = shift start, endH/endM = shift end
// crossMidnight = true for Night shift (19:00 → 07:00 next day)
const SHIFT_DEF: Record<ShiftType, {
  startH: number; startM: number;
  endH: number;   endM: number;
  expectedHours: number; crossMidnight: boolean;
}> = {
  day:      { startH: 7,  startM: 0, endH: 16, endM: 0,  expectedHours: 9,  crossMidnight: false },
  long_day: { startH: 7,  startM: 0, endH: 19, endM: 0,  expectedHours: 12, crossMidnight: false },
  morning:  { startH: 9,  startM: 0, endH: 19, endM: 0,  expectedHours: 10, crossMidnight: false },
  night:    { startH: 19, startM: 0, endH: 7,  endM: 0,  expectedHours: 12, crossMidnight: true  },
};

// Shift distribution weights per department
const DEPT_SHIFTS: Record<string, ShiftType[]> = {
  "dept-1": ["day","day","day","day","morning"],            // Administration: mostly Day
  "dept-2": ["day","day","long_day","long_day","morning"],  // Allied Health
  "dept-3": ["day","day","day","night","night"],            // Auxiliary (security rotates nights)
  "dept-4": ["long_day","long_day","day","night","night"],  // Medicine
  "dept-5": ["long_day","long_day","night","night","day"],  // Nursing & Midwifery
  "dept-6": ["day","day","day","morning","morning"],        // Pharmacy
};

function pickShift(deptId: string, empIndex: number): ShiftType {
  const pool = DEPT_SHIFTS[deptId] ?? ["day"];
  return pool[empIndex % pool.length];
}

function generateAttendance(employees: Employee[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();

  employees.forEach((emp, empIdx) => {
    const shift     = pickShift(emp.department_id, empIdx);
    const def       = SHIFT_DEF[shift];

    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const missedIn  = Math.random() < 0.08;
      const missedOut = Math.random() < 0.08;

      // Randomise clock-in within ±20 min of shift start (captures late arrivals)
      const inOffsetMin  = Math.floor(Math.random() * 35) - 5; // -5 to +30 min
      const outOffsetMin = Math.floor(Math.random() * 35) - 5;

      const clockInDate  = new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                                    def.startH, def.startM + inOffsetMin);
      // Clock-out: shift end + offset (next day for Night shift)
      const clockOutBase = new Date(date.getFullYear(), date.getMonth(),
                                    def.crossMidnight ? date.getDate() + 1 : date.getDate(),
                                    def.endH, def.endM + outOffsetMin);

      const clockIn  = missedIn  ? null : clockInDate.toISOString();
      const clockOut = missedOut ? null : (clockIn ? clockOutBase.toISOString() : null);

      const hoursWorked = (clockIn && clockOut)
        ? Number(((clockOutBase.getTime() - clockInDate.getTime()) / 3600000).toFixed(2))
        : 0;

      records.push({
        id:               `att-${emp.id}-${d}`,
        employee_id:      emp.id,
        date:             date.toISOString().split("T")[0],
        shift_type:       shift,
        clock_in:         clockIn,
        clock_out:        clockOut,
        missed_clock_in:  missedIn,
        missed_clock_out: missedOut,
        hours_worked:     hoursWorked,
        is_overtime:      hoursWorked > def.expectedHours + 0.5,
        overtime_approved: false,
      });
    }
  });
  return records;
}

function generateCredits(employees: Employee[], attendance: AttendanceRecord[]): CreditBalance[] {
  const now = new Date();
  return employees.map((emp) => {
    const empAtt     = attendance.filter((a) => a.employee_id === emp.id);
    const missedIns  = empAtt.filter((a) => a.missed_clock_in).length;
    const missedOuts = empAtt.filter((a) => a.missed_clock_out).length;
    const missedBoth = empAtt.filter((a) => a.missed_clock_in && a.missed_clock_out).length;
    const deductions = (missedIns - missedBoth) * 100 + (missedOuts - missedBoth) * 100 + missedBoth * 200;
    const totalHours = empAtt.reduce((sum, a) => sum + a.hours_worked, 0);

    return {
      id:                 `credit-${emp.id}`,
      employee_id:        emp.id,
      month:              now.getMonth() + 1,
      year:               now.getFullYear(),
      initial_credit:     1500,
      deductions,
      overtime_credits:   0,
      final_credit:       1500 - deductions,
      total_hours_worked: Number(totalHours.toFixed(2)),
      target_hours:       180,
    };
  });
}

export const mockEmployees  = generateEmployees();
export const mockAttendance = generateAttendance(mockEmployees);
export const mockCredits    = generateCredits(mockEmployees, mockAttendance);
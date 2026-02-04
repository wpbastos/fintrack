/**
 * Employers - Companies for income tracking
 */

export interface Employer {
  name: string;
  industry: string;
  location: string;
  website: string;
  notes: string;
}

export const employers: Employer[] = [
  // ========== Dynamics 365 Partners & Microsoft Consultants ==========
  { name: "Hitachi Solutions", industry: "IT Consulting", location: "Dallas, TX", website: "https://hitachisolutions.com", notes: "2024 Microsoft Partner of the Year, D365 specialist" },
  { name: "Avanade", industry: "IT Consulting", location: "Seattle, WA", website: "https://avanade.com", notes: "Accenture-Microsoft joint venture, D365 & Azure" },
  { name: "HSO", industry: "IT Consulting", location: "Chicago, IL", website: "https://hso.com", notes: "Global Microsoft Dynamics 365 partner" },
  { name: "Columbus", industry: "IT Consulting", location: "Chicago, IL", website: "https://columbusglobal.com", notes: "Microsoft D365 implementation partner" },
  { name: "sa.global", industry: "IT Consulting", location: "Cambridge, UK", website: "https://sa.global", notes: "AI-powered D365 consultant, 30+ years experience" },
  { name: "Sunrise Technologies", industry: "IT Consulting", location: "Winston-Salem, NC", website: "https://sunrisetechnologies.com", notes: "D365 for retail, manufacturing, distribution" },
  { name: "Folio3", industry: "IT Consulting", location: "Redwood City, CA", website: "https://folio3.com", notes: "Microsoft D365 Partner, 15+ years" },
  { name: "ArcherPoint", industry: "IT Consulting", location: "Minneapolis, MN", website: "https://archerpoint.com", notes: "Microsoft D365 & LS Retail partner" },
  { name: "Alithya", industry: "IT Consulting", location: "Montreal, QC", website: "https://alithya.com", notes: "2,200+ professionals, D365 & digital transformation" },
  { name: "Endeavour Solutions", industry: "IT Consulting", location: "Toronto, ON", website: "https://endeavoursolutions.com", notes: "Microsoft Gold Partner, top 5% worldwide" },
  { name: "Evolvous", industry: "IT Consulting", location: "Toronto, ON", website: "https://evolvous.com", notes: "Canada's leading Microsoft D365 Partner" },
  { name: "MNP Digital", industry: "IT Consulting", location: "Calgary, AB", website: "https://mnp.ca", notes: "D365, security & compliance solutions" },
  { name: "Quisitive", industry: "IT Consulting", location: "Toronto, ON", website: "https://quisitive.com", notes: "D365, Azure, AI & Copilot enablement" },
  { name: "RSM", industry: "IT Consulting", location: "Chicago, IL", website: "https://rsmus.com", notes: "Middle market D365 specialist, founded 1926" },
  { name: "Encore Business Solutions", industry: "IT Consulting", location: "Winnipeg, MB", website: "https://encorebusiness.com", notes: "35+ years D365 ERP/CRM experience" },
  { name: "PowerObjects", industry: "IT Consulting", location: "Minneapolis, MN", website: "https://powerobjects.com", notes: "Exclusive D365 focus, HCL Technologies company" },
  { name: "Velosio", industry: "IT Consulting", location: "Columbus, OH", website: "https://velosio.com", notes: "Full-stack D365 for SMBs" },
  { name: "AlphaBOLD", industry: "IT Consulting", location: "Dallas, TX", website: "https://alphabold.com", notes: "D365, Power Platform & Azure" },
  { name: "Confiz", industry: "IT Consulting", location: "Lahore, Pakistan", website: "https://confiz.com", notes: "Global D365 implementation partner" },
  { name: "Cynoteck", industry: "IT Consulting", location: "San Jose, CA", website: "https://cynoteck.com", notes: "D365 & Salesforce consultants" },
  { name: "TTMS", industry: "IT Consulting", location: "Lodz, Poland", website: "https://ttms.com", notes: "800+ IT professionals, Office 365 & D365" },
  { name: "Kainos", industry: "IT Consulting", location: "Belfast, UK", website: "https://kainos.com", notes: "Expanding Toronto office to 300+ employees" },

  // ========== Big Tech - Canada Operations ==========
  { name: "Microsoft Canada", industry: "Technology", location: "Mississauga, ON", website: "https://microsoft.com/en-ca", notes: "Global tech leader, cloud & enterprise software" },
  { name: "Google Canada", industry: "Technology", location: "Toronto, ON", website: "https://google.ca", notes: "Search, cloud, AI & advertising" },
  { name: "Amazon Canada", industry: "Technology", location: "Toronto, ON", website: "https://amazon.ca", notes: "E-commerce, AWS cloud services" },
  { name: "IBM Canada", industry: "Technology", location: "Markham, ON", website: "https://ibm.com/ca-en", notes: "Enterprise IT, AI & consulting" },
  { name: "SAP Canada", industry: "Technology", location: "Toronto, ON", website: "https://sap.com/canada", notes: "Enterprise software, 25+ years in Canada" },
  { name: "Oracle Canada", industry: "Technology", location: "Mississauga, ON", website: "https://oracle.com/ca-en", notes: "Database, cloud & enterprise applications" },
  { name: "Salesforce Canada", industry: "Technology", location: "Toronto, ON", website: "https://salesforce.com", notes: "CRM & cloud platform leader" },

  // ========== Canadian Tech Leaders ==========
  { name: "Shopify", industry: "Technology", location: "Ottawa, ON", website: "https://shopify.com", notes: "E-commerce platform, founded 2006" },
  { name: "OpenText", industry: "Technology", location: "Waterloo, ON", website: "https://opentext.com", notes: "Enterprise information management" },
  { name: "CGI", industry: "IT Consulting", location: "Montreal, QC", website: "https://cgi.com", notes: "91,000+ employees, IT & business consulting" },
  { name: "BlackBerry", industry: "Technology", location: "Waterloo, ON", website: "https://blackberry.com", notes: "Cybersecurity & IoT software" },
  { name: "Lightspeed", industry: "Technology", location: "Montreal, QC", website: "https://lightspeedhq.com", notes: "POS & e-commerce platform" },
  { name: "Kinaxis", industry: "Technology", location: "Ottawa, ON", website: "https://kinaxis.com", notes: "Supply chain management software" },
  { name: "Descartes Systems", industry: "Technology", location: "Waterloo, ON", website: "https://descartes.com", notes: "Logistics & supply chain solutions" },
  { name: "Constellation Software", industry: "Technology", location: "Toronto, ON", website: "https://csisoftware.com", notes: "Acquires & manages vertical market software" },
  { name: "Ceridian (Dayforce)", industry: "Technology", location: "Toronto, ON", website: "https://ceridian.com", notes: "HCM & workforce management" },
  { name: "Coveo", industry: "Technology", location: "Quebec City, QC", website: "https://coveo.com", notes: "AI-powered search & recommendations" },
  { name: "Nuvei", industry: "FinTech", location: "Montreal, QC", website: "https://nuvei.com", notes: "Payment technology solutions" },
  { name: "Docebo", industry: "Technology", location: "Toronto, ON", website: "https://docebo.com", notes: "AI-powered learning platform" },
  { name: "D2L", industry: "Technology", location: "Kitchener, ON", website: "https://d2l.com", notes: "Learning management system (Brightspace)" },
  { name: "Clio", industry: "Technology", location: "Burnaby, BC", website: "https://clio.com", notes: "Legal practice management software" },
  { name: "Hootsuite", industry: "Technology", location: "Vancouver, BC", website: "https://hootsuite.com", notes: "Social media management platform" },
  { name: "FreshBooks", industry: "Technology", location: "Toronto, ON", website: "https://freshbooks.com", notes: "Cloud accounting for SMBs" },
  { name: "Wealthsimple", industry: "FinTech", location: "Toronto, ON", website: "https://wealthsimple.com", notes: "Online investment platform" },
  { name: "Thinkific", industry: "Technology", location: "Vancouver, BC", website: "https://thinkific.com", notes: "Online course platform" },
  { name: "TouchBistro", industry: "Technology", location: "Toronto, ON", website: "https://touchbistro.com", notes: "Restaurant POS system" },
  { name: "Trulioo", industry: "Technology", location: "Vancouver, BC", website: "https://trulioo.com", notes: "Identity verification platform" },
  { name: "GeoComply", industry: "Technology", location: "Vancouver, BC", website: "https://geocomply.com", notes: "Fraud prevention, cybersecurity unicorn" },

  // ========== Global IT Services (Canada presence) ==========
  { name: "Accenture", industry: "IT Consulting", location: "Toronto, ON", website: "https://accenture.com", notes: "Global consulting & professional services" },
  { name: "Deloitte Digital", industry: "IT Consulting", location: "Toronto, ON", website: "https://deloittedigital.com", notes: "Digital transformation & consulting" },
  { name: "Capgemini", industry: "IT Consulting", location: "Toronto, ON", website: "https://capgemini.com", notes: "Global IT services & consulting" },
  { name: "Cognizant", industry: "IT Consulting", location: "Toronto, ON", website: "https://cognizant.com", notes: "IT services & digital solutions" },
  { name: "Infosys", industry: "IT Consulting", location: "Toronto, ON", website: "https://infosys.com", notes: "Global IT services, Calgary hub" },
  { name: "Wipro", industry: "IT Consulting", location: "Mississauga, ON", website: "https://wipro.com", notes: "IT services & consulting" },
  { name: "TCS", industry: "IT Consulting", location: "Toronto, ON", website: "https://tcs.com", notes: "Tata Consultancy Services, global IT" },
  { name: "HCL Technologies", industry: "IT Consulting", location: "Mississauga, ON", website: "https://hcltech.com", notes: "Global IT services company" },
  { name: "Tech Mahindra", industry: "IT Consulting", location: "Toronto, ON", website: "https://techmahindra.com", notes: "IT services & digital transformation" },

  // ========== Canadian Telecom (IT divisions) ==========
  { name: "TELUS", industry: "Telecom/Technology", location: "Vancouver, BC", website: "https://telus.com", notes: "Telecom, TELUS Digital & health tech" },
  { name: "Bell Canada", industry: "Telecom/Technology", location: "Montreal, QC", website: "https://bell.ca", notes: "Telecom, media & IT services" },
  { name: "Rogers Communications", industry: "Telecom/Technology", location: "Toronto, ON", website: "https://rogers.com", notes: "Telecom, media & sports" },

  // ========== Additional IT Consultants ==========
  { name: "TechRepute", industry: "IT Consulting", location: "Toronto, ON", website: "https://techrepute.com", notes: "AI, ML, Data Science & Blockchain solutions" },
  { name: "CloudVital", industry: "IT Consulting", location: "Toronto, ON", website: "https://cloudvital.ca", notes: "Canadian tech consulting & product studio, founded 2018" },
];

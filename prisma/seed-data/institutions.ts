/**
 * Institutions - Banks, Credit Unions, Brokerages, and Card Issuers
 */

import type { Institution } from "./types";

export const institutions: Institution[] = [
  // Big 6 Canadian Banks
  { institutionName: "Royal Bank of Canada", institutionType: "Bank", website: "https://www.rbc.com", notes: "RBC - Canada's largest bank" },
  { institutionName: "Toronto-Dominion Bank", institutionType: "Bank", website: "https://www.td.com", notes: "TD Bank" },
  { institutionName: "Bank of Montreal", institutionType: "Bank", website: "https://www.bmo.com", notes: "BMO" },
  { institutionName: "Scotiabank", institutionType: "Bank", website: "https://www.scotiabank.com", notes: "Bank of Nova Scotia" },
  { institutionName: "Canadian Imperial Bank of Commerce", institutionType: "Bank", website: "https://www.cibc.com", notes: "CIBC" },
  { institutionName: "National Bank of Canada", institutionType: "Bank", website: "https://www.nbc.ca", notes: "NBC - Quebec-based" },

  // Online Banks
  { institutionName: "Tangerine", institutionType: "Bank", website: "https://www.tangerine.ca", notes: "Scotiabank subsidiary, formerly ING Direct" },
  { institutionName: "Simplii Financial", institutionType: "Bank", website: "https://www.simplii.com", notes: "CIBC subsidiary" },
  { institutionName: "EQ Bank", institutionType: "Bank", website: "https://www.eqbank.ca", notes: "Equitable Bank digital platform" },
  { institutionName: "Manulife Bank", institutionType: "Bank", website: "https://www.manulifebank.ca", notes: "Manulife Financial subsidiary" },
  { institutionName: "Alterna Bank", institutionType: "Bank", website: "https://www.alternabank.ca", notes: "Alterna Savings digital bank" },
  { institutionName: "Motusbank", institutionType: "Bank", website: "https://www.motusbank.ca", notes: "Meridian Credit Union digital bank" },
  { institutionName: "Neo Financial", institutionType: "Bank", website: "https://www.neofinancial.com", notes: "Digital bank and rewards" },
  { institutionName: "KOHO", institutionType: "Bank", website: "https://www.koho.ca", notes: "Prepaid spending account" },
  { institutionName: "STACK", institutionType: "Bank", website: "https://www.getstack.ca", notes: "Digital prepaid Mastercard" },

  // Credit Unions
  { institutionName: "Desjardins", institutionType: "Credit Union", website: "https://www.desjardins.com", notes: "Largest credit union in North America" },
  { institutionName: "Meridian Credit Union", institutionType: "Credit Union", website: "https://www.meridiancu.ca", notes: "Ontario's largest credit union" },
  { institutionName: "Vancity", institutionType: "Credit Union", website: "https://www.vancity.com", notes: "Vancouver City Savings Credit Union" },
  { institutionName: "Coast Capital Savings", institutionType: "Credit Union", website: "https://www.coastcapitalsavings.com", notes: "BC credit union" },
  { institutionName: "Servus Credit Union", institutionType: "Credit Union", website: "https://www.servus.ca", notes: "Alberta's largest credit union" },
  { institutionName: "FirstOntario Credit Union", institutionType: "Credit Union", website: "https://www.firstontario.com", notes: "Ontario credit union" },
  { institutionName: "Conexus Credit Union", institutionType: "Credit Union", website: "https://www.conexus.ca", notes: "Saskatchewan credit union" },
  { institutionName: "Steinbach Credit Union", institutionType: "Credit Union", website: "https://www.scu.mb.ca", notes: "Manitoba credit union" },
  { institutionName: "Affinity Credit Union", institutionType: "Credit Union", website: "https://www.affinitycu.ca", notes: "Saskatchewan credit union" },

  // Brokerages & Investment Platforms
  { institutionName: "Questrade", institutionType: "Brokerage", website: "https://www.questrade.com", notes: "Canadian discount brokerage" },
  { institutionName: "Wealthsimple", institutionType: "Brokerage", website: "https://www.wealthsimple.com", notes: "Robo-advisor and trading platform" },
  { institutionName: "Qtrade", institutionType: "Brokerage", website: "https://www.qtrade.ca", notes: "Qtrade Direct Investing" },
  { institutionName: "Interactive Brokers", institutionType: "Brokerage", website: "https://www.interactivebrokers.ca", notes: "IBKR - Global trading platform" },
  { institutionName: "TD Direct Investing", institutionType: "Brokerage", website: "https://www.td.com/ca/en/investing", notes: "TD WebBroker" },
  { institutionName: "RBC Direct Investing", institutionType: "Brokerage", website: "https://www.rbcdirectinvesting.com", notes: "RBC brokerage platform" },
  { institutionName: "BMO InvestorLine", institutionType: "Brokerage", website: "https://www.bmoinvestorline.com", notes: "BMO self-directed investing" },
  { institutionName: "CIBC Investor's Edge", institutionType: "Brokerage", website: "https://www.investorsedge.cibc.com", notes: "CIBC online brokerage" },
  { institutionName: "Scotia iTRADE", institutionType: "Brokerage", website: "https://www.scotiaitrade.com", notes: "Scotiabank online brokerage" },
  { institutionName: "National Bank Direct Brokerage", institutionType: "Brokerage", website: "https://www.nbc.ca/personal/accounts/investing.html", notes: "NBDB - Commission-free trading" },
  { institutionName: "AGF Investments", institutionType: "Brokerage", website: "https://www.agf.com", notes: "Mutual funds and ETFs" },
  { institutionName: "Fidelity Investments Canada", institutionType: "Brokerage", website: "https://www.fidelity.ca", notes: "Investment management" },
  { institutionName: "CI Financial", institutionType: "Brokerage", website: "https://www.ci.com", notes: "Wealth management" },
  { institutionName: "Mackenzie Investments", institutionType: "Brokerage", website: "https://www.mackenzieinvestments.com", notes: "Mutual funds and ETFs" },
  { institutionName: "Vanguard Canada", institutionType: "Brokerage", website: "https://www.vanguard.ca", notes: "Low-cost ETFs" },
  { institutionName: "iShares by BlackRock", institutionType: "Brokerage", website: "https://www.blackrock.com/ca", notes: "ETF provider" },

  // Credit Card Issuers (not banks)
  { institutionName: "American Express Canada", institutionType: "Other", website: "https://www.americanexpress.com/ca", notes: "Amex - Credit cards and travel" },
  { institutionName: "Capital One Canada", institutionType: "Other", website: "https://www.capitalone.ca", notes: "Credit cards" },
  { institutionName: "MBNA", institutionType: "Other", website: "https://www.mbna.ca", notes: "TD Bank credit card brand" },
  { institutionName: "Rogers Bank", institutionType: "Other", website: "https://www.rogersbank.com", notes: "Rogers World Elite Mastercard" },
  { institutionName: "PC Financial", institutionType: "Other", website: "https://www.pcfinancial.ca", notes: "President's Choice Financial (CIBC)" },
  { institutionName: "Canadian Tire Bank", institutionType: "Other", website: "https://www.ctfs.com", notes: "Triangle Mastercard issuer" },
  { institutionName: "Walmart Canada Bank", institutionType: "Other", website: "https://www.walmart.ca/en/financial-services", notes: "Walmart Rewards Mastercard" },
  { institutionName: "Home Trust", institutionType: "Other", website: "https://www.hometrust.ca", notes: "Mortgages and credit cards" },
  { institutionName: "Flexiti", institutionType: "Other", website: "https://www.flexiti.com", notes: "Retail financing" },

  // Mortgage Lenders
  { institutionName: "CMLS Financial", institutionType: "Other", website: "https://www.cmls.ca", notes: "Mortgage lender (acquired by Nesto)" },
  { institutionName: "Nesto", institutionType: "Other", website: "https://www.nesto.ca", notes: "Digital mortgage platform" },
  { institutionName: "MCAP", institutionType: "Other", website: "https://www.mcap.com", notes: "Mortgage financing" },
  { institutionName: "First National", institutionType: "Other", website: "https://www.firstnational.ca", notes: "Mortgage lender" },

  // Payment Processors
  { institutionName: "PayPal Canada", institutionType: "Other", website: "https://www.paypal.com/ca", notes: "Online payments" },
  { institutionName: "Wise", institutionType: "Other", website: "https://www.wise.com", notes: "International money transfers" },
];

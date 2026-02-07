/**
 * Income Sources - Seed data for income resolution
 * These are matched against deposit/credit transactions
 */

import type { IncomeSource } from "./types";

export const incomes: IncomeSource[] = [
  // ============================================================================
  // HEALTH BENEFIT REIMBURSEMENTS
  // ============================================================================
  {
    incomeName: "Manulife Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Manulife Claim",
    payFrequency: "Irregular",
    notes: "Manulife group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "HEALTH/DENTAL CLAIM MANULIFE", priority: 25, notes: "RBC chequing health claim deposit" },
      { pattern: "MANULIFE CLAIM", priority: 20, notes: "Generic claim deposit" },
      { pattern: "MANULIFE HEALTH", priority: 20, notes: null },
      { pattern: "MANULIFE DENTAL", priority: 20, notes: null },
      { pattern: "MANULIFE REIMB", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Sun Life Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Sun Life Claim",
    payFrequency: "Irregular",
    notes: "Sun Life group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "INSURANCE SUNLIFE MED INS", priority: 25, notes: "RBC chequing insurance claim deposit" },
      { pattern: "SUNLIFE MED INS", priority: 25, notes: "Sun Life medical insurance claim" },
      { pattern: "SUN LIFE CLAIM", priority: 20, notes: null },
      { pattern: "SUNLIFE CLAIM", priority: 20, notes: null },
      { pattern: "SUN LIFE HEALTH", priority: 20, notes: null },
      { pattern: "SUN LIFE DENTAL", priority: 20, notes: null },
      { pattern: "SUNLIFE REIMB", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Canada Life Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Canada Life Claim",
    payFrequency: "Irregular",
    notes: "Canada Life (Great-West) group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "CANADA LIFE CLAIM", priority: 20, notes: null },
      { pattern: "CANADA LIFE HEALTH", priority: 20, notes: null },
      { pattern: "CANADA LIFE DENTAL", priority: 20, notes: null },
      { pattern: "GREAT-WEST LIFE CLAIM", priority: 20, notes: null },
      { pattern: "GWL CLAIM", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Desjardins Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Desjardins Claim",
    payFrequency: "Irregular",
    notes: "Desjardins Insurance group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "DESJARDINS CLAIM", priority: 20, notes: null },
      { pattern: "DESJARDINS HEALTH", priority: 20, notes: null },
      { pattern: "DESJARDINS DENTAL", priority: 20, notes: null },
      { pattern: "DESJARDINS REIMB", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Industrial Alliance Health Claim",
    incomeType: "Reimbursement",
    categoryName: "iA Financial Claim",
    payFrequency: "Irregular",
    notes: "iA Financial group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "IA FINANCIAL CLAIM", priority: 20, notes: null },
      { pattern: "INDUSTRIAL ALLIANCE CLAIM", priority: 20, notes: null },
      { pattern: "IA HEALTH", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Blue Cross Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Blue Cross Claim",
    payFrequency: "Irregular",
    notes: "Blue Cross group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "BLUE CROSS CLAIM", priority: 20, notes: null },
      { pattern: "BLUE CROSS HEALTH", priority: 20, notes: null },
      { pattern: "BLUE CROSS DENTAL", priority: 20, notes: null },
      { pattern: "PACIFIC BLUE CROSS", priority: 15, notes: "BC Blue Cross" },
      { pattern: "MEDAVIE BLUE CROSS", priority: 15, notes: "Atlantic Blue Cross" },
      { pattern: "ALBERTA BLUE CROSS", priority: 15, notes: null },
    ],
  },
  {
    incomeName: "Green Shield Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Green Shield Claim",
    payFrequency: "Irregular",
    notes: "Green Shield Canada group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "GREEN SHIELD", priority: 15, notes: null },
      { pattern: "GREENSHIELD", priority: 15, notes: null },
      { pattern: "GSC CLAIM", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Equitable Life Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Equitable Life Claim",
    payFrequency: "Irregular",
    notes: "Equitable Life group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "EQUITABLE LIFE CLAIM", priority: 20, notes: null },
      { pattern: "EQUITABLE LIFE HEALTH", priority: 20, notes: null },
    ],
  },
  {
    incomeName: "Co-operators Health Claim",
    incomeType: "Reimbursement",
    categoryName: "Co-operators Claim",
    payFrequency: "Irregular",
    notes: "Co-operators group benefits - health/dental claim reimbursement",
    patterns: [
      { pattern: "CO-OP HEALTH", priority: 20, notes: null },
      { pattern: "COOPERATORS CLAIM", priority: 20, notes: null },
      { pattern: "CO-OPERATORS CLAIM", priority: 20, notes: null },
    ],
  },
];

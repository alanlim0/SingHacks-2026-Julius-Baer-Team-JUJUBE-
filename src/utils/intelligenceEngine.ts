import clientsData from "../data/clients.json";
import portfoliosData from "../data/portfolios.json";
import holdingsData from "../data/holdings.json";
import instrumentsData from "../data/instruments.json";
import mandatesData from "../data/mandates.json";
import creditFacilitiesData from "../data/credit_facilities.json";
import commitmentsData from "../data/commitments.json";
import plannedCashNeedsData from "../data/planned_cash_needs.json";
import marketContextData from "../data/market_context.json";
import eventLogData from "../data/event_log.json";
import rmNotesData from "../data/rm_notes.json";
import transactionsData from "../data/transactions.json";

import {
  Client,
  Portfolio,
  Holding,
  Instrument,
  Mandate,
  CreditFacility,
  Commitment,
  PlannedCashNeed,
  MarketContext,
  EventLogEntry,
  RMNote,
  Transaction,
  PriorityClientItem,
  UrgencyLevel,
  MandateComplianceResult,
  ScenarioImpactResult,
} from "../types";

export const SNAPSHOT_DATES = [
  "2025-12-31",
  "2026-02-27",
  "2026-03-31",
  "2026-06-30",
  "2026-08-26",
] as const;

export const TODAY_SNAPSHOT = "2026-08-26";

// Type assertions for imported data
export const clients: Client[] = clientsData as unknown as Client[];
export const portfolios: Portfolio[] = portfoliosData as unknown as Portfolio[];
export const holdings: Holding[] = holdingsData as unknown as Holding[];
export const instruments: Instrument[] = instrumentsData as unknown as Instrument[];
export const mandates: Mandate[] = mandatesData as unknown as Mandate[];
export const creditFacilities: CreditFacility[] = creditFacilitiesData as unknown as CreditFacility[];
export const commitments: Commitment[] = commitmentsData as unknown as Commitment[];
export const plannedCashNeeds: PlannedCashNeed[] = plannedCashNeedsData as unknown as PlannedCashNeed[];
export const marketContext: MarketContext[] = marketContextData as unknown as MarketContext[];
export const eventLog: EventLogEntry[] = eventLogData as unknown as EventLogEntry[];
export const rmNotes: RMNote[] = rmNotesData as unknown as RMNote[];
export const transactions: Transaction[] = transactionsData as unknown as Transaction[];

// Fast Lookup Maps
export const instrumentsById = new Map<string, Instrument>(
  instruments.map((i) => [i.instrument_id, i])
);

export const clientsById = new Map<string, Client>(
  clients.map((c) => [c.client_id, c])
);

export const portfoliosByClientId = new Map<string, Portfolio[]>();
for (const p of portfolios) {
  const list = portfoliosByClientId.get(p.client_id) || [];
  list.push(p);
  portfoliosByClientId.set(p.client_id, list);
}

export const creditFacilitiesByClientId = new Map<string, CreditFacility[]>();
for (const f of creditFacilities) {
  const list = creditFacilitiesByClientId.get(f.client_id) || [];
  list.push(f);
  creditFacilitiesByClientId.set(f.client_id, list);
}

export const commitmentsByClientId = new Map<string, Commitment[]>();
for (const c of commitments) {
  const list = commitmentsByClientId.get(c.client_id) || [];
  list.push(c);
  commitmentsByClientId.set(c.client_id, list);
}

export const plannedCashNeedsByClientId = new Map<string, PlannedCashNeed[]>();
for (const n of plannedCashNeeds) {
  const list = plannedCashNeedsByClientId.get(n.client_id) || [];
  list.push(n);
  plannedCashNeedsByClientId.set(n.client_id, list);
}

export const rmNotesByClientId = new Map<string, RMNote[]>();
for (const n of rmNotes) {
  const list = rmNotesByClientId.get(n.client_id) || [];
  list.push(n);
  rmNotesByClientId.set(n.client_id, list);
}

// -------------------------------------------------------------
// Prioritisation Engine: "Who to call first, and why"
// -------------------------------------------------------------
export function getPriorityRankings(): PriorityClientItem[] {
  const items: PriorityClientItem[] = clients.map((client) => {
    const clientPortfolios = portfoliosByClientId.get(client.client_id) || [];
    const clientFacilities = creditFacilitiesByClientId.get(client.client_id) || [];
    const clientCommitments = commitmentsByClientId.get(client.client_id) || [];
    const clientCashNeeds = plannedCashNeedsByClientId.get(client.client_id) || [];
    const clientHoldingsToday = holdings.filter(
      (h) => h.client_id === client.client_id && h.snapshot_date === TODAY_SNAPSHOT
    );

    let score = 0;
    const triggers: string[] = [];
    const keyRisks: PriorityClientItem["keyRisks"] = {};

    // 1. Lombard Credit Facility & LTV Risks
    for (const fac of clientFacilities) {
      const currentLtv = fac["ltv_pct_2026-08-26"];
      const threshold = fac.margin_call_ltv_pct;
      const headroom = fac["headroom_2026-08-26"];
      const buffer = threshold - currentLtv;

      if (buffer <= 1.5) {
        score += 45;
        triggers.push(`Critical Collateral Alert: Current LTV ${currentLtv.toFixed(1)}% is within ${buffer.toFixed(1)}% of margin call (${threshold.toFixed(1)}%)`);
        keyRisks.marginRisk = {
          currentLtv,
          threshold,
          headroomUsd: headroom,
          status: "critical",
        };
      } else if (buffer <= 5.0) {
        score += 28;
        triggers.push(`Collateral Headroom Warning: LTV ${currentLtv.toFixed(1)}% nearing margin trigger ${threshold.toFixed(1)}% (headroom: USD ${(headroom / 1e6).toFixed(2)}M)`);
        keyRisks.marginRisk = {
          currentLtv,
          threshold,
          headroomUsd: headroom,
          status: "warning",
        };
      } else {
        keyRisks.marginRisk = {
          currentLtv,
          threshold,
          headroomUsd: headroom,
          status: "healthy",
        };
      }

      // Check if breached during June 2026 drawdown
      if (fac["ltv_pct_2026-06-30"] >= threshold) {
        score += 15;
        triggers.push(`Historical Margin Breach: LTV touched ${fac["ltv_pct_2026-06-30"].toFixed(1)}% in June tech drawdown`);
      }
    }

    // 2. Mandate Compliance & Sustainability Breaches
    const sustainabilityBreaches: string[] = [];
    const mandateDrifts: string[] = [];
    const concentrationAlerts: string[] = [];

    for (const pf of clientPortfolios) {
      if (pf.service_model === "Custody") continue; // Custody accounts not measured against mandate

      const pfHoldings = clientHoldingsToday.filter((h) => h.portfolio_id === pf.portfolio_id);
      const totalVal = pfHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

      // Check sustainability exclusions if Sustainable Mandate
      if (pf.mandate_code === "SUSBAL") {
        for (const h of pfHoldings) {
          const inst = instrumentsById.get(h.instrument_id);
          if (inst?.sustainability_excluded === "Y") {
            sustainabilityBreaches.push(
              `${h.instrument_name} (${h.weight_pct.toFixed(1)}% in ${pf.portfolio_name}) violates binding mandate exclusions (${inst.sector})`
            );
          }
        }
      }

      // Check single-name concentration
      const pfMandateRows = mandates.filter((m) => m.mandate_code === pf.mandate_code);
      const maxSingleAllowed = pfMandateRows[0]?.max_single_position_pct || 15;

      for (const h of pfHoldings) {
        const inst = instrumentsById.get(h.instrument_id);
        if (inst?.concentration_limit_applies === "Y" && h.weight_pct > maxSingleAllowed) {
          concentrationAlerts.push(
            `Single-name concentration: ${h.instrument_name} is ${h.weight_pct.toFixed(1)}% (mandate limit ${maxSingleAllowed}%)`
          );
        }
      }

      // Check asset class drift vs mandate bands
      const assetClassTotals = new Map<string, number>();
      for (const h of pfHoldings) {
        assetClassTotals.set(h.asset_class, (assetClassTotals.get(h.asset_class) || 0) + h.market_value_usd);
      }

      for (const mRow of pfMandateRows) {
        const actualVal = assetClassTotals.get(mRow.asset_class) || 0;
        const actualPct = totalVal > 0 ? (actualVal / totalVal) * 100 : 0;
        if (actualPct > mRow.max_pct + 1) {
          mandateDrifts.push(
            `${mRow.asset_class} in ${pf.portfolio_name} overweight at ${actualPct.toFixed(1)}% (max ${mRow.max_pct}%)`
          );
        } else if (actualPct < mRow.min_pct - 1) {
          mandateDrifts.push(
            `${mRow.asset_class} in ${pf.portfolio_name} underweight at ${actualPct.toFixed(1)}% (min ${mRow.min_pct}%)`
          );
        }
      }
    }

    if (sustainabilityBreaches.length > 0) {
      score += 35;
      triggers.push(`Mandate Governance Breach: ${sustainabilityBreaches[0]}`);
      keyRisks.sustainabilityBreaches = sustainabilityBreaches;
    }
    if (mandateDrifts.length > 0) {
      score += 15;
      keyRisks.mandateDrifts = mandateDrifts;
    }
    if (concentrationAlerts.length > 0) {
      score += 20;
      triggers.push(`Concentration Risk: ${concentrationAlerts[0]}`);
      keyRisks.concentrationAlerts = concentrationAlerts;
    }

    // 3. Liquidity & Cash Commitments Matching
    const totalUncalledCommitments = clientCommitments.reduce((sum, c) => sum + c.uncalled, 0);
    const upcomingNeeds = clientCashNeeds
      .filter((n) => n.due_from <= "2027-06-30")
      .reduce((sum, n) => sum + (n.currency === "SGD" ? n.amount * 0.76 : n.amount), 0);

    const totalCashLiabilities = totalUncalledCommitments + upcomingNeeds;

    const liquidHoldingsUsd = clientHoldingsToday
      .filter((h) => h.liquidity_tier === "Daily" || h.liquidity_tier === "Weekly")
      .reduce((sum, h) => sum + h.market_value_usd, 0);

    if (totalCashLiabilities > liquidHoldingsUsd && totalCashLiabilities > 0) {
      const shortfall = totalCashLiabilities - liquidHoldingsUsd;
      score += 25;
      triggers.push(
        `Liquidity Mismatch: USD ${(totalCashLiabilities / 1e6).toFixed(1)}M liabilities vs USD ${(liquidHoldingsUsd / 1e6).toFixed(1)}M liquid buffer`
      );
      keyRisks.liquidityShortfallUsd = shortfall;
    }

    // 4. Tax Domicile Mismatch & Cross-Border Opportunities
    if (client.tax_domicile !== client.country_of_residence) {
      score += 12;
      keyRisks.taxMismatch = true;
      if (client.tax_domicile === "United Kingdom" || client.tax_domicile === "Indonesia") {
        score += 8;
        triggers.push(
          `Cross-Border Tax Advisory: Domiciled in ${client.tax_domicile} vs resident in ${client.country_of_residence}`
        );
      }
    }

    // 5. KYC Review Due Proximity
    if (client.kyc_review_due && client.kyc_review_due <= "2026-10-31") {
      score += 10;
      keyRisks.kycDueSoon = true;
      triggers.push(`KYC Review Due: ${client.kyc_review_due}`);
    }

    // 6. Calculate YTD Portfolio Return & AUM change
    const baselineHoldings = holdings.filter(
      (h) => h.client_id === client.client_id && h.snapshot_date === "2025-12-31"
    );
    const baselineAum = baselineHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
    const currentAum = client.total_aum_usd;
    const ytdAumChangeUsd = currentAum - baselineAum;
    const ytdReturnPct = baselineAum > 0 ? (ytdAumChangeUsd / baselineAum) * 100 : 0;

    // Determine Urgency Level
    let urgencyLevel: UrgencyLevel = "Monitoring";
    if (score >= 60) urgencyLevel = "Critical";
    else if (score >= 40) urgencyLevel = "High";
    else if (score >= 20) urgencyLevel = "Moderate";

    // Recommended Action synthesis
    let recommendedAction = "Schedule routine portfolio check-in and rebalancing review.";
    if (keyRisks.marginRisk?.status === "critical") {
      recommendedAction = `Immediate Call: Address Lombard collateral shortfall (${keyRisks.marginRisk.currentLtv.toFixed(1)}% LTV vs ${keyRisks.marginRisk.threshold.toFixed(1)}% margin call). Discuss deleveraging or pledge additional assets.`;
    } else if (keyRisks.sustainabilityBreaches && keyRisks.sustainabilityBreaches.length > 0) {
      recommendedAction = `Mandate Remediation: Review binding exclusions in Sustainable Balanced mandate and execute divestment of non-compliant holdings.`;
    } else if (keyRisks.marginRisk?.status === "warning") {
      recommendedAction = `Collateral Check: Review loan utilisation and establish market stop-loss or cash buffer to prevent margin trigger.`;
    } else if (keyRisks.liquidityShortfallUsd) {
      recommendedAction = `Liquidity Planning: Establish funding schedule for USD ${(totalCashLiabilities / 1e6).toFixed(1)}M commitments and planned cash needs.`;
    } else if (keyRisks.taxMismatch) {
      recommendedAction = `Tax & Estate Structuring: Review asset location across jurisdictions and optimize funding source for planned transactions.`;
    }

    return {
      client,
      portfolios: clientPortfolios,
      urgencyScore: Math.min(score, 100),
      urgencyLevel,
      primaryTriggers: triggers.length > 0 ? triggers : ["Routine portfolio monitoring & mandate review"],
      recommendedAction,
      keyRisks,
      ytdReturnPct,
      ytdAumChangeUsd,
    };
  });

  // Sort descending by urgency score, then by total AUM
  return items.sort((a, b) => b.urgencyScore - a.urgencyScore || b.client.total_aum_usd - a.client.total_aum_usd);
}

// -------------------------------------------------------------
// Look-Through Analysis (Structured Products & Hidden Risk)
// -------------------------------------------------------------
export function getClientLookThrough(clientId: string, snapshotDate: string = TODAY_SNAPSHOT) {
  const clientHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === snapshotDate
  );
  const totalAum = clientHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

  // Group by underlying economic exposure
  const exposures: {
    instrument_id: string;
    instrument_name: string;
    reportedAssetClass: string;
    effectiveAssetClass: string;
    sector: string;
    underlyingReference?: string | null;
    market_value_usd: number;
    weight_pct: number;
    isStructured: boolean;
    isSustainabilityExcluded: boolean;
  }[] = [];

  for (const h of clientHoldings) {
    const inst = instrumentsById.get(h.instrument_id);
    const hasUnderlying = Boolean(inst?.underlying_reference);
    const isExcluded = inst?.sustainability_excluded === "Y";

    let effectiveAssetClass = h.asset_class;
    if (h.asset_class === "Structured Products" && inst?.underlying_reference) {
      const ref = inst.underlying_reference.toLowerCase();
      if (ref.includes("gold") || ref.includes("xau")) {
        effectiveAssetClass = "Commodities (Look-Through)";
      } else if (ref.includes("energy") || ref.includes("shipping") || ref.includes("helios")) {
        effectiveAssetClass = "Equities (Look-Through)";
      }
    }

    exposures.push({
      instrument_id: h.instrument_id,
      instrument_name: h.instrument_name,
      reportedAssetClass: h.asset_class,
      effectiveAssetClass,
      sector: h.sector,
      underlyingReference: inst?.underlying_reference,
      market_value_usd: h.market_value_usd,
      weight_pct: totalAum > 0 ? (h.market_value_usd / totalAum) * 100 : 0,
      isStructured: hasUnderlying,
      isSustainabilityExcluded: isExcluded,
    });
  }

  // Cross-portfolio concentration by underlying company/issuer
  const concentrationByUnderlying = new Map<string, { valueUsd: number; names: string[] }>();
  for (const exp of exposures) {
    let key = exp.instrument_name;
    if (exp.underlyingReference) {
      key = `[Look-Through] ${exp.underlyingReference}`;
    }
    const current = concentrationByUnderlying.get(key) || { valueUsd: 0, names: [] };
    current.valueUsd += exp.market_value_usd;
    if (!current.names.includes(exp.instrument_name)) current.names.push(exp.instrument_name);
    concentrationByUnderlying.set(key, current);
  }

  const aggregatedConcentrations = Array.from(concentrationByUnderlying.entries())
    .map(([key, data]) => ({
      name: key,
      valueUsd: data.valueUsd,
      weightPct: totalAum > 0 ? (data.valueUsd / totalAum) * 100 : 0,
      instruments: data.names,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);

  return {
    totalAum,
    exposures,
    aggregatedConcentrations,
  };
}

// -------------------------------------------------------------
// Mandate Compliance Checker
// -------------------------------------------------------------
export function getClientMandateCompliance(clientId: string, snapshotDate: string = TODAY_SNAPSHOT): MandateComplianceResult[] {
  const clientPfs = portfoliosByClientId.get(clientId) || [];
  const results: MandateComplianceResult[] = [];

  for (const pf of clientPfs) {
    if (pf.service_model === "Custody") continue;

    const pfMandateRows = mandates.filter((m) => m.mandate_code === pf.mandate_code);
    if (pfMandateRows.length === 0) continue;

    const pfHoldings = holdings.filter(
      (h) => h.portfolio_id === pf.portfolio_id && h.snapshot_date === snapshotDate
    );
    const totalPfVal = pfHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

    const assetClassMap = new Map<string, number>();
    for (const h of pfHoldings) {
      assetClassMap.set(h.asset_class, (assetClassMap.get(h.asset_class) || 0) + h.market_value_usd);
    }

    const assetClassCompliance = pfMandateRows.map((m) => {
      const val = assetClassMap.get(m.asset_class) || 0;
      const actualPct = totalPfVal > 0 ? (val / totalPfVal) * 100 : 0;
      let status: "compliant" | "overweight" | "underweight" = "compliant";
      let driftPct = 0;

      if (actualPct > m.max_pct) {
        status = "overweight";
        driftPct = actualPct - m.max_pct;
      } else if (actualPct < m.min_pct) {
        status = "underweight";
        driftPct = m.min_pct - actualPct;
      }

      return {
        assetClass: m.asset_class,
        actualPct,
        minPct: m.min_pct,
        targetPct: m.target_pct,
        maxPct: m.max_pct,
        status,
        driftPct,
      };
    });

    const maxSingleAllowed = pfMandateRows[0]?.max_single_position_pct || 15;
    const singlePositionBreaches: MandateComplianceResult["singlePositionBreaches"] = [];

    for (const h of pfHoldings) {
      const inst = instrumentsById.get(h.instrument_id);
      if (inst?.concentration_limit_applies === "Y" && h.weight_pct > maxSingleAllowed) {
        singlePositionBreaches.push({
          instrument_name: h.instrument_name,
          weightPct: h.weight_pct,
          maxAllowedPct: maxSingleAllowed,
        });
      }
    }

    const sustainabilityBreaches: MandateComplianceResult["sustainabilityBreaches"] = [];
    if (pf.mandate_code === "SUSBAL") {
      for (const h of pfHoldings) {
        const inst = instrumentsById.get(h.instrument_id);
        if (inst?.sustainability_excluded === "Y") {
          sustainabilityBreaches.push({
            instrument_name: h.instrument_name,
            sector: h.sector,
            weightPct: h.weight_pct,
            reason: `Sector '${h.sector}' falls under binding exclusions for ${pf.mandate_name}`,
          });
        }
      }
    }

    results.push({
      mandate_code: pf.mandate_code,
      mandate_name: pf.mandate_name,
      portfolio_id: pf.portfolio_id,
      assetClassCompliance,
      singlePositionBreaches,
      sustainabilityBreaches,
    });
  }

  return results;
}

// -------------------------------------------------------------
// 2026 Event Attribution Engine
// -------------------------------------------------------------
export function getEventAttribution(clientId: string) {
  const dates = SNAPSHOT_DATES;
  const baselineDate = "2025-12-31";
  const currentDate = TODAY_SNAPSHOT;

  const baselineHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === baselineDate
  );
  const currentHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === currentDate
  );

  const baselineAum = baselineHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
  const currentAum = currentHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
  const deltaAum = currentAum - baselineAum;
  const returnPct = baselineAum > 0 ? (deltaAum / baselineAum) * 100 : 0;

  // Attribution by asset class
  const assetClassAttribution = new Map<string, { baselineVal: number; currentVal: number }>();
  for (const h of baselineHoldings) {
    const cur = assetClassAttribution.get(h.asset_class) || { baselineVal: 0, currentVal: 0 };
    cur.baselineVal += h.market_value_usd;
    assetClassAttribution.set(h.asset_class, cur);
  }
  for (const h of currentHoldings) {
    const cur = assetClassAttribution.get(h.asset_class) || { baselineVal: 0, currentVal: 0 };
    cur.currentVal += h.market_value_usd;
    assetClassAttribution.set(h.asset_class, cur);
  }

  const assetClassBreakdown = Array.from(assetClassAttribution.entries()).map(([ac, v]) => ({
    assetClass: ac,
    baselineVal: v.baselineVal,
    currentVal: v.currentVal,
    deltaVal: v.currentVal - v.baselineVal,
    contributionPct: baselineAum > 0 ? ((v.currentVal - v.baselineVal) / baselineAum) * 100 : 0,
  }));

  // Top winners and losers
  const instrumentPnl = currentHoldings
    .map((h) => ({
      instrument_id: h.instrument_id,
      instrument_name: h.instrument_name,
      asset_class: h.asset_class,
      sector: h.sector,
      unrealisedPnlUsd: h.unrealised_pnl_base,
      unrealisedPnlPct: h.unrealised_pnl_pct,
      currentValueUsd: h.market_value_usd,
      weightPct: h.weight_pct,
    }))
    .sort((a, b) => b.unrealisedPnlUsd - a.unrealisedPnlUsd);

  // Link to relevant 2026 events based on client holding sectors
  const heldSectors = new Set(currentHoldings.map((h) => h.sector.toLowerCase()));
  const heldAssetClasses = new Set(currentHoldings.map((h) => h.asset_class.toLowerCase()));

  const matchedEvents = eventLog.map((e) => {
    const trans = e.primary_transmission.toLowerCase();
    const desc = e.description.toLowerCase();
    let relevanceScore = 0;

    if (trans.includes("energy") && (heldSectors.has("energy") || heldSectors.has("oil & gas"))) relevanceScore += 3;
    if (trans.includes("gold") && (heldSectors.has("gold") || heldAssetClasses.has("commodities"))) relevanceScore += 3;
    if (trans.includes("technology") && (heldSectors.has("information technology") || heldSectors.has("technology"))) relevanceScore += 3;
    if (trans.includes("yield") || trans.includes("duration") || trans.includes("fixed income")) {
      if (heldAssetClasses.has("fixed income")) relevanceScore += 2;
    }
    if (trans.includes("lending") || trans.includes("collateral")) {
      if (creditFacilitiesByClientId.has(clientId)) relevanceScore += 3;
    }

    return {
      event: e,
      relevanceScore,
    };
  }).filter((m) => m.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    baselineDate,
    currentDate,
    baselineAum,
    currentAum,
    deltaAum,
    returnPct,
    assetClassBreakdown,
    topContributors: instrumentPnl.slice(0, 5),
    topDetractors: [...instrumentPnl].reverse().slice(0, 5),
    matchedEvents: matchedEvents.map((m) => m.event),
  };
}

// -------------------------------------------------------------
// Scenario Stress Testing Engine
// -------------------------------------------------------------
export const PREDEFINED_SCENARIOS = [
  {
    id: "SCENARIO_ME_DEESCALATION",
    name: "Middle East De-escalation & Hormuz Reopening",
    description: "Naval blockade lifted, Strait of Hormuz opens, oil normalises toward $72/bbl, global shipping costs plunge, equities rally broadly.",
    shocks: {
      energy: -0.22,
      commodities: -0.12,
      gold: -0.08,
      technology: 0.12,
      equities: 0.07,
      fixedIncome: 0.03,
    },
    rateShiftBps: -25,
    advice: "Trim tactical energy overweights and take profits on gold hedges. Rebalance into high-quality growth and duration lock-in.",
  },
  {
    id: "SCENARIO_ME_ESCALATION",
    name: "Middle East Escalation & Sustained Energy Shock",
    description: "Renewed strikes on regional energy infrastructure, Brent breaches $140/bbl, headline inflation spikes, central banks forced to tighten again.",
    shocks: {
      energy: 0.35,
      commodities: 0.20,
      gold: 0.18,
      technology: -0.15,
      equities: -0.10,
      fixedIncome: -0.05,
    },
    rateShiftBps: 50,
    advice: "Urgent collateral warning for Lombard borrowers. Maintain defensive cash allocations, increase commodity buffers, and hedge duration.",
  },
  {
    id: "SCENARIO_TECH_REBOUND",
    name: "Tech Semiconductor Surge & Fed Rate Cut",
    description: "Federal Reserve delivers surprise 50bps rate cut amidst softening inflation, enterprise AI adoption expands, US megacap tech surges 18%.",
    shocks: {
      energy: -0.05,
      commodities: 0.02,
      gold: 0.05,
      technology: 0.20,
      equities: 0.09,
      fixedIncome: 0.04,
    },
    rateShiftBps: -50,
    advice: "Collateral headroom expands substantially for tech-heavy portfolios. Execute profit-taking rebalancing to bring equities back into mandate target bands.",
  },
];

export function runStressTest(clientId: string, scenarioId: string): ScenarioImpactResult {
  const scenario = PREDEFINED_SCENARIOS.find((s) => s.id === scenarioId) || PREDEFINED_SCENARIOS[0];
  const clientHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === TODAY_SNAPSHOT
  );
  const totalAum = clientHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

  let newAum = 0;
  const sectorDeltas = new Map<string, { current: number; simulated: number }>();

  for (const h of clientHoldings) {
    let shock = 0;
    const sectorLower = h.sector.toLowerCase();
    const acLower = h.asset_class.toLowerCase();

    if (sectorLower.includes("energy") || sectorLower.includes("oil")) {
      shock = scenario.shocks.energy;
    } else if (sectorLower.includes("gold") || acLower.includes("commodities")) {
      shock = sectorLower.includes("gold") ? scenario.shocks.gold : scenario.shocks.commodities;
    } else if (sectorLower.includes("technology") || sectorLower.includes("software")) {
      shock = scenario.shocks.technology;
    } else if (acLower.includes("equity") || acLower.includes("equities")) {
      shock = scenario.shocks.equities;
    } else if (acLower.includes("fixed income") || acLower.includes("bonds")) {
      shock = scenario.shocks.fixedIncome;
    } else {
      shock = 0.0;
    }

    const simVal = h.market_value_usd * (1 + shock);
    newAum += simVal;

    const sCur = sectorDeltas.get(h.sector) || { current: 0, simulated: 0 };
    sCur.current += h.market_value_usd;
    sCur.simulated += simVal;
    sectorDeltas.set(h.sector, sCur);
  }

  const deltaUsd = newAum - totalAum;
  const deltaPct = totalAum > 0 ? (deltaUsd / totalAum) * 100 : 0;

  // Check facility impact
  const facilities = creditFacilitiesByClientId.get(clientId) || [];
  let facilityImpact: ScenarioImpactResult["facilityLtvImpact"] = undefined;

  if (facilities.length > 0) {
    const fac = facilities[0];
    const beforeLtv = fac["ltv_pct_2026-08-26"];
    const lendingVal = fac["lending_value_2026-08-26"];
    const drawn = fac["drawn_2026-08-26"];
    // Assume lending value moves proportionally to simulated collateral
    const simLendingVal = lendingVal * (1 + deltaPct / 100);
    const afterLtv = simLendingVal > 0 ? (drawn / simLendingVal) * 100 : beforeLtv;

    facilityImpact = {
      beforeLtv,
      afterLtv,
      marginCallTriggered: afterLtv >= fac.margin_call_ltv_pct,
    };
  }

  const affectedSectors = Array.from(sectorDeltas.entries()).map(([sec, d]) => ({
    sector: sec,
    deltaPct: d.current > 0 ? ((d.simulated - d.current) / d.current) * 100 : 0,
  }));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    description: scenario.description,
    estimatedAumImpactPct: deltaPct,
    estimatedAumImpactUsd: deltaUsd,
    facilityLtvImpact: facilityImpact,
    affectedSectors: affectedSectors.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)),
    strategicAdvice: scenario.advice,
  };
}

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
  PortfolioObservation,
  ClientRiskRadar,
  EventOpportunity,
  PersonalisedRecommendation,
  RebalancingSuggestion,
  TaxAwareOpportunity,
  LifeEventPlan,
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

// -------------------------------------------------------------
// CORE REQUIREMENT 1: Intelligent Portfolio Explanations Engine
// -------------------------------------------------------------
export function getIntelligentPortfolioExplanations(clientId: string): {
  executiveSummary: string;
  ytdReturnPct: number;
  ytdReturnUsd: number;
  currentAumUsd: number;
  observations: PortfolioObservation[];
  clientAttribution: {
    assetClass: string;
    contributionPct: number;
    contributionUsd: number;
    plainEnglishDriver: string;
    primaryHoldings: string[];
  }[];
  topMovingHoldings: {
    instrument_name: string;
    sector: string;
    asset_class: string;
    unrealisedPnlUsd: number;
    unrealisedPnlPct: number;
    macroEventLinked: string;
    plainReason: string;
  }[];
  clientReadyMeetingScript: string;
} {
  const client = clientsById.get(clientId);
  const clientHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === TODAY_SNAPSHOT
  );
  const baselineHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === "2025-12-31"
  );

  const baselineAum = baselineHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
  const currentAum = clientHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
  const ytdReturnUsd = currentAum - baselineAum;
  const ytdReturnPct = baselineAum > 0 ? (ytdReturnUsd / baselineAum) * 100 : 0;

  const sortedHoldings = [...clientHoldings].sort(
    (a, b) => Math.abs(b.unrealised_pnl_base) - Math.abs(a.unrealised_pnl_base)
  );

  const observations: PortfolioObservation[] = [];

  // Check Gold / Commodities
  const goldHoldings = clientHoldings.filter(
    (h) =>
      h.sector.toLowerCase().includes("gold") ||
      h.asset_class.toLowerCase().includes("commodities") ||
      h.instrument_name.toLowerCase().includes("gold")
  );
  if (goldHoldings.length > 0) {
    const goldPnlUsd = goldHoldings.reduce((sum, h) => sum + h.unrealised_pnl_base, 0);
    observations.push({
      id: "OBS-GOLD",
      category: "Geopolitical Transmission",
      headline: `Precious Metals Safe-Haven Surge (+$${(goldPnlUsd / 1e6).toFixed(1)}M)`,
      narrative: `Spot gold's historic run above USD 5,500/oz in early 2026 provided strong capital preservation during Middle East escalation, lifting your commodity allocation significantly.`,
      affectedHoldings: goldHoldings.map((h) => ({
        instrumentName: h.instrument_name,
        sector: h.sector,
        pnlUsd: h.unrealised_pnl_base,
        pnlPct: h.unrealised_pnl_pct,
        eventConnection: "Gold record all-time high amidst geopolitical conflict and global central bank reserve diversification.",
      })),
      clientFriendlySummary: `Your gold and commodity positions acted as a textbook shock absorber, gaining solidly while broader markets saw heightened volatility.`,
    });
  }

  // Check Energy
  const energyHoldings = clientHoldings.filter(
    (h) => h.sector.toLowerCase().includes("energy") || h.sector.toLowerCase().includes("oil")
  );
  if (energyHoldings.length > 0) {
    const energyPnlUsd = energyHoldings.reduce((sum, h) => sum + h.unrealised_pnl_base, 0);
    observations.push({
      id: "OBS-ENERGY",
      category: "Macro Shock",
      headline: `Oil & Tanker Freight Rally (+$${(energyPnlUsd / 1e6).toFixed(1)}M)`,
      narrative: `Military operations in the Middle East and tanker disruptions across the Strait of Hormuz drove Brent crude above $82/bbl, benefiting your integrated energy and maritime holdings.`,
      affectedHoldings: energyHoldings.map((h) => ({
        instrumentName: h.instrument_name,
        sector: h.sector,
        pnlUsd: h.unrealised_pnl_base,
        pnlPct: h.unrealised_pnl_pct,
        eventConnection: "Strait of Hormuz transit delays and regional refining outages tightened physical crude supply.",
      })),
      clientFriendlySummary: `Energy positions captured substantial cash-flow upside from the geopolitical supply disruption.`,
    });
  }

  // Check Technology
  const techHoldings = clientHoldings.filter(
    (h) => h.sector.toLowerCase().includes("tech") || h.sector.toLowerCase().includes("software")
  );
  if (techHoldings.length > 0) {
    const techPnlUsd = techHoldings.reduce((sum, h) => sum + h.unrealised_pnl_base, 0);
    observations.push({
      id: "OBS-TECH",
      category: "Holding Driver",
      headline: `Enterprise AI Momentum vs Multiple Compression (${techPnlUsd >= 0 ? "+" : ""}$${(techPnlUsd / 1e6).toFixed(1)}M)`,
      narrative: `Core mega-cap technology holdings benefited from accelerating enterprise cloud demand, but experienced pullbacks during periods of interest rate volatility and yields spiking.`,
      affectedHoldings: techHoldings.map((h) => ({
        instrumentName: h.instrument_name,
        sector: h.sector,
        pnlUsd: h.unrealised_pnl_base,
        pnlPct: h.unrealised_pnl_pct,
        eventConnection: "High semiconductor CapEx spending offset by higher-for-longer rate sentiment.",
      })),
      clientFriendlySummary: `Technology continues to be your primary structural growth engine, though valuation sensitivity requires active concentration monitoring.`,
    });
  }

  // Check Fixed Income
  const fiHoldings = clientHoldings.filter(
    (h) => h.asset_class.toLowerCase().includes("fixed income") || h.asset_class.toLowerCase().includes("bonds")
  );
  if (fiHoldings.length > 0) {
    const fiPnlUsd = fiHoldings.reduce((sum, h) => sum + h.unrealised_pnl_base, 0);
    observations.push({
      id: "OBS-FI",
      category: "Asset Class Move",
      headline: `High-Quality Yield Accumulation (${fiPnlUsd >= 0 ? "+" : ""}$${(fiPnlUsd / 1e6).toFixed(1)}M)`,
      narrative: `Investment grade paper and green bonds delivered consistent coupon income, dampening portfolio drawdown while locking in attractive multi-year yields.`,
      affectedHoldings: fiHoldings.map((h) => ({
        instrumentName: h.instrument_name,
        sector: h.sector,
        pnlUsd: h.unrealised_pnl_base,
        pnlPct: h.unrealised_pnl_pct,
        eventConnection: "Central bank monetary policy divergence and high starting coupon yields.",
      })),
      clientFriendlySummary: `Bonds provided steady quarterly cash flow and essential capital stability against equity swings.`,
    });
  }

  // Client Attribution Breakdown
  const acMap = new Map<string, { current: number; baseline: number; holdings: string[] }>();
  for (const h of clientHoldings) {
    const item = acMap.get(h.asset_class) || { current: 0, baseline: 0, holdings: [] };
    item.current += h.market_value_usd;
    item.holdings.push(h.instrument_name);
    acMap.set(h.asset_class, item);
  }
  for (const h of baselineHoldings) {
    const item = acMap.get(h.asset_class) || { current: 0, baseline: 0, holdings: [] };
    item.baseline += h.market_value_usd;
    acMap.set(h.asset_class, item);
  }

  const clientAttribution = Array.from(acMap.entries()).map(([ac, data]) => {
    const deltaUsd = data.current - data.baseline;
    const contribPct = baselineAum > 0 ? (deltaUsd / baselineAum) * 100 : 0;
    let plainDriver = "Market appreciation and reinvested cash dividends.";
    if (ac === "Equities") plainDriver = "Driven by enterprise tech earnings and global defense contracting.";
    else if (ac === "Commodities") plainDriver = "Supercharged by gold's historical rally and energy supply friction.";
    else if (ac === "Fixed Income") plainDriver = "Stable yield coupons with modest duration sensitivity.";
    else if (ac === "Structured Products") plainDriver = "Enhanced coupon yields and autocall barrier resilience.";
    else if (ac === "Cash") plainDriver = "High money-market yields offsetting currency volatility.";

    return {
      assetClass: ac,
      contributionPct: contribPct,
      contributionUsd: deltaUsd,
      plainEnglishDriver: plainDriver,
      primaryHoldings: data.holdings.slice(0, 3),
    };
  });

  const topMovingHoldings = sortedHoldings.slice(0, 6).map((h) => {
    let macroEvent = "Macro trends and sector rotation in 2026.";
    let plainReason = "Consistent operational earnings growth.";
    const s = h.sector.toLowerCase();
    if (s.includes("gold") || h.instrument_name.toLowerCase().includes("gold")) {
      macroEvent = "Gold all-time high ($5,589/oz) amidst geopolitical flight to safety.";
      plainReason = "Direct participation in spot gold and bullion appreciation.";
    } else if (s.includes("energy") || s.includes("oil")) {
      macroEvent = "Middle East operations and Hormuz maritime supply constraints.";
      plainReason = "Crude price surge expanded refining margins and exploration cash flow.";
    } else if (s.includes("tech") || s.includes("software")) {
      macroEvent = "Enterprise cloud CapEx and accelerated computing deployments.";
      plainReason = "Strong recurring software subscription revenue and AI backlog.";
    } else if (s.includes("finance") || s.includes("bank")) {
      macroEvent = "Higher-for-longer central bank rate environment in major economies.";
      plainReason = "Elevated net interest margins supporting corporate banking divisions.";
    }

    return {
      instrument_name: h.instrument_name,
      sector: h.sector,
      asset_class: h.asset_class,
      unrealisedPnlUsd: h.unrealised_pnl_base,
      unrealisedPnlPct: h.unrealised_pnl_pct,
      macroEventLinked: macroEvent,
      plainReason,
    };
  });

  const clientName = client?.client_name || "the client";
  const clientReadyMeetingScript = `Good morning, ${clientName}. Looking at your portfolio performance for 2026, total assets stand at USD ${(currentAum / 1e6).toFixed(1)}M, representing a net gain of USD ${(ytdReturnUsd / 1e6).toFixed(1)}M (${ytdReturnPct >= 0 ? "+" : ""}${ytdReturnPct.toFixed(1)}% YTD). The key drivers were real-world events: the surge in precious metals and global energy disruptions boosted your commodity hedges, while enterprise technology delivered resilient earnings despite interest rate fluctuations. Your portfolio successfully withstood market turbulence while capturing tangible upside.`;

  return {
    executiveSummary: `Portfolio delivered ${ytdReturnPct >= 0 ? "+" : ""}${ytdReturnPct.toFixed(1)}% YTD (+$${(ytdReturnUsd / 1e6).toFixed(1)}M), steered by gold safe-haven demand and tactical energy positioning offsetting tech interest-rate headwinds.`,
    ytdReturnPct,
    ytdReturnUsd,
    currentAumUsd: currentAum,
    observations,
    clientAttribution,
    topMovingHoldings,
    clientReadyMeetingScript,
  };
}

// -------------------------------------------------------------
// CORE REQUIREMENT 2: Proactive Risk & Opportunity Detection Engine
// -------------------------------------------------------------
export function getProactiveRiskAndOpportunities(clientId: string): {
  riskRadar: ClientRiskRadar;
  eventOpportunities: EventOpportunity[];
  scenarios: typeof PREDEFINED_SCENARIOS;
} {
  const client = clientsById.get(clientId);
  const clientHoldings = holdings.filter(
    (h) => h.client_id === clientId && h.snapshot_date === TODAY_SNAPSHOT
  );
  const totalAum = clientHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

  // 1. Mandate & SAA Drift Risk
  const mandateResults = getClientMandateCompliance(clientId);
  const hasDrift = mandateResults.some((m) => m.assetClassCompliance.some((a) => a.status !== "compliant"));
  const driftClasses = mandateResults.flatMap((m) =>
    m.assetClassCompliance.filter((a) => a.status !== "compliant").map((a) => a.assetClass)
  );
  const driftRisk = {
    hasRisk: hasDrift,
    headline: hasDrift ? "Strategic Asset Allocation (SAA) Mandate Drift" : "Mandate Allocation Balanced",
    details: hasDrift
      ? `Drift detected in ${driftClasses.join(", ")} exceeding investment mandate threshold bands.`
      : "All portfolio asset classes remain within target strategic policy corridors.",
    affectedAssetClasses: driftClasses,
  };

  // 2. Single-Stock & Sector Concentration Risk
  const topSingleBreaches: { name: string; weightPct: number; maxAllowedPct: number }[] = [];
  for (const h of clientHoldings) {
    if (h.weight_pct > 10) {
      topSingleBreaches.push({
        name: h.instrument_name,
        weightPct: h.weight_pct,
        maxAllowedPct: 10,
      });
    }
  }
  const hasConcentration = topSingleBreaches.length > 0;
  const concentrationRisk = {
    hasRisk: hasConcentration,
    headline: hasConcentration ? `Single-Holding Concentration (>10%)` : "Diversification Healthy",
    details: hasConcentration
      ? `${topSingleBreaches.map((b) => `${b.name} at ${b.weightPct.toFixed(1)}%`).join(", ")} exceed the 10.0% single issuer limit.`
      : "No single security exceeds 10% of total wealth.",
    topPositions: topSingleBreaches,
  };

  // 3. Liquidity Risk (Cash Buffer vs Upcoming Cash Needs)
  const cashHoldings = clientHoldings
    .filter((h) => h.asset_class === "Cash" || h.liquidity_tier === "Daily")
    .reduce((sum, h) => sum + h.market_value_usd, 0);
  const needs = plannedCashNeedsByClientId.get(clientId) || [];
  const comms = commitmentsByClientId.get(clientId) || [];
  const totalLiabilities =
    needs.reduce((s, n) => s + (n.amount || 0), 0) +
    comms.reduce((s, c) => s + (c.uncalled || 0), 0);
  const shortfall = Math.max(0, totalLiabilities - cashHoldings);
  const hasLiquidityRisk = shortfall > 0;
  const liquidityRisk = {
    hasRisk: hasLiquidityRisk,
    headline: hasLiquidityRisk ? "Projected Liquidity Shortfall" : "Adequate Liquidity Coverage",
    details: hasLiquidityRisk
      ? `Upcoming commitments of $${(totalLiabilities / 1e6).toFixed(1)}M exceed immediate cash buffer of $${(cashHoldings / 1e6).toFixed(1)}M by $${(shortfall / 1e6).toFixed(1)}M.`
      : `Liquid cash buffer of $${(cashHoldings / 1e6).toFixed(1)}M fully satisfies all planned capital calls and withdrawals.`,
    liquidBufferUsd: cashHoldings,
    upcomingLiabilitiesUsd: totalLiabilities,
    shortfallUsd: shortfall,
  };

  // 4. Currency Risk (Unhedged FX vs Base Currency)
  const baseCurrency = client?.base_currency || "USD";
  const nonBaseHoldings = clientHoldings.filter((h) => h.currency !== baseCurrency);
  const nonBaseValue = nonBaseHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
  const nonBaseWeight = totalAum > 0 ? (nonBaseValue / totalAum) * 100 : 0;
  const hasCurrencyRisk = nonBaseWeight > 35;
  const currencyRisk = {
    hasRisk: hasCurrencyRisk,
    headline: hasCurrencyRisk ? `Unhedged FX Exposure (${nonBaseWeight.toFixed(0)}% non-${baseCurrency})` : "Currency Risk Moderate",
    details: hasCurrencyRisk
      ? `Portfolio holds significant non-${baseCurrency} assets without currency overlay, exposing performance to FX volatility.`
      : `FX diversification is aligned with the global multi-currency profile.`,
    unhedgedExposures: [
      { currency: "USD", weightPct: 48, riskNote: "Subject to Fed rate path volatility" },
      { currency: "EUR", weightPct: 18, riskNote: "ECB monetary easing trajectory" },
      { currency: "CHF", weightPct: 12, riskNote: "Safe haven franc appreciation risk" },
    ],
  };

  // 5. Collateral & Lombard Risk
  const facilities = creditFacilitiesByClientId.get(clientId) || [];
  let collateralRisk: ClientRiskRadar["collateralRisk"] = {
    hasRisk: false,
    headline: "No Lombard Facility Active",
    details: "Client does not currently utilize credit lines.",
    currentLtv: 0,
    thresholdLtv: 70,
    headroomUsd: 0,
    status: "healthy",
  };
  if (facilities.length > 0) {
    const fac = facilities[0];
    const curLtv = fac["ltv_pct_2026-08-26"];
    const marginLtv = fac.margin_call_ltv_pct;
    const lendingVal = fac["lending_value_2026-08-26"];
    const drawn = fac["drawn_2026-08-26"];
    const maxDrawAllowed = (marginLtv / 100) * lendingVal;
    const headroom = Math.max(0, maxDrawAllowed - drawn);
    const isCritical = curLtv >= marginLtv;
    const isWarning = curLtv >= marginLtv - 5;

    collateralRisk = {
      hasRisk: isWarning || isCritical,
      headline: isCritical ? "Lombard Margin Call Active" : isWarning ? "Lombard Buffer Warning" : "Lombard Buffer Healthy",
      details: `LTV at ${curLtv.toFixed(1)}% against ${marginLtv.toFixed(1)}% margin call threshold. Remaining headroom: $${(headroom / 1e6).toFixed(2)}M.`,
      currentLtv: curLtv,
      thresholdLtv: marginLtv,
      headroomUsd: headroom,
      status: isCritical ? "critical" : isWarning ? "warning" : "healthy",
    };
  }

  // Event-Based Opportunity Engine
  const eventOpportunities: EventOpportunity[] = [
    {
      id: "OPP-01",
      eventDate: "2026-03-02",
      marketEvent: "Strait of Hormuz maritime disruption and crude supply friction",
      transmissionChannel: "Energy, Shipping, Refining Margins",
      affectedPortfolioImpact: "Energy positions gained +18%; high cash-flow generation across maritime logistics.",
      actionableIdea: "Take partial profits on cyclical energy equities and roll proceeds into Julius Baer Capital-Protected Energy Transition Notes.",
      expectedBenefit: "Locks in gains while retaining asymmetric upside participation with zero downside principal risk.",
    },
    {
      id: "OPP-02",
      eventDate: "2026-01-28",
      marketEvent: "Gold consolidates near historical high above $5,000/oz",
      transmissionChannel: "Precious Metals, Real Assets",
      affectedPortfolioImpact: "Gold allocations overweight; substantial capital appreciation accumulated.",
      actionableIdea: "Monetize gold volatility via Reverse Convertible or Yield-Enhancing Bullion FCN paying 9.8% p.a. with 25% barrier.",
      expectedBenefit: "Harvests elevated implied volatility into predictable quarterly cash yield.",
    },
    {
      id: "OPP-03",
      eventDate: "2026-04-10",
      marketEvent: "Global Central Bank Yield Curve Steepening",
      transmissionChannel: "Sovereign Bonds, Investment Grade Credit",
      affectedPortfolioImpact: "Cash yields peak while long-duration bonds offer attractive multi-year lock-in.",
      actionableIdea: "Reallocate idle daily cash into 3-5 Year Senior Green Bonds yielding 5.4% p.a.",
      expectedBenefit: "Protects reinvestment rate against anticipated late-2026 central bank easing.",
    },
  ];

  return {
    riskRadar: {
      driftRisk,
      concentrationRisk,
      liquidityRisk,
      currencyRisk,
      collateralRisk,
    },
    eventOpportunities,
    scenarios: PREDEFINED_SCENARIOS,
  };
}

// -------------------------------------------------------------
// CORE REQUIREMENT 3: RM Intelligence Workbench Engine
// -------------------------------------------------------------
export function getRMIntelligenceWorkbench(clientId: string): {
  client: Client;
  recommendations: PersonalisedRecommendation[];
  rebalancingSuggestions: RebalancingSuggestion[];
  taxOpportunities: TaxAwareOpportunity[];
  lifeEventPlans: LifeEventPlan[];
} {
  const client = clientsById.get(clientId) || clients[0];

  // 1. Personalised Recommendations
  const recommendations: PersonalisedRecommendation[] = [
    {
      id: "REC-01",
      title: "Mandate Rebalancing & SAA Alignment",
      category: "Mandate Alignment",
      grounding: {
        mandate: client.risk_profile + " Mandate",
        riskProfile: `Risk Tolerance ${client.risk_tolerance_score}/10 (${client.risk_profile})`,
        taxPosition: `Domiciled in ${client.tax_domicile}, resident in ${client.country_of_residence}`,
        clientObjectives: client.objectives,
      },
      description: "Trim overweight growth equities and redeploy proceeds to restore target fixed income and liquidity weights.",
      rationale: "Ensures portfolio risk remains strictly calibrated to investment objectives while taking profit on cyclical highs.",
      proposedAction: "Execute phased rebalancing over 5 business days using algorithmic TWAP execution.",
      status: "Approved by RM",
    },
    {
      id: "REC-02",
      title: "Lombard Collateral De-risking & Stop-Loss Buffer",
      category: "Risk Optimization",
      grounding: {
        mandate: "Credit & Collateral Guidelines",
        riskProfile: `Risk Score: ${client.risk_tolerance_score}/10`,
        taxPosition: "Clean borrowing against offshore custody assets",
        clientObjectives: "Maintain liquidity flexibility without forced asset liquidations",
      },
      description: "Establish automated collateral top-up protocols or pledge unencumbered deposit assets to expand LTV headroom.",
      rationale: "Avoids sudden margin call liquidation during geopolitical volatility in underlying tech or energy collateral.",
      proposedAction: "Pledge USD 3.0M fixed deposit or execute partial loan paydown.",
      status: "Pending RM Review",
    },
    {
      id: "REC-03",
      title: "Yield Enhancement via Tailored Structured Notes",
      category: "Yield Arbitrage",
      grounding: {
        mandate: "Multi-Asset Yield Optimization",
        riskProfile: "Comfortable with derivative overlay on approved names",
        taxPosition: "Capital gains tax-neutral structuring in Singapore booking centre",
        clientObjectives: "Generate cash income to support planned withdrawals",
      },
      description: "Deploy tactical cash into 6-month Fixed Coupon Notes (FCN) on diversified high-conviction blue-chip underlyings.",
      rationale: "Elevated market volatility allows structuring attractive coupons (8-10% p.a.) with protective 70% downside barriers.",
      proposedAction: "Present term sheet for USD 2.5M subscription across 3 non-correlated indices.",
      status: "Pending RM Review",
    },
  ];

  // 2. Rebalancing Suggestions (with reasoning attached)
  const rebalancingSuggestions: RebalancingSuggestion[] = [
    {
      id: "REBAL-01",
      tradeAction: "TRIM",
      instrumentName: "Alphabet Inc. Class A",
      assetClass: "Equities",
      currentWeightPct: 13.8,
      targetWeightPct: 9.5,
      deltaUsd: -2000000,
      reasoningAttached: "Single-position concentration exceeds 10% mandate ceiling. Trimming locks in +22% YTD gains and eliminates regulatory concentration breach.",
      mandateImpact: "Returns single-issuer equity exposure within approved 10.0% mandate limit.",
      taxAwareNote: "No capital gains tax triggered in Singapore booking centre.",
    },
    {
      id: "REBAL-02",
      tradeAction: "BUY",
      instrumentName: "Julius Baer Sustainable Green Bond Fund",
      assetClass: "Fixed Income",
      currentWeightPct: 14.2,
      targetWeightPct: 18.5,
      deltaUsd: 2000000,
      reasoningAttached: "Fixed income asset class is underweight by 4.3% vs Strategic Asset Allocation (SAA). Green bond allocation enhances ESG credentials and locks in 5.2% coupon yield.",
      mandateImpact: "Restores Fixed Income to SAA policy corridor and satisfies sustainability criteria.",
      taxAwareNote: "Accrued interest treated under standard offshore tax treaty exemptions.",
    },
    {
      id: "REBAL-03",
      tradeAction: "SELL",
      instrumentName: "Non-Compliant Energy Exploration Note",
      assetClass: "Structured Products",
      currentWeightPct: 3.2,
      targetWeightPct: 0.0,
      deltaUsd: -1500000,
      reasoningAttached: "Binding sustainability mandate exclusion triggered due to upstream fossil fuel exploration revenues exceeding ESG thresholds.",
      mandateImpact: "Eliminates compliance audit flag under Sustainable Balanced mandate.",
      taxAwareNote: "Full redemption at par with zero punitive exit penalty.",
    },
    {
      id: "REBAL-04",
      tradeAction: "REALLOCATE",
      instrumentName: "Julius Baer Gold Bullion Daily Liquidity Fund",
      assetClass: "Commodities",
      currentWeightPct: 16.5,
      targetWeightPct: 12.0,
      deltaUsd: -2100000,
      reasoningAttached: "Gold allocation has organically swelled to 16.5% following historical surge above $5,000/oz. Reallocating into defensive short-duration cash buffers secures life-event liquidity.",
      mandateImpact: "Re-aligns commodity asset class within 12% maximum tactical band.",
      taxAwareNote: "Direct physical holding redemption with zero withholding leakage.",
    },
  ];

  // 3. Tax-Aware Optimisation Opportunities
  const taxOpportunities: TaxAwareOpportunity[] = [
    {
      id: "TAX-01",
      strategyName: "Cross-Border Domicile & Asset Location Structuring",
      jurisdiction: `${client.tax_domicile} vs ${client.country_of_residence}`,
      currentStructureIssue: `Client resides in ${client.country_of_residence} while retaining tax domicile in ${client.tax_domicile}, exposing investment income to potential cross-border remittance inquiries or double taxation.`,
      optimisationMechanism: "Migrate holding structures into an onshore Singapore Variable Capital Company (VCC) or Section 13O/13U Tax Incentive Fund.",
      taxEfficiencyGain: "100% tax exemption on specified income and capital gains under Singapore tax treaties.",
      rmActionStep: "Introduce Julius Baer Wealth Planning & Tax Advisory team to prepare preliminary feasibility memorandum.",
    },
    {
      id: "TAX-02",
      strategyName: "US Dividend Withholding Tax Mitigation",
      jurisdiction: "United States / Singapore Treaty Network",
      currentStructureIssue: "Direct US equity holdings currently suffer 30% statutory withholding tax on quarterly cash dividends.",
      optimisationMechanism: "Synthetically replace direct US equities with Irish-domiciled UCITS ETFs (15% treaty withholding) or total return swap notes.",
      taxEfficiencyGain: "Recovers 1500 bps (50%) of dividend withholding drag annually across US equity book.",
      rmActionStep: "Review top 5 dividend-paying US positions and draft swap transition schedule.",
    },
    {
      id: "TAX-03",
      strategyName: "Strategic Tax-Loss Harvesting & Gain Offsetting",
      jurisdiction: "Global Portfolio Custody",
      currentStructureIssue: "Unrealized capital losses in legacy fixed income positions remain unutilized against realized equity gains.",
      optimisationMechanism: "Execute tactical wash-sale compliant sales of impaired bond tranches and immediately reinvest in equivalent credit curves.",
      taxEfficiencyGain: "Offsets taxable gains while maintaining identical duration and credit yield profile.",
      rmActionStep: "Generate tax-loss harvesting execution matrix for year-end tax reporting.",
    },
  ];

  // 4. Life-Event Wealth Planning (5 Pillars)
  const isRetirement = client.age >= 55 || client.life_stage.toLowerCase().includes("retire");
  const isPreLiquidity = client.life_stage.toLowerCase().includes("pre-liquidity") || client.objectives.toLowerCase().includes("sale") || client.objectives.toLowerCase().includes("founder");
  const isSuccession = client.life_stage.toLowerCase().includes("second generation") || client.life_stage.toLowerCase().includes("succession") || client.objectives.toLowerCase().includes("family");

  const lifeEventPlans: LifeEventPlan[] = [
    {
      pillar: "Retirement & Decumulation",
      isRelevant: isRetirement,
      status: isRetirement ? "Immediate Focus" : "Long Term (5+ yrs)",
      clientContext: `${client.client_name} (Age ${client.age}) has an investment horizon of ${client.investment_horizon_years} years. Objectives: ${client.objectives}`,
      actionChecklist: [
        {
          step: "Cash-Flow Runway Simulation: Map 10-year projected annual drawdowns against liquid yield.",
          timeframe: "Q3 2026",
          completed: true,
          rmNotes: "Completed during annual portfolio review. Required annual yield: USD 1.2M.",
        },
        {
          step: "Layered Annuity & Fixed Income Laddering to guarantee baseline living expenses.",
          timeframe: "Q4 2026",
          completed: false,
          rmNotes: "Proposed USD 5M allocation to 5-year investment grade credit ladder.",
        },
        {
          step: "Medical & Longevity Buffer: Ring-fence emergency liquidity in multi-currency deposits.",
          timeframe: "Ongoing",
          completed: true,
          rmNotes: "USD 2M retained in high-yield daily liquidity facility.",
        },
      ],
      recommendedVehicles: ["Fixed Income Maturity Ladder", "Capital Preservation Discretionary Mandate", "Guaranteed Yield Notes"],
    },
    {
      pillar: "Business Sale / Pre-Liquidity",
      isRelevant: isPreLiquidity,
      status: isPreLiquidity ? "Immediate Focus" : "Medium Term (1-3 yrs)",
      clientContext: `Anticipating founder share transaction / secondary liquidity event. Stated goal: "${client.objectives}".`,
      actionChecklist: [
        {
          step: "Pre-Closing Trust Structuring: Establish irrevocable discretionary trust prior to binding term sheet.",
          timeframe: "Immediate (Pre-Closing)",
          completed: false,
          rmNotes: "Essential to settle trust before final share valuation is legally fixed.",
        },
        {
          step: "Lombard Pre-Liquidity Bridge Facility: Provide working capital without premature equity sale.",
          timeframe: "Current",
          completed: true,
          rmNotes: "Lombard facility active. Monitoring LTV closely against tech collateral volatility.",
        },
        {
          step: "Post-Liquidity Reinvestment Blueprint: SAA design to transition concentrated equity wealth into institutional multi-asset endowment model.",
          timeframe: "Post-Closing (Q4 2026)",
          completed: false,
          rmNotes: "Draft endowment allocation prepared: 40% Equities, 30% Private Markets, 20% Fixed Income, 10% Gold/Real Assets.",
        },
      ],
      recommendedVehicles: ["Pre-IPO Pre-Liquidity Trust", "Lombard Bridge Line", "Endowment Multi-Asset Mandate"],
    },
    {
      pillar: "Family Succession & Governance",
      isRelevant: isSuccession,
      status: isSuccession ? "Immediate Focus" : "Medium Term (1-3 yrs)",
      clientContext: `Multi-generational wealth management. Source of wealth: ${client.source_of_wealth}. Life stage: ${client.life_stage}.`,
      actionChecklist: [
        {
          step: "Family Office Constitution: Draft charter governing investment mandates, voting rights, and conflict resolution.",
          timeframe: "Q3 2026",
          completed: false,
          rmNotes: "Engaged external family governance legal counsel in Singapore.",
        },
        {
          step: "Next-Gen Leadership Handover: Formalize treasury and investment committee participation.",
          timeframe: "Q4 2026",
          completed: true,
          rmNotes: "Client actively participating in monthly treasury committee meetings.",
        },
        {
          step: "Asset Protection Structuring: Implement multi-jurisdictional holding companies and reserved powers trusts.",
          timeframe: "2027",
          completed: false,
          rmNotes: "Reviewing Singapore VCC structure alongside Cayman holding vehicle.",
        },
      ],
      recommendedVehicles: ["Singapore VCC Family Office Fund", "Reserved Powers Family Trust", "Private Trust Company (PTC)"],
    },
    {
      pillar: "Philanthropy & Foundations",
      isRelevant: true,
      status: "Medium Term (1-3 yrs)",
      clientContext: "Client has expressed desire to support environmental conservation and higher education initiatives in Southeast Asia.",
      actionChecklist: [
        {
          step: "Establish Donor-Advised Fund (DAF) or Julius Baer Philanthropic Foundation sub-fund.",
          timeframe: "Q4 2026",
          completed: false,
          rmNotes: "Allows immediate tax deductibility with flexible multi-year grant disbursement.",
        },
        {
          step: "Mission-Aligned Impact Mandate: Align endowment assets with UN Sustainable Development Goals.",
          timeframe: "2027",
          completed: false,
          rmNotes: "Screening clean water and renewable energy venture funds.",
        },
      ],
      recommendedVehicles: ["Julius Baer Philanthropy Foundation", "Donor-Advised Fund", "Impact Investing Discretionary Mandate"],
    },
    {
      pillar: "Next-Gen Education & Trust",
      isRelevant: true,
      status: "Routine",
      clientContext: "Educational funding and wealth stewardship training for next-generation family members.",
      actionChecklist: [
        {
          step: "Education Milestone Trusts: Ring-fence tuition and living stipends at international universities.",
          timeframe: "Completed",
          completed: true,
          rmNotes: "Funded via conservative fixed income portfolio generating USD 180k p.a. distribution.",
        },
        {
          step: "Julius Baer Young Investors Academy enrollment for heirs.",
          timeframe: "Summer 2027",
          completed: false,
          rmNotes: "Invitations scheduled for dispatch in Q1 2027.",
        },
      ],
      recommendedVehicles: ["Educational Accumulation Trust", "Next-Gen Mentorship Program"],
    },
  ];

  return {
    client,
    recommendations,
    rebalancingSuggestions,
    taxOpportunities,
    lifeEventPlans,
  };
}

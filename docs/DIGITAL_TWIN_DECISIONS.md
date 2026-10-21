# SilageGuard AI — Digital Twin Engineering Decisions

**Date**: 2026-10-21  
**Author**: Antigravity Principal Engineer  
**Status**: Approved Conservative Defaults

---

### Decision 1: Baseline Definition
- **Question**: How is the baseline established for a physical silage batch?
- **Decision**: The **earliest valid observation** for each batch automatically establishes its baseline. The baseline is stored as the initial reference point ($O_1$). It is NOT assumed to be ideal or safe; it is simply the earliest recorded physical state of that batch.
- **Rationale**: Farmers frequently inspect silage days or weeks after bunker sealing. The earliest observation provides an objective benchmark for subsequent chemical and thermal drift.

---

### Decision 2: Single Observation Rule
- **Question**: Can a single observation trigger a deterioration trend?
- **Decision**: **NO.** A single observation establishes the *Current Status* and *Baseline*, but cannot produce a *Deterioration Trend*.
- **Thresholds**:
  - $N = 1$: Current Status only. Trend = `"Baseline established"`.
  - $N = 2$: Change detection enabled. Can report change compared to previous or baseline, but labeled as `"Preliminary signal"`.
  - $N \ge 3$: Full longitudinal trend engine activated. Can report persistent trends across multiple checks.

---

### Decision 3: Batch Lifecycle
- **Question**: Should batches expire automatically or remain active until user action?
- **Decision**: Batches remain active indefinitely by default. Farmers can create new batches at will. If a batch has not received observations for $> 30$ days, the Digital Twin notes `"Dormant / Monitoring paused"` rather than auto-deleting or altering records.

---

### Decision 4: Warning Levels & Separation from Immediate Safety
- **Question**: How do Digital Twin warnings relate to immediate screening verdicts?
- **Decision**: They are kept structurally separate:
  - **Immediate Screening Verdict**: `SAFE` / `CAUTION` / `UNSAFE` (or `GOOD` / `WATCH` / `HIGH RISK`), determined by current sensor readings and model inference. Deterministic safety rules (severe pH $\ge 5.0$, $\Delta T \ge 8.0^\circ\text{C}$, heavy mold) always override immediate screening.
  - **Digital Twin Longitudinal State**: `STABLE`, `WATCH`, `EARLY_DETERIORATION`, `HIGH_RISK`.
- **Combination Matrix**:
  - `SAFE` + `STABLE` $\implies$ Green indicator, routine monitoring.
  - `SAFE` + `WATCH` $\implies$ Amber indicator, early signal (e.g. slight temperature rise or small pH increase over 2 observations).
  - `CAUTION` + `EARLY_DETERIORATION` $\implies$ Amber/Red indicator, multiple worsening signals over 3+ observations.
  - `UNSAFE` + any trend $\implies$ Red indicator, immediate hazard warning.

---

### Decision 5: Multi-Signal Early Deterioration Thresholds (Engineering Screening Thresholds)
- **Signal A (Chemical Drift)**: pH increase $\Delta\text{pH} \ge +0.25$ over previous observation, or $\Delta\text{pH}_{\text{base}} \ge +0.35$ from baseline.
- **Signal B (Thermal Accumulation)**: Core temperature increase $\Delta T_{\text{core}} \ge +2.0^\circ\text{C}$ over previous, or thermal differential rise $\Delta\Delta T = \Delta T_N - \Delta T_{N-1} \ge +1.5^\circ\text{C}$.
- **Signal C (Stability Index Drop)**: MSSI decrease $\Delta\text{MSSI} \ge -8$ points over previous, or $\Delta\text{MSSI}_{\text{base}} \ge -15$ points from baseline.
- **Signal D (Visual Deterioration)**: Vision classification rank worsens (e.g., `Healthy` $\to$ `Abnormal_appearance` $\to$ `Mould`/`Spoilage`).
- **Deterioration Rule**:
  - $\ge 2$ simultaneous signals $\implies$ `EARLY_DETERIORATION`.
  - $1$ signal $\implies$ `WATCH`.
  - $0$ signals $\implies$ `STABLE`.
- *Scientific Disclaimer*: These thresholds are **engineering screening heuristics** based on Borreani et al. (2018) aerobic deterioration kinetics, not certified clinical/laboratory thresholds.

---

### Decision 6: Farmer Recommendations
- **Question**: How should recommendations be phrased to avoid liability while aiding farmers?
- **Decision**: Strictly conservative, non-prescriptive agronomic guidance:
  - `STABLE`: *"Fermentation parameters remain stable across checks. Continue standard bunker face management and routine feeding."*
  - `WATCH`: *"Early shift detected ({reasons}). Inspect the bunker face for loose packing or air ingress, and re-check in 24–48 hours."*
  - `EARLY_DETERIORATION`: *"Multiple deteriorating trends detected ({reasons}). Inspect silage face, check feed-out rate, and discard any visibly discolored surface sections."*
  - `HIGH_RISK`: *"Severe deterioration or spoilage thresholds crossed ({reasons}). Do not feed deteriorating sections to high-yield or pregnant cattle. Consult a dairy nutritionist."*

---

### Decision 7: Historical Observations
- **Question**: Should past observations already in SQLite / PostgreSQL be retroactively integrated into the Twin?
- **Decision**: **YES.** The Digital Twin state is dynamically derived from the chronological sequence of observations. Any historical observation with a valid timestamp and batch ID automatically contributes to the timeline and trend calculations.

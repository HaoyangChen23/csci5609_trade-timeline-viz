<script lang="ts">
  import type { TTariff, TPMI, TTEU, AutoIncome, TariffData, TradeBalance, TimelineData } from "../../types";

  // define the props of this component
  type Props = {
    tariffs: TTariff[];
    pmiData: TPMI[];
    teuData: TTEU[];
    incomeData: AutoIncome[];
    globalTariffData: TariffData[];
    tradeBalanceData: TradeBalance[];
    timelineData: TimelineData[];
  };
  let { tariffs, pmiData, teuData, incomeData, globalTariffData, tradeBalanceData, timelineData }: Props = $props();

  import { Scroll, RulerTimeline, TariffRatesChart, PortTEUChart, ManufacturingPMIChart, AutoIncomeBarChart, GlobeTariffViz, TradeBalanceChart, PMILineChart, TEUMultiLineChart } from "$lib";
  import * as d3 from "d3";

  // Separate progress variables for each scroll section to prevent conflicts
  let timelineProgress = $state(0.01); // Main timeline section
  let tradeBalanceProgress = $state(0); // Trade balance section
  let autoIncomeProgress = $state(0); // Auto income section

  // Debug: Log when timelineData changes
  $effect(() => {
    console.log('timelineData in Scrolly2D:', timelineData.length, 'items');
    console.log('timelineProgress:', timelineProgress);
  });

  // Set initial progress to show data before 2025
  let dateRange = $derived(d3.extent(tariffs.map((d) => d.date)) as [Date, Date]);

  // Filter tariffs to get events before 2025 for initial display
  const tariffsBefore2025 = $derived(
    tariffs.filter((d) => d.date.getFullYear() < 2025)
  );

  // Get significant tariff events (events where tariff action is not just a date)
  const significantEvents = $derived(
    tariffs.filter((d) => d.tariff_action && d.tariff_action !== "")
  );

  const chartHeight = 500;
  const chartWidth = 900;
</script>

<h2>Interactive Trade Timeline & Visualizations (2024-2025)</h2>
<p>
  Explore the comprehensive timeline of trade events and their impacts on tariff rates, port activity,
  and manufacturing. Scroll through to see how events unfold chronologically with synchronized visualizations.
</p>

<!-- Main Scrollytelling Section with Timeline and Visualizations -->
{#if timelineData.length > 0}
  <Scroll bind:progress={timelineProgress}>
    <!-- Timeline Story (Left side) -->
    <RulerTimeline data={timelineData} progress={timelineProgress} />

    <!-- Visualizations (Right side) -->
    <div slot="viz" class="visualizations-stack">
      <div class="chart-wrapper">
        <TariffRatesChart data={timelineData} progress={timelineProgress} height={chartHeight} width={chartWidth} />
      </div>

      <div class="chart-wrapper">
        <PortTEUChart data={timelineData} progress={timelineProgress} height={chartHeight} width={chartWidth} />
      </div>

      <div class="chart-wrapper">
        <ManufacturingPMIChart data={timelineData} progress={timelineProgress} height={chartHeight} width={chartWidth} />
      </div>
    </div>
  </Scroll>
{:else}
  <div class="loading">Loading timeline data...</div>
{/if}

<!-- Trade Balance Section -->
<div class="section-divider"></div>
<h2>U.S. Trade Balance Trends (2024-2025)</h2>
<p>
  The trade balance shows the difference between exports and imports, measured in hundreds of millions of dollars.
  Negative values indicate a trade deficit, where the U.S. imports more than it exports.
</p>

<Scroll bind:progress={tradeBalanceProgress}>
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      The U.S. trade deficit spiked dramatically in Q1 2025 to -4,255 (hundreds of millions USD),
      coinciding with the tariff announcement. However, the deficit improved significantly in Q2 and Q3 2025,
      suggesting a shift in trade patterns and potential effectiveness of trade policy adjustments.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <TradeBalanceChart data={tradeBalanceData} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!--Auto Income Section -->
<div class="section-divider"></div>
<h2>Tariff Impact on Automaker Operating Income</h2>
<p>
  The trade war had a direct and measurable effect on automaker profits.
</p>

<Scroll bind:progress={autoIncomeProgress}>
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      By stacking the negative tariff impact (in red) on top of the actual
      operating income (in grey), we can visualize the potential income lost.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <AutoIncomeBarChart data={incomeData} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- Global Tariff Map Section -->
<div class="section-divider"></div>
<h2>Global Tariff Impact: 3D World View</h2>
<p>
  Explore US tariff rates across the world in an interactive 3D globe. Taller bars represent higher tariff rates.
</p>

<div class="globe-section">
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      Toggle between Pre-2025 and Current (2025) tariff rates to see how US trade policy has evolved.
      The height and color of each bar represents the total tariff rate applied to imports from that country.
      Drag to rotate the globe and zoom with your scroll wheel.
    </p>
  </div>
  <div class="globe-wrapper">
    {#if globalTariffData.length > 0}
      <GlobeTariffViz data={globalTariffData} height={600} width={900} />
    {:else}
      <div class="loading">Loading global tariff data...</div>
    {/if}
  </div>
</div>

<style>
  h2 {
    margin-top: 40px;
    margin-bottom: 15px;
    color: #2c3e50;
    font-size: 28px;
    font-weight: 700;
  }

  p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 30px;
    font-size: 16px;
  }

  .visualizations-stack {
    display: flex;
    flex-direction: column;
    gap: 60px;
    width: 100%;
  }

  .chart-wrapper {
    width: 100%;
    max-width: 900px;
  }

  .section-divider {
    height: 60px;
    border-bottom: 2px solid #e0e0e0;
    margin: 40px 0;
  }

  .info-section {
    background-color: #f0f8ff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border-left: 4px solid #4169E1;
  }

  .info-section h3 {
    margin-top: 0;
    color: #333;
    font-size: 1.3em;
  }

  .info-section p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 0;
  }

  .chart-container {
    width: 100%;
    max-width: 900px;
    margin-left: 40px;
  }

  .globe-section {
    margin: 40px 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .globe-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .loading {
    text-align: center;
    padding: 60px;
    font-size: 18px;
    color: #666;
  }
</style>
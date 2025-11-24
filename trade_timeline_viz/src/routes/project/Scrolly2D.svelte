<script lang="ts">
  import type { TTariff, TPMI, TTEU, AutoIncome, TariffData } from "../../types";

  // define the props of this component
  type Props = {
    tariffs: TTariff[];
    pmiData: TPMI[];
    teuData: TTEU[];
    incomeData: AutoIncome[];
    globalTariffData: TariffData[];
  };
  let { tariffs, pmiData, teuData, incomeData, globalTariffData }: Props = $props();

  import { Scroll, LineChart, PMILineChart, TEUMultiLineChart, AutoIncomeBarChart, GlobeTariffViz } from "$lib";
  import * as d3 from "d3";

  let myProgress = $state(0); // reactive variable for tracking the progress of the scrollytelling

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

<h2>US-China Trade Timeline Visualization</h2>
<p>
  Explore the evolution of tariff rates between the US, China, and the rest of the world (ROW)
  from 2018 to 2025. Scroll down to see how tariffs changed over time with each significant
  trade action.
</p>

<Scroll bind:progress={myProgress}>
  <!-- the above Scroll component also accept variables such as
  --scrolly-story-width="600px"
  --scrolly-layout="viz-first"
  you can see the comment in lib/Scroll.svelte for more details
-->

  <!-- Story here - Display tariff events -->
  {#each significantEvents as tariff}
    <div class="tariff-event">
      <h3 class="date">{d3.timeFormat("%B %d, %Y")(tariff.date)}</h3>
      <p class="tariff-action">{tariff.tariff_action}</p>
      <div class="tariff-rates">
        <p><strong>Chinese tariffs on US exports:</strong> {tariff.chinese_tariffs_us.toFixed(1)}%</p>
        <p><strong>US tariffs on Chinese exports:</strong> {tariff.us_tariffs_chinese.toFixed(1)}%</p>
        <p><strong>Chinese tariffs on ROW exports:</strong> {tariff.chinese_tariffs_row.toFixed(1)}%</p>
        <p><strong>US tariffs on ROW exports:</strong> {tariff.us_tariffs_row.toFixed(1)}%</p>
      </div>
    </div>
  {/each}

  <!-- visualization here, indicated by slot='viz' -->
  <div slot="viz" class="chart-container">
    <LineChart {tariffs} progress={myProgress} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- PMI Section -->
<div class="section-divider"></div>

<h2>Manufacturing Contraction After Tariff Announcement</h2>
<p>
  The ISM Manufacturing PMI dropped below the critical 50-point threshold following the tariff announcement in August 2025, signaling a contraction in the manufacturing sector.
</p>

<Scroll bind:progress={myProgress}>
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      Manufacturing PMI (Purchasing Managers' Index) is a key economic indicator. A value above 50 indicates expansion, 
      while below 50 indicates contraction. The tariff announcement in August 2025 coincided with a sharp drop below this threshold.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <PMILineChart data={pmiData} progress={myProgress} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- TEU Section -->
<div class="section-divider"></div>

<h2>Front-loading Effect at U.S. Ports</h2>
<p>
  Container throughput surged at major U.S. ports before the tariff effective date, as importers rushed to bring goods in before tariffs took effect.
</p>

<Scroll bind:progress={myProgress}>
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      TEU (Twenty-foot Equivalent Unit) measures container volume. The front-loading effect shows how businesses anticipated 
      the tariff implementation by increasing imports in the months leading up to the effective date.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <TEUMultiLineChart data={teuData} progress={myProgress} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!--Auto Income Section -->
<div class="section-divider"></div>
<h2>Tariff Impact on Automaker Operating Income</h2>
<p>
  The trade war had a direct and measurable effect on automaker profits.
</p>

<Scroll bind:progress={myProgress}>
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
  .tariff-event {
    margin-bottom: 30px;
    padding: 15px;
    background-color: #f9f9f9;
    border-left: 4px solid #4169E1;
    border-radius: 4px;
  }

  .date {
    color: #333;
    font-size: 1.2em;
    margin-bottom: 10px;
    margin-top: 0;
  }

  .tariff-action {
    color: #555;
    font-size: 1em;
    line-height: 1.6;
    margin-bottom: 10px;
  }

  .tariff-rates {
    font-size: 0.9em;
    color: #666;
  }

  .tariff-rates p {
    margin: 5px 0;
  }

  .tariff-rates strong {
    color: #333;
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
    margin-left: 40px; /* Adjust this value to move charts more/less to the right */
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
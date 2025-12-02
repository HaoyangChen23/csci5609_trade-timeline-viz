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

  // Progress variables for other scroll sections
  let tariffRatesScrollProgress = $state(0);
  let portTEUScrollProgress = $state(0);
  let pmiScrollProgress = $state(0);
  let tradeBalanceScrollProgress = $state(0);
  let autoIncomeScrollProgress = $state(0);

  // Timeline scroll state (independent from page scroll)
  let timelineScrollContainer: HTMLElement;
  let currentIndex = $state(0); // Start at 0 to show first date
  let timelineItemElements = new Map<number, HTMLElement>(); // Store refs to timeline items

  // Create filtered timeline dataset: only tariff action dates + first of each month
  const filteredTimelineData = $derived.by(() => {
    const seen = new Set<string>();
    const filtered: TimelineData[] = [];

    timelineData.forEach((d) => {
      const dateKey = d3.timeFormat('%Y-%m-%d')(d.date);

      // Skip if already added
      if (seen.has(dateKey)) return;

      // Include if has tariff action
      const hasTariffAction = d.tariff_action &&
                              d.tariff_action.trim() !== '' &&
                              d.tariff_action !== 'nan';

      // Include if first day of month
      const isFirstOfMonth = d.date.getDate() === 1;

      if (hasTariffAction || isFirstOfMonth) {
        filtered.push(d);
        seen.add(dateKey);
      }
    });

    // Sort by date to ensure chronological order
    return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // Calculate current date from index
  const currentDate = $derived(currentIndex >= 0 ? filteredTimelineData[currentIndex]?.date : null);

  // Handle timeline container scroll - find item closest to center
  function handleTimelineScroll(event: Event) {
    const container = event.target as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    // Find which timeline item is closest to the center of the viewport
    timelineItemElements.forEach((element, index) => {
      const itemRect = element.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    currentIndex = closestIndex;
  }

  // Svelte action to register timeline item elements
  function registerTimelineItem(node: HTMLElement, index: number) {
    timelineItemElements.set(index, node);

    return {
      destroy() {
        timelineItemElements.delete(index);
      }
    };
  }

  // Handle date selection from charts - jump timeline to that date
  function handleDateSelect(date: Date) {
    // Find the index of the date in filteredTimelineData (or closest match)
    let closestIndex = 0;
    let closestDiff = Infinity;

    filteredTimelineData.forEach((d, index) => {
      const diff = Math.abs(d.date.getTime() - date.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });

    // Update the current index
    currentIndex = closestIndex;

    // Scroll the timeline to the selected item
    const targetElement = timelineItemElements.get(closestIndex);
    if (targetElement && timelineScrollContainer) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const chartHeight = 500;
  const chartWidth = 900;
</script>

<h2 class="timeline-title">Interactive Trade Timeline & Visualizations (2024-2025)</h2>
<p class="timeline-description">
  Explore the comprehensive timeline of trade events and their impacts on tariff rates, port activity,
  and manufacturing. Scroll through to see how events unfold chronologically with synchronized visualizations.
</p>

<!-- Main Timeline & Charts Section (Independent from page scroll) -->
{#if filteredTimelineData.length > 0}
  <div class="timeline-charts-container">
    <!-- Timeline Story (Left side) - Scrollable Container -->
    <div
      class="timeline-scroll-container"
      bind:this={timelineScrollContainer}
      onscroll={handleTimelineScroll}
    >
      <RulerTimeline data={filteredTimelineData} {currentDate} {registerTimelineItem} />
    </div>

    <!-- Visualizations (Right side) - Scrollable Container -->
    <div class="charts-scroll-container">
      <div class="visualizations-stack">
        <div class="chart-wrapper">
          <TariffRatesChart data={filteredTimelineData} {currentDate} height={chartHeight} width={chartWidth} onDateSelect={handleDateSelect} />
        </div>

        <div class="chart-wrapper">
          <PortTEUChart data={filteredTimelineData} {currentDate} height={chartHeight} width={chartWidth} onDateSelect={handleDateSelect} />
        </div>

        <div class="chart-wrapper">
          <ManufacturingPMIChart data={filteredTimelineData} {currentDate} height={chartHeight} width={chartWidth} onDateSelect={handleDateSelect} />
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="loading">Loading timeline data...</div>
{/if}

<!-- Detailed Tariff Rates Section -->
<div class="section-divider"></div>
<h2>US-China Tariff Rate Trends (2024-2025)</h2>
<p>
  Track the escalation of tariff rates between the United States and China, as well as their respective rates
  toward the rest of the world. This visualization shows how trade tensions evolved over time.
</p>

<Scroll bind:progress={tariffRatesScrollProgress} id="tariffRates">
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      US tariffs on Chinese goods surged dramatically from around 20% to over 140% following the April 2025
      tariff announcements. China retaliated with proportional increases on US goods. Both countries maintained
      relatively stable tariff rates toward the rest of the world, indicating the targeted nature of the trade conflict.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <TariffRatesChart data={timelineData} currentDate={new Date('2025-12-31')} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- Detailed Port TEU Section -->
<div class="section-divider"></div>
<h2>Front-loading Effect at U.S. Ports (2024-2025)</h2>
<p>
  Examine container throughput (measured in Twenty-foot Equivalent Units) at major US ports.
  This metric reveals how businesses adjusted their shipping patterns in response to tariff announcements.
</p>

<Scroll bind:progress={portTEUScrollProgress} id="portTEU">
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      Prior to tariff implementation, US ports experienced a significant surge in container traffic as businesses
      rushed to import goods before higher tariffs took effect - a phenomenon known as "front-loading."
      The ports of Long Beach and Los Angeles showed the most dramatic increases, followed by a sharp decline
      after tariffs were fully implemented.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <PortTEUChart data={timelineData} currentDate={new Date('2025-12-31')} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- Detailed Manufacturing PMI Section -->
<div class="section-divider"></div>
<h2>Manufacturing PMI Trends (2024-2025)</h2>
<p>
  The ISM Manufacturing Purchasing Managers' Index (PMI) indicates the health of the manufacturing sector.
  A reading above 50 signals expansion, while below 50 indicates contraction.
</p>

<Scroll bind:progress={pmiScrollProgress} id="pmi">
  <div class="info-section">
    <h3>Key Insight</h3>
    <p>
      Following the tariff announcements in early 2025, the Manufacturing PMI dropped below the critical 50 threshold,
      signaling a contraction in the manufacturing sector. This decline reflects increased costs for imported materials
      and components, as well as uncertainty in global supply chains caused by the trade tensions.
    </p>
  </div>

  <div slot="viz" class="chart-container">
    <ManufacturingPMIChart data={timelineData} currentDate={new Date('2025-12-31')} height={chartHeight} width={chartWidth} />
  </div>
</Scroll>

<!-- Trade Balance Section -->
<div class="section-divider"></div>
<h2>U.S. Trade Balance Trends (2024-2025)</h2>
<p>
  The trade balance shows the difference between exports and imports, measured in hundreds of millions of dollars.
  Negative values indicate a trade deficit, where the U.S. imports more than it exports.
</p>

<Scroll bind:progress={tradeBalanceScrollProgress} id="tradeBalance">
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

<Scroll bind:progress={autoIncomeScrollProgress} id="autoIncome">
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

<!-- Global Tariff Map Section - MOVED TO TOP OF PAGE (see +page.svelte) -->
<!--
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
-->

<style>
  h2 {
    margin-top: 40px;
    margin-bottom: 15px;
    color: #2c3e50;
    font-size: 28px;
    font-weight: 700;
  }

  .timeline-title {
    margin-top: 80px; /* Extra space to prevent overlapping with progress indicators */
  }

  .timeline-description {
    margin-bottom: 30px;
  }

  p {
    color: #555;
    line-height: 1.6;
    margin-bottom: 30px;
    font-size: 16px;
  }

  /* Timeline & Charts Container */
  .timeline-charts-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin: 40px 0;
    min-height: 80vh;
  }

  /* Scrollable containers for timeline and charts */
  .timeline-scroll-container {
    height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 20px;
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: #667eea #f1f1f1;
  }

  .timeline-scroll-container::-webkit-scrollbar {
    width: 8px;
  }

  .timeline-scroll-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .timeline-scroll-container::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 4px;
  }

  .timeline-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #5568d3;
  }

  .charts-scroll-container {
    height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
    padding-left: 20px;
    /* Custom scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: #4a90e2 #f1f1f1;
  }

  .charts-scroll-container::-webkit-scrollbar {
    width: 8px;
  }

  .charts-scroll-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .charts-scroll-container::-webkit-scrollbar-thumb {
    background: #4a90e2;
    border-radius: 4px;
  }

  .charts-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #3a7bc8;
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
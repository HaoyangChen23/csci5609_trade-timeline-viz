<script lang="ts">
  import type { TTariff } from "../types";
  import * as d3 from "d3";

  // define the props of the LineChart component
  type Props = {
    tariffs: TTariff[];
    progress?: number;
    width?: number;
    height?: number;
  };

  let { tariffs, progress = 100, width = 800, height = 500 }: Props = $props();

  // Define the line series to display
  const lineSeries = [
    { key: "chinese_tariffs_row", label: "Chinese tariffs on ROW exports", color: "#8B0000", style: "dotted" },
    { key: "chinese_tariffs_us", label: "Chinese tariffs on US exports", color: "#DC143C", style: "solid" },
    { key: "us_tariffs_chinese", label: "US tariffs on Chinese exports", color: "#4169E1", style: "solid" },
    { key: "us_tariffs_row", label: "US tariffs on ROW exports", color: "#1E90FF", style: "dotted" }
  ];

  // Processing the data
  const dateExtent = $derived(d3.extent(tariffs.map((d) => d.date)) as [Date, Date]);

  // Calculate the current date based on progress
  function getCurrentDate(dateExtent: [Date, Date], progress: number) {
    if (!dateExtent[0] || !dateExtent[1]) return new Date();
    const timeScale = d3.scaleTime().domain(dateExtent).range([0, 100]);
    return timeScale.invert(progress);
  }

  const currentDate = $derived(getCurrentDate(dateExtent, progress));

  // Filter data up to current date
  const visibleTariffs = $derived(
    tariffs.filter((d) => d.date <= currentDate)
  );

  // Set up margins and scales
  const margin = {
    top: 40,
    bottom: 80,
    left: 60,
    right: 150,
  };

  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
  };

  // X scale (time-based)
  const xScale = $derived(
    d3.scaleTime()
      .domain(dateExtent)
      .range([usableArea.left, usableArea.right])
  );

  // Y scale (percentage)
  const yMax = $derived(
    Math.max(
      150, // Set a minimum of 150%
      d3.max(tariffs, (d) =>
        Math.max(d.chinese_tariffs_row, d.chinese_tariffs_us, d.us_tariffs_chinese, d.us_tariffs_row)
      ) || 0
    )
  );

  const yScale = $derived(
    d3.scaleLinear()
      .domain([0, yMax])
      .range([usableArea.bottom, usableArea.top])
  );

  // Line generator
  const lineGenerator = $derived((key: string) =>
    d3.line<TTariff>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d[key as keyof TTariff] as number))
      .curve(d3.curveStepAfter)
  );

  // Axes
  let xAxis: any = $state();
  let yAxis: any = $state();

  function updateAxis() {
    if (!xAxis || !yAxis) return;

    d3.select(xAxis)
      .call(
        d3.axisBottom(xScale)
          .ticks(d3.timeYear.every(1))
          .tickFormat(d3.timeFormat("%Y") as any)
      )
      .selectAll("text")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");

    d3.select(yAxis)
      .call(
        d3.axisLeft(yScale)
          .ticks(10)
          .tickFormat((d) => d + "%")
      );
  }

  $effect(() => {
    updateAxis();
  });

  // Presidential term backgrounds
  const presidentialTerms = [
    { name: "Trump 1", start: new Date(2018, 0, 1), end: new Date(2021, 0, 20) },
    { name: "Biden", start: new Date(2021, 0, 20), end: new Date(2025, 0, 20) },
    { name: "Trump 2", start: new Date(2025, 0, 20), end: new Date(2025, 11, 31) }
  ];

  // Get the latest value for each series for the legend
  const latestValues = $derived(() => {
    if (visibleTariffs.length === 0) return {};
    const latest = visibleTariffs[visibleTariffs.length - 1];
    return {
      chinese_tariffs_row: latest.chinese_tariffs_row,
      chinese_tariffs_us: latest.chinese_tariffs_us,
      us_tariffs_chinese: latest.us_tariffs_chinese,
      us_tariffs_row: latest.us_tariffs_row
    };
  });
</script>

<h3 style="font-family: Arial; text-align: center;">
  US-China Tariff Rates Toward Each Other and Rest of World (ROW)
</h3>

{#if tariffs.length > 0}
  <svg {width} {height}>
    <!-- Presidential term backgrounds -->
    <g class="backgrounds">
      {#each presidentialTerms as term}
        {@const x1 = Math.max(xScale(term.start), usableArea.left)}
        {@const x2 = Math.min(xScale(term.end), usableArea.right)}
        {@const termWidth = x2 - x1}

        {#if termWidth > 0}
          <rect
            x={x1}
            y={usableArea.top}
            width={termWidth}
            height={usableArea.bottom - usableArea.top}
            fill={term.name.includes("Trump") ? "#f0f0f0" : "#ffffff"}
            opacity="0.5"
          />
          <text
            x={x1 + termWidth / 2}
            y={usableArea.top + 20}
            text-anchor="middle"
            font-size="14"
            font-weight="bold"
            fill="#666"
          >
            {term.name}
          </text>
        {/if}
      {/each}
    </g>

    <!-- Grid lines -->
    <g class="grid">
      {#each yScale.ticks(10) as tick}
        <line
          x1={usableArea.left}
          x2={usableArea.right}
          y1={yScale(tick)}
          y2={yScale(tick)}
          stroke="#e0e0e0"
          stroke-width="1"
        />
      {/each}
    </g>

    <!-- Line paths -->
    <g class="lines">
      {#each lineSeries as series}
        {#if visibleTariffs.length > 0}
          <path
            d={lineGenerator(series.key)(visibleTariffs)}
            fill="none"
            stroke={series.color}
            stroke-width="2.5"
            stroke-dasharray={series.style === "dotted" ? "5,5" : "0"}
            class="line-path"
          />

          <!-- Show the latest point -->
          {@const lastPoint = visibleTariffs[visibleTariffs.length - 1]}
          <circle
            cx={xScale(lastPoint.date)}
            cy={yScale(lastPoint[series.key as keyof TTariff] as number)}
            r="4"
            fill={series.color}
          />

          <!-- Show value label at the end -->
          <text
            x={xScale(lastPoint.date) + 5}
            y={yScale(lastPoint[series.key as keyof TTariff] as number) + 4}
            font-size="12"
            fill={series.color}
            font-weight="bold"
          >
            {(lastPoint[series.key as keyof TTariff] as number).toFixed(1)}%
          </text>
        {/if}
      {/each}
    </g>

    <!-- Axes -->
    <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
    <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />

    <!-- Legend -->
    <g class="legend" transform="translate({usableArea.right + 10}, {usableArea.top})">
      {#each lineSeries as series, i}
        <g transform="translate(0, {i * 30})">
          <line
            x1="0"
            x2="30"
            y1="0"
            y2="0"
            stroke={series.color}
            stroke-width="2.5"
            stroke-dasharray={series.style === "dotted" ? "5,5" : "0"}
          />
          <text
            x="35"
            y="4"
            font-size="11"
            fill="#333"
          >
            {series.label}
          </text>
        </g>
      {/each}
    </g>

    <!-- Y-axis label -->
    <text
      x={-(usableArea.top + usableArea.bottom) / 2}
      y={margin.left - 45}
      transform="rotate(-90)"
      text-anchor="middle"
      font-size="14"
      fill="#333"
    >
      Tariff Rate (%)
    </text>

    <!-- X-axis label -->
    <text
      x={(usableArea.left + usableArea.right) / 2}
      y={height - 10}
      text-anchor="middle"
      font-size="14"
      fill="#333"
    >
      Date
    </text>
  </svg>
{/if}

<style>
  .line-path {
    transition: d 0.3s ease;
  }
</style>

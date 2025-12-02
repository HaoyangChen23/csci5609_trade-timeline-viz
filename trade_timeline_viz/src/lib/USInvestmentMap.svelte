<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import * as topojson from "topojson-client";

  type Props = {
    width?: number;
    height?: number;
  };

  let { width = 960, height = 600 }: Props = $props();

  let svgElement: SVGSVGElement;
  let containerElement: HTMLDivElement;

  type TooltipData = {
    x: number;
    y: number;
    company: string;
    city: string;
    state: string;
    value: number;
    origin: string;
    desc: string;
  } | null;

  let tooltipData: TooltipData = $state(null);

  // Investment data
  const investmentData = [
    { company: "TSMC", origin: "Taiwan", state: "AZ", city: "Phoenix", value: 40.0, lat: 33.4484, lon: -112.0740, desc: "2 Fabs (4nm/3nm)" },
    { company: "Samsung", origin: "South Korea", state: "TX", city: "Taylor", value: 17.0, lat: 30.5708, lon: -97.4092, desc: "Advanced Logic Fab" },
    { company: "Hyundai", origin: "South Korea", state: "GA", city: "Savannah", value: 12.6, lat: 32.0809, lon: -81.0998, desc: "EV Metaplant" },
    { company: "SK On (Ford)", origin: "South Korea", state: "KY", city: "Glendale", value: 5.8, lat: 37.6053, lon: -85.9252, desc: "BlueOval Battery Park" },
    { company: "SK On (Ford)", origin: "South Korea", state: "TN", city: "Stanton", value: 5.6, lat: 35.4670, lon: -89.4053, desc: "BlueOval City" },
    { company: "LG Energy", origin: "South Korea", state: "AZ", city: "Queen Creek", value: 5.5, lat: 33.2486, lon: -111.6346, desc: "Battery Complex" },
    { company: "SK Hynix", origin: "South Korea", state: "IN", city: "West Lafayette", value: 3.9, lat: 40.4259, lon: -86.9081, desc: "Adv. Packaging" },
    { company: "LG Energy (GM)", origin: "South Korea", state: "MI", city: "Lansing", value: 2.6, lat: 42.7325, lon: -84.5555, desc: "Ultium Cells" },
    { company: "LG Energy (GM)", origin: "South Korea", state: "OH", city: "Lordstown", value: 2.3, lat: 41.1706, lon: -80.8584, desc: "Ultium Cells" }
  ];

  const colors = {
    "Taiwan": "#e35424",      // Orange/Red for Taiwan
    "South Korea": "#2a7bbc"  // Blue for South Korea
  };

  onMount(() => {
    const svg = d3.select(svgElement);

    // Map Projection
    const projection = d3.geoAlbersUsa()
      .translate([width / 2, height / 2])
      .scale(1200);

    const path = d3.geoPath().projection(projection);

    // Scale for Bubble Size
    const sizeScale = d3.scaleSqrt()
      .domain([0, 40])
      .range([0, 50]);

    // Load and render map
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then((us: any) => {
      // Draw States
      svg.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "states");

      // Draw State Borders
      svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a: any, b: any) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

      // Draw Bubbles
      svg.append("g")
        .selectAll("circle")
        .data(investmentData)
        .enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", d => projection([d.lon, d.lat])![0])
        .attr("cy", d => projection([d.lon, d.lat])![1])
        .attr("r", d => sizeScale(d.value))
        .style("fill", d => colors[d.origin as keyof typeof colors])
        .on("mouseover", (event: MouseEvent, d: any) => {
          const rect = containerElement.getBoundingClientRect();
          tooltipData = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            company: d.company,
            city: d.city,
            state: d.state,
            value: d.value,
            origin: d.origin,
            desc: d.desc
          };
        })
        .on("mouseout", () => {
          tooltipData = null;
        });

      // Add Legend
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(800, 500)");

      legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).style("fill", colors["South Korea"]);
      legend.append("text").attr("x", 15).attr("y", 4).text("South Korea").style("font-size", "13px");

      legend.append("circle").attr("cx", 0).attr("cy", 25).attr("r", 6).style("fill", colors["Taiwan"]);
      legend.append("text").attr("x", 15).attr("y", 29).text("Taiwan").style("font-size", "13px");
    });
  });
</script>

<div class="map-container" bind:this={containerElement}>
  <svg bind:this={svgElement} viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet"></svg>

  {#if tooltipData}
    <div
      class="tooltip"
      style="left: {tooltipData.x + 10}px; top: {tooltipData.y - 10}px;"
    >
      <strong>{tooltipData.company}</strong><br/>
      Location: {tooltipData.city}, {tooltipData.state}<br/>
      Investment: <strong>${tooltipData.value} Billion</strong><br/>
      Origin: {tooltipData.origin}<br/>
      <em>{tooltipData.desc}</em>
    </div>
  {/if}
</div>

<style>
  .map-container {
    position: relative;
    width: 100%;
    max-width: 960px;
    overflow: visible;
  }

  svg {
    width: 100%;
    height: auto;
    border: 1px solid #eee;
  }

  :global(.states) {
    fill: #e6e6e6;
    stroke: #fff;
    stroke-width: 1px;
  }

  :global(.bubble) {
    fill-opacity: 0.8;
    stroke: #fff;
    stroke-width: 1px;
    transition: all 0.2s;
    cursor: pointer;
  }

  :global(.bubble:hover) {
    fill-opacity: 1;
    stroke: #333;
    stroke-width: 2px;
  }

  .tooltip {
    position: absolute;
    text-align: left;
    padding: 10px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ddd;
    border-radius: 4px;
    pointer-events: none;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
  }

  :global(.legend) {
    font-size: 12px;
  }
</style>

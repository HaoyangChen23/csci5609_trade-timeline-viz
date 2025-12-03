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
        { company: "SK On", origin: "South Korea", state: "KY", city: "Glendale", value: 5.8, lat: 37.6053, lon: -85.9252, desc: "BlueOval Battery Park" },
        { company: "SK On", origin: "South Korea", state: "TN", city: "Stanton", value: 5.6, lat: 35.4670, lon: -89.4053, desc: "BlueOval City" },
        { company: "LG Energy", origin: "South Korea", state: "AZ", city: "Queen Creek", value: 5.5, lat: 33.2486, lon: -111.6346, desc: "Battery Complex" },
        { company: "SK Hynix", origin: "South Korea", state: "IN", city: "West Lafayette", value: 3.9, lat: 40.4259, lon: -86.9081, desc: "Adv. Packaging" },
        { company: "LG Energy", origin: "South Korea", state: "MI", city: "Lansing", value: 2.6, lat: 42.7325, lon: -84.5555, desc: "Ultium Cells" },
        { company: "LG Energy", origin: "South Korea", state: "OH", city: "Lordstown", value: 2.3, lat: 41.1706, lon: -80.8584, desc: "Ultium Cells" }
    ];

    const colors = {
        "Taiwan": "#e35424",      // Orange/Red for Taiwan
        "South Korea": "#2a7bbc"  // Blue for South Korea
    };

    onMount(() => {
        const svg = d3.select(svgElement);
        svg.selectAll("*").remove();

        // Map Projection
        const projection = d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale(width * 1.25);

        const path = d3.geoPath().projection(projection);

        // Scale for Bubble Size
        const sizeScale = d3.scaleSqrt()
            .domain([0, 40])
            .range([4, 50]);

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

            // ADD LABELS FOR ALL INVESTMENTS
            // Removed the .filter() so all bubbles get a label
            const labels = svg.append("g").selectAll("text")
                .data(investmentData)
                .enter().append("g")
                .attr("transform", d => {
                    const [x, y] = projection([d.lon, d.lat])!;
                    // Push label down based on bubble size
                    return `translate(${x}, ${y + sizeScale(d.value) + 14})`;
                });

            labels.append("text")
                .text(d => d.company)
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .attr("font-size", d => d.value > 10 ? "11px" : "10px") // Slightly smaller font for smaller bubbles
                .attr("fill", "#333");

            labels.append("text")
                .text(d => `$${d.value}B`)
                .attr("y", 11)
                .attr("text-anchor", "middle")
                .attr("font-size", "9px")
                .attr("fill", "#555");
        });
    });
</script>

<div class="viz-container">
    <div class="header">
        <h3>Major International Investments in US High-Tech Manufacturing</h3>
        <p>
            Global tech giants are reshoring critical supply chains, investing over $100B in new semiconductor and EV battery facilities across the United States.
        </p>

        <div class="company-legend">
            <span class="legend-label">Origin:</span>
            <span class="company-item"><span class="dot sk"></span> South Korea (e.g., Samsung, Hyundai, SK, LG)</span>
            <span class="company-item"><span class="dot tw"></span> Taiwan (TSMC)</span>
        </div>

        <div class="size-legend">
            <span class="legend-label">Investment Size:</span>
            <div class="circle-size">
                <div class="circle-sample" style="width: 10px; height: 10px;"></div>
                <span>$5B</span>
            </div>
            <div class="circle-size">
                <div class="circle-sample" style="width: 20px; height: 20px;"></div>
                <span>$20B</span>
            </div>
            <div class="circle-size">
                <div class="circle-sample" style="width: 35px; height: 35px;"></div>
                <span>$40B</span>
            </div>
        </div>
    </div>

    <div class="map-wrapper" bind:this={containerElement}>
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

    <p class="source-note">Source: Reuters reports and company statements</p>
</div>

<style>
    .viz-container {
        width: 100%;
        max-width: 960px;
        font-family: 'Segoe UI', Arial, sans-serif;
    }

    .header {
        margin-bottom: 20px;
        border-bottom: 1px solid #eee;
        padding-bottom: 15px;
    }

    .header h3 {
        font-size: 22px; /* Increased size */
        margin: 0 0 10px 0;
        color: #2c3e50;
    }

    .header p {
        font-size: 14px;
        color: #666;
        margin: 0 0 15px 0;
    }

    .company-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        font-size: 13px;
        color: #555;
        margin-bottom: 10px;
        align-items: center;
    }

    .company-item {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .legend-label {
        font-weight: bold;
        color: #333;
        margin-right: 5px;
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
    }
    .dot.sk { background-color: #2a7bbc; }
    .dot.tw { background-color: #e35424; }

    .size-legend {
        display: flex;
        align-items: center;
        gap: 20px;
        font-size: 12px;
        color: #555;
        margin-top: 5px;
    }

    .circle-size {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .circle-sample {
        border: 1px solid #999;
        border-radius: 50%;
        background: none;
    }

    .map-wrapper {
        position: relative;
        width: 100%;
        overflow: visible;
    }

    svg {
        width: 100%;
        height: auto;
        background-color: #fff;
    }

    :global(.states) {
        fill: #f0f0f0;
        stroke: #fff;
        stroke-width: 1px;
    }

    :global(.bubble) {
        fill-opacity: 0.85;
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
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid #ccc;
        border-radius: 4px;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 150px;
    }

    .source-note {
        font-size: 10px;
        color: #999;
        text-align: right;
        margin-top: 5px;
        border-top: 1px solid #eee;
        padding-top: 5px;
    }
</style>
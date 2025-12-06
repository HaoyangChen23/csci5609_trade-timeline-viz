<script lang="ts">
    import * as d3 from 'd3';

    // Props
    type InflationData = {
        date: Date;
        rate: number;
        corePCE: number;
        importPrice: number;
    };

    let { data, width = 900, height = 500, currentDate = null } = $props<{
        data: InflationData[];
        width?: number;
        height?: number;
        currentDate?: Date | null;
    }>();

    import { chartColors, chartTypography, chartSpacing, chartStyles } from './chartStyles';

    const margin = chartSpacing.margin;
    margin.right = 160; // Keep wider right margin for dual axis

    const usableArea = $derived({
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left
    });

    // Filter visible data up to current date
    const visibleData = $derived.by(() => {
        if (!currentDate) return data;
        return data.filter(d => d.date <= currentDate);
    });

    // --- Scales ---
    // Use full data range for consistent domain
    const dateExtent = $derived(d3.extent(data, (d) => d.date) as [Date, Date]);

    const xScale = $derived(
        d3.scaleTime()
            .domain(dateExtent)
            .range([usableArea.left, usableArea.right])
    );

    const yLeft = $derived(
        d3.scaleLinear()
            .domain(d3.extent(data, (d) => d.importPrice) as [number, number])
            .nice()
            .range([usableArea.bottom, usableArea.top])
    );

    const yRight = $derived(
        d3.scaleLinear()
            .domain([
                (d3.min(data, (d) => Math.min(d.rate, d.corePCE)) || 0) - 0.5,
                (d3.max(data, (d) => Math.max(d.rate, d.corePCE)) || 0) + 0.5
            ])
            .nice()
            .range([usableArea.bottom, usableArea.top])
    );

    const lineImport = $derived(
        d3.line<InflationData>()
            .defined(d => !isNaN(d.importPrice))
            .x((d) => xScale(d.date))
            .y((d) => yLeft(d.importPrice))
            .curve(d3.curveLinear)
    );

    const lineRate = $derived(
        d3.line<InflationData>()
            .defined(d => !isNaN(d.rate))
            .x((d) => xScale(d.date))
            .y((d) => yRight(d.rate))
            .curve(d3.curveLinear)
    );

    const linePCE = $derived(
        d3.line<InflationData>()
            .defined(d => !isNaN(d.corePCE))
            .x((d) => xScale(d.date))
            .y((d) => yRight(d.corePCE))
            .curve(d3.curveLinear)
    );

    let xAxis: SVGGElement = $state();
    let yAxisLeft: SVGGElement = $state();
    let yAxisRight: SVGGElement = $state();

    $effect(() => {
        if (xAxis) {
            d3.select(xAxis)
                .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %Y') as any))
                .selectAll('text')
                .style('text-anchor', 'end')
                .attr('dx', '-.8em')
                .attr('dy', '.15em')
                .attr('transform', 'rotate(-45)');
        }
        if (yAxisLeft) {
            d3.select(yAxisLeft)
                .call(d3.axisLeft(yLeft).ticks(5))
                .call(g => g.select(".domain").remove())
                .style('color', '#28a745');
        }
        if (yAxisRight) {
            d3.select(yAxisRight)
                .call(d3.axisRight(yRight).ticks(5))
                .call(g => g.select(".domain").remove())
                .style('color', '#444');
        }
    });

    const legendItems = [
        { label: "Import Price (Left)", color: "#28a745" },
        { label: "Inflation Rate (Right)", color: "#007bff" },
        { label: "Core PCE (Right)", color: "#fd7e14" }
    ];

    // --- TOOLTIP LOGIC ---
    let tooltip = $state({
        visible: false,
        x: 0,
        y: 0,
        title: "",
        items: [] as { label: string, value: string, color: string }[]
    });

    function showTooltip(event: MouseEvent, d: InflationData) {
        const dateStr = d3.timeFormat("%B %Y")(d.date);

        // Collect available metrics for this date
        const items = [];
        if (!isNaN(d.importPrice)) items.push({ label: "Import Price", value: d.importPrice.toFixed(1), color: "#28a745" });
        if (!isNaN(d.rate)) items.push({ label: "Inflation Rate", value: d.rate.toFixed(1) + "%", color: "#007bff" });
        if (!isNaN(d.corePCE)) items.push({ label: "Core PCE", value: d.corePCE.toFixed(1) + "%", color: "#fd7e14" });

        tooltip = {
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: dateStr,
            items: items
        };
    }

    function moveTooltip(event: MouseEvent) {
        tooltip.x = event.clientX + 15;
        tooltip.y = event.clientY - 15;
    }

    function hideTooltip() {
        tooltip.visible = false;
    }

</script>

{#if data.length > 0}
    <div class="chart-wrapper">
        <svg {width} {height} class="chart-svg">
            <g class="grid-lines">
                {#each yRight.ticks(5) as tick}
                    <line
                            x1={usableArea.left}
                            x2={usableArea.right}
                            y1={yRight(tick)}
                            y2={yRight(tick)}
                            stroke="#e0e0e0"
                            stroke-width="1"
                            stroke-dasharray="3,3"
                    />
                {/each}
            </g>

            <line
                    class="target-line"
                    x1={usableArea.left}
                    x2={usableArea.right}
                    y1={yRight(2)}
                    y2={yRight(2)}
            />
            <text class="target-label" x={usableArea.right - 10} y={yRight(2) - 5}>
                Target (2%)
            </text>

            <path class="line-import" d={lineImport(visibleData)} />
            <path class="line-rate" d={lineRate(visibleData)} />
            <path class="line-pce" d={linePCE(visibleData)} />

            {#each visibleData as d}
                {#if !isNaN(d.importPrice)}
                    <circle
                            role="graphics-symbol"
                            cx={xScale(d.date)}
                            cy={yLeft(d.importPrice)}
                            r="4"
                            fill="#28a745"
                            stroke="#fff"
                            stroke-width="1.5"
                            class="dot"
                            onmouseenter={(e) => showTooltip(e, d)}
                            onmousemove={moveTooltip}
                            onmouseleave={hideTooltip}
                    />
                {/if}

                {#if !isNaN(d.rate)}
                    <circle
                            role="graphics-symbol"
                            cx={xScale(d.date)}
                            cy={yRight(d.rate)}
                            r="4"
                            fill="#007bff"
                            stroke="#fff"
                            stroke-width="1.5"
                            class="dot"
                            onmouseenter={(e) => showTooltip(e, d)}
                            onmousemove={moveTooltip}
                            onmouseleave={hideTooltip}
                    />
                {/if}

                {#if !isNaN(d.corePCE)}
                    <circle
                            role="graphics-symbol"
                            cx={xScale(d.date)}
                            cy={yRight(d.corePCE)}
                            r="4"
                            fill="#fd7e14"
                            stroke="#fff"
                            stroke-width="1.5"
                            class="dot"
                            onmouseenter={(e) => showTooltip(e, d)}
                            onmousemove={moveTooltip}
                            onmouseleave={hideTooltip}
                    />
                {/if}
            {/each}

            <g class="axes">
                <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
                <g transform="translate({usableArea.left}, 0)" bind:this={yAxisLeft} />
                <g transform="translate({usableArea.right}, 0)" bind:this={yAxisRight} />
            </g>

            <text
                    class="axis-label"
                    transform="rotate(-90)"
                    y={15}
                    x={-(usableArea.top + usableArea.bottom) / 2}
                    text-anchor="middle"
                    fill="#28a745"
            >
                Import Price Index
            </text>
            <text
                    class="axis-label"
                    transform="rotate(-90)"
                    y={width - 20}
                    x={-(usableArea.top + usableArea.bottom) / 2}
                    text-anchor="middle"
                    fill="#444"
            >
                Rate (%)
            </text>

            <g transform="translate({usableArea.right + 20}, {usableArea.top})">
                {#each legendItems as item, i}
                    <g transform="translate(0, {i * 25})">
                        <rect width="12" height="12" fill={item.color} rx="2" />
                        <text x="20" y="10" font-size="11" fill="#555">{item.label}</text>
                    </g>
                {/each}
            </g>
        </svg>

        {#if tooltip.visible}
            <div
                    class="tooltip"
                    style="top: {tooltip.y}px; left: {tooltip.x}px;"
            >
                <strong>{tooltip.title}</strong>
                {#each tooltip.items as item}
                    <div class="tooltip-row">
                        <span class="dot-swatch" style="background: {item.color}"></span>
                        <span class="label">{item.label}:</span>
                        <span class="val">{item.value}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .chart-wrapper {
        position: relative;
    }
    .chart-svg {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 12px;
    }
    .line-import {
        fill: none;
        stroke: #10b981;
        stroke-width: 3px;
        transition: d 150ms ease;
    }
    .line-rate {
        fill: none;
        stroke: #3b82f6;
        stroke-width: 3px;
        transition: d 150ms ease;
    }
    .line-pce {
        fill: none;
        stroke: #f97316;
        stroke-width: 3px;
        stroke-dasharray: 2, 4;
        transition: d 150ms ease;
    }
    .target-line {
        stroke: #dc3545;
        stroke-width: 1.5px;
        stroke-dasharray: 4, 4;
        opacity: 0.6;
    }
    .target-label {
        fill: #dc3545;
        font-size: 11px;
        text-anchor: end;
        opacity: 0.8;
    }
    .axis-label {
        font-size: 13px;
        font-weight: 600;
    }
    .axes {
        color: #333;
    }
    .dot {
        transition: r 0.2s ease, stroke-width 0.2s ease;
        cursor: pointer;
    }
    .dot:hover {
        r: 7;
        stroke-width: 2.5;
    }

    /* Tooltip Styles */
    .tooltip {
        position: fixed;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid #d1d5db;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 10px 12px;
        border-radius: 8px;
        pointer-events: none;
        z-index: 1000;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 12px;
        min-width: 140px;
        transform: translate(0, -100%); /* Position above cursor */
    }
    .tooltip strong {
        display: block;
        border-bottom: 1px solid #eee;
        padding-bottom: 4px;
        margin-bottom: 4px;
        color: #333;
    }
    .tooltip-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 2px;
    }
    .dot-swatch {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .label {
        color: #666;
    }
    .val {
        margin-left: auto;
        font-weight: bold;
        color: #222;
    }
</style>
<script lang="ts">
    import * as d3 from 'd3';

    // 1. Define Props with $props()
    type SoybeanData = {
        year: number;
        US: number;
        Argentina: number;
        Brazil: number;
        Uruguay: number;
        Others: number;
    };

    let {
        data = [],
        width = 900,
        height = 500
    } = $props<{
        data: SoybeanData[];
        width?: number;
        height?: number;
    }>();

    const margin = { top: 40, right: 120, bottom: 50, left: 60 };

    // 2. Use $derived instead of $:
    const innerWidth = $derived(width - margin.left - margin.right);
    const innerHeight = $derived(height - margin.top - margin.bottom);

    // Scales
    const x = $derived(
        d3.scaleLinear()
            .domain(d3.extent(data, d => d.year) as [number, number])
            .range([0, innerWidth])
    );

    const maxY = $derived(
        d3.max(data, d => Math.max(d.US, d.Argentina, d.Brazil, d.Uruguay, d.Others)) || 0
    );

    const y = $derived(
        d3.scaleLinear()
            .domain([0, maxY * 1.1])
            .nice()
            .range([innerHeight, 0])
    );

    // Generators
    const getLinePath = (key: string) => {
        const generator = d3.line<SoybeanData>()
            .x(d => x(d.year))
            .y(d => y(d[key as keyof SoybeanData] as number))
            .curve(d3.curveLinear);
        return generator(data);
    };

    const colors = {
        Brazil: '#28a745',
        US: '#007bff',
        Argentina: '#fd7e14',
        Uruguay: '#6f42c1',
        Others: '#6c757d'
    };

    const yTicks = $derived(y.ticks(6));
    const xTicks = $derived(x.ticks(10));

    // --- TOOLTIP STATE & LOGIC ---
    let tooltip = $state({
        visible: false,
        x: 0,
        y: 0,
        year: 0,
        country: "",
        volume: 0,
        color: ""
    });

    function showTooltip(event: MouseEvent, d: SoybeanData, country: string, value: number, color: string) {
        tooltip = {
            visible: true,
            x: event.clientX,
            y: event.clientY,
            year: d.year,
            country: country,
            volume: value,
            color: color
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
            <g transform={`translate(${margin.left},${margin.top})`}>

                <g class="grid">
                    {#each yTicks as tick}
                        <line
                                x1="0" x2={innerWidth}
                                y1={y(tick)} y2={y(tick)}
                                stroke="#e0e0e0" stroke-dasharray="3,3"
                        />
                    {/each}
                </g>

                <g transform={`translate(0,${innerHeight})`}>
                    <line x1="0" x2={innerWidth} stroke="#333" />
                    {#each xTicks as tick}
                        <g transform={`translate(${x(tick)},0)`}>
                            <line y2="6" stroke="#333" />
                            <text y="20" text-anchor="middle" font-size="12" fill="#555">{tick}</text>
                        </g>
                    {/each}
                </g>

                <g>
                    {#each yTicks as tick}
                        <g transform={`translate(0,${y(tick)})`}>
                            <text x="-10" dy="0.32em" text-anchor="end" font-size="12" fill="#555">{tick}</text>
                        </g>
                    {/each}
                    <text
                            transform="rotate(-90)"
                            x={-innerHeight / 2}
                            y="-45"
                            text-anchor="middle"
                            font-weight="bold"
                            fill="#333"
                    >
                        Volume (Million Metric Tons)
                    </text>
                </g>

                {#each Object.entries(colors) as [country, color]}
                    <path
                            d={getLinePath(country)}
                            fill="none"
                            stroke={color}
                            stroke-width={country === 'Brazil' || country === 'US' ? 3 : 1.5}
                            opacity={country === 'Brazil' || country === 'US' ? 1 : 0.7}
                    />
                {/each}

                {#each data as d}
                    <circle
                            role="graphics-symbol"
                            cx={x(d.year)}
                            cy={y(d.Brazil)}
                            r="3"
                            fill={colors.Brazil}
                            stroke="#fff"
                            class="dot"
                            onmouseenter={(e) => showTooltip(e, d, "Brazil", d.Brazil, colors.Brazil)}
                            onmousemove={moveTooltip}
                            onmouseleave={hideTooltip}
                    />

                    <circle
                            role="graphics-symbol"
                            cx={x(d.year)}
                            cy={y(d.US)}
                            r="3"
                            fill={colors.US}
                            stroke="#fff"
                            class="dot"
                            onmouseenter={(e) => showTooltip(e, d, "US", d.US, colors.US)}
                            onmousemove={moveTooltip}
                            onmouseleave={hideTooltip}
                    />
                {/each}

                <g transform={`translate(${innerWidth + 10}, 0)`}>
                    {#each Object.entries(colors) as [country, color], i}
                        <g transform={`translate(0, ${i * 25})`}>
                            <rect width="12" height="12" fill={color} rx="2" />
                            <text x="20" y="10" font-size="12" fill="#555" alignment-baseline="middle">
                                {country}
                            </text>
                        </g>
                    {/each}
                </g>

                {#if x(2018)}
                    <line
                            x1={x(2018)} x2={x(2018)}
                            y1={0} y2={innerHeight}
                            stroke="#dc3545" stroke-dasharray="2,2" opacity="0.5"
                    />
                    <text x={x(2018)} y="-10" fill="#dc3545" font-size="11" text-anchor="middle">First Trump Tariff</text>
                {/if}

                <text
                        x={innerWidth}
                        y={innerHeight + 45}
                        text-anchor="end"
                        font-size="10"
                        fill="#999"
                >
                    Source: American Soybean Association, Trade Data Monitor
                </text>

            </g>
        </svg>

        {#if tooltip.visible}
            <div
                    class="tooltip"
                    style="top: {tooltip.y}px; left: {tooltip.x}px;"
            >
                <strong>{tooltip.year}</strong>
                <div class="tooltip-row">
                    <span class="dot-swatch" style="background: {tooltip.color}"></span>
                    <span class="label">{tooltip.country}:</span>
                    <span class="val">{tooltip.volume.toFixed(1)} M Tons</span>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    .chart-wrapper {
        position: relative;
    }
    .chart-svg {
        font-family: Arial, sans-serif;
    }
    .dot {
        transition: r 0.2s;
        cursor: pointer;
    }
    .dot:hover {
        r: 6;
        stroke: #333;
        stroke-width: 1px;
    }

    /* Tooltip Styles */
    .tooltip {
        position: fixed;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ccc;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        padding: 8px 12px;
        border-radius: 4px;
        pointer-events: none;
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        transform: translate(0, -100%);
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
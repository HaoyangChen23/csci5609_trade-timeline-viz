<script lang="ts">
    import * as d3 from 'd3';
    import type { AutoIncome } from './types'; 

    type Props = {
        data: AutoIncome[]; 
        width?: number;
        height?: number;
    };
    let { data, width = 900, height = 500 }: Props = $props();

    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left
    };

    const keys = ['operatingIncome', 'impact'];

    const processedData = $derived(
        data.map((d) => ({
            ...d,
            impact: Math.abs(d.tariffImpact)
        }))
    );

    const stackGenerator = $derived(d3.stack<any, string>().keys(keys));
    const stackedData = $derived(stackGenerator(processedData));


    const companies = $derived([...new Set(data.map((d) => d.company))]);
    const quarters = $derived([...new Set(data.map((d) => d.quarter))]);
    //Company names and quarters for scales    
    const x0Scale = $derived(
        d3.scaleBand()
            .domain(companies)
            .range([usableArea.left, usableArea.right])
            .padding(0.2)
    );
    //Quarter scale within each company group    
    const x1Scale = $derived(
        d3.scaleBand()
            .domain(quarters) 
            .range([0, x0Scale.bandwidth()])
            .padding(0.1)
    );

    const yMax = $derived(
        d3.max(stackedData[stackedData.length - 1], (d) => d[1]) || 0
    );

    const yScale = $derived(
        d3.scaleLinear()
            .domain([0, yMax * 1.05])
            .range([usableArea.bottom, usableArea.top])
    );

    const colorScale = $derived(
        d3.scaleOrdinal<string>()
            .domain(keys)
            .range(['#007bff', '#cccccc'])
    );

    let xAxis: SVGGElement = $state();
    let yAxis: SVGGElement = $state();

    $effect(() => {
        if (xAxis) {
            d3.select(xAxis)
                .call(d3.axisBottom(x0Scale))
                .selectAll('.tick line')
                .remove();
        }
        if (yAxis) {
            d3.select(yAxis).call(d3.axisLeft(yScale));
        }
    });
</script>

{#if data.length > 0}
    <svg {width} {height} class="chart-svg">
        <g class="grid-lines">
            {#each yScale.ticks(10) as tick}
                <line
                    x1={usableArea.left}
                    x2={usableArea.right}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                    stroke="#e0e0e0"
                    stroke-width="1"
                    stroke-dasharray="3,3"
                />
            {/each}
        </g>

        <g class="legend" transform="translate({usableArea.left}, {margin.top - 30})">
            <rect x={0} y={0} width={12} height={12} fill={colorScale.range()[0]} />
            <text x={18} y={11} class="legend-text">Operating Income</text>
            <rect x={160} y={0} width={12} height={12} fill={colorScale.range()[1]} />
            <text x={178} y={11} class="legend-text">Tariff Impact (Negative)</text>
        </g>

        <g class="bars">
            {#each stackedData as series}
                {#each series as d, i}
                    {@const original = processedData[i]}
                    <rect
                        x={x0Scale(original.company)! + x1Scale(original.quarter)!}
                        y={yScale(d[1])}
                        width={x1Scale.bandwidth()}
                        height={yScale(d[0]) - yScale(d[1])}
                        fill={colorScale(series.key)}
                    />
                {/each}
            {/each}
        </g>

        <g class="axes">
            <g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
            <g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
        </g>

        <g class="x-sub-labels">
            {#each processedData as d}
                <text
                    x={x0Scale(d.company)! + x1Scale(d.quarter)! + x1Scale.bandwidth() / 2}
                    y={usableArea.bottom + 18}
                >
                    {d.quarter.split('-')[0] || d.quarter.split(' ')[0]}
                </text>
            {/each}
        </g>

        <text
            class="axis-label"
            transform="rotate(-90)"
            y={margin.left - 45}
            x={-(usableArea.top + usableArea.bottom) / 2}
            dy="1em"
        >
            USD Millions
        </text>
        <text
            class="axis-label"
            y={height - 15}
            x={(usableArea.left + usableArea.right) / 2}
            text-anchor="middle"
        >
            Company
        </text>
    </svg>
{/if}

<style>
    .chart-svg {
        font-family: Arial, sans-serif;
        font-size: 12px;
    }
    .axes,
    .axis-label {
        color: #333;
        fill: #333;
    }
    .legend-text {
        fill: #333;
        font-size: 12px;
    }
    .x-sub-labels text {
        fill: #555;
        font-size: 10px;
        text-anchor: middle;
    }
</style>
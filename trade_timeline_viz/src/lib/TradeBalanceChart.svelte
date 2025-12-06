<script lang="ts">
	import * as d3 from 'd3';
	import type { TradeBalance } from '../types';

	type Props = {
		data: TradeBalance[];
		width?: number;
		height?: number;
	};
	let { data, width = 900, height = 500 }: Props = $props();

	const margin = { top: 40, right: 60, bottom: 80, left: 80 };
	const usableArea = {
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	};


	const xScale = $derived(
		d3
			.scaleBand()
			.domain(data.map((d) => d.date)) // Use full data for consistent domain
			.range([usableArea.left, usableArea.right])
			.padding(0.2)
	);

	// Find min value for y-axis (most negative) - use full data for consistent domain
	const yMin = $derived(d3.min(data, (d) => d.balance) || 0);
	const yMax = $derived(0); // Max is 0 since all values are negative

	const yScale = $derived(
		d3
			.scaleLinear()
			.domain([yMin * 1.1, yMax]) // Add 10% padding
			.range([usableArea.bottom, usableArea.top])
			.nice()
	);

	const zeroLine = $derived(yScale(0));

	let xAxis: SVGGElement = $state();
	let yAxis: SVGGElement = $state();

	$effect(() => {
		if (xAxis) {
			d3.select(xAxis)
				.call(d3.axisBottom(xScale))
				.selectAll('text')
				.style('text-anchor', 'end')
				.attr('dx', '-.8em')
				.attr('dy', '.15em')
				.attr('transform', 'rotate(-45)');
		}
		if (yAxis) {
			d3.select(yAxis).call(d3.axisLeft(yScale).tickFormat(d3.format('.0f')));
		}
	});

	// Color scale - deeper red for larger deficits
	const colorScale = $derived(
		d3
			.scaleLinear<string>()
			.domain([yMin, yMax])
			.range(['#d32f2f', '#ff6b6b'])
	);
</script>

{#if data.length > 0}
	<svg {width} {height} class="chart-svg">
		<!-- Grid lines -->
		<g class="grid-lines">
			{#each yScale.ticks(8) as tick}
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

		<!-- Zero line (reference) -->
		<line
			x1={usableArea.left}
			x2={usableArea.right}
			y1={zeroLine}
			y2={zeroLine}
			stroke="#666"
			stroke-width="2"
		/>

		<!-- Bars -->
		{#each data as d}
			{@const barX = xScale(d.date)}
			{@const barWidth = xScale.bandwidth()}
			{@const barY = zeroLine}
			{@const barHeight = yScale(d.balance) - zeroLine}

			{#if barX !== undefined}
				<rect
					x={barX}
					y={barY}
					width={barWidth}
					height={barHeight}
					fill={colorScale(d.balance)}
					class="trade-bar"
				/>

				<!-- Value labels -->
				<text
					x={barX + barWidth / 2}
					y={yScale(d.balance) + 15}
					text-anchor="middle"
					font-size="11"
					fill="#333"
				>
					{d.balance.toFixed(0)}
				</text>
			{/if}
		{/each}

		<!-- Axes -->
		<g class="axes">
			<g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
			<g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
		</g>

		<!-- Axis labels -->
		<text
			class="axis-label"
			transform="rotate(-90)"
			y={15}
			x={-(usableArea.top + usableArea.bottom) / 2}
			text-anchor="middle"
			font-size="14"
			font-weight="600"
		>
			Trade Balance (Hundreds of Millions USD)
		</text>
		<text
			class="axis-label"
			y={height - 10}
			x={(usableArea.left + usableArea.right) / 2}
			text-anchor="middle"
			font-size="14"
			font-weight="600"
		>
			Quarter
		</text>

		<!-- Title -->
		<text
			class="chart-title"
			x={width / 2}
			y={margin.top / 2}
			text-anchor="middle"
		>
			U.S. Trade Balance (2024-2025)
		</text>
	</svg>
{/if}

<style>
	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}
	.trade-bar {
		transition: opacity 0.2s ease, height 0.15s ease, y 0.15s ease;
	}
	.trade-bar:hover {
		opacity: 0.8;
	}
	.axes,
	.axis-label {
		color: #333;
	}
	.chart-title {
		font-size: 18px;
		font-weight: bold;
		fill: #333;
	}
</style>

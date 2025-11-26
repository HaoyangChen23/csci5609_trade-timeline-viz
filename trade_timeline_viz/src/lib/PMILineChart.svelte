<script lang="ts">
	import * as d3 from 'd3';
	import type { TPMI } from '../types';

	type Props = {
		data: TPMI[];
		progress?: number;
		width?: number;
		height?: number;
	};
	let { data, progress = 100, width = 900, height = 500 }: Props = $props();

	const margin = { top: 40, right: 30, bottom: 60, left: 60 };
	const usableArea = {
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	};

	const dateExtent = $derived(d3.extent(data, (d) => d.date) as [Date, Date]);

	// Static display: always show all data
	const currentDate = $derived(dateExtent[1] || new Date());
	const visibleData = $derived(data);

	const xScale = $derived(
		d3.scaleTime().domain(dateExtent).range([usableArea.left, usableArea.right])
	);

	const yScale = $derived(
		d3
			.scaleLinear()
			.domain([d3.min(data, (d) => d.pmi) - 2 || 40, d3.max(data, (d) => d.pmi) + 2 || 55])
			.range([usableArea.bottom, usableArea.top])
	);

	const lineGenerator = $derived(
		d3
			.line<TPMI>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.pmi))
			.curve(d3.curveMonotoneX)
	);

	const announcementDate = new Date('2025-08-01');

	let xAxis: SVGGElement = $state();
	let yAxis: SVGGElement = $state();

	$effect(() => {
		if (xAxis) {
			d3.select(xAxis)
				.call(
					d3
						.axisBottom(xScale)
						.ticks(d3.timeMonth.every(2))
						.tickFormat(d3.timeFormat('%Y-%m') as any)
				)
				.selectAll('text')
				.style('text-anchor', 'end')
				.attr('dx', '-.8em')
				.attr('dy', '.15em')
				.attr('transform', 'rotate(-45)');
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

		<!-- Contraction threshold line at 50 -->
		<line
			class="contraction-line"
			x1={usableArea.left}
			y1={yScale(50)}
			x2={usableArea.right}
			y2={yScale(50)}
		/>
		<text class="contraction-label" x={usableArea.right - 10} y={yScale(50) - 5}
			>Contraction threshold (50)</text
		>

		<!-- PMI line -->
		<path class="pmi-line" d={lineGenerator(visibleData)} />

		<!-- Data points -->
		{#each visibleData as d}
			<circle cx={xScale(d.date)} cy={yScale(d.pmi)} r="3" fill="#007bff" />
		{/each}

		<!-- Tariff announcement annotation -->
		{#if currentDate >= announcementDate}
			<line
				class="annotation-line"
				x1={xScale(announcementDate)}
				y1={usableArea.top}
				x2={xScale(announcementDate)}
				y2={usableArea.bottom}
			/>
			<text class="annotation-label" x={xScale(announcementDate) + 5} y={usableArea.top + 15}
				>Tariff 2.0 Announcement (Aug 2025)</text
			>
		{/if}

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
			PMI Value
		</text>
		<text
			class="axis-label"
			y={height - 10}
			x={(usableArea.left + usableArea.right) / 2}
			text-anchor="middle"
			font-size="14"
			font-weight="600"
		>
			Date
		</text>
	</svg>
{/if}

<style>
	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}
	.pmi-line {
		fill: none;
		stroke: #007bff;
		stroke-width: 2.5px;
		transition: d 0.3s ease;
	}
	.contraction-line {
		stroke: #dc3545;
		stroke-width: 1.5px;
		stroke-dasharray: 4, 4;
	}
	.contraction-label {
		fill: #dc3545;
		font-size: 11px;
		text-anchor: end;
	}
	.annotation-line {
		stroke: #28a745;
		stroke-width: 2px;
	}
	.annotation-label {
		fill: #28a745;
		font-size: 12px;
		font-weight: bold;
	}
	.axes,
	.axis-label {
		color: #333;
	}
</style>


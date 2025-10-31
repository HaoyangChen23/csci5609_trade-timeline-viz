<script lang="ts">
	import * as d3 from 'd3';
	import type { TTEU } from '../types';

	type Props = {
		data: TTEU[];
		progress?: number;
		width?: number;
		height?: number;
	};
	let { data, progress = 100, width = 900, height = 500 }: Props = $props();

	const margin = { top: 40, right: 150, bottom: 60, left: 60 };
	const usableArea = {
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	};

	const dateExtent = $derived(d3.extent(data, (d) => d.date) as [Date, Date]);

	function getCurrentDate(dateExtent: [Date, Date], progress: number) {
		if (!dateExtent[0] || !dateExtent[1]) return new Date();
		const timeScale = d3.scaleTime().domain(dateExtent).range([0, 100]);
		return timeScale.invert(progress);
	}

	const currentDate = $derived(getCurrentDate(dateExtent, progress));
	const visibleData = $derived(data.filter((d) => d.date <= currentDate));

	const xScale = $derived(
		d3.scaleTime().domain(dateExtent).range([usableArea.left, usableArea.right])
	);

	const yMax = $derived(
		Math.max(
			d3.max(data, (d) => d.longBeach) || 0,
			d3.max(data, (d) => d.losAngeles) || 0,
			d3.max(data, (d) => d.nyNj) || 0
		)
	);

	const yScale = $derived(
		d3.scaleLinear().domain([0, yMax]).range([usableArea.bottom, usableArea.top]).nice()
	);

	const lineSeries = [
		{ key: 'longBeach', label: 'Long Beach, CA', color: '#4169E1' },
		{ key: 'losAngeles', label: 'Los Angeles, CA', color: '#FF6347' },
		{ key: 'nyNj', label: 'New York/New Jersey', color: '#32CD32' }
	];

	const lineGenerator = $derived((key: keyof TTEU) =>
		d3
			.line<TTEU>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d[key] as number))
			.curve(d3.curveMonotoneX)
	);

	const tariffEffectiveDate = new Date('2025-08-01');

	let xAxis: SVGGElement = $state();
	let yAxis: SVGGElement = $state();

	$effect(() => {
		if (xAxis) {
			d3.select(xAxis)
				.call(
					d3
						.axisBottom(xScale)
						.ticks(d3.timeMonth.every(3))
						.tickFormat(d3.timeFormat('%Y-%m') as any)
				)
				.selectAll('text')
				.style('text-anchor', 'end')
				.attr('dx', '-.8em')
				.attr('dy', '.15em')
				.attr('transform', 'rotate(-45)');
		}
		if (yAxis) {
			d3.select(yAxis).call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')));
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

		<!-- Lines for each port -->
		{#each lineSeries as series}
			{#if visibleData.length > 0}
				<path
					class="teu-line"
					d={lineGenerator(series.key as keyof TTEU)(visibleData)}
					stroke={series.color}
					stroke-width="2.5"
					fill="none"
				/>

				<!-- Data points -->
				{#each visibleData as d}
					<circle
						cx={xScale(d.date)}
						cy={yScale(d[series.key as keyof TTEU] as number)}
						r="3"
						fill={series.color}
					/>
				{/each}
			{/if}
		{/each}

		<!-- Tariff effective date annotation -->
		{#if currentDate >= tariffEffectiveDate}
			<line
				class="annotation-line"
				x1={xScale(tariffEffectiveDate)}
				y1={usableArea.top}
				x2={xScale(tariffEffectiveDate)}
				y2={usableArea.bottom}
			/>
			<text
				class="annotation-label"
				x={xScale(tariffEffectiveDate) + 5}
				y={usableArea.top + 15}
			>
				Tariff Effective Date
			</text>
		{/if}

		<!-- Axes -->
		<g class="axes">
			<g transform="translate(0, {usableArea.bottom})" bind:this={xAxis} />
			<g transform="translate({usableArea.left}, 0)" bind:this={yAxis} />
		</g>

		<!-- Legend -->
		<g class="legend" transform={`translate(${usableArea.right + 10}, ${usableArea.top})`}>
			{#each lineSeries as series, i}
				<g transform={`translate(0, ${i * 30})`}>
					<line
						x1="0"
						x2="30"
						y1="0"
						y2="0"
						stroke={series.color}
						stroke-width="2.5"
					/>
					<text x="35" y="4" font-size="12" fill="#333">
						{series.label}
					</text>
				</g>
			{/each}
		</g>

		<!-- Axis labels -->
		<text
			class="axis-label"
			transform="rotate(-90)"
			y={margin.left - 40}
			x={-(usableArea.top + usableArea.bottom) / 2}
			dy="1em"
		>
			Container Throughput (TEU)
		</text>
		<text
			class="axis-label"
			y={height - 10}
			x={(usableArea.left + usableArea.right) / 2}
			text-anchor="middle"
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
	.teu-line {
		transition: d 0.3s ease;
	}
	.annotation-line {
		stroke: #ff9800;
		stroke-width: 2px;
		stroke-dasharray: 5, 5;
	}
	.annotation-label {
		fill: #ff9800;
		font-size: 12px;
		font-weight: bold;
	}
	.axes,
	.axis-label {
		color: #333;
	}
</style>


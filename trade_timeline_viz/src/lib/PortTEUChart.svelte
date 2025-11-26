<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		progress: number;
		height: number;
		width: number;
	};
	let { data, progress, height, width }: Props = $props();

	// SVG elements
	let xAxis: SVGGElement;
	let yAxis: SVGGElement;

	// Margins
	const margin = { top: 40, right: 120, bottom: 60, left: 80 };
	const usableArea = $derived({
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	});

	// Normalize progress to 0-1 range (it might come as 0-100 or other scale)
	// Round to 3 decimal places (0.1% precision) to prevent oscillation from tiny changes
	const normalizedProgress = $derived(
		Math.round(Math.max(0, Math.min(1, progress > 1 ? progress / 100 : progress)) * 1000) / 1000
	);

	// Aggregate data by month (TEU data is monthly)
	const monthlyData = $derived.by(() => {
		const grouped = new Map<string, TimelineData>();

		data.forEach((d) => {
			const monthKey = d3.timeFormat('%Y-%m')(d.date);
			// Use the first entry of each month (they should all have the same TEU values)
			if (!grouped.has(monthKey)) {
				grouped.set(monthKey, d);
			}
		});

		return Array.from(grouped.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
	});

	// Filter data based on progress
	const visibleData = $derived.by(() => {
		const maxIndex = Math.floor(normalizedProgress * monthlyData.length);
		const result = monthlyData.slice(0, Math.max(1, maxIndex));
		console.log('PortTEUChart - raw progress:', progress, 'normalized:', normalizedProgress, 'maxIndex:', maxIndex, 'visibleData length:', result.length);
		return result;
	});

	// Get the current date based on progress for the indicator line
	const currentDate = $derived.by(() => {
		const currentIndex = Math.floor(normalizedProgress * monthlyData.length) - 1;
		return currentIndex >= 0 && monthlyData[currentIndex] ? monthlyData[currentIndex].date : null;
	});

	// Scales
	const xScale = $derived(
		d3
			.scaleTime()
			.domain(d3.extent(monthlyData, (d) => d.date) as [Date, Date])
			.range([usableArea.left, usableArea.right])
	);

	const yScale = $derived.by(() => {
		const allValues = monthlyData.flatMap((d) => [
			d.long_beach_teu,
			d.ca_los_angeles_teu,
			d.ca_ny_nj_teu
		]);
		const [min, max] = d3.extent(allValues) as [number, number];
		return d3
			.scaleLinear()
			.domain([0, max])
			.range([usableArea.bottom, usableArea.top])
			.nice();
	});

	// Line generators
	const lineLongBeach = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.long_beach_teu))
	);

	const lineLosAngeles = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.ca_los_angeles_teu))
	);

	const lineNYNJ = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.ca_ny_nj_teu))
	);

	// Update axes when scales change
	$effect(() => {
		if (xAxis) {
			d3.select(xAxis).call(
				d3.axisBottom(xScale).tickFormat((d) => d3.timeFormat('%b %Y')(d as Date))
			);
		}
		if (yAxis) {
			d3.select(yAxis).call(d3.axisLeft(yScale).tickFormat((d) => d3.format(',')(d as number)));
		}
	});

	// Line colors
	const colors = {
		long_beach: '#e74c3c',
		los_angeles: '#3498db',
		ny_nj: '#2ecc71'
	};
</script>

{#if monthlyData.length > 0}
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

		<!-- Lines -->
		<g class="lines">
			{#if visibleData.length > 0}
				<!-- Long Beach TEU -->
				<path
					d={lineLongBeach(visibleData) || ''}
					fill="none"
					stroke={colors.long_beach}
					stroke-width="2.5"
					class="teu-line"
				/>

				<!-- Los Angeles TEU -->
				<path
					d={lineLosAngeles(visibleData) || ''}
					fill="none"
					stroke={colors.los_angeles}
					stroke-width="2.5"
					class="teu-line"
				/>

				<!-- NY & NJ TEU -->
				<path
					d={lineNYNJ(visibleData) || ''}
					fill="none"
					stroke={colors.ny_nj}
					stroke-width="2.5"
					class="teu-line"
				/>
			{/if}
		</g>

		<!-- Progress indicator line -->
		{#if currentDate}
			<line
				x1={xScale(currentDate)}
				x2={xScale(currentDate)}
				y1={usableArea.top}
				y2={usableArea.bottom}
				stroke="#ff6b6b"
				stroke-width="2"
				stroke-dasharray="5,5"
				opacity="0.7"
				class="progress-line"
			/>
			<circle
				cx={xScale(currentDate)}
				cy={usableArea.top - 10}
				r="5"
				fill="#ff6b6b"
				class="progress-indicator"
			/>
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
			Container Throughput (TEU)
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

		<!-- Legend -->
		<g class="legend" transform="translate({usableArea.right + 10}, {usableArea.top})">
			<g transform="translate(0, 0)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.long_beach} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">Long Beach</text>
			</g>
			<g transform="translate(0, 20)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.los_angeles} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">Los Angeles</text>
			</g>
			<g transform="translate(0, 40)">
				<line x1="0" x2="20" y1="0" y2="0" stroke={colors.ny_nj} stroke-width="2.5" />
				<text x="25" y="5" font-size="11" fill="#333">NY & NJ</text>
			</g>
		</g>

		<!-- Title -->
		<text class="chart-title" x={width / 2} y={margin.top / 2} text-anchor="middle">
			Front-loading Effect at U.S. Ports
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
	.axes,
	.axis-label {
		color: #333;
	}
	.chart-title {
		font-size: 16px;
		font-weight: bold;
		fill: #333;
	}
</style>

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
	const margin = { top: 40, right: 60, bottom: 60, left: 80 };
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

	// Aggregate data by month (PMI data is monthly)
	const monthlyData = $derived.by(() => {
		const grouped = new Map<string, TimelineData>();

		data.forEach((d) => {
			const monthKey = d3.timeFormat('%Y-%m')(d.date);
			// Use the first entry of each month (they should all have the same PMI value)
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
		console.log('ManufacturingPMIChart - raw progress:', progress, 'normalized:', normalizedProgress, 'maxIndex:', maxIndex, 'visibleData length:', result.length);
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
		const allValues = monthlyData.map((d) => d.ism_manufacturing_pmi);
		const [min, max] = d3.extent(allValues) as [number, number];
		return d3
			.scaleLinear()
			.domain([Math.floor(min) - 2, Math.ceil(max) + 2])
			.range([usableArea.bottom, usableArea.top])
			.nice();
	});

	// Line generator
	const pmiLine = $derived(
		d3
			.line<TimelineData>()
			.x((d) => xScale(d.date))
			.y((d) => yScale(d.ism_manufacturing_pmi))
	);

	// Area generator for highlighting below 50
	const pmiArea = $derived(
		d3
			.area<TimelineData>()
			.x((d) => xScale(d.date))
			.y0((d) => Math.min(yScale(d.ism_manufacturing_pmi), yScale(50)))
			.y1(yScale(50))
	);

	// Update axes when scales change
	$effect(() => {
		if (xAxis) {
			d3.select(xAxis).call(
				d3.axisBottom(xScale).tickFormat((d) => d3.timeFormat('%b %Y')(d as Date))
			);
		}
		if (yAxis) {
			d3.select(yAxis).call(d3.axisLeft(yScale));
		}
	});

	// Reference line at 50 (expansion/contraction threshold)
	const threshold50 = $derived(yScale(50));
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

		<!-- Threshold line at 50 -->
		<line
			x1={usableArea.left}
			x2={usableArea.right}
			y1={threshold50}
			y2={threshold50}
			stroke="#d32f2f"
			stroke-width="2"
			stroke-dasharray="5,5"
		/>
		<text x={usableArea.right + 5} y={threshold50 + 5} font-size="11" fill="#d32f2f" font-weight="600">
			50 (Threshold)
		</text>

		<!-- Area below 50 (contraction) -->
		{#if visibleData.length > 0}
			{@const contractionData = visibleData.filter((d) => d.ism_manufacturing_pmi < 50)}
			{#if contractionData.length > 0}
				<path
					d={pmiArea(contractionData) || ''}
					fill="#ffcdd2"
					opacity="0.5"
				/>
			{/if}
		{/if}

		<!-- PMI Line -->
		<g class="lines">
			{#if visibleData.length > 0}
				<path
					d={pmiLine(visibleData) || ''}
					fill="none"
					stroke="#1976d2"
					stroke-width="3"
					class="pmi-line"
				/>

				<!-- Data points -->
				{#each visibleData as d}
					<circle
						cx={xScale(d.date)}
						cy={yScale(d.ism_manufacturing_pmi)}
						r="4"
						fill={d.ism_manufacturing_pmi < 50 ? '#d32f2f' : '#1976d2'}
						class="data-point"
					/>
				{/each}
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
			ISM Manufacturing PMI
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

		<!-- Title -->
		<text class="chart-title" x={width / 2} y={margin.top / 2} text-anchor="middle">
			Manufacturing Contraction After Tariff Announcement
		</text>

		<!-- Legend -->
		<g class="legend" transform="translate({usableArea.left + 20}, {usableArea.top + 20})">
			<rect x="0" y="0" width="200" height="60" fill="white" opacity="0.9" rx="4" />
			<text x="10" y="20" font-size="11" fill="#333" font-weight="600">PMI Interpretation:</text>
			<text x="10" y="35" font-size="10" fill="#1976d2">Above 50 = Expansion</text>
			<text x="10" y="50" font-size="10" fill="#d32f2f">Below 50 = Contraction</text>
		</g>
	</svg>
{/if}

<style>
	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}
	.pmi-line {
		transition: d 0.3s ease;
	}
	.data-point {
		transition: all 0.2s ease;
	}
	.data-point:hover {
		r: 6;
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

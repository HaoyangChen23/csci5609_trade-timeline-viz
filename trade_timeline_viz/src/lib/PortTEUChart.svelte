<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		currentDate: Date | null;
		height: number;
		width: number;
	};
	let { data, currentDate, height, width }: Props = $props();

	// SVG elements
	let svgElement: SVGSVGElement;
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

	// Filter data to only first-of-month entries and stop at Aug 2025
	const monthlyData = $derived.by(() => {
		const seen = new Set<string>();
		const filtered: TimelineData[] = [];
		const augustCutoff = new Date('2025-09-01'); // Stop before September

		data.forEach((d) => {
			if (d.date >= augustCutoff) return; // Skip September 2025 and later

			if (d.date.getDate() === 1) {
				const monthKey = d3.timeFormat('%Y-%m')(d.date);
				if (!seen.has(monthKey)) {
					filtered.push(d);
					seen.add(monthKey);
				}
			}
		});

		return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
	});

	// Filter visible monthly data based on current date
	// Only show months up to and including the current month
	const visibleMonthlyData = $derived.by(() => {
		if (!currentDate) return [];
		return monthlyData.filter(d => d.date <= currentDate);
	});

	// Scales - use full monthly data range
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
		const [_, max] = d3.extent(allValues) as [number, number];
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

	// Smooth transitions for line paths
	$effect(() => {
		if (!svgElement || visibleMonthlyData.length === 0) return;

		const svg = d3.select(svgElement);

		svg.select('.line-long-beach')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineLongBeach(visibleMonthlyData) || '');

		svg.select('.line-los-angeles')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineLosAngeles(visibleMonthlyData) || '');

		svg.select('.line-ny-nj')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', lineNYNJ(visibleMonthlyData) || '');
	});

	// Line colors
	const colors = {
		long_beach: '#e74c3c',
		los_angeles: '#3498db',
		ny_nj: '#2ecc71'
	};
</script>

{#if monthlyData.length > 0}
	<svg bind:this={svgElement} {width} {height} class="chart-svg">
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
			<!-- Long Beach TEU -->
			<path
				class="teu-line line-long-beach"
				fill="none"
				stroke={colors.long_beach}
				stroke-width="2.5"
			/>

			<!-- Los Angeles TEU -->
			<path
				class="teu-line line-los-angeles"
				fill="none"
				stroke={colors.los_angeles}
				stroke-width="2.5"
			/>

			<!-- NY & NJ TEU -->
			<path
				class="teu-line line-ny-nj"
				fill="none"
				stroke={colors.ny_nj}
				stroke-width="2.5"
			/>
		</g>

		<!-- Progress indicator line (only show if current date is first of month) -->
		{#if currentDate && currentDate.getDate() === 1}
			<g class="progress-indicator">
				<line
					x1={xScale(currentDate)}
					x2={xScale(currentDate)}
					y1={usableArea.top}
					y2={usableArea.bottom}
					stroke="#667eea"
					stroke-width="3"
					stroke-dasharray="5,5"
					opacity="0.8"
					class="progress-line"
				/>
				<circle
					cx={xScale(currentDate)}
					cy={usableArea.top - 15}
					r="6"
					fill="#667eea"
					class="progress-dot"
				/>
				<text
					x={xScale(currentDate)}
					y={usableArea.top - 25}
					text-anchor="middle"
					font-size="11"
					font-weight="600"
					fill="#667eea"
				>
					{d3.timeFormat('%b %Y')(currentDate)}
				</text>
			</g>
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

		<!-- Note about data availability -->
		<text
			x={usableArea.right}
			y={usableArea.bottom + 45}
			text-anchor="end"
			font-size="10"
			fill="#999"
			font-style="italic"
		>
			Data available through August 2025
		</text>
	</svg>
{/if}

<style>
	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}

	.teu-line {
		transition: opacity 0.3s ease;
	}

	.progress-line {
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
	}

	.progress-dot {
		transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
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

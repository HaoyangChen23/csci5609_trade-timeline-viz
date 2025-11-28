<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineData } from '../types';

	type Props = {
		data: TimelineData[];
		currentDate: Date | null;
		height: number;
		width: number;
		onDateSelect?: (date: Date) => void;
	};
	let { data, currentDate, height, width, onDateSelect }: Props = $props();

	// SVG elements
	let svgElement: SVGSVGElement = $state()!;
	let xAxis: SVGGElement = $state()!;
	let yAxis: SVGGElement = $state()!;

	// Tooltip state
	type TooltipData = {
		x: number;
		y: number;
		date: Date;
		long_beach: number;
		los_angeles: number;
		ny_nj: number;
	};
	let tooltipData: TooltipData | null = $state(null);

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

	// Get the last visible data point for endpoint labels
	const lastDataPoint = $derived(visibleMonthlyData.length > 0 ? visibleMonthlyData[visibleMonthlyData.length - 1] : null);

	// Update line paths and endpoints with shared transition for perfect sync
	$effect(() => {
		if (!svgElement || visibleMonthlyData.length === 0) return;

		const svg = d3.select(svgElement);

		// Create a single shared transition for all elements
		const t = svg.transition().duration(100).ease(d3.easeLinear);

		// Update all lines with shared transition
		svg.select('.line-long-beach').transition(t).attr('d', lineLongBeach(visibleMonthlyData) || '');
		svg.select('.line-los-angeles').transition(t).attr('d', lineLosAngeles(visibleMonthlyData) || '');
		svg.select('.line-ny-nj').transition(t).attr('d', lineNYNJ(visibleMonthlyData) || '');

		// Update endpoint circles and labels with same shared transition
		if (lastDataPoint) {
			// Long Beach endpoint
			svg.select('.endpoint-long-beach').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.long_beach_teu));
			svg.select('.label-long-beach').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.long_beach_teu) + 4)
				.text(d3.format(',')(lastDataPoint.long_beach_teu));

			// Los Angeles endpoint
			svg.select('.endpoint-los-angeles').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.ca_los_angeles_teu));
			svg.select('.label-los-angeles').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.ca_los_angeles_teu) + 4)
				.text(d3.format(',')(lastDataPoint.ca_los_angeles_teu));

			// NY & NJ endpoint
			svg.select('.endpoint-ny-nj').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(lastDataPoint.ca_ny_nj_teu));
			svg.select('.label-ny-nj').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(lastDataPoint.ca_ny_nj_teu) + 4)
				.text(d3.format(',')(lastDataPoint.ca_ny_nj_teu));
		}
	});

	// Line colors (brighter for better visibility)
	const colors = {
		long_beach: '#e63946',    // Bright red
		los_angeles: '#2563eb',   // Bright blue
		ny_nj: '#16a34a'          // Bright green
	};

	// Event handlers for data points
	function handlePointHover(event: MouseEvent, d: TimelineData) {
		const rect = svgElement.getBoundingClientRect();
		tooltipData = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			date: d.date,
			long_beach: d.long_beach_teu,
			los_angeles: d.ca_los_angeles_teu,
			ny_nj: d.ca_ny_nj_teu
		};
	}

	function handlePointLeave() {
		tooltipData = null;
	}

	function handlePointClick(d: TimelineData) {
		if (onDateSelect) {
			onDateSelect(d.date);
		}
	}
</script>

{#if monthlyData.length > 0}
	<div class="chart-container" style="position: relative; width: {width}px; height: {height}px;">
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

		<!-- Data points for each month (interactive) -->
		<g class="data-points">
			{#each visibleMonthlyData as d}
				<!-- Long Beach data point -->
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.long_beach_teu)}
					r="4"
					fill={colors.long_beach}
					stroke="white"
					stroke-width="1"
					class="data-point"
					role="button"
					tabindex="0"
					onmouseenter={(e) => handlePointHover(e, d)}
					onmouseleave={handlePointLeave}
					onclick={() => handlePointClick(d)}
					onkeydown={(e) => e.key === 'Enter' && handlePointClick(d)}
				/>
				<!-- Los Angeles data point -->
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.ca_los_angeles_teu)}
					r="4"
					fill={colors.los_angeles}
					stroke="white"
					stroke-width="1"
					class="data-point"
					role="button"
					tabindex="0"
					onmouseenter={(e) => handlePointHover(e, d)}
					onmouseleave={handlePointLeave}
					onclick={() => handlePointClick(d)}
					onkeydown={(e) => e.key === 'Enter' && handlePointClick(d)}
				/>
				<!-- NY & NJ data point -->
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.ca_ny_nj_teu)}
					r="4"
					fill={colors.ny_nj}
					stroke="white"
					stroke-width="1"
					class="data-point"
					role="button"
					tabindex="0"
					onmouseenter={(e) => handlePointHover(e, d)}
					onmouseleave={handlePointLeave}
					onclick={() => handlePointClick(d)}
					onkeydown={(e) => e.key === 'Enter' && handlePointClick(d)}
				/>
			{/each}
		</g>

		<!-- Endpoint circles and value labels (positions managed by D3 transitions) -->
		<g class="endpoints">
			<!-- Long Beach endpoint -->
			<circle
				r="5"
				fill={colors.long_beach}
				class="endpoint-dot endpoint-long-beach"
			/>
			<text
				font-size="11"
				font-weight="600"
				fill={colors.long_beach}
				class="label-long-beach"
			></text>

			<!-- Los Angeles endpoint -->
			<circle
				r="5"
				fill={colors.los_angeles}
				class="endpoint-dot endpoint-los-angeles"
			/>
			<text
				font-size="11"
				font-weight="600"
				fill={colors.los_angeles}
				class="label-los-angeles"
			></text>

			<!-- NY & NJ endpoint -->
			<circle
				r="5"
				fill={colors.ny_nj}
				class="endpoint-dot endpoint-ny-nj"
			/>
			<text
				font-size="11"
				font-weight="600"
				fill={colors.ny_nj}
				class="label-ny-nj"
			></text>
		</g>

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

		<!-- Tooltip -->
		{#if tooltipData}
			<div
				class="tooltip"
				style="left: {tooltipData.x + 15}px; top: {tooltipData.y - 10}px;"
			>
				<div class="tooltip-date">{d3.timeFormat('%B %Y')(tooltipData.date)}</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.long_beach}">Long Beach:</span>
					<span class="tooltip-value" style="color: {colors.long_beach}">{d3.format(',')(tooltipData.long_beach)} TEU</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.los_angeles}">Los Angeles:</span>
					<span class="tooltip-value" style="color: {colors.los_angeles}">{d3.format(',')(tooltipData.los_angeles)} TEU</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label" style="color: {colors.ny_nj}">NY & NJ:</span>
					<span class="tooltip-value" style="color: {colors.ny_nj}">{d3.format(',')(tooltipData.ny_nj)} TEU</span>
				</div>
				<div class="tooltip-hint">Click to jump to this date</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.chart-container {
		position: relative;
	}

	.chart-svg {
		font-family: Arial, sans-serif;
		font-size: 12px;
	}

	.data-point {
		cursor: pointer;
		transition: r 0.15s ease;
	}

	.data-point:hover {
		r: 6;
	}

	.tooltip {
		position: absolute;
		background: white;
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		pointer-events: none;
		z-index: 100;
		white-space: nowrap;
	}

	.tooltip-date {
		font-weight: 600;
		color: #333;
		margin-bottom: 6px;
		padding-bottom: 4px;
		border-bottom: 1px solid #eee;
	}

	.tooltip-row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 2px 0;
	}

	.tooltip-label {
		font-size: 11px;
	}

	.tooltip-value {
		font-weight: 600;
	}

	.tooltip-hint {
		font-size: 10px;
		color: #888;
		margin-top: 6px;
		font-style: italic;
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

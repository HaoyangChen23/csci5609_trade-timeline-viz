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
	let tooltipData: { x: number; y: number; date: Date; value: number } | null = $state(null);

	// Margins
	const margin = { top: 40, right: 120, bottom: 60, left: 80 };
	const usableArea = $derived({
		top: margin.top,
		right: width - margin.right,
		bottom: height - margin.bottom,
		left: margin.left
	});

	// Filter data to only first-of-month entries
	const monthlyData = $derived.by(() => {
		const seen = new Set<string>();
		const filtered: TimelineData[] = [];

		data.forEach((d) => {
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

	// Get the last visible data point for endpoint labels
	const lastDataPoint = $derived(visibleMonthlyData.length > 0 ? visibleMonthlyData[visibleMonthlyData.length - 1] : null);

	// Update line paths and endpoints with shared transition for perfect sync
	$effect(() => {
		if (!svgElement || visibleMonthlyData.length === 0) return;

		const svg = d3.select(svgElement);

		// Create a single shared transition for all elements
		const t = svg.transition().duration(100).ease(d3.easeLinear);

		// Update line with shared transition
		svg.select('.pmi-line-path').transition(t).attr('d', pmiLine(visibleMonthlyData) || '');

		// Update area with shared transition
		const contractionData = visibleMonthlyData.filter((d) => d.ism_manufacturing_pmi < 50);
		svg.select('.pmi-area-path').transition(t).attr('d', pmiArea(contractionData) || '');

		// Update endpoint circle and label with same shared transition
		if (lastDataPoint) {
			const pmiValue = lastDataPoint.ism_manufacturing_pmi;
			const pointColor = pmiValue < 50 ? '#d32f2f' : '#1976d2';

			svg.select('.endpoint-pmi').transition(t)
				.attr('cx', xScale(lastDataPoint.date))
				.attr('cy', yScale(pmiValue))
				.attr('fill', pointColor);

			svg.select('.label-pmi').transition(t)
				.attr('x', xScale(lastDataPoint.date) + 10)
				.attr('y', yScale(pmiValue) + 4)
				.attr('fill', pointColor)
				.text(pmiValue.toFixed(1));
		}
	});

	// Reference line at 50 (expansion/contraction threshold)
	const threshold50 = $derived(yScale(50));

	// Line color
	const lineColor = '#1976d2';

	// Event handlers for data points
	function handlePointHover(event: MouseEvent, d: TimelineData) {
		const rect = svgElement.getBoundingClientRect();
		tooltipData = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			date: d.date,
			value: d.ism_manufacturing_pmi
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
		<path
			class="pmi-area-path"
			fill="#ffcdd2"
			opacity="0.5"
		/>

		<!-- PMI Line -->
		<g class="lines">
			<path
				class="pmi-line pmi-line-path"
				fill="none"
				stroke={lineColor}
				stroke-width="2.5"
			/>
		</g>

		<!-- Data points colored by threshold -->
		<g class="data-points">
			{#each visibleMonthlyData as d}
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.ism_manufacturing_pmi)}
					r="4"
					fill={d.ism_manufacturing_pmi < 50 ? '#d32f2f' : '#1976d2'}
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

		<!-- Endpoint circle and value label (positions managed by D3 transitions) -->
		<g class="endpoints">
			<circle
				r="5"
				fill={lineColor}
				class="endpoint-dot endpoint-pmi"
			/>
			<text
				font-size="11"
				font-weight="600"
				fill={lineColor}
				class="label-pmi"
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

		<!-- Tooltip -->
		{#if tooltipData}
			<div
				class="tooltip"
				style="left: {tooltipData.x + 15}px; top: {tooltipData.y - 10}px;"
			>
				<div class="tooltip-date">{d3.timeFormat('%B %Y')(tooltipData.date)}</div>
				<div class="tooltip-value" style="color: {tooltipData.value < 50 ? '#d32f2f' : '#1976d2'}">
					PMI: {tooltipData.value.toFixed(1)}
				</div>
				<div class="tooltip-status" style="color: {tooltipData.value < 50 ? '#d32f2f' : '#1976d2'}">
					{tooltipData.value < 50 ? 'Contraction' : 'Expansion'}
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
		margin-bottom: 4px;
	}

	.tooltip-value {
		font-weight: 600;
		font-size: 14px;
	}

	.tooltip-status {
		font-size: 11px;
		margin-top: 2px;
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

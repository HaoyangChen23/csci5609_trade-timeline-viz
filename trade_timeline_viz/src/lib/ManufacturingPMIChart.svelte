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
	const margin = { top: 40, right: 60, bottom: 60, left: 80 };
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

	// Smooth transitions for line and area paths
	$effect(() => {
		if (!svgElement || visibleMonthlyData.length === 0) return;

		const svg = d3.select(svgElement);

		// Transition line
		svg.select('.pmi-line-path')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', pmiLine(visibleMonthlyData) || '');

		// Transition area
		const contractionData = visibleMonthlyData.filter((d) => d.ism_manufacturing_pmi < 50);
		svg.select('.pmi-area-path')
			.transition()
			.duration(300)
			.ease(d3.easeCubicInOut)
			.attr('d', pmiArea(contractionData) || '');
	});

	// Reference line at 50 (expansion/contraction threshold)
	const threshold50 = $derived(yScale(50));
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
				stroke="#1976d2"
				stroke-width="3"
			/>

			<!-- Data points with fade-in animation -->
			{#each visibleMonthlyData as d}
				<circle
					cx={xScale(d.date)}
					cy={yScale(d.ism_manufacturing_pmi)}
					r="4"
					fill={d.ism_manufacturing_pmi < 50 ? '#d32f2f' : '#1976d2'}
					class="data-point"
					style="animation: fadeIn 0.3s ease-in-out;"
				/>
			{/each}
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
		transition: opacity 0.3s ease;
	}

	.data-point {
		transition: all 0.2s ease;
	}

	.data-point:hover {
		r: 6;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
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

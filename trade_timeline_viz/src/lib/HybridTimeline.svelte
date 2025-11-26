<script lang="ts">
	import * as d3 from 'd3';
	import type { TTariff, TimelineEvent } from '../types';

	type Props = {
		tariffs2024: TTariff[];
		events2025: TimelineEvent[];
	};
	let { tariffs2024, events2025 }: Props = $props();

	// Group 2024 tariffs by month
	const tariffs2024ByMonth = $derived.by(() => {
		const grouped = new Map<string, TTariff[]>();

		tariffs2024.forEach((tariff) => {
			const monthKey = d3.timeFormat('%Y-%m')(tariff.date);
			if (!grouped.has(monthKey)) {
				grouped.set(monthKey, []);
			}
			grouped.get(monthKey)!.push(tariff);
		});

		const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

		return sorted.map(([monthKey, monthTariffs]) => {
			const [year, month] = monthKey.split('-');
			const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
			return {
				monthKey,
				monthName: d3.timeFormat('%B %Y')(monthDate),
				events: monthTariffs.sort((a, b) => a.date.getTime() - b.date.getTime())
			};
		});
	});

	// Group 2025 events by month
	const events2025ByMonth = $derived.by(() => {
		const grouped = new Map<string, TimelineEvent[]>();

		events2025.forEach((event) => {
			const monthKey = d3.timeFormat('%Y-%m')(event.date);
			if (!grouped.has(monthKey)) {
				grouped.set(monthKey, []);
			}
			grouped.get(monthKey)!.push(event);
		});

		const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

		return sorted.map(([monthKey, monthEvents]) => {
			const [year, month] = monthKey.split('-');
			const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
			return {
				monthKey,
				monthName: d3.timeFormat('%B %Y')(monthDate),
				events: monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
			};
		});
	});

	// Function to parse and clean links
	function parseLinks(linkStr: string): Array<{ text: string; url: string }> {
		if (!linkStr || linkStr.trim() === '') return [];

		const linkParts = linkStr.split('\n').filter((l) => l.trim() !== '');
		const links: Array<{ text: string; url: string }> = [];

		linkParts.forEach((part) => {
			part = part.trim();
			if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
				links.push({ text: 'Link', url: part });
			} else {
				links.push({ text: part, url: '' });
			}
		});

		return links;
	}
</script>

<div class="timeline-container">
	<!-- 2024 Events -->
	{#each tariffs2024ByMonth as month}
		<div class="month-section">
			<div class="month-header month-2024">
				<h3>{month.monthName}</h3>
			</div>

			<div class="events-list">
				{#each month.events as tariff}
					<div class="event-card tariff-event-card">
						<div class="event-date">
							{d3.timeFormat('%b %d')(tariff.date)}
						</div>
						<div class="event-content">
							<p class="tariff-action">{tariff.tariff_action}</p>
							<div class="tariff-rates">
								<div class="rate-item">
									<span class="rate-label">Chinese tariffs on US:</span>
									<span class="rate-value">{tariff.chinese_tariffs_us.toFixed(1)}%</span>
								</div>
								<div class="rate-item">
									<span class="rate-label">US tariffs on Chinese:</span>
									<span class="rate-value">{tariff.us_tariffs_chinese.toFixed(1)}%</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<!-- BORDERLINE: Transition to 2025 -->
	<div class="year-transition">
		<div class="transition-line"></div>
		<div class="transition-badge">
			<div class="badge-content">
				<h3>2025 - Tariff 2.0 Era Begins</h3>
				<p>A new phase of trade policy unfolds</p>
			</div>
		</div>
		<div class="transition-line"></div>
	</div>

	<!-- 2025 Events -->
	{#each events2025ByMonth as month}
		<div class="month-section">
			<div class="month-header month-2025">
				<h3>{month.monthName}</h3>
			</div>

			<div class="events-list">
				{#each month.events as event}
					<div class="event-card timeline-event-card">
						<div class="event-date">
							{d3.timeFormat('%b %d')(event.date)}
						</div>
						<div class="event-content">
							<div class="event-meta">
								<span class="event-country">{event.country}</span>
								<span class="event-category">{event.category}</span>
							</div>
							<p class="event-description">{event.description}</p>
							{#if event.link && event.link.trim() !== ''}
								{@const links = parseLinks(event.link)}
								<div class="event-links">
									{#each links as link}
										{#if link.url}
											<a href={link.url} target="_blank" rel="noopener noreferrer" class="link-button">
												{link.text}
											</a>
										{:else if link.text}
											<span class="link-text">{link.text}</span>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.timeline-container {
		padding: 0;
	}

	.month-section {
		margin-bottom: 30px;
		border-left: 4px solid #4a90e2;
		padding-left: 15px;
	}

	.month-header {
		margin-bottom: 15px;
		padding: 8px 0;
	}

	.month-header h3 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}

	.month-2024 h3 {
		color: #2c3e50;
	}

	.month-2025 h3 {
		color: #c7254e;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.event-card {
		display: flex;
		gap: 12px;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e0e0e0;
		transition: all 0.2s ease;
	}

	.event-card:hover {
		background: #ffffff;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		transform: translateX(3px);
	}

	.event-date {
		min-width: 50px;
		font-weight: 600;
		color: #4a90e2;
		font-size: 13px;
		text-align: right;
		padding-top: 2px;
	}

	.event-content {
		flex: 1;
	}

	/* 2024 Tariff Event Styles */
	.tariff-action {
		margin: 0 0 10px 0;
		color: #333;
		font-size: 14px;
		line-height: 1.5;
		font-weight: 500;
	}

	.tariff-rates {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.rate-item {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.rate-label {
		color: #666;
	}

	.rate-value {
		color: #333;
		font-weight: 600;
	}

	/* 2025 Timeline Event Styles */
	.event-meta {
		display: flex;
		gap: 8px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}

	.event-country {
		background: #c7254e;
		color: white;
		padding: 3px 8px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 600;
	}

	.event-category {
		background: #f0f0f0;
		color: #333;
		padding: 3px 8px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
	}

	.event-description {
		margin: 0 0 10px 0;
		color: #333;
		line-height: 1.5;
		font-size: 13px;
	}

	.event-links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.link-button {
		display: inline-block;
		padding: 4px 10px;
		background: #4a90e2;
		color: white;
		text-decoration: none;
		border-radius: 3px;
		font-size: 11px;
		transition: background 0.2s ease;
	}

	.link-button:hover {
		background: #357ab8;
	}

	.link-text {
		display: inline-block;
		padding: 4px 10px;
		background: #e8f4fd;
		color: #2c3e50;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
	}

	/* Year Transition Borderline */
	.year-transition {
		display: flex;
		align-items: center;
		margin: 50px 0;
		gap: 20px;
	}

	.transition-line {
		flex: 1;
		height: 3px;
		background: linear-gradient(to right, #4a90e2, #c7254e);
		border-radius: 2px;
	}

	.transition-badge {
		flex-shrink: 0;
		position: relative;
	}

	.badge-content {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 20px 30px;
		border-radius: 12px;
		box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
		text-align: center;
		border: 3px solid white;
		position: relative;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
		}
		50% {
			transform: scale(1.05);
			box-shadow: 0 12px 30px rgba(102, 126, 234, 0.6);
		}
	}

	.badge-content h3 {
		margin: 0 0 8px 0;
		font-size: 22px;
		font-weight: 700;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.badge-content p {
		margin: 0;
		font-size: 14px;
		opacity: 0.95;
		font-weight: 500;
	}
</style>

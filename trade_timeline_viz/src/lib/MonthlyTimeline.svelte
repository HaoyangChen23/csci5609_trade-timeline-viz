<script lang="ts">
	import * as d3 from 'd3';
	import type { TimelineEvent } from '../types';

	type Props = {
		events: TimelineEvent[];
	};
	let { events }: Props = $props();

	// Group events by month
	const eventsByMonth = $derived.by(() => {
		const grouped = new Map<string, TimelineEvent[]>();

		events.forEach((event) => {
			const monthKey = d3.timeFormat('%Y-%m')(event.date);
			if (!grouped.has(monthKey)) {
				grouped.set(monthKey, []);
			}
			grouped.get(monthKey)!.push(event);
		});

		// Sort months chronologically
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

		// Split by newline to handle multiple links
		const linkParts = linkStr.split('\n').filter((l) => l.trim() !== '');

		const links: Array<{ text: string; url: string }> = [];

		linkParts.forEach((part) => {
			part = part.trim();
			// Try to detect if it's a URL (starts with http or www)
			if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
				links.push({ text: 'Link', url: part });
			} else {
				// It's descriptive text, assume next item might be URL
				links.push({ text: part, url: '' });
			}
		});

		return links;
	}
</script>

<div class="timeline-container">
	{#each eventsByMonth as month}
		<div class="month-section">
			<div class="month-header">
				<h3>{month.monthName}</h3>
			</div>

			<div class="events-list">
				{#each month.events as event}
					<div class="event-card">
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
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.month-section {
		margin-bottom: 40px;
		border-left: 4px solid #4a90e2;
		padding-left: 20px;
	}

	.month-header {
		margin-bottom: 20px;
		position: sticky;
		top: 0;
		background: white;
		z-index: 10;
		padding: 10px 0;
	}

	.month-header h3 {
		margin: 0;
		color: #2c3e50;
		font-size: 24px;
		font-weight: 600;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.event-card {
		display: flex;
		gap: 16px;
		padding: 16px;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
		transition: all 0.2s ease;
	}

	.event-card:hover {
		background: #ffffff;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transform: translateX(4px);
	}

	.event-date {
		min-width: 60px;
		font-weight: 600;
		color: #4a90e2;
		font-size: 14px;
		text-align: right;
		padding-top: 2px;
	}

	.event-content {
		flex: 1;
	}

	.event-meta {
		display: flex;
		gap: 12px;
		margin-bottom: 8px;
		flex-wrap: wrap;
	}

	.event-country {
		background: #4a90e2;
		color: white;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
	}

	.event-category {
		background: #f0f0f0;
		color: #333;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.event-description {
		margin: 0 0 12px 0;
		color: #333;
		line-height: 1.6;
		font-size: 14px;
	}

	.event-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}

	.link-button {
		display: inline-block;
		padding: 6px 12px;
		background: #4a90e2;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		font-size: 12px;
		transition: background 0.2s ease;
	}

	.link-button:hover {
		background: #357ab8;
	}

	.link-text {
		display: inline-block;
		padding: 6px 12px;
		background: #e8f4fd;
		color: #2c3e50;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}
</style>


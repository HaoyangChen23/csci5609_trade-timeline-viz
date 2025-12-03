<script lang="ts">
    import * as d3 from "d3";

    // Data Definition (Variance Analysis: Change on Left)
    const companies = [
        {
            name: "Hyundai",
            period: "Q2 2025",
            currency: "KRW (Billions)",
            data: [
                { label: "Change in Op. Income", value: -677, type: "outcome" },
                { label: "Tariff Cost", value: -828, type: "negative" },
                { label: "FX Impact", value: 632, type: "positive" }
            ]
        },
        {
            name: "Kia",
            period: "Q2 2025",
            currency: "KRW (Billions)",
            data: [
                { label: "Change in Op. Income", value: -879, type: "outcome" },
                { label: "Tariff Cost", value: -786, type: "negative" },
                { label: "FX Impact", value: 501, type: "positive" }
            ]
        },
        {
            name: "Toyota",
            period: "Q1 2026",
            currency: "JPY (Billions)",
            data: [
                { label: "Change in Op. Income", value: -142.3, type: "outcome" },
                { label: "Tariff Cost", value: -450, type: "negative" },
                { label: "FX Impact", value: -165, type: "negative" }
            ]
        },
        {
            name: "Honda",
            period: "Q1 2025",
            currency: "JPY (Billions)",
            data: [
                { label: "Change in Op. Income", value: -243.4, type: "outcome" },
                { label: "Tariff Cost", value: -124.6, type: "negative" },
                { label: "FX Impact", value: -86.1, type: "negative" }
            ]
        },
        {
            name: "Ford",
            period: "Q3 2025",
            currency: "USD (Billions)",
            data: [
                { label: "Change in Adj. EBIT", value: 0.036, type: "outcome" },
                { label: "Tariff Cost", value: -0.7, type: "negative" }
            ]
        }
    ];

    // Colors mapping
    const colors = {
        negative: "#dc3545",        // Red (Tariff/Loss)
        positive: "#28a745",        // Green (Forex Gain)
        outcome: "#007bff"          // Blue (Change/Result)
    };

    // Reduced Dimensions for Compact View
    const cardWidth = 165;  // Reduced from 200
    const cardHeight = 230; // Reduced from 280
    const margin = { top: 35, right: 10, bottom: 50, left: 40 }; // Tighter margins

    function wrapText(text: string) {
        return text.split(/\s+/);
    }
</script>

<div class="chart-container">
    <div class="main-header">
        <h2>Automaker First Earnings since Second Trump Tariff</h2>
        <p class="subtitle">Operating income YoY comparison</p>
    </div>

    <div class="grid-layout">
        {#each companies as company}
            {@const maxVal = Math.max(0, ...company.data.map(d => d.value))}
            {@const minVal = Math.min(0, ...company.data.map(d => d.value))}

            {@const yDomain = [minVal * 1.15, maxVal * 1.15]}

            {@const yScale = d3.scaleLinear()
                .domain(yDomain)
                .range([cardHeight - margin.bottom, margin.top])
            }

            {@const xScale = d3.scaleBand()
                .domain(company.data.map(d => d.label))
                .range([margin.left, cardWidth - margin.right])
                .padding(0.3)
            }

            <div class="card">
                <div class="card-header">
                    <strong>{company.name}</strong>
                    <div class="period">({company.period})</div>
                    <div class="currency">{company.currency}</div>
                </div>

                <svg width={cardWidth} height={cardHeight}>
                    <line
                            x1={margin.left}
                            x2={cardWidth - margin.right}
                            y1={yScale(0)}
                            y2={yScale(0)}
                            stroke="#333"
                            stroke-width="1"
                    />

                    {#each yScale.ticks(5) as tick}
                        {#if tick !== 0}
                            <line
                                    x1={margin.left}
                                    x2={cardWidth - margin.right}
                                    y1={yScale(tick)}
                                    y2={yScale(tick)}
                                    stroke="#eee"
                                    stroke-dasharray="2,2"
                            />
                        {/if}
                    {/each}

                    {#each company.data as d}
                        <rect
                                x={xScale(d.label)}
                                y={Math.min(yScale(0), yScale(d.value))}
                                width={xScale.bandwidth()}
                                height={Math.abs(yScale(0) - yScale(d.value))}
                                fill={colors[d.type as keyof typeof colors]}
                                rx="2"
                                ry="2"
                        />

                        <text
                                x={xScale(d.label)! + xScale.bandwidth() / 2}
                                y={yScale(d.value) + (d.value >= 0 ? -5 : 10)}
                                text-anchor="middle"
                                font-size="9"
                                font-weight="bold"
                                fill="#222"
                        >
                            {d.value > 0 ? "+" : ""}{d3.format(company.name === 'Ford' ? ".3f" : ",.0f")(d.value)}
                        </text>

                        {@const lines = wrapText(d.label)}
                        {#each lines as line, i}
                            <text
                                    x={xScale(d.label)! + xScale.bandwidth() / 2}
                                    y={cardHeight - margin.bottom + 14 + (i * 10)}
                                    text-anchor="middle"
                                    font-size="8"
                                    fill="#555"
                            >
                                {line}
                            </text>
                        {/each}
                    {/each}

                    <g transform="translate({margin.left}, 0)">
                        {#each yScale.ticks(5) as tick}
                            <text
                                    x="-4"
                                    y={yScale(tick)}
                                    dy="0.32em"
                                    text-anchor="end"
                                    font-size="8"
                                    fill="#999"
                            >
                                {d3.format("~s")(tick)}
                            </text>
                        {/each}
                    </g>
                </svg>
            </div>
        {/each}
    </div>

    <div class="legend">
        <div class="item"><span class="box" style="background: {colors.outcome}"></span> Net Change / Loss</div>
        <div class="item"><span class="box" style="background: {colors.negative}"></span> Negative Impact (Tariff/Loss)</div>
        <div class="item"><span class="box" style="background: {colors.positive}"></span> Forex Gain</div>
    </div>

    <p class="source-label">Source: Company Filings</p>
</div>

<style>
    .chart-container {
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: #fff;
        padding: 15px; /* Reduced padding */
        border-radius: 8px;
        width: 100%;
        max-width: 950px; /* Reduced max-width to keep it compact */
        margin: 0 auto;
    }

    .main-header {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    }

    h2 { margin: 0 0 5px 0; color: #333; font-size: 18px; font-weight: 700; }
    .subtitle { margin: 0; color: #666; font-size: 13px; }

    .grid-layout {
        display: flex;
        flex-wrap: wrap;
        gap: 15px; /* Reduced gap */
        justify-content: center;
    }

    .card {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-bottom: 8px;
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 8px rgba(0,0,0,0.08);
    }

    .card-header {
        width: 100%;
        text-align: center;
        padding: 8px 0;
        background: #fafafa;
        border-bottom: 1px solid #eee;
        border-radius: 6px 6px 0 0;
        margin-bottom: 4px;
    }

    .card-header strong { display: block; font-size: 14px; color: #222; margin-bottom: 1px;}
    .period { font-size: 11px; color: #777; font-style: italic; }
    .currency { font-size: 10px; color: #555; margin-top: 2px; font-weight: 500;}

    .legend {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }

    .legend .item {
        display: flex;
        align-items: center;
        font-size: 11px;
        color: #444;
    }

    .legend .box {
        width: 10px;
        height: 10px;
        margin-right: 6px;
        border-radius: 2px;
    }

    .source-label {
        font-size: 10px;
        color: #999;
        text-align: right;
        margin-top: 10px;
        width: 100%;
        font-style: italic;
    }
</style>
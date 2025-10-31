<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import type { TMovie, TTariff } from "../../types";
  import StoryOpen from "./StoryOpen.svelte";
  import Scrolly2D from "./Scrolly2D.svelte";

  let movies: TMovie[] = [];
  let tariffs: TTariff[] = [];

  // Reactive variable for storing the data

  // Function to load the CSV
  async function loadCsv() {
    try {
      const csvUrl = "./summer_movies.csv";
      movies = await d3.csv(csvUrl, (row) => {
        // all values are strings, so use row conversion function to format them
        return {
          ...row,
          num_votes: Number(row.num_votes),
          runtime_minutes: Number(row.runtime_minutes),
          genres: row.genres.split(","),
          year: new Date(row.year),
          average_rating: Number(row.average_rating),
        };
      });

      console.log("Loaded CSV Data:", movies);
    } catch (error) {
      console.error("Error loading CSV:", error);
    }
  }

  // Function to load the tariff CSV
  async function loadTariffCsv() {
    try {
      const csvUrl = "./CSCI5609_Project_Dataset - Sheet1.csv";
      tariffs = await d3.csv(csvUrl, (row) => {
        // Parse the date string (format: "1-Jan-18" or "January 1, 2018")
        const dateStr = row.Date;
        let parsedDate: Date;

        // Try multiple date formats
        if (dateStr.includes("-")) {
          // Format like "1-Jan-18"
          parsedDate = d3.timeParse("%d-%b-%y")(dateStr) || new Date();
        } else {
          // Format like "January 1, 2018"
          parsedDate = new Date(dateStr);
        }

        return {
          tariff_action: row["Tariff action"],
          date: parsedDate,
          chinese_tariffs_row: Number(row["Chinese tariffs on ROW exports"]),
          chinese_tariffs_us: Number(row["Chinese tariffs on US exports"]),
          us_tariffs_chinese: Number(row["US tariffs on Chinese exports"]),
          us_tariffs_row: Number(row["US tariffs on ROW exports"])
        };
      });

      console.log("Loaded Tariff Data:", tariffs);
    } catch (error) {
      console.error("Error loading tariff CSV:", error);
    }
  }

  // Call the loaders when the component mounts
  onMount(() => {
    loadCsv();
    loadTariffCsv();
  });
</script>

<div class="container">
  <StoryOpen movieNum={movies.length} />
  <Scrolly2D {tariffs} />
</div>

<style>
  .container {
    width: 80vw;
    margin: 10px auto;
    padding: 10px;
    align-content: center;
  }
</style>
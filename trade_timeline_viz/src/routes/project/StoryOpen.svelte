<script lang="ts">
  import { Scroll } from "$lib";

  import { fly } from "svelte/transition";

  let progress: number = $state(0);
</script>

<Scroll bind:progress --scrolly-story-width="0">
  <div id="virtual"></div>
  <div slot="viz" class="header">
    <div class="content-overlay">
      <h1>The Trade War Timeline</h1>

      {#if progress > 20}
        <p
          in:fly={{
            duration: 1500,
            y: 50,
            delay: 200,
          }}
        >
          [Placeholder: Explore the evolution of US-China trade relations from 2018 to 2025 through interactive data visualizations]
        </p>
      {/if}

      {#if progress > 50}
        <p in:fly={{
          duration: 1500,
          y: 50,
          delay: 300,
        }}>
          [Placeholder: Scroll to discover how tariffs shaped global commerce]
        </p>
      {/if}
    </div>
  </div>
</Scroll>

<!-- <svelte:window bind:scrollY={progress} /> -->

<style>
  .header {
    background-image: url('/Story_open.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed; /* Parallax effect */
    padding: 80px 60px;
    height: 80vh;
    width: 100vw;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: calc(-50vw + 50%);
    margin-right: calc(-50vw + 50%);
  }

  .content-overlay {
    background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent dark overlay */
    padding: 50px 70px;
    border-radius: 15px;
    backdrop-filter: blur(8px);
    max-width: 1000px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;
  }

  #virtual {
    height: 150vh; /* Make the page scrollable with a 150% view height */
  }

  h1 {
    font-size: 10vh;
    color: #ffffff; /* White text for better contrast on background */
    font-weight: 700; /* Bold font weight */
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.9);
    margin-bottom: 30px;
    margin-top: 0;
    letter-spacing: 1px;
    opacity: 0;
    animation: fadeInUp 1.2s ease-out forwards;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  p {
    font-size: 2.5vh;
    color: #f5f5f5; /* Light text color */
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    line-height: 1.8;
    margin-top: 20px;
    margin-bottom: 10px;
    font-weight: 400;
  }
</style>

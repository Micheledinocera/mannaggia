<template>
  <main>
    <SantoDelGiornoCelestiale
      apiKey="425|zHfFIRgRP2FAsLY61AOxAxOhBnqEEFVKF5giHVkB01bab0fe"
      musicUrl="/music/celestial-ambient.mp3"
    />
  </main>
</template>

<script setup>
import SantoDelGiornoCelestiale from './components/SantoDelGiornoCelestiale.vue'
</script>

<style>
body{
  margin:0;
  height:100vh;
  width:100vw;
}

#app{
  height:100%;
  width:100vw;
  main,section{
    height: 100vh;
    padding: 0;
  }
}

</style>
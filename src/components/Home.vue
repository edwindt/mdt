<!-- YourVuetifyComponent.vue -->
<template>
  <v-container>
    <ChartComponent />
  </v-container>
</template>

<script>
import ChartComponent from '../components/ScatterPlot.vue';

export default {
  components: {
    ChartComponent
  }
};
</script>

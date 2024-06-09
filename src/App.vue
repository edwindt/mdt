<template>
  <v-app>
    <v-app-bar app color="primary">
      <v-btn text to="/">Home</v-btn>
      <v-btn text to="/about">About</v-btn>
    </v-app-bar>
    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'App',
});
</script>

<style>
/* Add any custom styles here */
</style>

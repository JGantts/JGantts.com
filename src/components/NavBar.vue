<script setup lang="ts">
import NavBarItem from './NavBarItem.vue';

</script>

<template>
  <div id="container-nav" class="container default full">
    <div class="wrapper">
      <div class="inner">
        <ul>
          <li>
            <NavBarItem :name="'home'" :title="'Home'" />
          </li>
          <li>
            <NavBarItem :name="'background'" :title="'Background Project'" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBarItem from './NavBarItem.vue';
import VStack from '@/library-jgantts/VStack.vue';

</script>

<template>
  <div id="container-nav" class="container default full">
    <div class="wrapper">
      <div class="inner">
        <ul>
          <li>
            <NavBarItem :name="'welcome'" :title="'Build with me'" />
          </li>
          <!--<li>
            <NavBarItem :name="'web'" :title="'Getting Started'" />
          </li>-->
          <!--<li>
            <NavBarItem :name="'apps'" :title="'iOS Apps'" />
          </li>
          <li>
            <NavBarItem :name="'about-me'" :title="'Who am I?'" />
          </li>
          <li>
            <NavBarItem :name="'about-me2'" :title="'About Me 2'" />
          </li>-->
          <!--<li>
            <NavBarItem :name="'services'" :title="'Services'" />
          </li>-->
        </ul>
      </div>
    </div>
  </div>
</template>

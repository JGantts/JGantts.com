<script>
export default {

}
</script>

<template>
  <ol>
    <p>Item 1</p>
    <TodoItem
      v-for="item in groceryList"
      :todo="item"
      :key="item.id"
    ></TodoItem>
    <TodoItem
      :todo="{ text: 'Hi' }"
    >
    </TodoItem>
    <p>Item n</p>
  </ol>
</template>

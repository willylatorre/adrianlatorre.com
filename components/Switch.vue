<script setup>
const darkMode = useState('darkMode', () => false)
</script>


<template>
    <label class="switch">
  <input type="checkbox" v-model="darkMode">
  <span class="slider round"></span>
</label>
</template>

<style lang="scss" scoped>
@import '../assets/scss/_vars.scss';

$height: 24px;
$circle: 16px;

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: $height;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: $circle;
  width: $circle;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: $warning;
}

input:focus + .slider {
  box-shadow: 0 0 1px $warning;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: $height;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
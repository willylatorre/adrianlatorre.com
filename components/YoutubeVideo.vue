<script setup>

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const bgImg = computed(() =>  `https://img.youtube.com/vi/${props.id}/hqdefault.jpg`)

function initYT() {
      const youtube = document.getElementById('yt-' + props.id)
      youtube.addEventListener('click', () => {
        youtube.innerHTML = ''
        youtube.appendChild(loadIframe())
      })
    }

    function loadIframe() {
      const iframe = document.createElement('iframe')
      const embed = `https://www.youtube.com/embed/${props.id}?autoplay=1`
      iframe.setAttribute('src', embed)
      iframe.setAttribute('class', 'youtube-iframe')
      // iframe.setAttribute('style', `backgroundImage: url(${bgImg})`)
      iframe.setAttribute('frameborder', '0')
      iframe.setAttribute('allowfullscreen', '1')
      return iframe
    }
  

onMounted(() => {
  initYT()
})

</script>


<template>
  <div class="youtube" :id="'yt-' + id" :style="{ backgroundImage: `url(${bgImg}`}">
    <div class="play-button"></div>
  </div>
</template>


<style lang="scss" scoped>
.youtube {
  background-color: #000;
  width: 320px;
  height: 180px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.youtube img {
  width: 100%;
  height: 100%;
  opacity: 0.7;
}
.youtube .play-button {
  width: 90px;
  height: 60px;
  background-color: #333;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
  z-index: 1;
  opacity: 0.8;
  border-radius: 6px;
}
.youtube .play-button:before {
  content: '';
  border-style: solid;
  border-width: 15px 0 15px 26px;
  border-color: transparent transparent transparent #fff;
}
.youtube img,
.youtube .play-button {
  cursor: pointer;
}
.youtube img,
.youtube iframe,
.youtube .play-button,
.youtube .play-button:before {
  position: absolute;
}
.youtube .play-button,
.youtube .play-button:before {
  top: 50%;
  left: 50%;
  transform: translate3d(-50%, -50%, 0);
}
:deep(.youtube-iframe) {
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
}
</style>

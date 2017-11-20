<template lang="html">
  <div class="youtube" :id="'yt-' + id">
    <div class="play-button"></div>
  </div>
</template>

<script>
export default {
  name: 'YoutubeVideo',
  props: ['id'],
  mounted () {
    this.initYT()
  },
  methods: {
    initYT () {
      var youtube = document.getElementById('yt-' + this.id)
      var div = document.createElement('div')
      var image = new Image()
      image.src = `https://img.youtube.com/vi/${this.id}/sddefault.jpg`
      image.addEventListener('load', () => {
        youtube.appendChild(image)
      })
      youtube.addEventListener('click', () => {
        youtube.innerHTML = ''
        youtube.appendChild(this.labnolIframe())
      })
    },
    labnolIframe () {
      var iframe = document.createElement('iframe')
      var embed = `https://www.youtube.com/embed/${this.id}?autoplay=1`
      iframe.setAttribute('src', embed)
      iframe.setAttribute(this.$options._scopeId, '')
      iframe.setAttribute('class', 'youtube-iframe')
      iframe.setAttribute('frameborder', '0')
      iframe.setAttribute('allowfullscreen', '1')
      return iframe
    }
  }
}
</script>

<style lang="scss" scoped>
.youtube {
	background-color: #000;
  width: 320px;
  height: 180px;
	position: relative;
	overflow: hidden;
	cursor: pointer;
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
	box-shadow: 0 0 30px rgba( 0,0,0,0.6 );
	z-index: 1;
	opacity: 0.8;
	border-radius: 6px;
}
.youtube .play-button:before {
	content: "";
	border-style: solid;
	border-width: 15px 0 15px 26.0px;
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
	transform: translate3d( -50%, -50%, 0 );
}
.youtube iframe, .youtube-iframe {
	height: 100%;
	width: 100%;
	top: 0;
	left: 0;
}
</style>

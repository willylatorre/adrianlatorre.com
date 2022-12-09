import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({

    css: [
        'bulma/bulma.sass',
        '~/assets/scss/main.css',
        '~/assets/scss/common.scss'
    ],


    modules: [
        '@nuxtjs/tailwindcss'
    ],

    vite: {
        plugins: [
            svgLoader()
        ]
    }
})

import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            title: 'Adrian Latorre Crespo - Personal website',
            meta: [
                { name: 'description', content: 'Adrian Latorre\'s personal website' }
            ],
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }
            ]
        }
    },

    css: [
        'bulma/bulma.sass',
        '~/assets/scss/main.css',
        '~/assets/scss/common.scss'
    ],


    modules: [
        '@nuxtjs/tailwindcss'
    ],

    experimental: {
        viteNode: true
    },

    vite: {
        plugins: [
            svgLoader()
        ]
    }
})

const path = require('path')

function addStyleResource (rule) {
  rule.use('style-resource')
    .loader('style-resources-loader')
    .options({
      patterns: [
        path.resolve(__dirname, './src/assets/scss/_vars.scss'),
      ],
    })
}

module.exports = {
  siteName: 'Adrian Latorre',
  siteDescription: 'Personal website of Adrian Latorre. Frontend development, Vuejs, tech and much more.',
  siteUrl: 'https://adrianlatorre.com',
  transformers: {
    remark: {}
  },
  plugins: [
    // {
    //   use: '@gridsome/plugin-critical',
    //   options: {
    //     paths: ['/'],
    //     width: 1300,
    //     height: 900
    //   }
    // },
    {
      use: "@gridsome/source-filesystem",
      options: {
        path: "blog/**/*.md",
        typeName: "Post"
      }
    },
    {
      use: 'gridsome-plugin-tailwindcss',
      /* These are the default options. You don't need to set any options to get going.
      options: {
        tailwindConfig: './some/file/js',
        purgeConfig: {},
        presetEnvConfig: {},
        shouldPurge: true,
        shouldImport: true,
        shouldTimeTravel: true
      }
      */
    }
  ],
  chainWebpack (config) {
    const types = ['vue-modules', 'vue', 'normal-modules', 'normal']

    types.forEach(type => {
      addStyleResource(config.module.rule('scss').oneOf(type))
    })
	}
}

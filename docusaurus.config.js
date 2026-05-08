// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'CAL-Log Documentation',
  tagline: 'Cost-Aware Active Learning with Logarithmic Cost — Technical Reference',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://cal-log-docs.vercel.app',
  baseUrl: '/',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-nB0miv6/jRmo5RLHO8BIp/8hwEUGy0/z9TodF8sSliJDQ9HSupnDQ0gOf8DXQOY',
      crossorigin: 'anonymous',
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'CAL-Log',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/KDvs2001/alx-label-app',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              { label: 'Introduction', to: '/' },
              { label: 'Architecture', to: '/architecture/overview' },
              { label: 'Mathematics', to: '/mathematics/cost-function' },
            ],
          },
          {
            title: 'Codebase',
            items: [
              { label: 'ML Service', to: '/ml-service/simulation-server' },
              { label: 'Server (Node.js)', to: '/server/express-setup' },
              { label: 'Client (React)', to: '/client/app-structure' },
            ],
          },
          {
            title: 'Reference',
            items: [
              { label: 'API Endpoints', to: '/api-reference/ml-endpoints' },
              { label: 'Citations', to: '/citations' },
            ],
          },
        ],
        copyright: `CAL-Log Research Tool — Vihanga Supasan Kariyakaranage © ${new Date().getFullYear()}. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['python', 'bash', 'json', 'docker'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
    }),
};

export default config;

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/data-flow',
        'architecture/deployment',
      ],
    },
    {
      type: 'category',
      label: 'Mathematics',
      collapsed: false,
      items: [
        'mathematics/cost-function',
        'mathematics/ols-regression',
        'mathematics/entropy-scoring',
        'mathematics/fatigue-modeling',
      ],
    },
    {
      type: 'category',
      label: 'ML Service (Python)',
      collapsed: false,
      items: [
        'ml-service/simulation-server',
        'ml-service/cost-engine',
        'ml-service/cal-log-ranker',
        'ml-service/simple-backbone',
        'ml-service/shadow-benchmarking',
      ],
    },
    {
      type: 'category',
      label: 'Research Benchmark',
      collapsed: false,
      items: [
        'ml-service/research-benchmark',
      ],
    },
    {
      type: 'category',
      label: 'Server (Node.js)',
      collapsed: false,
      items: [
        'server/express-setup',
        'server/session-routes',
        'server/experiment-routes',
        'server/feedback-routes',
        'server/database-models',
      ],
    },
    {
      type: 'category',
      label: 'Client (React)',
      collapsed: false,
      items: [
        'client/app-structure',
        'client/research-workspace',
        'client/task-card',
        'client/spy-analysis',
        'client/roi-calculator',
        'client/session-management',
        'client/analysis-components',
        'client/parameter-impact',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api-reference/ml-endpoints',
        'api-reference/server-endpoints',
      ],
    },
    'citations',
  ],
};

export default sidebars;

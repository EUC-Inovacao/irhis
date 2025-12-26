module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        unstable_transformProfile: 'hermes-stable',
        jsxRuntime: 'automatic',
      }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './app/components',
            '@context': './app/context',
            '@data': './app/data',
            '@navigation': './app/navigation',
            '@screens': './app/screens',
            '@theme': './app/theme',
            '@types': './app/types',
            '@services': './app/services',
            '@storage': './app/storage',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      ],
      'babel-plugin-transform-flow-enums',
      '@babel/plugin-transform-flow-strip-types',
    ],
  };
}; 
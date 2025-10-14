/**
 * Production Webpack Configuration for StickForStats
 * Optimized for performance, size, and caching
 */

const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false, // No source maps in production

  entry: {
    main: './src/index.js',
    // Code splitting for vendor libraries
    vendor: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      'axios',
      'recharts',
      'plotly.js'
    ]
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
    clean: true
  },

  optimization: {
    minimize: true,
    minimizer: [
      // JavaScript minification
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true, // Remove console logs
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),

      // CSS minification
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeUnicode: false
            }
          ]
        }
      })
    ],

    // Code splitting configuration
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react',
          priority: 40,
          enforce: true
        },
        // Material-UI
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          priority: 35,
          enforce: true
        },
        // Charts and visualization
        charts: {
          test: /[\\/]node_modules[\\/](recharts|plotly\.js|d3|chart\.js)[\\/]/,
          name: 'charts',
          priority: 30,
          enforce: true
        },
        // Math and statistics libraries
        math: {
          test: /[\\/]node_modules[\\/](mathjs|jstat|ml-matrix)[\\/]/,
          name: 'math',
          priority: 25,
          enforce: true
        },
        // Validation system
        validation: {
          test: /[\\/]src[\\/]utils[\\/]validation[\\/]/,
          name: 'validation',
          priority: 20,
          enforce: true
        },
        // Common vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
          reuseExistingChunk: true
        },
        // Common components
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },

    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime'
    },

    // Module IDs for better caching
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  },

  module: {
    rules: [
      // JavaScript/JSX
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.25%, not dead',
                useBuiltIns: 'entry',
                corejs: 3
              }],
              ['@babel/preset-react', {
                runtime: 'automatic'
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
              ['@babel/plugin-transform-runtime', {
                corejs: 3,
                helpers: true,
                regenerator: true
              }]
            ],
            cacheDirectory: true,
            cacheCompression: true
          }
        }
      },

      // CSS/SASS
      {
        test: /\.(css|scss|sass)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: false,
              modules: {
                auto: true,
                localIdentName: '[hash:base64:5]'
              }
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  'autoprefixer',
                  'cssnano'
                ]
              }
            }
          },
          'sass-loader'
        ]
      },

      // Images
      {
        test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb
          }
        },
        generator: {
          filename: 'static/media/[name].[hash:8][ext]'
        }
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[name].[hash:8][ext]'
        }
      }
    ]
  },

  plugins: [
    // Clean build directory
    new CleanWebpackPlugin(),

    // Environment variables
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
        REACT_APP_VERSION: JSON.stringify(process.env.REACT_APP_VERSION || '1.0.0'),
        REACT_APP_API_URL: JSON.stringify(process.env.REACT_APP_API_URL),
        REACT_APP_WS_URL: JSON.stringify(process.env.REACT_APP_WS_URL),
        REACT_APP_ENVIRONMENT: JSON.stringify('production')
      }
    }),

    // HTML generation
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      meta: {
        viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
        description: 'StickForStats - Enterprise Statistical Analysis Platform',
        keywords: 'statistics, analysis, FDA compliant, scientific computing'
      }
    }),

    // CSS extraction
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css'
    }),

    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|json)$/,
      threshold: 8192,
      minRatio: 0.8
    }),

    // Brotli compression
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg|json)$/,
      compressionOptions: {
        level: 11
      },
      threshold: 8192,
      minRatio: 0.8,
      filename: '[path][base].br'
    }),

    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '',
          globOptions: {
            ignore: ['**/index.html']
          }
        }
      ]
    }),

    // Service Worker for PWA
    new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.stickforstats\.com\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 300 // 5 minutes
            },
            networkTimeoutSeconds: 10
          }
        },
        {
          urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
            }
          }
        },
        {
          urlPattern: /\.(js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-cache'
          }
        }
      ]
    }),

    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    }),

    // Progress plugin for build feedback
    new webpack.ProgressPlugin({
      activeModules: false,
      entries: true,
      modules: true,
      modulesCount: 5000,
      profile: false,
      dependencies: true,
      dependenciesCount: 10000,
      percentBy: null
    })
  ].filter(Boolean),

  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@validation': path.resolve(__dirname, 'src/utils/validation'),

      // Optimize imports for production
      'lodash': 'lodash-es',
      'moment': 'dayjs'
    }
  },

  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500 KB
    maxAssetSize: 512000 // 500 KB
  },

  stats: {
    all: false,
    modules: true,
    errors: true,
    warnings: true,
    moduleTrace: true,
    errorDetails: true,
    colors: true,
    builtAt: true,
    assets: true,
    assetsSort: 'size',
    chunksSort: 'size',
    timings: true
  }
};

// Export a function for custom configuration
module.exports.withCustomConfig = (customConfig) => {
  return { ...module.exports, ...customConfig };
};
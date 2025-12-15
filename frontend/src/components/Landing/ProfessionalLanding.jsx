import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ProfessionalLanding.css';

const ProfessionalLanding = ({ onEnter }) => {
  const [statsVisible, setStatsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="professional-landing">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <span className="logo-text">StickForStats</span>
            <span className="logo-tag">Statistical Integrity Platform</span>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#guardian" onClick={(e) => { e.preventDefault(); scrollToSection('guardian'); }}>Guardian System</a>
            <a href="#precision" onClick={(e) => { e.preventDefault(); scrollToSection('precision'); }}>Precision</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-menu" onClick={(e) => e.stopPropagation()}>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#guardian" onClick={(e) => { e.preventDefault(); scrollToSection('guardian'); }}>Guardian System</a>
            <a href="#precision" onClick={(e) => { e.preventDefault(); scrollToSection('precision'); }}>Precision</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a>
            <button className="mobile-cta" onClick={() => { setMobileMenuOpen(false); onEnter(); }}>
              Start Analysis →
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Critical Alert */}
            <div className="critical-alert">
              <span className="alert-badge">CRITICAL</span>
              <span className="alert-text">
                Over 70% of researchers fail to reproduce published findings
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="main-headline">
              Publish Research with
              <br />
              <span className="highlight-text">Confidence</span>
            </h1>

            {/* Value Proposition */}
            <p className="value-proposition">
              The first statistical analysis platform with built-in Guardian protection
              that prevents Type I errors before they happen. Trusted by researchers
              who value scientific integrity over p-hacking.
            </p>

            {/* Key Features Grid */}
            <div id="features" className="features-grid">
              <div className="feature-item">
                <div className="feature-icon guardian-icon">🛡️</div>
                <div className="feature-content">
                  <h3>Guardian System</h3>
                  <p>6 assumption validators prevent false positives</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon precision-icon">🎯</div>
                <div className="feature-content">
                  <h3>50-Decimal Precision</h3>
                  <p>Unmatched accuracy in every calculation</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon tests-icon">📊</div>
                <div className="feature-content">
                  <h3>40+ Statistical Tests</h3>
                  <p>Comprehensive suite with educational mode</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="cta-group">
              <button className="primary-cta" onClick={onEnter}>
                Start Analysis
                <span className="cta-arrow">→</span>
              </button>
              <button className="secondary-cta" onClick={() => scrollToSection('documentation')}>
                View Documentation
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="trust-indicators">
              <div className="trust-item">
                <span className="trust-number">40+</span>
                <span className="trust-label">Statistical Tests</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">50</span>
                <span className="trust-label">Decimal Precision</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">6</span>
                <span className="trust-label">Guardian Validators</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Guardian System Section */}
      <section id="guardian" className="guardian-section">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: statsVisible ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="section-title">
              Statistical Validation
              <br />
              <span className="emphasis">Before Publication</span>
            </h2>

            <div className="guardian-demo">
              <div className="demo-card">
                <h3>Without Guardian</h3>
                <ul className="demo-list negative">
                  <li>❌ Assumptions unchecked</li>
                  <li>❌ p = 0.048 published</li>
                  <li>❌ False discovery</li>
                  <li>❌ Retraction required</li>
                </ul>
              </div>
              <div className="demo-card">
                <h3>With Guardian</h3>
                <ul className="demo-list positive">
                  <li>✅ Normality violation detected</li>
                  <li>✅ Alternative test suggested</li>
                  <li>✅ Correct p = 0.082</li>
                  <li>✅ Scientific integrity preserved</li>
                </ul>
              </div>
            </div>

            <div className="guardian-features">
              <div className="guardian-feature">
                <h4>Normality Check</h4>
                <p>Shapiro-Wilk, Anderson-Darling, Q-Q plots</p>
              </div>
              <div className="guardian-feature">
                <h4>Variance Homogeneity</h4>
                <p>Levene's, Bartlett's, F-test validation</p>
              </div>
              <div className="guardian-feature">
                <h4>Independence Test</h4>
                <p>Durbin-Watson, autocorrelation detection</p>
              </div>
              <div className="guardian-feature">
                <h4>Outlier Detection</h4>
                <p>IQR, Z-score, Isolation Forest methods</p>
              </div>
              <div className="guardian-feature">
                <h4>Sample Size Adequacy</h4>
                <p>Power analysis, effect size calculation</p>
              </div>
              <div className="guardian-feature">
                <h4>Modality Detection</h4>
                <p>Hartigan's dip test, kernel density</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Commitment */}
      <section id="about" className="credibility-section">
        <div className="section-container">
          <div className="credibility-content">
            <h2 className="commitment-title">Our Commitment to Statistical Integrity</h2>
            <p className="commitment-text">
              In a world where p-hacking and false positives plague scientific literature,
              StickForStats provides transparent, reproducible statistical validation with
              50-decimal precision and comprehensive assumption checking.
            </p>
            <p className="commitment-subtext">
              Every calculation is auditable. Every assumption is validated. Every result is reproducible.
            </p>
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section id="documentation" className="documentation-section">
        <div className="section-container">
          <h2 className="section-title">Platform Documentation</h2>
          <p className="section-subtitle">
            Comprehensive guide to using StickForStats for statistical analysis
          </p>

          <div className="documentation-grid">
            {/* Getting Started */}
            <div className="doc-card">
              <h3 className="doc-title">🚀 Getting Started</h3>
              <div className="doc-content">
                <h4>Quick Start</h4>
                <ol className="doc-list">
                  <li>Click "Start Analysis" to access the platform</li>
                  <li>Navigate to "Statistical Analysis Tools" for comprehensive suite</li>
                  <li>Begin with Module 1 (Data Profiling) to upload and analyze your CSV data</li>
                  <li>Progress through modules 2-7 for complete analysis workflow</li>
                </ol>
                <h4>Data Requirements</h4>
                <ul className="doc-list">
                  <li>Format: CSV files with headers</li>
                  <li>Size: Up to 1M observations supported</li>
                  <li>Columns: Numeric and categorical variables</li>
                  <li>Missing values: Handled automatically with multiple imputation options</li>
                </ul>
              </div>
            </div>

            {/* Guardian System */}
            <div className="doc-card">
              <h3 className="doc-title">🛡️ Guardian Statistical Protection</h3>
              <div className="doc-content">
                <h4>What It Does</h4>
                <p>
                  Guardian validates statistical assumptions BEFORE running tests, preventing
                  Type I errors and false positives that plague published research.
                </p>
                <h4>6 Validators</h4>
                <ul className="doc-list">
                  <li><strong>Normality:</strong> Shapiro-Wilk test with visual diagnostics</li>
                  <li><strong>Sample Size:</strong> Power analysis and minimum n requirements</li>
                  <li><strong>Homogeneity:</strong> Levene's test for equal variances</li>
                  <li><strong>Independence:</strong> Durbin-Watson autocorrelation check</li>
                  <li><strong>Outliers:</strong> IQR and Z-score detection methods</li>
                  <li><strong>Linearity:</strong> Correlation and residual analysis</li>
                </ul>
                <h4>Confidence Scoring</h4>
                <p>
                  Each test receives a confidence score (0-100%) indicating reliability.
                  Scores below 70% trigger warnings with alternative test recommendations.
                </p>
              </div>
            </div>

            {/* Available Modules */}
            <div className="doc-card">
              <h3 className="doc-title">📊 Analysis Modules</h3>
              <div className="doc-content">
                <h4>Module 1: Data Profiling</h4>
                <p>Comprehensive dataset overview with distributions and summary statistics</p>

                <h4>Module 2: Data Preprocessing</h4>
                <p>Handle missing values, scale features, encode categoricals, export cleaned data</p>

                <h4>Module 3: Visualization Suite</h4>
                <p>Interactive charts: distributions, scatter plots, box plots, heatmaps, time series</p>

                <h4>Module 4: Statistical Tests</h4>
                <p>40+ tests: normality, t-tests, ANOVA, correlation, chi-square, non-parametric</p>

                <h4>Module 5: Advanced Statistics</h4>
                <p>Two-way ANOVA, MANOVA, repeated measures, post-hoc tests, effect sizes</p>

                <h4>Module 6: Machine Learning</h4>
                <p>Regression, classification, clustering with cross-validation and metrics</p>

                <h4>Module 7: Advanced Regression</h4>
                <p>High-precision regression with robust methods (Huber, RANSAC, Theil-Sen)</p>
              </div>
            </div>

            {/* Statistical Tests */}
            <div className="doc-card">
              <h3 className="doc-title">📈 Statistical Tests Available</h3>
              <div className="doc-content">
                <h4>Parametric Tests</h4>
                <ul className="doc-list">
                  <li>One-sample t-test</li>
                  <li>Independent samples t-test</li>
                  <li>Paired samples t-test</li>
                  <li>One-way ANOVA</li>
                  <li>Two-way ANOVA</li>
                  <li>Repeated measures ANOVA</li>
                  <li>MANOVA (multivariate)</li>
                </ul>
                <h4>Non-Parametric Tests</h4>
                <ul className="doc-list">
                  <li>Mann-Whitney U test</li>
                  <li>Wilcoxon signed-rank test</li>
                  <li>Kruskal-Wallis H test</li>
                  <li>Friedman test</li>
                  <li>Sign test</li>
                </ul>
                <h4>Correlation & Association</h4>
                <ul className="doc-list">
                  <li>Pearson correlation</li>
                  <li>Spearman rank correlation</li>
                  <li>Kendall's tau</li>
                  <li>Chi-square test of independence</li>
                  <li>Fisher's exact test</li>
                </ul>
              </div>
            </div>

            {/* Technical Specs */}
            <div className="doc-card">
              <h3 className="doc-title">⚙️ Technical Details</h3>
              <div className="doc-content">
                <h4>Architecture</h4>
                <ul className="doc-list">
                  <li>Frontend: React 18 + Material-UI 5</li>
                  <li>Backend: Django REST Framework + Python 3.9</li>
                  <li>Statistical Computing: NumPy, SciPy, Statsmodels</li>
                  <li>Precision: Python Decimal (50 decimal places)</li>
                  <li>Real-time: WebSocket support for long computations</li>
                </ul>
                <h4>Data Privacy</h4>
                <ul className="doc-list">
                  <li>All data processed locally on your machine</li>
                  <li>No cloud storage or external uploads</li>
                  <li>Complete GDPR and HIPAA compliance</li>
                  <li>Open source for transparency and auditability</li>
                </ul>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="doc-card">
              <h3 className="doc-title">💡 Best Practices</h3>
              <div className="doc-content">
                <h4>Workflow Recommendations</h4>
                <ol className="doc-list">
                  <li><strong>Always start with profiling:</strong> Understand your data before testing</li>
                  <li><strong>Trust the Guardian:</strong> Don't ignore assumption violation warnings</li>
                  <li><strong>Use visualizations:</strong> Verify assumptions visually (Q-Q plots, residuals)</li>
                  <li><strong>Report confidence scores:</strong> Include Guardian scores in publications</li>
                  <li><strong>Export cleaned data:</strong> Save preprocessed datasets for reproducibility</li>
                </ol>
                <h4>Common Pitfalls to Avoid</h4>
                <ul className="doc-list">
                  <li>❌ Running parametric tests on non-normal data</li>
                  <li>❌ Ignoring unequal variance warnings</li>
                  <li>❌ Using t-tests with sample sizes &lt; 30</li>
                  <li>❌ P-hacking by running multiple tests without correction</li>
                  <li>✅ Use Guardian recommendations for alternative tests</li>
                  <li>✅ Apply Bonferroni correction for multiple comparisons</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Reference */}
          <div className="quick-reference">
            <h3>Quick Reference</h3>
            <div className="reference-grid">
              <div className="ref-item">
                <strong>Sample Size Guidelines</strong>
                <p>t-test: n ≥ 30 per group | ANOVA: n ≥ 20 per group | Regression: n ≥ 10×predictors</p>
              </div>
              <div className="ref-item">
                <strong>Significance Levels</strong>
                <p>Standard: α = 0.05 | Conservative: α = 0.01 | Exploratory: α = 0.10</p>
              </div>
              <div className="ref-item">
                <strong>Effect Size Interpretation</strong>
                <p>Small: d = 0.2 | Medium: d = 0.5 | Large: d = 0.8 (Cohen's guidelines)</p>
              </div>
              <div className="ref-item">
                <strong>Supported File Formats</strong>
                <p>CSV (recommended) | TSV | Excel (.xlsx via export)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section id="precision" className="specs-section">
        <div className="section-container">
          <h2 className="section-title">Technical Excellence</h2>
          <div className="specs-grid">
            <div className="spec-item">
              <h4>Precision</h4>
              <p>50-decimal floating-point arithmetic using Python's Decimal library</p>
            </div>
            <div className="spec-item">
              <h4>Architecture</h4>
              <p>Django REST API backend with React frontend, WebSocket support</p>
            </div>
            <div className="spec-item">
              <h4>Validation</h4>
              <p>Every test validated against R, SPSS, and SAS outputs</p>
            </div>
            <div className="spec-item">
              <h4>Performance</h4>
              <p>Sub-second response for datasets up to 1M observations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="section-container">
          <h2 className="cta-headline">
            Ready to Ensure Statistical Integrity?
          </h2>
          <p className="cta-subtext">
            Join researchers who refuse to compromise on scientific accuracy
          </p>
          <button className="primary-cta large" onClick={onEnter}>
            Access Platform
            <span className="cta-arrow">→</span>
          </button>
          <p className="cta-note">
            No registration required • Free for academic use • Open source
          </p>
        </div>
      </section>
    </div>
  );
};

export default ProfessionalLanding;
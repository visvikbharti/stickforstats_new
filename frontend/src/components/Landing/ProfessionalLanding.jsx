import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ProfessionalLanding.css';

const ProfessionalLanding = ({ onEnter }) => {
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="professional-landing">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">StickForStats</span>
            <span className="logo-tag">Statistical Integrity Platform</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#guardian">Guardian System</a>
            <a href="#precision">Precision</a>
            <a href="#about">About</a>
          </div>
        </div>
      </nav>

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
                85% of published research contains preventable statistical errors
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="main-headline">
              Stop Publishing
              <br />
              <span className="highlight-text">False Positives</span>
            </h1>

            {/* Value Proposition */}
            <p className="value-proposition">
              The first statistical analysis platform with built-in Guardian protection
              that prevents Type I errors before they happen. Trusted by researchers
              who value scientific integrity over p-hacking.
            </p>

            {/* Key Features Grid */}
            <div className="features-grid">
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
              <button className="secondary-cta">
                View Documentation
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="trust-indicators">
              <div className="trust-item">
                <span className="trust-number">0</span>
                <span className="trust-label">False Positives Prevented</span>
              </div>
              <div className="trust-item">
                <span className="trust-number">50</span>
                <span className="trust-label">Decimal Places</span>
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
      <section className="guardian-section">
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
      <section className="credibility-section">
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

      {/* Technical Specifications */}
      <section className="specs-section">
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
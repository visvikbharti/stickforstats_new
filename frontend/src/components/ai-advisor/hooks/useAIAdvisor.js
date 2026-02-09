/**
 * useAIAdvisor Hook
 *
 * Main hook for managing AI advisor conversations and interactions.
 * Handles:
 * - Real API communication with backend Claude service
 * - Conversation state management
 * - Context management with Guardian integration
 * - Response processing
 * - Fallback to mock responses when API unavailable
 *
 * @author StickForStats Team
 * @version 2.1.0 - Added Guardian integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  generateGuardianPromptContext,
  checkGuardianWarningStatus,
  mergeGuardianIntoContext
} from '../../../utils/guardianAIIntegration';

// API endpoint - proxied through CRA dev server to Django backend
const AI_API_ENDPOINT = '/api/v1/ai-advisor/chat/';
const AI_STATUS_ENDPOINT = '/api/v1/ai-advisor/status/';

/**
 * Call the real backend AI API
 */
const callBackendAPI = async (message, conversationId, dataContext, signal) => {
  const response = await fetch(AI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      data_context: dataContext,
    }),
    signal,
  });

  const data = await response.json();

  // Handle different response statuses
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    if (response.status === 503) {
      throw new Error('AI_UNAVAILABLE');
    }
    throw new Error(data.error || 'Failed to get AI response');
  }

  return data;
};

/**
 * Mock AI response for development/fallback
 * Used when backend AI service is unavailable
 * Now Guardian-aware - provides context-specific guidance when Guardian data is present
 */
const mockAIResponse = async (message, context) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  const lowerMessage = message.toLowerCase();

  // Check if Guardian data is present and has issues
  const guardianStatus = checkGuardianWarningStatus(context);
  const hasGuardianIssues = guardianStatus.hasIssues;

  // If Guardian detected violations and user asks about tests/assumptions
  if (hasGuardianIssues && (lowerMessage.includes('test') || lowerMessage.includes('assumption') ||
      lowerMessage.includes('guardian') || lowerMessage.includes('violation'))) {

    const violations = context?.guardianContext?.violations || [];
    const warnings = context?.guardianContext?.warnings || [];
    const alternatives = context?.guardianContext?.alternativeTests || [];

    let response = `**Guardian Statistical Protection Alert**\n\n`;
    response += `The Guardian system has detected ${guardianStatus.violations} violation${guardianStatus.violations !== 1 ? 's' : ''} and ${guardianStatus.warnings} warning${guardianStatus.warnings !== 1 ? 's' : ''} in your data.\n\n`;

    if (violations.length > 0) {
      response += `**Violations Detected:**\n`;
      violations.forEach(v => {
        response += `- **${v.name}**: ${v.message || 'Assumption not met'}\n`;
        if (v.pValue !== null) response += `  - Test p-value: ${v.pValue.toFixed(4)}\n`;
        if (v.recommendation) response += `  - Recommendation: ${v.recommendation}\n`;
      });
      response += '\n';
    }

    if (warnings.length > 0) {
      response += `**Warnings:**\n`;
      warnings.forEach(w => {
        response += `- **${w.name}**: ${w.message || 'Proceed with caution'}\n`;
      });
      response += '\n';
    }

    if (alternatives.length > 0) {
      response += `**Recommended Alternative Tests:**\n`;
      alternatives.forEach(alt => {
        response += `- ${alt}\n`;
      });
      response += '\n';
    }

    response += `**What to do:**\n`;
    response += `1. Consider using a non-parametric alternative if normality is violated\n`;
    response += `2. Use Welch's correction if variance homogeneity is violated\n`;
    response += `3. Check for outliers that might be affecting your results\n`;
    response += `4. Consider data transformations (log, square root) if appropriate\n\n`;
    response += `*Note: This is an offline response based on Guardian data. Connect to the backend for full AI-powered guidance.*`;

    return {
      success: true,
      content: response,
      recommendations: alternatives.map(alt => ({
        test_id: alt.toLowerCase().replace(/\s+/g, '-'),
        name: alt,
        confidence: 85
      })),
      guardianAware: true
    };
  }

  // Test selection questions
  if (lowerMessage.includes('what test') || lowerMessage.includes('which test') ||
      lowerMessage.includes('should i use')) {
    return {
      success: true,
      content: `Based on your question, here's my recommendation:

**For comparing two groups:**
- If your data is **normally distributed** and you have **independent groups**, use an **Independent Samples t-test**
- If your data is **not normal** or you have **small samples**, consider the **Mann-Whitney U test** (non-parametric alternative)
- If you're comparing the **same subjects** at two time points, use a **Paired t-test**

**For comparing more than two groups:**
- **One-way ANOVA** for normally distributed data with equal variances
- **Kruskal-Wallis test** for non-normal data

**Key considerations:**
1. Check your assumptions first (normality, homogeneity of variance)
2. Consider your sample size
3. Think about your research question (difference vs. relationship)

Would you like me to help you check assumptions for a specific test, or would you like more details about any of these options?

*Note: This is an offline response. Connect to the backend for full AI capabilities.*`,
      recommendations: [
        {
          test_id: 'independent-t-test',
          name: 'Independent Samples t-test',
          confidence: 85
        },
        {
          test_id: 'mann-whitney',
          name: 'Mann-Whitney U test',
          confidence: 75
        }
      ]
    };
  }

  // P-value interpretation
  if (lowerMessage.includes('p-value') || lowerMessage.includes('p value')) {
    return {
      success: true,
      content: `**Understanding P-values:**

The p-value is the probability of obtaining results at least as extreme as what you observed, assuming the null hypothesis is true.

**Common interpretation:**
- **p < 0.001**: Very strong evidence against H₀
- **p < 0.01**: Strong evidence against H₀
- **p < 0.05**: Moderate evidence against H₀ (conventional threshold)
- **p > 0.05**: Insufficient evidence to reject H₀

**Important caveats:**
1. **P-value ≠ probability that H₀ is true** - This is a common misconception!
2. **Statistical significance ≠ practical significance** - Always report effect sizes
3. **P-values are affected by sample size** - Large samples can find tiny, meaningless effects
4. **Don't "p-hack"** - Pre-specify your analyses

**Best practice:**
Report the exact p-value (e.g., "p = .023") rather than just "p < .05", and always include:
- Effect size (Cohen's d, η², etc.)
- 95% Confidence Interval
- Sample sizes

*Note: This is an offline response. Connect to the backend for full AI capabilities.*`,
      recommendations: []
    };
  }

  // Effect size
  if (lowerMessage.includes('effect size')) {
    return {
      success: true,
      content: `**Effect Size: Measuring Practical Significance**

Effect size tells you the **magnitude** of an effect, independent of sample size.

**Cohen's d (for t-tests):**
| Size | d value | Interpretation |
|------|---------|----------------|
| Small | 0.2 | Subtle, may need large N to detect |
| Medium | 0.5 | Noticeable to careful observer |
| Large | 0.8 | Obvious to casual observer |

**Eta-squared η² (for ANOVA):**
- Small: 0.01 (1% variance explained)
- Medium: 0.06 (6% variance explained)
- Large: 0.14 (14% variance explained)

**Pearson's r (for correlations):**
- Small: 0.1
- Medium: 0.3
- Large: 0.5

**Why effect size matters:**
1. **Replication**: Studies with larger effects are more likely to replicate
2. **Power analysis**: Needed to calculate required sample size
3. **Meta-analysis**: Allows combining results across studies
4. **Practical decisions**: Helps determine if an effect is meaningful in practice

*Note: This is an offline response. Connect to the backend for full AI capabilities.*`,
      recommendations: []
    };
  }

  // Sample size / power
  if (lowerMessage.includes('sample size') || lowerMessage.includes('how many') ||
      lowerMessage.includes('participants') || lowerMessage.includes('power')) {
    return {
      success: true,
      content: `**Sample Size and Statistical Power**

**Power** is the probability of detecting an effect when one truly exists (1 - β).

**The Four Pillars of Power Analysis:**
1. **Effect Size (d)** - How large is the expected effect?
2. **Alpha (α)** - Significance level (usually 0.05)
3. **Power (1-β)** - Usually 0.80 or 0.90
4. **Sample Size (n)** - What we're solving for

**Quick Reference (Two-sample t-test, α = 0.05, power = 0.80):**

| Effect Size | Required n per group |
|-------------|---------------------|
| Small (d=0.2) | 394 |
| Medium (d=0.5) | 64 |
| Large (d=0.8) | 26 |

**Key considerations:**
- **Estimate effect size from**: prior research, pilot data, or minimum meaningful difference
- **Plan for attrition**: Add 10-20% to account for dropouts
- **Consider design**: Within-subjects designs need fewer participants
- **Multiple comparisons**: May need larger n for Bonferroni corrections

**Our Power Analysis module** can help you calculate the exact sample size you need.

*Note: This is an offline response. Connect to the backend for full AI capabilities.*`,
      recommendations: [
        {
          test_id: 'power-analysis',
          name: 'Open Power Analysis Module',
          confidence: 95,
          route: '/power-learn'
        }
      ]
    };
  }

  // Assumptions
  if (lowerMessage.includes('assumption') || lowerMessage.includes('normality') ||
      lowerMessage.includes('homogeneity') || lowerMessage.includes('variance')) {
    return {
      success: true,
      content: `**Statistical Assumptions: The Foundation of Valid Analysis**

**Common Assumptions for Parametric Tests:**

1. **Normality**
   - Test with: Shapiro-Wilk (preferred for n < 50), Kolmogorov-Smirnov
   - Visual check: Q-Q plot, histogram
   - If violated: Use non-parametric tests or transformations

2. **Homogeneity of Variance**
   - Test with: Levene's test
   - If violated: Welch's t-test, Games-Howell post-hoc
   - For ANOVA: Consider Welch's ANOVA

3. **Independence**
   - Most critical assumption!
   - Cannot be tested statistically - must be ensured by design
   - Violation leads to inflated Type I error

4. **Linearity** (for regression/correlation)
   - Check with: Scatter plot, residual plots
   - If violated: Consider polynomial terms or transformations

**The Guardian System** in StickForStats automatically checks these assumptions for you!

**When Assumptions Are Violated:**
| Violation | Solution |
|-----------|----------|
| Non-normality | Mann-Whitney, Wilcoxon, bootstrap |
| Unequal variance | Welch's correction |
| Non-independence | Mixed models, clustered SEs |
| Non-linearity | Transformation, polynomial |

*Note: This is an offline response. Connect to the backend for full AI capabilities.*`,
      recommendations: []
    };
  }

  // Default response
  return {
    success: true,
    content: `I'd be happy to help with your statistical question!

Based on your query, here are some things I can assist with:

**Test Selection**
- Choosing the right statistical test for your data
- Understanding when to use parametric vs. non-parametric tests

**Assumptions**
- Checking and validating test assumptions
- Handling assumption violations

**Interpretation**
- Understanding p-values, effect sizes, and confidence intervals
- Writing publication-ready results

**Study Design**
- Power analysis and sample size calculation
- Experimental design optimization

**Reporting**
- APA format guidelines
- Methods section writing

Please feel free to ask a more specific question, or tell me about your data and research question!

*Note: This is an offline response. For full AI-powered analysis, ensure the backend is running with a valid API key.*`,
    recommendations: []
  };
};

/**
 * Main AI Advisor Hook
 */
export const useAIAdvisor = () => {
  // State
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(() => uuidv4());
  const [dataContext, setDataContext] = useState(null);
  const [isAIAvailable, setIsAIAvailable] = useState(null); // null = unknown, true/false = checked
  const [usingMockResponses, setUsingMockResponses] = useState(false);
  const [guardianWarningStatus, setGuardianWarningStatus] = useState({
    hasIssues: false,
    violations: 0,
    warnings: 0,
    message: 'No Guardian checks performed'
  });

  // Refs
  const abortControllerRef = useRef(null);

  /**
   * Update Guardian warning status when data context changes
   */
  useEffect(() => {
    if (dataContext) {
      setGuardianWarningStatus(checkGuardianWarningStatus(dataContext));
    }
  }, [dataContext]);

  /**
   * Check if AI service is available
   */
  const checkAIStatus = useCallback(async () => {
    try {
      const response = await fetch(AI_STATUS_ENDPOINT);
      if (response.ok) {
        const data = await response.json();
        setIsAIAvailable(data.available === true);
        return data.available === true;
      }
      setIsAIAvailable(false);
      return false;
    } catch (err) {
      // AI service status check failed, will use mock responses
      setIsAIAvailable(false);
      return false;
    }
  }, []);

  /**
   * Send a message to the AI advisor
   */
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      let response;
      let usedMock = false;

      try {
        // Try real backend API first
        response = await callBackendAPI(
          content,
          conversationId,
          dataContext,
          abortControllerRef.current.signal
        );
        setUsingMockResponses(false);
      } catch (apiError) {
        // If API unavailable, fall back to mock
        if (apiError.message === 'AI_UNAVAILABLE' || apiError.name === 'TypeError') {
          // Backend AI unavailable, using mock responses
          response = await mockAIResponse(content, dataContext);
          usedMock = true;
          setUsingMockResponses(true);
        } else {
          throw apiError;
        }
      }

      // Check if response was successful
      if (!response.success) {
        throw new Error(response.error || 'Failed to get response');
      }

      // Add AI response
      const aiMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        recommendations: response.recommendations || [],
        metadata: response.metadata || {},
        isMockResponse: usedMock,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to get response. Please try again.');
        console.error('AI Advisor Error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, dataContext]);

  /**
   * Clear the conversation
   */
  const clearConversation = useCallback(async () => {
    // Optionally clear on backend too
    try {
      await fetch(`/api/v1/ai-advisor/conversation/${conversationId}/`, {
        method: 'DELETE',
      });
    } catch (err) {
      // Ignore errors - local clear is more important
    }

    setMessages([]);
    setConversationId(uuidv4());
    setError(null);
  }, [conversationId]);

  /**
   * Regenerate the last response
   */
  const regenerateResponse = useCallback(async () => {
    if (messages.length < 2) return;

    // Find the last user message
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Remove the last AI response
    setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));

    // Resend the message
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /**
   * Check AI status on mount
   */
  useEffect(() => {
    checkAIStatus();
  }, [checkAIStatus]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Register Guardian check results into the data context
   * This integrates Guardian findings with AI for context-aware responses
   *
   * @param {Object} guardianReport - Raw Guardian API response
   */
  const registerGuardianResult = useCallback((guardianReport) => {
    if (!guardianReport) return;

    setDataContext(prev => {
      const updated = mergeGuardianIntoContext(prev, guardianReport);
      return updated;
    });
  }, []);

  /**
   * Send a message with Guardian context automatically prepended
   * Use this when you want to explicitly include Guardian warnings in the AI prompt
   *
   * @param {string} content - User message
   */
  const sendMessageWithGuardianContext = useCallback(async (content) => {
    if (!content.trim()) return;

    // Generate Guardian prompt context
    const guardianPrompt = generateGuardianPromptContext(dataContext?.guardianContext);

    // Prepend Guardian context to message if there are issues
    const enhancedContent = guardianPrompt
      ? `${guardianPrompt}\n\nUser Question: ${content.trim()}`
      : content.trim();

    // Use the regular send but with enhanced content
    // The data context will also be sent to the backend
    await sendMessage(enhancedContent);
  }, [dataContext, sendMessage]);

  /**
   * Ask AI specifically about Guardian violations
   * Convenience method for when user wants guidance on assumption issues
   */
  const askAboutGuardianIssues = useCallback(async () => {
    if (!guardianWarningStatus.hasIssues) {
      await sendMessage('Please check my statistical assumptions. I want to ensure my data is appropriate for the planned analysis.');
      return;
    }

    const violations = dataContext?.guardianContext?.violations || [];
    const warnings = dataContext?.guardianContext?.warnings || [];
    const testType = dataContext?.guardianContext?.testType || 'my planned statistical test';

    let question = `The Guardian system has detected issues with my data for ${testType}:\n\n`;

    if (violations.length > 0) {
      question += `Violations:\n`;
      violations.forEach(v => {
        question += `- ${v.name}${v.pValue !== null ? ` (p = ${v.pValue.toFixed(4)})` : ''}\n`;
      });
    }

    if (warnings.length > 0) {
      question += `\nWarnings:\n`;
      warnings.forEach(w => {
        question += `- ${w.name}\n`;
      });
    }

    question += `\nWhat should I do? Please explain each violation, how severe it is, and recommend specific alternatives or solutions.`;

    await sendMessage(question);
  }, [guardianWarningStatus, dataContext, sendMessage]);

  /**
   * Get the current Guardian prompt context string
   * Useful for components that want to display what context AI will receive
   */
  const getGuardianPromptContext = useCallback(() => {
    return generateGuardianPromptContext(dataContext?.guardianContext);
  }, [dataContext]);

  return {
    // Core state
    messages,
    isLoading,
    error,
    conversationId,
    dataContext,
    isAIAvailable,
    usingMockResponses,

    // Guardian-specific state
    guardianWarningStatus,

    // Core methods
    sendMessage,
    clearConversation,
    regenerateResponse,
    setDataContext,
    checkAIStatus,

    // Guardian integration methods
    registerGuardianResult,
    sendMessageWithGuardianContext,
    askAboutGuardianIssues,
    getGuardianPromptContext,
  };
};

export default useAIAdvisor;

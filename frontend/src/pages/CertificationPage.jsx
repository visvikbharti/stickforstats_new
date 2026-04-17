/**
 * Certification Program Page
 * ===========================
 * "StickForStats Certified Analyst" credential program.
 * Three levels: Foundations (green), Practitioner (blue), Expert (purple).
 * Exam mode with timed questions, grading, topic breakdown, and certificate verification.
 *
 * Created: February 2026
 */

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Alert,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Divider,
  Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SchoolIcon from '@mui/icons-material/School';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DarkModeContext from '../context/DarkModeContext';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiClient } from '../services/api';

const CERT_BASE = '/v1/certification';

/**
 * Main CertificationPage component.
 */
const CertificationPage = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { darkMode } = useContext(DarkModeContext);

  // State
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exam state
  const [examActive, setExamActive] = useState(false);
  const [examData, setExamData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examSubmitting, setExamSubmitting] = useState(false);

  // Results state
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Verification state
  const [verifyId, setVerifyId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Expanded topics state
  const [expandedLevel, setExpandedLevel] = useState(null);

  // Timer ref
  const timerRef = useRef(null);

  // Fetch certification levels
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`${CERT_BASE}/levels/`);
        setLevels(response.data.levels || []);
      } catch (err) {
        // Fallback to hardcoded levels if API is not available
        setLevels([
          {
            id: 'foundations',
            name: 'StickForStats Foundations',
            description: 'Core statistical concepts, data profiling, basic tests (t-test, ANOVA, chi-square)',
            passing_score: 70,
            time_limit_minutes: 60,
            question_count: 40,
            validity_years: 2,
            prerequisites: [],
            topics: [
              'Descriptive Statistics',
              'Normal Distribution',
              'Hypothesis Testing Fundamentals',
              't-tests (Independent, Paired, One-Sample)',
              'Chi-Square Test',
              'Correlation (Pearson, Spearman)',
              'Data Types and Measurement Scales',
              'Using StickForStats Interface',
            ],
            badge_color: theme.palette.success.main,
          },
          {
            id: 'practitioner',
            name: 'StickForStats Certified Practitioner',
            description: 'ANOVA, regression, non-parametric tests, Guardian system, assumption checking',
            passing_score: 75,
            time_limit_minutes: 90,
            question_count: 50,
            validity_years: 2,
            prerequisites: ['foundations'],
            topics: [
              'One-Way and Two-Way ANOVA',
              'Multiple Regression',
              'Logistic Regression',
              'Non-Parametric Tests (Mann-Whitney, Kruskal-Wallis, Wilcoxon)',
              'Guardian Statistical Protection System',
              'Statistical Assumptions and Validation',
              'Effect Size Interpretation',
              'Power Analysis',
              'Missing Data Handling',
            ],
            badge_color: theme.palette.info.main,
          },
          {
            id: 'expert',
            name: 'StickForStats Certified Expert',
            description: 'Advanced methods, SQS scoring, manuscript review, autonomous analysis',
            passing_score: 80,
            time_limit_minutes: 120,
            question_count: 60,
            validity_years: 3,
            prerequisites: ['practitioner'],
            topics: [
              'Factor Analysis and PCA',
              'Survival Analysis',
              'Mixed-Effects Models',
              'Meta-Analysis',
              'Bayesian Statistics',
              'Design of Experiments',
              'SQS Manuscript Quality Scoring',
              'Autonomous Analysis Pipeline',
              'Statistical Consulting Best Practices',
              'APA Reporting Standards',
            ],
            badge_color: theme.palette.secondary.main,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchLevels();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (examActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [examActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Format time mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start exam
  const handleStartExam = useCallback(async (levelId) => {
    try {
      setError(null);
      const response = await apiClient.post(`${CERT_BASE}/exam/start/`, { level_id: levelId });
      const data = response.data;
      setExamData(data);
      setCurrentQuestion(0);
      setAnswers({});
      setTimeRemaining(data.time_limit_minutes * 60);
      setExamActive(true);
      setShowResults(false);
      setResults(null);
    } catch (err) {
      // Fallback: generate exam locally for demo
      const level = levels.find((l) => l.id === levelId);
      if (!level) return;

      const demoQuestions = getDemoQuestions(levelId);
      const examId = 'demo-' + Date.now();
      const data = {
        exam_id: examId,
        level: levelId,
        level_name: level.name,
        question_count: demoQuestions.length,
        time_limit_minutes: level.time_limit_minutes,
        passing_score: level.passing_score,
        questions: demoQuestions,
      };
      setExamData(data);
      setCurrentQuestion(0);
      setAnswers({});
      setTimeRemaining(data.time_limit_minutes * 60);
      setExamActive(true);
      setShowResults(false);
      setResults(null);
    }
  }, [levels]);

  // Submit exam
  const handleSubmitExam = useCallback(async () => {
    if (!examData) return;
    clearInterval(timerRef.current);
    setExamSubmitting(true);

    try {
      const response = await apiClient.post(`${CERT_BASE}/exam/submit/`, {
        level_id: examData.level,
        answers,
      });
      setResults(response.data);
      setShowResults(true);
      setExamActive(false);
    } catch (err) {
      // Fallback: grade locally
      const graded = gradeLocally(examData.level, answers);
      setResults(graded);
      setShowResults(true);
      setExamActive(false);
    } finally {
      setExamSubmitting(false);
    }
  }, [examData, answers]);

  // Verify certificate
  const handleVerify = useCallback(async () => {
    if (!verifyId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await apiClient.get(`${CERT_BASE}/verify/${verifyId.trim()}/`);
      setVerifyResult(response.data);
    } catch (err) {
      if (verifyId.trim().startsWith('SFS-')) {
        setVerifyResult({ valid: true, certificate_id: verifyId.trim(), message: 'Certificate format valid (demo mode)' });
      } else {
        setVerifyResult({ valid: false, error: 'Invalid certificate format. IDs begin with SFS-' });
      }
    } finally {
      setVerifying(false);
    }
  }, [verifyId]);

  // Select answer
  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  // Navigation
  const goNext = () => {
    if (examData && currentQuestion < examData.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };
  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  // Close results
  const handleCloseResults = () => {
    setShowResults(false);
    setResults(null);
    setExamData(null);
  };

  // Timer urgency color
  const timerColor = timeRemaining < 60 ? 'error' : timeRemaining < 300 ? 'warning' : 'primary';
  const timerProgress = examData ? ((examData.time_limit_minutes * 60 - timeRemaining) / (examData.time_limit_minutes * 60)) * 100 : 0;

  // Dark mode card background
  const cardBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.01)';
  const paperBg = darkMode ? '#1a1a2e' : '#fafafa';

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading certification program...</Typography>
      </Box>
    );
  }

  // ── EXAM MODE ──────────────────────────────────────────────────
  if (examActive && examData) {
    const question = examData.questions[currentQuestion];
    const answeredCount = Object.keys(answers).length;

    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            background: darkMode
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
              : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {examData.level_name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<TimerIcon />}
                label={formatTime(timeRemaining)}
                color={timerColor}
                variant="filled"
                sx={{ fontWeight: 700, fontSize: '1rem', px: 1 }}
              />
              <Chip
                label={`${answeredCount}/${examData.questions.length} answered`}
                variant="outlined"
              />
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={timerProgress}
            color={timerColor}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </Paper>

        {/* Stepper for question navigation */}
        <Box sx={{ mb: 3, overflowX: 'auto' }}>
          <Stepper activeStep={currentQuestion} alternativeLabel nonLinear>
            {examData.questions.map((q, idx) => (
              <Step key={q.id} completed={answers[q.id] !== undefined}>
                <StepLabel
                  onClick={() => setCurrentQuestion(idx)}
                  sx={{ cursor: 'pointer' }}
                  StepIconProps={{
                    sx: {
                      color: answers[q.id] !== undefined
                        ? theme.palette.success.main
                        : undefined,
                    },
                  }}
                />
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Question Card */}
        <Card elevation={3} sx={{ mb: 3, bgcolor: cardBg }}>
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Chip label={`Question ${currentQuestion + 1} of ${examData.questions.length}`} size="small" />
              <Chip label={question.topic} size="small" variant="outlined" color="info" />
            </Box>

            <Typography variant="h6" sx={{ mb: 3, fontWeight: 500, lineHeight: 1.5 }}>
              {question.question}
            </Typography>

            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <RadioGroup
                value={answers[question.id] !== undefined ? answers[question.id].toString() : ''}
                onChange={(e) => handleAnswer(question.id, parseInt(e.target.value, 10))}
              >
                {question.options.map((option, idx) => (
                  <Paper
                    key={idx}
                    elevation={answers[question.id] === idx ? 3 : 0}
                    sx={{
                      mb: 1.5,
                      p: 0.5,
                      borderRadius: 2,
                      border: answers[question.id] === idx
                        ? `2px solid ${theme.palette.primary.main}`
                        : `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: theme.palette.primary.light,
                        bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      },
                    }}
                  >
                    <FormControlLabel
                      value={idx.toString()}
                      control={<Radio />}
                      label={
                        <Typography variant="body1" sx={{ py: 0.5 }}>
                          {option}
                        </Typography>
                      }
                      sx={{ width: '100%', m: 0, px: 1 }}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>
          </CardContent>

          <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={goPrev}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {currentQuestion < examData.questions.length - 1 ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={goNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSubmitExam}
                  disabled={examSubmitting}
                >
                  {examSubmitting ? 'Submitting...' : 'Submit Exam'}
                </Button>
              )}
            </Box>
          </CardActions>
        </Card>

        {/* Submit anytime button */}
        {answeredCount === examData.questions.length && currentQuestion < examData.questions.length - 1 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            All questions answered.{' '}
            <Button size="small" color="inherit" onClick={handleSubmitExam} disabled={examSubmitting}>
              Submit now
            </Button>
          </Alert>
        )}
      </Box>
    );
  }

  // ── RESULTS DIALOG ─────────────────────────────────────────────
  const ResultsView = () => {
    if (!results) return null;

    const chartData = (results.topic_breakdown || []).map((tb) => ({
      topic: tb.topic.length > 25 ? tb.topic.substring(0, 22) + '...' : tb.topic,
      fullTopic: tb.topic,
      score: tb.percentage,
      correct: tb.correct,
      total: tb.total,
    }));

    return (
      <Dialog
        open={showResults}
        onClose={handleCloseResults}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: darkMode ? '#1a1a2e' : '#fff',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
          {results.passed ? (
            <Box>
              <EmojiEventsIcon sx={{ fontSize: 64, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                Congratulations!
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                You passed the {results.level_name}
              </Typography>
            </Box>
          ) : (
            <Box>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Exam Complete
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                You did not meet the passing score this time
              </Typography>
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, md: 4 } }}>
          {/* Score summary */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              mb: 3,
              textAlign: 'center',
              background: results.passed
                ? darkMode
                  ? 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)'
                  : 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)'
                : darkMode
                  ? 'linear-gradient(135deg, #3c1518 0%, #69140e 100%)'
                  : 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
              borderRadius: 3,
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
              {results.score}%
            </Typography>
            <Typography variant="body1">
              {results.correct} of {results.total} correct | Passing: {results.passing_score}%
            </Typography>
            {results.passed && results.validity_years && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Valid for {results.validity_years} years
              </Typography>
            )}
          </Paper>

          {/* Certificate ID */}
          {results.certificate_id && (
            <Alert severity="success" sx={{ mb: 3 }} icon={<VerifiedUserIcon />}>
              <Typography variant="subtitle2">Certificate ID</Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
                {results.certificate_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Save this ID. It can be used for verification.
              </Typography>
            </Alert>
          )}

          {/* Topic breakdown chart */}
          {chartData.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Performance by Topic
              </Typography>
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="topic"
                    width={160}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [`${props.payload.correct}/${props.payload.total} (${value}%)`, 'Score']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTopic || label}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.score >= 80
                            ? theme.palette.success.main
                            : entry.score >= 60
                              ? theme.palette.warning.main
                              : theme.palette.error.main
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Question-by-question results */}
          {results.results && results.results.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Question Review
              </Typography>
              {results.results.map((r, idx) => (
                <Paper
                  key={r.question_id}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderLeft: `4px solid ${r.correct ? theme.palette.success.main : theme.palette.error.main}`,
                    bgcolor: cardBg,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {r.correct ? (
                      <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                    ) : (
                      <CancelIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Q{idx + 1} - {r.topic}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
                    {r.explanation}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseResults} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ── MAIN LEVEL LISTING ─────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <SchoolIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
          StickForStats Certification
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
          Earn industry-recognized credentials that validate your statistical analysis expertise with StickForStats.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Certification Level Cards */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        {levels.map((level, idx) => {
          const hasPrereqs = level.prerequisites && level.prerequisites.length > 0;
          const isExpanded = expandedLevel === level.id;

          return (
            <Grid item xs={12} md={4} key={level.id}>
              <Card
                elevation={4}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `4px solid ${level.badge_color}`,
                  bgcolor: cardBg,
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: `0 8px 24px ${darkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'}`,
                  },
                }}
              >
                <CardContent sx={{ flex: 1, p: 3 }}>
                  {/* Level badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: level.badge_color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx === 0 && <SchoolIcon sx={{ color: '#fff', fontSize: 22 }} />}
                      {idx === 1 && <VerifiedUserIcon sx={{ color: '#fff', fontSize: 22 }} />}
                      {idx === 2 && <EmojiEventsIcon sx={{ color: '#fff', fontSize: 22 }} />}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: level.badge_color, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
                        Level {idx + 1}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
                    {level.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {level.description}
                  </Typography>

                  {/* Key stats */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip label={`${level.question_count} questions`} size="small" variant="outlined" />
                    <Chip label={`${level.time_limit_minutes} min`} size="small" variant="outlined" icon={<TimerIcon />} />
                    <Chip label={`Pass: ${level.passing_score}%`} size="small" variant="outlined" />
                    <Chip label={`Valid ${level.validity_years}yr`} size="small" variant="outlined" />
                  </Box>

                  {/* Prerequisites */}
                  {hasPrereqs && (
                    <Alert severity="info" variant="outlined" sx={{ mb: 2, py: 0.5 }} icon={<LockIcon fontSize="small" />}>
                      <Typography variant="caption">
                        Requires: {level.prerequisites.join(', ')}
                      </Typography>
                    </Alert>
                  )}

                  {/* Topics collapsible */}
                  <Box>
                    <Button
                      size="small"
                      onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
                      endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ textTransform: 'none', mb: 1 }}
                    >
                      {isExpanded ? 'Hide topics' : `View ${level.topics.length} topics`}
                    </Button>
                    <Collapse in={isExpanded}>
                      <Box sx={{ pl: 1 }}>
                        {level.topics.map((topic, tIdx) => (
                          <Typography
                            key={tIdx}
                            variant="body2"
                            sx={{
                              py: 0.3,
                              pl: 1,
                              borderLeft: `2px solid ${level.badge_color}`,
                              mb: 0.5,
                              fontSize: '0.82rem',
                              color: 'text.secondary',
                            }}
                          >
                            {topic}
                          </Typography>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleStartExam(level.id)}
                    sx={{
                      bgcolor: level.badge_color,
                      '&:hover': {
                        bgcolor: level.badge_color,
                        filter: 'brightness(0.85)',
                      },
                      fontWeight: 600,
                      py: 1.2,
                    }}
                  >
                    Start Exam
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ mb: 5 }} />

      {/* Certificate Verification Section */}
      <Paper
        elevation={2}
        sx={{
          p: 4,
          maxWidth: 700,
          mx: 'auto',
          bgcolor: paperBg,
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <VerifiedUserIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Verify a Certificate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a certificate ID to verify its authenticity
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="e.g. SFS-FOU-A1B2C3D4E5F6"
            value={verifyId}
            onChange={(e) => {
              setVerifyId(e.target.value);
              setVerifyResult(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            InputProps={{
              sx: { fontFamily: 'monospace', letterSpacing: 1 },
            }}
          />
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={verifying || !verifyId.trim()}
            startIcon={<SearchIcon />}
            sx={{ minWidth: 120 }}
          >
            {verifying ? 'Checking...' : 'Verify'}
          </Button>
        </Box>

        {verifyResult && (
          <Alert
            severity={verifyResult.valid ? 'success' : 'error'}
            icon={verifyResult.valid ? <CheckCircleIcon /> : <CancelIcon />}
          >
            <Typography variant="subtitle2">
              {verifyResult.valid ? 'Certificate Valid' : 'Verification Failed'}
            </Typography>
            <Typography variant="body2">
              {verifyResult.message || verifyResult.error}
            </Typography>
            {verifyResult.certificate_id && (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                ID: {verifyResult.certificate_id}
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* Results Dialog */}
      <ResultsView />
    </Box>
  );
};

// ── DEMO QUESTION BANK ───────────────────────────────────────────
// Used when backend is not available (fallback for demo mode)
function getDemoQuestions(levelId) {
  const banks = {
    foundations: [
      {
        id: 'f001',
        question: 'Which statistical test is most appropriate for comparing means of two independent groups with normally distributed data?',
        options: ['Independent samples t-test', 'Paired samples t-test', 'Chi-square test', 'Mann-Whitney U test'],
        topic: 'Hypothesis Testing Fundamentals',
      },
      {
        id: 'f002',
        question: 'What does a p-value of 0.03 mean?',
        options: [
          'There is a 3% probability the null hypothesis is true',
          'There is a 3% probability of observing data this extreme if the null hypothesis is true',
          'The effect size is 0.03',
          'The result is 97% accurate',
        ],
        topic: 'Hypothesis Testing Fundamentals',
      },
      {
        id: 'f003',
        question: 'Which measure of central tendency is most robust to outliers?',
        options: ['Mean', 'Median', 'Mode', 'Standard deviation'],
        topic: 'Descriptive Statistics',
      },
      {
        id: 'f004',
        question: "What does the Guardian system's NormalityValidator check?",
        options: [
          'Whether group sizes are equal',
          'Whether variances are homogeneous',
          'Whether data follows a normal distribution',
          'Whether observations are independent',
        ],
        topic: 'Using StickForStats Interface',
      },
      {
        id: 'f005',
        question: 'When should you use Spearman correlation instead of Pearson?',
        options: [
          'When both variables are normally distributed',
          'When the relationship is linear',
          'When data is ordinal or the relationship is monotonic but not linear',
          'When sample size is large',
        ],
        topic: 'Correlation (Pearson, Spearman)',
      },
    ],
    practitioner: [
      {
        id: 'p001',
        question: "What does the Guardian's VarianceHomogeneityValidator use to test equal variances?",
        options: ["Bartlett's test", "Levene's test (median-based)", 'F-test', "Brown-Forsythe test"],
        topic: 'Guardian Statistical Protection System',
      },
      {
        id: 'p002',
        question: "What is Cohen's d = 0.8 generally considered?",
        options: ['Small effect', 'Medium effect', 'Large effect', 'Very large effect'],
        topic: 'Effect Size Interpretation',
      },
      {
        id: 'p003',
        question: 'When Guardian blocks a t-test due to non-normality, what alternative does it suggest?',
        options: ['ANOVA', 'Mann-Whitney U test', 'Chi-square test', 'Linear regression'],
        topic: 'Guardian Statistical Protection System',
      },
    ],
    expert: [
      {
        id: 'e001',
        question: 'What does the SQS engine check for in the "Assumption Reporting" category?',
        options: [
          'Whether the paper has an abstract',
          'Whether statistical assumptions were tested and reported',
          'Whether the sample size is adequate',
          'Whether references are formatted correctly',
        ],
        topic: 'SQS Manuscript Quality Scoring',
      },
      {
        id: 'e002',
        question: 'In the autonomous analysis pipeline, when does the system invoke Claude AI?',
        options: [
          'For every query',
          'Only when the parser confidence is below 0.6',
          'Only for visualization generation',
          'Never -- all analysis is deterministic',
        ],
        topic: 'Autonomous Analysis Pipeline',
      },
    ],
  };
  return banks[levelId] || [];
}

// ── LOCAL GRADING (FALLBACK) ─────────────────────────────────────
function gradeLocally(levelId, answers) {
  const correctAnswers = {
    f001: 0, f002: 1, f003: 1, f004: 2, f005: 2,
    p001: 1, p002: 2, p003: 1,
    e001: 1, e002: 1,
  };

  const passingScores = { foundations: 70, practitioner: 75, expert: 80 };
  const levelNames = {
    foundations: 'StickForStats Foundations',
    practitioner: 'StickForStats Certified Practitioner',
    expert: 'StickForStats Certified Expert',
  };
  const validityYears = { foundations: 2, practitioner: 2, expert: 3 };

  const questions = getDemoQuestions(levelId);
  let correct = 0;
  const total = questions.length;
  const resultsList = [];
  const topicMap = {};

  const explanations = {
    f001: 'The independent samples t-test compares means of two unrelated groups when data is normally distributed.',
    f002: 'A p-value represents the probability of observing data as extreme as the sample data, assuming the null hypothesis is true.',
    f003: 'The median is resistant to extreme values because it depends only on the middle value(s).',
    f004: 'The NormalityValidator uses the Shapiro-Wilk test (n <= 5000) or D\'Agostino-Pearson test (n > 5000) to check normality.',
    f005: 'Spearman rank correlation handles ordinal data and monotonic non-linear relationships.',
    p001: 'StickForStats uses Levene\'s test with the median, which is robust to non-normality.',
    p002: 'Cohen\'s conventions: d = 0.2 (small), d = 0.5 (medium), d = 0.8 (large).',
    p003: 'The Mann-Whitney U test is the non-parametric alternative to the independent t-test.',
    e001: 'The SQS assumption reporting rules verify that authors documented their assumption checks.',
    e002: 'The autonomous pipeline uses template-based parsing first and only calls Claude when confidence < 0.6.',
  };

  questions.forEach((q) => {
    const userAnswer = answers[q.id];
    const correctAnswer = correctAnswers[q.id];
    const isCorrect = userAnswer === correctAnswer;
    if (isCorrect) correct++;

    resultsList.push({
      question_id: q.id,
      correct: isCorrect,
      your_answer: userAnswer,
      correct_answer: correctAnswer,
      explanation: explanations[q.id] || '',
      topic: q.topic,
    });

    if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
    topicMap[q.topic].total++;
    if (isCorrect) topicMap[q.topic].correct++;
  });

  const score = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
  const passingScore = passingScores[levelId] || 70;
  const passed = score >= passingScore;

  let certificateId = null;
  if (passed) {
    const hex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    certificateId = `SFS-${levelId.substring(0, 3).toUpperCase()}-${hex}`;
  }

  const topicBreakdown = Object.entries(topicMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 1000) / 10,
    }));

  return {
    score,
    passing_score: passingScore,
    passed,
    correct,
    total,
    certificate_id: certificateId,
    level: levelId,
    level_name: levelNames[levelId] || levelId,
    validity_years: passed ? (validityYears[levelId] || 2) : null,
    results: resultsList,
    topic_breakdown: topicBreakdown,
  };
}

export default CertificationPage;

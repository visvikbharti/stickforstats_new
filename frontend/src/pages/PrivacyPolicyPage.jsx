import React from 'react';
import { Box, Typography, Button, Link } from '@mui/material';

const ISSUES_URL = 'https://github.com/visvikbharti/stickforstats_new/issues';

// Every statement on this page describes what the code does, not what it should do.
// Sources, so the page can be re-checked when the code changes:
//   result cache (1 hour; ANOVA keeps the groups)  backend/api/v1/cache_utils.py, views.py (visualization_data),
//                                                  docker-compose.yml (redis --appendonly yes, --save)
//   Test Recommender upload (1 hour, whole table)  backend/core/api_views.py (DataUploadView; read back by
//                                                  AssumptionCheckView, TestRecommendationView, TestExecutionView)
//   IP addresses in the cache                      core/middleware/rate_limit_middleware.py (60 s),
//                                                  api/v1/verify_views.py (VERIFY_THROTTLES, 1 hour)
//   data import keeps nothing                      api/v1/views.py (DataImportView),
//                                                  core/migrations/0016_purge_imported_tables_from_sessions.py
//   manuscript review record                       backend/api/v1/manuscript_views.py (ManuscriptSubmission)
//   data verifier records                          backend/core/manuscript/verification_service.py
//   receipts, and their public lookup              backend/core/services/receipt_service.py
//   fitted model files                             backend/core/services/analytics/{survival,factor}/, api/v1/survival_views.py
//   request and application logs                   nginx/nginx.conf (log_format), backend/api/v1/regression_views.py,
//                                                  confidence_intervals/api/calculation_views.py, core/services/error_handler.py
//   daily backups kept 30 days (find -mtime +30)   scripts/backup.sh, docker-compose.yml (postgres-backup)
//   accounts                                       authentication/serializers.py (email = username), gdpr_views.py
//   third parties                                  frontend/public/index.html, Providers.jsx (MathJaxContext's default
//                                                  cdnjs src), paper-parser/utils/pdfParser.js,
//                                                  ai_advisor/services/ai_service.py (PCA's 3-D plot, with troika
//                                                  fonts from jsdelivr, is on no page: PCAAnalysisPage.jsx)
//   account export and erase                       backend/core/services/gdpr_service.py
//   browser storage                                context/AuthContext.js, context/SearchContext.js, DarkModeContext.jsx
//   AI conversation owner and session cookie       api/v1/ai_advisor_views.py (conversation_owner), Django's
//                                                  SESSION_COOKIE_AGE, core/tasks.py (cleanup_expired_sessions)
const Section = ({ title, children }) => (
  <>
    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>{title}</Typography>
    {children}
  </>
);

const Item = ({ children }) => (
  <Typography component="li" variant="body1" sx={{ mb: 1 }}>{children}</Typography>
);

const PrivacyPolicyPage = () => (
  <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, minHeight: '60vh' }}>
    <Typography variant="h4" gutterBottom>Privacy &amp; Data</Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      StickForStats is in beta and open to everyone: no account or password is needed to use most
      of the tools. This page says what happens to the data you give it, as the software works
      today (24 October 2026).
    </Typography>

    <Section title="Your data is processed on our server">
      <Typography variant="body1" paragraph>
        When you run an analysis, the values you upload or type are sent to our server, which
        computes the result and sends it back to your browser. The manuscript tools upload the
        file itself. A few calculations run in your browser instead; the Statistical Analysis
        Tools page lists which of its tools do.
      </Typography>
    </Section>

    <Section title="What we keep, and for how long">
      <Box component="ul" sx={{ pl: 3, m: 0 }}>
        <Item>
          <strong>Most tools keep nothing.</strong> The data you send and the result exist only
          while your request is being processed. That includes the data-import endpoint of our
          programming interface (API), which no screen uses yet: it reads your file, sends back a
          summary and keeps nothing. Earlier versions also saved the whole table on our server, in
          a session record linked to your browser, and never deleted it. Those copies are deleted
          when this version is installed, but backups made before then can hold them for up to 32
          days.
        </Item>
        <Item>
          <strong>Cached results, up to one hour.</strong> The t-test, ANOVA and regression tools
          keep their result in a cache for up to one hour, so that an identical request can be
          answered without recomputing it. For ANOVA the cached result can include the group
          values you sent. The Test Recommender, which needs an account, keeps the whole table you
          upload in the same cache for up to one hour, so that its later steps can use it. The
          cache is also written to disk, where an expired entry can remain,
          for no fixed time, until the cache file is next rewritten. The cache also holds your IP
          address: for a minute after each request, to limit request rates, and for an hour,
          with the time of each check, when you use the data verifier.
        </Item>
        <Item>
          <strong>Manuscript checks, kept until deleted.</strong> Manuscript review, the data
          verifier and reproducibility receipts keep a record of each check: the title and author
          names read from the manuscript; the file&rsquo;s name, type, size and word count; a
          SHA-256 fingerprint of the file; the scores and verdicts; the statistical statements
          found in the text, where each appears and the references cited with it, with their
          recomputed values; and, for data files, their names and numbers of rows and columns.
          We do not keep the manuscript file or the values in your data files. These records do
          not store your IP address (a receipt is linked to your account only if you were signed
          in), although our server logs record the IP address and time of each upload, and
          nothing deletes them automatically yet. Anyone who has a receipt&rsquo;s ID can look
          up that receipt&rsquo;s title, verdict, issue date and the file&rsquo;s SHA-256
          fingerprint.
        </Item>
        <Item>
          <strong>Fitted models, until the next update.</strong> Whenever a survival-analysis
          (Cox regression) or factor-analysis fit succeeds, the fitted model is saved as a file on
          the server, without asking, and anyone with the model ID shown in your results can use
          it. A Cox model file contains each subject&rsquo;s follow-up time and event. These files
          are deleted when the server software is next updated.
        </Item>
        <Item>
          <strong>Server logs.</strong> Our web servers record each request&rsquo;s IP address,
          browser identification, the address requested (including any share or download link
          it contains), the referring page and the time. Our application logs record each
          request&rsquo;s address, result and duration (with your account number if you are
          signed in) and any errors, and some contain values you submitted: the regression tool
          currently writes the data it receives into the log; the confidence-interval calculators
          record the counts and summary statistics you send; many tools write a value they could
          not read as a number into the error log; and the data-import tool records the names of
          the files you upload. Errors from survival and factor analysis also go to an error file
          on the server that is kept when the software is updated. No fixed retention period for
          logs is set in our software, and nothing in it deletes them.
        </Item>
        <Item>
          <strong>Backups, 30 days.</strong> The database is backed up every day and backups
          are kept for 30 days: the nightly clean-up deletes a backup once it is more than 30
          full days old, so a deleted record can remain in a backup for up to 32 days.
        </Item>
        <Item>
          <strong>Accounts.</strong> If you create one: your email address (which is also your
          username), your name, a hash of your password, when you signed up and last signed in,
          a record of each sign-in token issued to you, your privacy choices (stored with your
          browser identification), and anything you choose to save to a project in the modules
          that offer saving.
        </Item>
        <Item>
          <strong>In your browser.</strong> Your browser keeps your settings, your search history
          and, if you sign in, your sign-in tokens in this site&rsquo;s local storage. Clearing
          the site&rsquo;s data in your browser removes them. If you chat with the AI assistant
          while it is switched on, the site also sets a session cookie, so that only your browser
          can read the conversation back. The cookie lasts 14 days. Our server keeps the matching
          session record, which holds nothing else, for those 14 days, and the next daily
          clean-up deletes it.
        </Item>
      </Box>
    </Section>

    <Section title="Who else receives anything">
      <Box component="ul" sx={{ pl: 3, m: 0 }}>
        <Item>
          We do not use analytics, advertising or tracking services, and we do not sell your data
          or use it for advertising.
        </Item>
        <Item>
          Every page loads its fonts from Google Fonts, and every page after the opening screen
          loads the MathJax formula renderer from cdnjs.cloudflare.com. The Paper Parser also
          loads its PDF reader from cdnjs.cloudflare.com. Those services see your IP address,
          your browser and our site&rsquo;s address, not your data. The Paper Parser reads the PDF in your browser and
          sends us only the extracted text.
        </Item>
        <Item>
          If the AI assistant is switched on, what you type into it is sent to Anthropic to
          generate the answer: your question, the earlier messages of the same conversation and,
          in the Methods-section generator, the study design, participant numbers and
          description, variable names, types and roles, and the tests you enter. Our server keeps
          the conversation in its memory for at least 24 hours after your last message; it is
          removed the next time the assistant is used after that, when you clear the
          conversation, or when the server restarts. Only your browser can read it back,
          continue it or clear it: it is tied to your browser&rsquo;s session cookie, and its ID
          alone is not enough.
        </Item>
      </Box>
    </Section>

    <Section title="Deleting your data">
      <Typography variant="body1" paragraph>
        To ask us to delete a record, use the email link in the footer. Manuscript-review and
        verifier records are not linked to accounts, so tell us the receipt ID or report link, or
        the file&rsquo;s SHA-256 fingerprint. Our{' '}
        <Link href={ISSUES_URL} target="_blank" rel="noopener noreferrer">issue tracker</Link>{' '}
        is public, so please don&rsquo;t put personal details there.
      </Typography>
      <Typography variant="body1" paragraph>
        With an account, Privacy settings lets you download part of your account data and close
        your account: that removes your analysis sessions, consents and memberships, anonymises
        your usage and audit records, clears your name and deactivates the account. Your email
        address stays in our database, because it is also your username. It does not yet delete
        everything saved under an account (for example saved PCA, quality-control,
        confidence-interval or probability-distribution projects, or receipts, which stay linked
        to the deactivated account), so ask us by email if you need the account itself and those
        removed. The consent switches in Privacy settings are recorded, but the software does not
        yet act on them, and turning one off currently fails with an error.
      </Typography>
    </Section>

    <Section title="Please note (beta)">
      <Typography variant="body1" paragraph>
        This is a beta. Please do not upload personally identifiable, clinical, or otherwise
        sensitive data that you are not authorised to share. Results may change as the software
        evolves&mdash;verify anything you intend to publish.
      </Typography>
    </Section>

    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
      <Button variant="contained" href="/privacy-settings">Privacy settings</Button>
      <Button variant="outlined" href="/">Return Home</Button>
    </Box>
  </Box>
);

export default PrivacyPolicyPage;

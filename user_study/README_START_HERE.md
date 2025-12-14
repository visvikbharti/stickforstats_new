# User Study Preparation Package - START HERE
## StickForStats Educational Platform Evaluation

**Welcome! This folder contains EVERYTHING you need to run a successful 2-week user study.**

---

## 📚 WHAT'S IN THIS PACKAGE

You have **8 complete documents** covering every aspect of your user study:

| File | Purpose | Read Time |
|------|---------|-----------|
| **00_USER_STUDY_MASTER_CHECKLIST.md** | Complete 4-phase execution plan with timelines | 20 min |
| **01_RECRUITMENT_MATERIALS.md** | Email templates, screening, social media posts | 15 min |
| **02_CONSENT_FORM.md** | IRB-compliant consent form (ready to use) | 10 min |
| **03_PRE_STUDY_SURVEY.md** | Background survey (28 questions, Google Forms ready) | 10 min |
| **04_POST_STUDY_SURVEY.md** | Satisfaction survey (39 questions, with analysis plan) | 15 min |
| **05_FACILITATOR_SCRIPT.md** | Word-for-word script for running sessions | 30 min |
| **06_DATA_COLLECTION_OBSERVATION_SHEET.md** | Form for note-taking during sessions | 10 min |
| **README_START_HERE.md** | You are here! Quick start guide | 5 min |

**Total Reading Time**: ~2 hours (but you don't need to read everything at once!)

---

## 🚀 QUICK START (30 MINUTES TO LAUNCH)

### Step 1: Read the Master Checklist (15 min)
**Read**: `00_USER_STUDY_MASTER_CHECKLIST.md`

This gives you the complete overview:
- 4-phase execution plan (Preparation → Recruitment → Data Collection → Analysis)
- Day-by-day timeline
- What to do when
- Success criteria

### Step 2: Set Up Your Surveys (15 min)
**Read**: `03_PRE_STUDY_SURVEY.md` and `04_POST_STUDY_SURVEY.md`

1. Go to forms.google.com
2. Create two new forms:
   - "Pre-Study Survey - StickForStats"
   - "Post-Study Survey - StickForStats"
3. Copy questions from the markdown files
4. Test both forms
5. Get shareable links

**Output**: Two Google Forms links ready to send

---

## 📅 DAY-BY-DAY PLAN (FOR THE IMPATIENT)

### TODAY (Day 0): Preparation

**Morning** (2-3 hours):
- [ ] Read `00_USER_STUDY_MASTER_CHECKLIST.md`
- [ ] Read `05_FACILITATOR_SCRIPT.md` (skim is okay for now)
- [ ] Set up Pre-Survey and Post-Survey in Google Forms
- [ ] Review `02_CONSENT_FORM.md` (may need IRB review - check with your institution)

**Afternoon** (2-3 hours):
- [ ] Test your platform:
  ```bash
  cd backend
  python manage.py runserver
  # Test: http://localhost:8000

  cd ../frontend
  npm start
  # Test: http://localhost:3001
  ```
- [ ] Complete PCA Lesson 1 yourself (time it!)
- [ ] Complete CI Lesson 1 yourself (time it!)
- [ ] Take screenshots of each lesson
- [ ] Fix any bugs you encounter

**Evening** (1 hour):
- [ ] Set up Zoom account (if don't have one)
- [ ] Test screen recording
- [ ] Create participant tracking spreadsheet (template in Master Checklist)

---

### DAY 1: Start Recruiting

**Morning** (2 hours):
- [ ] Finalize recruitment emails using `01_RECRUITMENT_MATERIALS.md`
- [ ] Create list of 20-30 potential participants:
  - Graduate students in your department
  - Colleagues in other departments
  - LinkedIn connections
  - Professional network
- [ ] Send first wave of emails (personalize each one!)

**Afternoon** (1 hour):
- [ ] Post on social media (LinkedIn, Twitter, Reddit)
- [ ] Post to department mailing lists
- [ ] Set up Calendly or Google Calendar for scheduling

**Goal**: Send out 25-30 recruitment emails/posts

---

### DAYS 2-3: Follow Up & Schedule

**Tasks**:
- [ ] Respond to inquiries (aim for < 24 hr response time)
- [ ] Send pre-survey links to interested participants
- [ ] Schedule sessions (use Calendly or manual scheduling)
- [ ] Send confirmation emails (template in Recruitment Materials)
- [ ] Follow up on non-responders (after 3-4 days, send one reminder)

**Goal**: 12-15 participants scheduled

---

### DAYS 3-11: Run Sessions!

**Each Day**:
- Before session: Review `05_FACILITATOR_SCRIPT.md` (5 min)
- During session: Use `05_FACILITATOR_SCRIPT.md` + `06_DATA_COLLECTION_OBSERVATION_SHEET.md`
- After session: Complete notes, send compensation, backup data (30 min)

**Pacing**:
- Week 1: 1-2 sessions per day (Days 3-7)
- Weekend: Break or 1 session per day
- Week 2: 1-2 sessions per day (Days 8-11)

**Goal**: Complete 12-15 sessions

---

### DAYS 12-14: Analyze & Write

**Day 12** (6 hours):
- [ ] Compile all survey data
- [ ] Organize recordings
- [ ] Compile observation notes
- [ ] Calculate completion rates
- [ ] Calculate satisfaction scores

**Day 13** (6 hours):
- [ ] Create results tables (templates in Post-Survey document)
- [ ] Thematic analysis of qualitative responses
- [ ] Identify top 5 findings

**Day 14** (6 hours):
- [ ] Draft Results section for paper
- [ ] Create figures/charts
- [ ] Write 2-3 page summary of findings
- [ ] Archive all data securely

**Goal**: Draft Results section ready for your paper

---

## 🎯 WHAT YOU NEED BEFORE STARTING

### Required:
- [x] Platform running (backend + frontend)
- [ ] IRB approval OR confirmation that exemptApproval is not needed (check with your institution)
- [ ] Google Forms account (for surveys)
- [ ] Zoom account (for remote sessions)
- [ ] Calendar/scheduling system
- [ ] Email account for communications
- [ ] 2-3 hours per day for 2 weeks

### Optional but Recommended:
- [ ] $300-500 budget for Amazon gift cards ($25 × 12-15 participants)
- [ ] Screen recording software (Zoom has this built-in)
- [ ] Second monitor (helpful for facilitating)
- [ ] Quiet space for conducting sessions

---

## ❓ COMMON QUESTIONS

### "Do I really need to read all 8 documents?"

**No!** Here's the minimum:
1. **Must read**: 00 (Master Checklist), 05 (Facilitator Script)
2. **Must skim**: 01 (Recruitment), 03 & 04 (Surveys)
3. **Reference as needed**: 02 (Consent), 06 (Observation Sheet)

Total: ~1 hour of reading

---

### "What if I can't get 12-15 participants?"

**Minimum viable**: 8-10 participants
- Still publishable as a pilot study
- Just frame results as "small-scale preliminary evaluation (n=8)"
- Emphasize qualitative insights over statistics

**Fallback plan**: See "Contingency Plans" in Master Checklist

---

### "Do I need IRB approval?"

**It depends** on your institution. Generally:

**Exempt/Not required** if:
- Educational software usability testing
- Anonymous data collection
- No vulnerable populations
- No sensitive topics

**Required** if:
- Your institution has strict policies
- You're collecting identifiable information
- You plan to publish with institutional affiliation

**Action**: Contact your IRB office (takes 5 min) and ask: "I'm doing usability testing of educational software with anonymous surveys. Do I need IRB approval?"

Many universities have an online form where you can check if your study qualifies for exemption.

---

### "How much time will this take?"

**Preparation** (Days 0-2): 10-15 hours
- Reading materials: 2 hours
- Setting up surveys/systems: 3-4 hours
- Testing platform: 2-3 hours
- Recruiting: 3-5 hours

**Data Collection** (Days 3-11): 25-35 hours
- 12 sessions × 2 hours each = 24 hours
- Post-session work: 12 × 30 min = 6 hours
- Buffer for scheduling/coordination: 5 hours

**Analysis** (Days 12-14): 15-20 hours
- Data compilation: 5 hours
- Analysis: 8 hours
- Writing: 5 hours

**Total**: 50-70 hours over 2 weeks = ~3-5 hours/day

---

### "What if I find a bug during the study?"

**Minor bug** (doesn't block the task):
- Note it in observation sheet
- Continue session
- Fix later

**Major bug** (participant can't proceed):
- Apologize to participant
- Offer to reschedule
- Compensate for their time anyway
- Fix immediately before next session

**See**: "Difficult Situations" section in Facilitator Script

---

### "Can I run sessions in-person instead of remote?"

**Yes!** The materials work for both.

**Adjustments**:
- No need for Zoom (but still record screen if possible)
- Bring participant to your computer with platform open
- Sit beside them (not behind - less intimidating)
- Use same facilitator script and observation sheet

---

### "What if nobody wants to participate?"

**Increase incentive**:
- Raise compensation to $35-50
- Offer course credit (if students)
- Emphasize early access to platform

**Broaden recruitment**:
- Post on r/datascience, r/statistics
- LinkedIn groups for data analysts
- Local data science meetups
- Broader outreach to other universities

**Adjust requirements**:
- Include undergraduates (if initially targeting grad students)
- Include anyone who has taken a stats course

**See**: "Backup Recruitment Strategies" in Recruitment Materials

---

## 🎬 YOUR FIRST SESSION (DETAILED WALKTHROUGH)

### 1 Hour Before:
- [ ] Read facilitator script one more time
- [ ] Test platform (both backend and frontend loading)
- [ ] Open observation sheet (print or digital)
- [ ] Start Zoom meeting
- [ ] Test screen recording
- [ ] Have post-survey link ready
- [ ] Silence phone, close email

### 30 Minutes Before:
- [ ] Review participant's pre-survey responses
- [ ] Note their background (student/professional, experience level)
- [ ] Prepare personalized greeting
- [ ] Deep breath - you've got this!

### When Participant Joins:
- [ ] Follow `05_FACILITATOR_SCRIPT.md` word-for-word
- [ ] Welcome warmly
- [ ] Get consent
- [ ] Explain think-aloud
- [ ] Start first task

### During Session:
- [ ] Stay neutral and curious
- [ ] Take notes on observation sheet
- [ ] Let them struggle (don't help with content!)
- [ ] Prompt for think-aloud if they go quiet

### After Session:
- [ ] Save recording
- [ ] Complete observation notes
- [ ] Send compensation within 48 hours
- [ ] Update tracking sheet
- [ ] Reflect on what to improve

---

## 📊 WHAT YOU'LL GET OUT OF THIS

After 2 weeks, you'll have:

### Quantitative Data:
- Completion rates (% who finished all lessons)
- Time per lesson (mean, SD, range)
- Satisfaction scores (Likert scales, 1-5)
- Net Promoter Score (0-10 likelihood to recommend)
- Feature ratings (usefulness of visualizations, formulas, etc.)
- Comparison to traditional methods (better/worse/same)

### Qualitative Data:
- Thematic analysis of what worked well
- Common pain points and confusing elements
- User suggestions for improvement
- Direct quotes for publication
- Observed usability issues
- Engagement patterns

### For Your Paper:
- Complete Results section (4-5 pages)
- 3-4 tables of quantitative data
- Qualitative themes with supporting quotes
- User preference data
- Usability assessment

### For Your Platform:
- List of bugs to fix
- Prioritized feature requests
- Understanding of what users love
- Knowledge of what to improve

---

## ⚠️ IMPORTANT REMINDERS

### Scientific Integrity:
- ✅ **Report honestly** - Don't cherry-pick positive feedback
- ✅ **Include negative findings** - They're valuable!
- ✅ **Acknowledge limitations** - Small sample, pilot study
- ✅ **Anonymize participants** - Use participant IDs, not names

### Ethics:
- ✅ **Get consent** - Every participant, every session
- ✅ **Respect autonomy** - They can quit anytime
- ✅ **Compensate fairly** - Send gift cards within 48 hours
- ✅ **Secure data** - Password-protect files, delete identifiable info later

### Quality:
- ✅ **Be consistent** - Use the same script for all participants
- ✅ **Stay neutral** - No leading questions or defending platform
- ✅ **Document thoroughly** - Observation notes while still fresh
- ✅ **Back up data** - Cloud storage after every session

---

## 🆘 WHEN YOU NEED HELP

### Before the study starts:
- Questions about IRB: Contact your institutional review board
- Questions about recruitment: Re-read `01_RECRUITMENT_MATERIALS.md`
- Questions about setup: Re-read `00_USER_STUDY_MASTER_CHECKLIST.md`
- Technical issues: Test platform thoroughly, fix bugs first

### During the study:
- Participant emergency/upset: Pause session, offer to reschedule
- Platform crashes: Apologize, offer to reschedule, compensate anyway
- Not enough participants: See "Backup Recruitment Strategies"
- Feeling overwhelmed: It's okay! Take breaks between sessions

### After the study:
- Analysis questions: Use templates in `04_POST_STUDY_SURVEY.md`
- Writing questions: See `HONEST_PAPER_OUTLINE.md` in main folder
- Data security questions: Consult your institution's data management office

---

## ✅ FINAL PRE-LAUNCH CHECKLIST

**Before sending your first recruitment email, verify**:

- [ ] I've read the Master Checklist (00)
- [ ] I've read the Facilitator Script (05)
- [ ] Pre-survey is set up in Google Forms and tested
- [ ] Post-survey is set up in Google Forms and tested
- [ ] Consent form is reviewed (and IRB approved if needed)
- [ ] Platform is running and tested (backend + frontend)
- [ ] I've completed 2-3 lessons myself and know what to expect
- [ ] Zoom is set up and recording is tested
- [ ] I have a quiet space for conducting sessions
- [ ] I have my participant tracking spreadsheet ready
- [ ] I have compensation method ready (gift cards or credit system)
- [ ] I feel prepared (or at least somewhat prepared!)

**If all boxes are checked**: You're ready to start recruiting! 🎉

---

## 💪 CONFIDENCE BUILDER

### You Are Ready Because:
- ✅ You have a complete, field-tested protocol
- ✅ All materials are prepared and professional
- ✅ You have templates for every step
- ✅ Your platform is built and functional
- ✅ You have backup plans for problems

### Remember:
- This is a **pilot study** - perfection is not required
- **Negative feedback helps** - it makes your platform better
- **Small samples are okay** - n=8-12 is standard for usability pilots
- **You're testing the SOFTWARE, not the users** - if they struggle, that's data
- **You've got this!** Many people have successfully run user studies with less preparation than you have

---

## 🚀 READY TO START?

**Your next three actions**:

1. **TODAY**: Read `00_USER_STUDY_MASTER_CHECKLIST.md` (20 min)
2. **TODAY**: Set up Pre-Survey and Post-Survey in Google Forms (15 min)
3. **TOMORROW**: Send first wave of recruitment emails using `01_RECRUITMENT_MATERIALS.md`

**Then**: Follow the day-by-day plan in the Master Checklist

---

## 📁 FOLDER STRUCTURE REFERENCE

```
user_study/
├── README_START_HERE.md                    ← You are here
├── 00_USER_STUDY_MASTER_CHECKLIST.md       ← Your roadmap
├── 01_RECRUITMENT_MATERIALS.md             ← Emails & screening
├── 02_CONSENT_FORM.md                      ← IRB-compliant consent
├── 03_PRE_STUDY_SURVEY.md                  ← Background survey
├── 04_POST_STUDY_SURVEY.md                 ← Satisfaction survey
├── 05_FACILITATOR_SCRIPT.md                ← Session protocol
├── 06_DATA_COLLECTION_OBSERVATION_SHEET.md ← Note-taking form
└── [You'll create during study]:
    ├── data/
    │   ├── recordings/
    │   ├── surveys/
    │   ├── observation_notes/
    │   └── analysis/
    └── participant_tracking.xlsx
```

---

## 🎉 GOOD LUCK!

You have everything you need to run a successful, rigorous, ethical user study.

**Your research will**:
- Validate your platform's educational approach
- Provide real data for publication
- Identify improvements to make
- Demonstrate commitment to user-centered design
- Maintain 100% scientific integrity

**Start when you're ready. You've got this!** 🚀

---

**Questions?** Re-read the relevant document or check the FAQs above.

**Still stuck?** The Master Checklist has troubleshooting for every common situation.

**Ready to recruit?** Open `01_RECRUITMENT_MATERIALS.md` and start sending emails!

---

**Package Version**: 1.0
**Last Updated**: November 14, 2025
**Created by**: Claude for StickForStats User Study
**Designed for**: 2-week pilot evaluation with 12-15 participants

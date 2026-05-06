# Data Processing Agreement

## StickForStats Statistical Analysis Platform

**Document Version:** 1.0.0
**Effective Date:** 2026-02-19
**Classification:** Contractual -- Customer-Facing
**Prepared By:** StickForStats Legal and Privacy Team

---

## Table of Contents

1. [Definitions and Interpretation](#1-definitions-and-interpretation)
2. [Scope of Processing](#2-scope-of-processing)
3. [Data Categories Processed](#3-data-categories-processed)
4. [Obligations of the Controller](#4-obligations-of-the-controller)
5. [Obligations of the Processor](#5-obligations-of-the-processor)
6. [Sub-Processors](#6-sub-processors)
7. [Security Measures](#7-security-measures)
8. [Data Subject Rights](#8-data-subject-rights)
9. [Cross-Border Data Transfers](#9-cross-border-data-transfers)
10. [Data Breach Notification](#10-data-breach-notification)
11. [Data Retention and Deletion](#11-data-retention-and-deletion)
12. [Audit Rights](#12-audit-rights)
13. [Liability and Indemnification](#13-liability-and-indemnification)
14. [Term and Termination](#14-term-and-termination)
15. [Annexes](#15-annexes)

---

## 1. Definitions and Interpretation

### 1.1 Definitions

For the purposes of this Data Processing Agreement ("DPA"), the following
definitions apply:

**"Controller"** means the customer entity that determines the purposes and
means of processing personal data through the StickForStats platform.

**"Processor"** means StickForStats (the service provider) that processes
personal data on behalf of the Controller.

**"Data Subject"** means an identified or identifiable natural person whose
personal data is processed through the platform.

**"Personal Data"** means any information relating to a Data Subject, as defined
in Article 4(1) of the GDPR.

**"Processing"** means any operation performed on personal data, including
collection, recording, organization, structuring, storage, adaptation, retrieval,
consultation, use, disclosure, erasure, or destruction.

**"Sub-Processor"** means any third party engaged by the Processor to process
personal data on behalf of the Controller.

**"Platform"** means the StickForStats statistical analysis platform, including
the web application, backend API, Guardian validation system, manuscript review
engine, and all associated infrastructure components.

**"Statistical Data"** means numerical datasets uploaded to the Platform for
analysis, which may or may not contain personal data depending on the Controller's
use case.

**"Audit Trail"** means the immutable record of all statistical analyses
performed through the Platform, as stored in the StatisticalAudit database model.

**"Guardian System"** means the automatic assumption validation engine that
validates statistical assumptions before analysis and generates confidence
scores and recommendations.

**"SQS"** means Statistical Quality Score, the Platform's automated scoring
system for manuscript statistical reporting quality.

### 1.2 Interpretation

- References to "Articles" are to articles of Regulation (EU) 2016/679 (GDPR)
  unless otherwise specified.
- This DPA supplements and forms part of the main service agreement between the
  Controller and the Processor.
- In the event of a conflict between this DPA and the main service agreement,
  this DPA shall prevail with respect to data protection matters.

---

## 2. Scope of Processing

### 2.1 Purpose of Processing

The Processor processes personal data solely for the purpose of providing the
StickForStats statistical analysis platform services to the Controller, including:

1. **Statistical Analysis** -- Processing numerical datasets uploaded by the
   Controller's authorized users to perform statistical tests (t-tests, ANOVA,
   regression, correlation, non-parametric tests, Bayesian analysis, survival
   analysis, mixed models, and causal inference).

2. **Guardian Validation** -- Automatic validation of statistical assumptions
   against the Controller's data to ensure analysis integrity. This processing
   involves examining data distributions, variance properties, independence,
   outliers, sample adequacy, modality, linearity, and homoscedasticity.

3. **Manuscript Review** -- If applicable to the Controller's subscription tier,
   processing manuscript text and embedded statistical claims for SQS scoring
   and consistency verification.

4. **Audit Trail Maintenance** -- Recording metadata about each statistical
   analysis for compliance, reproducibility, and quality assurance purposes.

5. **Usage Analytics** -- When consented to by Data Subjects, aggregated usage
   data collection for platform improvement and capacity planning.

6. **Account Management** -- Processing of user account data for authentication,
   authorization, organization membership, and subscription management.

### 2.2 Nature of Processing

Processing operations include:

- Automated statistical computation on uploaded datasets
- Temporary storage of datasets during analysis session
- Persistent storage of analysis results and audit trail records
- Authentication and session management for authorized users
- API request logging for security monitoring and rate limiting
- Automated manuscript parsing and statistical claim extraction (if applicable)

### 2.3 Duration of Processing

Processing shall continue for the duration of the service agreement between the
Controller and the Processor. Upon termination, data handling follows the
procedures in Section 11 (Data Retention and Deletion).

---

## 3. Data Categories Processed

### 3.1 Categories of Data Subjects

| Category | Description |
|---|---|
| Controller's Employees | Users of the Platform within the Controller's organization |
| Research Participants | Individuals whose data may be included in uploaded statistical datasets (indirect) |
| Manuscript Authors | Authors of manuscripts submitted for SQS review (if applicable) |

### 3.2 Categories of Personal Data

| Data Category | Examples | Lawful Basis | Retention |
|---|---|---|---|
| **Account Data** | Username, email, name, organization membership, role | Contract performance (Art. 6(1)(b)) | Duration of account + 30 days |
| **Authentication Data** | Hashed passwords, session tokens, API key hashes | Legitimate interest (Art. 6(1)(f)) | Duration of account |
| **Statistical Datasets** | Numerical data uploaded for analysis (may contain personal data depending on Controller's use case) | Controller's determination | Duration of analysis session (temporary) or as configured by Controller |
| **Audit Trail Data** | Analysis metadata: test type, sample size, results, timestamps, user ID, source IP | Legitimate interest (Art. 6(1)(f)), legal obligation (Art. 6(1)(c)) for FDA-regulated use | 7 years (configurable) |
| **Usage Data** | API endpoints accessed, request timestamps, response times, client type, IP address | Legitimate interest (Art. 6(1)(f)) | 90 days |
| **Consent Records** | Consent type, grant/revoke status, timestamp, IP, user agent, policy version | Legal obligation (Art. 6(1)(c)) | Duration of account + 3 years |
| **Manuscript Content** | Text, statistical claims, author information (if SQS used) | Contract performance (Art. 6(1)(b)) | As configured by Controller |
| **Communication Data** | Webhook URLs, contact emails, notification preferences | Contract performance (Art. 6(1)(b)) | Duration of account |

### 3.3 Special Categories of Data

The Controller acknowledges that statistical datasets uploaded to the Platform
may contain special categories of data (Article 9 GDPR) such as health data
from clinical trials. In such cases:

- The Controller is responsible for establishing a lawful basis for processing
  under Article 9(2) (e.g., explicit consent, scientific research purposes)
- The Processor will apply all security measures described in Section 7 to
  special category data without distinction
- The Controller shall inform the Processor if special category data will be
  processed, enabling additional safeguards if necessary

---

## 4. Obligations of the Controller

The Controller shall:

4.1. Ensure that all personal data provided to the Processor has been collected
in accordance with applicable data protection law, including obtaining any
necessary consents or establishing other lawful bases for processing.

4.2. Provide clear instructions to the Processor regarding the processing of
personal data, limited to the purposes described in Section 2.

4.3. Ensure that Data Subjects are informed of the processing, including the
involvement of the Processor, in accordance with Articles 13 and 14 of the GDPR.

4.4. Cooperate with the Processor in responding to Data Subject requests
(Section 8) and data protection authority inquiries.

4.5. Assess the appropriateness of the security measures described in Section 7
for the categories of personal data processed.

4.6. Manage user access within its organization, including assigning appropriate
roles (Owner, Admin, Member, Viewer) and deactivating accounts for departed
personnel.

4.7. Ensure that uploaded statistical datasets are appropriately anonymized or
pseudonymized where possible, applying the principle of data minimization.

4.8. If processing special category data (e.g., clinical trial health data),
maintain documentation of the lawful basis under Article 9(2) and inform the
Processor accordingly.

---

## 5. Obligations of the Processor

The Processor shall:

5.1. Process personal data only on documented instructions from the Controller,
unless required to do so by applicable law. If such legal requirement exists,
the Processor shall inform the Controller before processing (unless prohibited
by law).

5.2. Ensure that persons authorized to process personal data have committed
themselves to confidentiality or are under an appropriate statutory obligation
of confidentiality.

5.3. Implement the technical and organizational security measures described in
Section 7.

5.4. Engage Sub-Processors only in accordance with Section 6.

5.5. Assist the Controller in responding to Data Subject rights requests
(Section 8) by appropriate technical and organizational measures.

5.6. Assist the Controller in ensuring compliance with obligations under
Articles 32-36 of the GDPR (security, DPIA, prior consultation), taking into
account the nature of processing and information available to the Processor.

5.7. At the Controller's choice, delete or return all personal data after the
end of the provision of services and delete existing copies, unless applicable
law requires further storage (Section 11).

5.8. Make available to the Controller all information necessary to demonstrate
compliance with the obligations laid down in Article 28 of the GDPR and allow
for and contribute to audits (Section 12).

5.9. Immediately inform the Controller if, in the Processor's opinion, an
instruction from the Controller infringes the GDPR or other data protection
provisions.

---

## 6. Sub-Processors

### 6.1 Authorized Sub-Processors

The Controller provides general authorization for the Processor to engage the
following Sub-Processors:

| Sub-Processor | Purpose | Data Processed | Location | Engagement |
|---|---|---|---|---|
| Cloud Infrastructure Provider | Server hosting, compute, storage, networking | All Platform data (encrypted) | As selected by deployment region | Always (deployment-dependent provider) |
| Stripe, Inc. | Payment processing and subscription billing | Billing contact name, email, payment method | United States (EU SCCs) | **Conditional** -- only when paid billing is enabled (`STRIPE_SECRET_KEY` configured); not engaged in self-hosted free-tier deployments |
| Keycloak (Self-Hosted) | Identity provider for enterprise SSO | Authentication credentials, session data | Same region as Platform deployment | Optional -- only when SSO is enabled |

### 6.2 Sub-Processor Changes

6.2.1. The Processor shall inform the Controller of any intended changes
concerning the addition or replacement of Sub-Processors at least 30 days
before the change, providing the Controller with an opportunity to object.

6.2.2. If the Controller objects to a new Sub-Processor on reasonable data
protection grounds, the parties shall discuss the objection in good faith.
If no resolution is reached within 30 days, the Controller may terminate
the affected services without penalty.

6.2.3. The Processor shall impose the same data protection obligations as set
out in this DPA on any Sub-Processor by way of a contract or other legal act,
in particular providing sufficient guarantees to implement appropriate technical
and organizational measures.

6.2.4. The Processor remains fully liable to the Controller for the performance
of each Sub-Processor's obligations.

---

## 7. Security Measures

### 7.1 Technical Measures

The Processor implements the following technical security measures, which
correspond to the controls documented in the StickForStats SOC 2 Type II
Controls document:

#### 7.1.1 Access Control

| Measure | Implementation |
|---|---|
| Authentication | Multi-method: Token, Session, API Key (SHA-256 hashed), SSO/SAML via Keycloak |
| Authorization | Four-tier RBAC (Owner, Admin, Member, Viewer) with explicit permission methods |
| Tenant Isolation | Middleware-enforced organization context on every API request |
| API Key Security | SHA-256 hashing, scope-based permissions, expiration, rate limiting, usage tracking |
| Password Policy | Minimum length, no common passwords, no user attribute similarity, no purely numeric |
| Session Security | Secure cookies, HTTPOnly, CSRF protection (production mode) |

#### 7.1.2 Encryption

| Measure | Implementation |
|---|---|
| Encryption in Transit | TLS 1.2+ via HTTPS. HSTS with 1-year duration, subdomain inclusion, preload |
| Encryption at Rest | Cloud provider volume encryption for database and file storage |
| API Key Protection | SHA-256 one-way hash storage. Raw keys returned once at creation |
| Secret Management | Environment variable injection. Auto-generated secrets. No hardcoded credentials |

#### 7.1.3 Data Integrity

| Measure | Implementation |
|---|---|
| Statistical Validation | Guardian system: 8 validators, confidence scoring, alternative recommendations |
| High Precision | mpmath with 50-digit decimal precision for statistical computations |
| File Integrity | SHA-256 hash verification for uploaded manuscripts |
| Input Validation | Django model validators, parameterized queries (ORM), DOMPurify (XSS prevention) |

#### 7.1.4 Monitoring and Logging

| Measure | Implementation |
|---|---|
| Audit Trail | StatisticalAudit model: 30+ fields per analysis, 7-year retention |
| Usage Logging | Every API request recorded with endpoint, method, status, timing, client info |
| Health Monitoring | Docker health checks on all services (10-30 second intervals) |
| Metrics | Prometheus collection with 90-day retention, Grafana visualization |

#### 7.1.5 Infrastructure Security

| Measure | Implementation |
|---|---|
| Container Security | Multi-stage builds, non-root execution, minimal base images (slim/alpine) |
| Network Isolation | Docker bridge network. Internal services not exposed on host ports |
| Reverse Proxy | Nginx for TLS termination and request routing |
| API Gateway | Kong for edge authentication, rate limiting, and traffic management |

### 7.2 Organizational Measures

| Measure | Description |
|---|---|
| Personnel Confidentiality | All staff with data access bound by confidentiality agreements |
| Security Training | Annual security awareness training covering OWASP Top 10 and data handling |
| Access Reviews | Quarterly review of system access permissions |
| Incident Response | Documented IRP with defined roles, escalation paths, and notification procedures |
| Change Management | Peer code review, CI/CD pipeline, version-controlled deployments |
| Vendor Assessment | Security evaluation of all Sub-Processors before engagement |

---

## 8. Data Subject Rights

### 8.1 Supported Rights

The Processor shall assist the Controller in fulfilling Data Subject requests
for the following rights:

| Right | GDPR Article | Platform Capability |
|---|---|---|
| Right of Access | Art. 15 | Export of all personal data associated with a user account, including audit trail records, usage records, consent records, and organization membership data. |
| Right to Rectification | Art. 16 | User profile editing through the Platform interface. Audit trail records are immutable by design (to preserve scientific integrity) but can be annotated with corrections. |
| Right to Erasure | Art. 17 | Account deletion with cascade deletion of associated records. Note: audit trail records required for regulatory compliance (e.g., FDA 21 CFR Part 11) may be retained in anonymized form. |
| Right to Restriction | Art. 18 | Account deactivation (soft delete) restricts processing while preserving data for potential restoration. |
| Right to Data Portability | Art. 20 | JSON export of all user data, analysis results, and audit records via API. Machine-readable format. |
| Right to Object | Art. 21 | Consent withdrawal mechanism via ConsentRecord model. Granular per-purpose objection (analytics, data processing, notifications, third-party sharing, cookies). |
| Rights re: Automated Decisions | Art. 22 | Guardian system provides full transparency into automated assumption validation. Users can review all assumption checks, override via Expert Mode with explicit acknowledgment, and access alternative test recommendations. |

### 8.2 Response Timeline

The Processor shall:

- Acknowledge Data Subject requests forwarded by the Controller within 2
  business days
- Provide the Controller with the requested data or confirmation of action
  within 10 business days
- Support the Controller in meeting the 30-day GDPR response deadline

### 8.3 Identity Verification

The Processor shall not respond directly to Data Subject requests. All requests
must be verified by the Controller and forwarded to the Processor with
confirmed identity verification.

---

## 9. Cross-Border Data Transfers

### 9.1 Transfer Mechanisms

When personal data is transferred outside the European Economic Area (EEA),
the following safeguards apply:

| Transfer Scenario | Mechanism | Reference |
|---|---|---|
| Cloud infrastructure in non-EEA region | EU Standard Contractual Clauses (SCCs) per Commission Decision 2021/914 | GDPR Art. 46(2)(c) |
| Stripe payment processing (US) -- *only when paid billing enabled* | EU-US Data Privacy Framework + SCCs | GDPR Art. 45, 46(2)(c) |
| Sub-Processor in non-EEA country | SCCs + supplementary measures assessment | GDPR Art. 46(2)(c) |

### 9.2 Data Residency Options

The Platform's containerized architecture (Docker/Kubernetes) supports
deployment in any cloud region. The Controller may specify a preferred
data residency region, and the Processor shall ensure that all personal
data processing occurs within that region.

Available deployment regions include:
- EU (Frankfurt, Ireland, Amsterdam)
- US (Virginia, Oregon, California)
- Asia-Pacific (Tokyo, Sydney, Singapore)
- UK (London)

### 9.3 Transfer Impact Assessment

The Processor maintains a Transfer Impact Assessment (TIA) for each
non-EEA transfer, evaluating:
- Legislation of the destination country
- Nature, scope, context, and purpose of the transfer
- Categories of personal data transferred
- Supplementary measures in place

---

## 10. Data Breach Notification

### 10.1 Notification to Controller

10.1.1. The Processor shall notify the Controller without undue delay, and
in any event within 24 hours, after becoming aware of a personal data breach.

10.1.2. The notification shall include, to the extent available:

- Description of the nature of the breach, including categories and
  approximate number of Data Subjects and records concerned
- Name and contact details of the Processor's data protection contact
- Description of the likely consequences of the breach
- Description of the measures taken or proposed to address the breach,
  including measures to mitigate possible adverse effects

10.1.3. Where it is not possible to provide all information at the same time,
the Processor shall provide information in phases without undue further delay.

### 10.2 Controller Obligations

10.2.1. The Controller is responsible for notifying the relevant supervisory
authority within 72 hours of becoming aware of the breach (Article 33 GDPR),
where required.

10.2.2. The Controller is responsible for notifying affected Data Subjects
without undue delay where the breach is likely to result in a high risk to
their rights and freedoms (Article 34 GDPR).

### 10.3 Cooperation

The Processor shall cooperate with the Controller and take reasonable
commercial steps to assist in the investigation, mitigation, and remediation
of the breach. This includes:

- Preserving forensic evidence (logs, audit trails, system snapshots)
- Implementing immediate containment measures
- Conducting root cause analysis
- Implementing corrective actions to prevent recurrence
- Providing documentation for regulatory notifications

### 10.4 Breach Register

The Processor maintains a breach register documenting all security incidents,
regardless of whether they meet the threshold for notification, including:
- Date and time of discovery
- Nature of the incident
- Data categories and volume affected
- Root cause analysis
- Remediation actions taken
- Lessons learned

---

## 11. Data Retention and Deletion

### 11.1 Retention Periods

| Data Category | Default Retention | Rationale | Configurable |
|---|---|---|---|
| Statistical Datasets | Duration of analysis session | Data minimization | Yes (Controller may request extended storage) |
| Audit Trail Records | 7 years | FDA 21 CFR Part 11, GxP compliance | Yes (minimum 1 year, maximum 10 years) |
| Usage Records | 90 days | Security monitoring | Yes (30-365 days) |
| Account Data | Duration of account + 30 days | Account recovery window | No |
| Consent Records | Duration of account + 3 years | Demonstrating consent compliance | No |
| Manuscript Submissions | As configured by Controller | Varies by use case | Yes |
| Backup Data | 30 days rolling | Disaster recovery | Yes (7-90 days) |

### 11.2 Deletion Upon Termination

Upon termination of the service agreement:

11.2.1. The Controller may request export of all personal data in JSON format
within 30 days of termination.

11.2.2. After the 30-day export window, or upon Controller's written
confirmation, the Processor shall:
- Delete all personal data from production systems within 30 days
- Delete all personal data from backup systems within 90 days
- Provide written confirmation of deletion to the Controller

11.2.3. Exceptions to deletion:
- Anonymized audit trail records may be retained for regulatory compliance
  (FDA 21 CFR Part 11) with Controller notification
- Aggregated, non-personal statistical data may be retained for platform
  improvement
- Data required by applicable law shall be retained only for the required
  period

### 11.3 Deletion Methods

| Data Type | Deletion Method |
|---|---|
| Database records | Django ORM cascading delete + PostgreSQL VACUUM |
| Cached data | Redis key deletion + TTL expiration |
| File uploads | Secure file deletion from object storage |
| Backup data | Backup rotation with overwrite |
| Log files | Log rotation with secure deletion |

---

## 12. Audit Rights

### 12.1 Controller's Audit Rights

12.1.1. The Controller may audit the Processor's compliance with this DPA
once per calendar year, with at least 30 days' written notice.

12.1.2. Audits may be conducted by:
- The Controller's internal audit team
- A qualified third-party auditor appointed by the Controller (subject to
  confidentiality agreement)

12.1.3. The Processor shall make available all information necessary to
demonstrate compliance, including:
- Security measures documentation (SOC 2 Type II Controls)
- FDA 21 CFR Part 11 compliance documentation
- Security controls matrix
- Audit trail records and system logs
- Sub-Processor agreements
- Incident and breach register
- Training records

### 12.2 Processor's Audit Facilitation

12.2.1. The Processor shall cooperate fully with audits and provide reasonable
access to:
- Relevant personnel for interviews
- System documentation and configuration
- Audit trail data (via API or database export)
- Security testing results (penetration tests, vulnerability scans)

12.2.2. The Processor may satisfy the Controller's audit rights by providing:
- A current SOC 2 Type II report from an independent auditor
- ISO 27001 certification (if applicable)
- Results of recent penetration tests (with appropriate redaction)
- Completed security questionnaire (SIG, CAIQ, or equivalent)

### 12.3 Cost Allocation

12.3.1. The Processor shall bear the cost of annual audits facilitated through
SOC 2 reports, security questionnaires, and documentation review.

12.3.2. On-site audits or custom audit procedures exceeding standard facilitation
shall be conducted at the Controller's expense, with reasonable time commitments
from the Processor.

---

## 13. Liability and Indemnification

### 13.1 Processor Liability

The Processor shall be liable for damages caused by processing that does not
comply with the obligations of this DPA or the GDPR, in accordance with
Article 82 of the GDPR.

### 13.2 Liability Cap

The Processor's total aggregate liability under this DPA shall not exceed the
total fees paid by the Controller to the Processor in the 12-month period
preceding the event giving rise to the claim, unless the damages result from
the Processor's gross negligence or willful misconduct.

### 13.3 Indemnification

Each party shall indemnify the other against any fines, penalties, claims,
damages, and reasonable legal costs arising from the indemnifying party's
breach of this DPA or applicable data protection law.

---

## 14. Term and Termination

### 14.1 Term

This DPA shall commence on the Effective Date and remain in effect for the
duration of the main service agreement between the Controller and the Processor.

### 14.2 Survival

Sections 7 (Security Measures), 10 (Breach Notification), 11 (Data Retention
and Deletion), 12 (Audit Rights), and 13 (Liability) shall survive termination
of this DPA.

### 14.3 Termination for Cause

Either party may terminate this DPA immediately upon written notice if the
other party materially breaches its obligations and fails to cure such breach
within 30 days of receiving written notice.

---

## 15. Annexes

### Annex A -- Technical and Organizational Measures (Summary)

| Category | Measure |
|---|---|
| Access Control | Multi-method authentication, 4-tier RBAC, tenant isolation, API key scoping |
| Encryption | TLS 1.2+, HSTS, SHA-256 key hashing, environment variable secrets |
| Data Integrity | Guardian validation (8 validators), mpmath 50-digit precision, file hashing |
| Monitoring | Prometheus/Grafana, audit trail (30+ fields), usage metering, health checks |
| Infrastructure | Docker multi-stage builds, non-root containers, network isolation |
| Business Continuity | Daily backups, Redis persistence, auto-restart, volume persistence |
| Incident Response | 24-hour breach notification, forensic logging, containment procedures |

### Annex B -- Sub-Processor List

| Sub-Processor | Service | Data Categories | Location | Safeguards |
|---|---|---|---|---|
| Cloud Provider | Infrastructure hosting | All Platform data | Per deployment region | SOC 2 Type II, encryption |
| Stripe, Inc. *(conditional -- only when paid billing enabled)* | Payment processing | Billing data | US | EU-US DPF, SCCs, PCI DSS |
| Keycloak (Self-Hosted) *(optional -- only when SSO enabled)* | Identity management | Auth credentials | Same as Platform | Self-hosted, no external transfer |

### Annex C -- Data Processing Activities Register

| Activity | Purpose | Legal Basis | Data Subjects | Data Categories | Retention |
|---|---|---|---|---|---|
| Statistical analysis | Core service delivery | Art. 6(1)(b) | Researchers | Datasets, results | Session duration |
| Guardian validation | Quality assurance | Art. 6(1)(b) | Researchers | Dataset metadata | Session duration |
| Audit trail | Compliance, reproducibility | Art. 6(1)(c), (f) | Researchers | Analysis metadata | 7 years |
| Account management | Authentication, authorization | Art. 6(1)(b) | Users | Account data | Account duration |
| Usage metering | Billing, security monitoring | Art. 6(1)(b), (f) | Users | Request metadata | 90 days |
| Manuscript review | SQS scoring | Art. 6(1)(b) | Authors | Manuscript content | Configurable |
| Consent management | GDPR compliance | Art. 6(1)(c) | Users | Consent records | Account + 3 years |

---

### Signatures

This Data Processing Agreement is entered into by:

**Controller:**

Name: ___________________________________

Title: ___________________________________

Organization: ___________________________________

Date: ___________________________________

Signature: ___________________________________


**Processor (StickForStats):**

Name: ___________________________________

Title: ___________________________________

Organization: StickForStats Platform

Date: ___________________________________

Signature: ___________________________________

---

### Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-19 | StickForStats Legal and Privacy Team | Initial Data Processing Agreement |

---

*This Data Processing Agreement is a template and should be reviewed by legal
counsel before execution. Specific terms may be negotiated based on the
Controller's requirements and applicable jurisdiction.*

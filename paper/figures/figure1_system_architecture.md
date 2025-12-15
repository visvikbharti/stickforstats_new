# Figure 1: StickForStats System Architecture

## Description for Paper

Figure 1 presents the high-level architecture of the StickForStats platform. The system follows a client-server model with three main tiers: the user interface layer (React frontend), the application layer (Django REST API with Guardian integration), and the data layer (SQLite/PostgreSQL database with Redis caching).

## ASCII Diagram (for conversion to vector graphics)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                           (React 18 + Material-UI)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Statistical │  │   Learning   │  │  AI Advisor  │  │    Report    │    │
│  │   Analysis   │  │     Hub      │  │     Hub      │  │   Manager    │    │
│  │    Tools     │  │  (50 lessons)│  │   (Claude)   │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                     │                                       │
│                                     ▼                                       │
│                        ┌────────────────────────┐                          │
│                        │    REST API Client     │                          │
│                        │   (Axios + Fetch API)  │                          │
│                        └────────────┬───────────┘                          │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION LAYER                                 │
│                        (Django 4.2 + REST Framework)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         GUARDIAN LAYER                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │  Normality  │ │  Variance   │ │ Independence│ │   Outlier   │   │   │
│  │  │  Validator  │ │  Validator  │ │  Validator  │ │  Detector   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │  Linearity  │ │  Sample     │ │ Homoscedas- │ │  Modality   │   │   │
│  │  │  Validator  │ │  Size Check │ │   ticity    │ │  Detector   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                    + 7 more specialized validators                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    STATISTICAL ENGINE                                │   │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐          │   │
│  │  │   Standard Precision    │  │   High Precision        │          │   │
│  │  │   (NumPy/SciPy)         │  │   (mpmath + Decimal)    │          │   │
│  │  │   ~15 decimal places    │  │   50 decimal places     │          │   │
│  │  └─────────────────────────┘  └─────────────────────────┘          │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │ T-Tests  │ │  ANOVA   │ │Correlation│ │  Meta-   │ │  Power   │ │   │
│  │  │          │ │          │ │          │ │ Analysis │ │ Analysis │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │Chi-Square│ │Non-Param │ │Regression│ │ Survival │ │  Factor  │ │   │
│  │  │          │ │  Tests   │ │          │ │ Analysis │ │ Analysis │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    PostgreSQL    │  │      Redis       │  │   File Storage   │          │
│  │    (Primary)     │  │     (Cache)      │  │    (Reports)     │          │
│  │                  │  │                  │  │                  │          │
│  │  • User data     │  │  • Session data  │  │  • PDF exports   │          │
│  │  • Analysis logs │  │  • Query cache   │  │  • Code bundles  │          │
│  │  • Audit trails  │  │  • Rate limiting │  │  • Data backups  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## TikZ Code for LaTeX

```latex
\begin{figure}[htbp]
\centering
\begin{tikzpicture}[
    box/.style={draw, rounded corners, minimum width=2.5cm, minimum height=0.8cm, align=center},
    layer/.style={draw, rounded corners, minimum width=14cm, minimum height=2cm, fill=gray!10},
    arrow/.style={->, thick}
]

% User Interface Layer
\node[layer, minimum height=3cm, fill=blue!10] (ui) at (0,6) {};
\node[above] at (ui.north) {\textbf{User Interface (React 18)}};
\node[box, fill=white] at (-4.5,6) {Statistical\\Analysis};
\node[box, fill=white] at (-1.5,6) {Learning\\Hub};
\node[box, fill=white] at (1.5,6) {AI\\Advisor};
\node[box, fill=white] at (4.5,6) {Report\\Manager};

% Application Layer
\node[layer, minimum height=4cm, fill=green!10] (app) at (0,2) {};
\node[above] at (app.north) {\textbf{Application Layer (Django REST)}};

% Guardian sublayer
\node[draw, dashed, minimum width=12cm, minimum height=1.2cm, fill=red!10] at (0,3) {};
\node at (-5,3) {\small\textbf{Guardian}};
\node[box, fill=white, minimum width=1.8cm, font=\scriptsize] at (-3,3) {Normality};
\node[box, fill=white, minimum width=1.8cm, font=\scriptsize] at (-0.5,3) {Variance};
\node[box, fill=white, minimum width=1.8cm, font=\scriptsize] at (2,3) {Outliers};
\node[box, fill=white, minimum width=1.8cm, font=\scriptsize] at (4.5,3) {+12 more};

% Statistical Engine
\node[draw, dashed, minimum width=12cm, minimum height=1.2cm, fill=yellow!10] at (0,1) {};
\node at (-5,1) {\small\textbf{Engine}};
\node[box, fill=white, minimum width=1.5cm, font=\scriptsize] at (-3.5,1) {T-Tests};
\node[box, fill=white, minimum width=1.5cm, font=\scriptsize] at (-1.5,1) {ANOVA};
\node[box, fill=white, minimum width=1.5cm, font=\scriptsize] at (0.5,1) {Meta};
\node[box, fill=white, minimum width=1.5cm, font=\scriptsize] at (2.5,1) {Power};
\node[box, fill=white, minimum width=1.5cm, font=\scriptsize] at (4.5,1) {+40};

% Data Layer
\node[layer, minimum height=1.5cm, fill=purple!10] (data) at (0,-1.5) {};
\node[above] at (data.north) {\textbf{Data Layer}};
\node[box, fill=white] at (-3.5,-1.5) {PostgreSQL};
\node[box, fill=white] at (0,-1.5) {Redis};
\node[box, fill=white] at (3.5,-1.5) {Files};

% Arrows
\draw[arrow] (0,4.2) -- (0,3.8);
\draw[arrow] (0,2.4) -- (0,1.8);
\draw[arrow] (0,0.2) -- (0,-0.5);

\end{tikzpicture}
\caption{StickForStats system architecture showing the three-tier design with the Guardian layer integrated into the application tier.}
\label{fig:architecture}
\end{figure}
```

## Figure Caption

**Figure 1.** StickForStats system architecture. The platform follows a three-tier architecture: (1) a React-based user interface providing statistical analysis tools, educational content, AI-powered guidance, and report management; (2) a Django REST application layer integrating the Guardian assumption validation system with a dual-precision statistical engine; and (3) a data layer supporting PostgreSQL for persistent storage, Redis for caching, and file storage for exports. The Guardian layer intercepts all statistical test requests, performing automatic assumption checks before analysis proceeds.

## Design Notes

- Colors should be consistent with platform branding
- Guardian layer should be visually prominent (different color/border)
- Arrows indicate data flow direction
- Component boxes should be clearly labeled
- Final figure should be vector format (PDF/EPS)

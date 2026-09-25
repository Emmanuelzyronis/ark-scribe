# ArkScribe — Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ArkScribe System                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Browser / Mobile                          │   │
│  │                                                              │   │
│  │  ┌─────────────┐   ┌─────────────────┐   ┌───────────────┐ │   │
│  │  │  MediaStream │   │ Next.js App     │   │ AssemblyAI    │ │   │
│  │  │  API (mic)   │──▶│ Router          │   │ WebSocket     │ │   │
│  │  │             │   │ (port 3000)     │   │ (streaming)   │ │   │
│  │  └─────────────┘   └────────┬────────┘   └──────┬────────┘ │   │
│  │                             │ fetch/JWT          │ words    │   │
│  └─────────────────────────────│────────────────────│──────────┘   │
│                                │                    │               │
│                    ┌───────────▼────────────────────▼───────┐      │
│                    │      Fastify API (port 3001)            │      │
│                    │                                         │      │
│                    │  ┌──────────┐  ┌────────────────────┐  │      │
│                    │  │ Auth     │  │ Encounters         │  │      │
│                    │  │ Routes   │  │ Routes             │  │      │
│                    │  │ /api/auth│  │ /api/encounters/*  │  │      │
│                    │  └─────┬────┘  └─────────┬──────────┘  │      │
│                    │        │                  │             │      │
│                    │  ┌─────▼──────────────────▼──────────┐ │      │
│                    │  │          Services Layer            │ │      │
│                    │  │  ┌─────────────┐ ┌──────────────┐ │ │      │
│                    │  │  │ AI Service  │ │ PHI Redaction│ │ │      │
│                    │  │  │ (Claude API)│ │ Service      │ │ │      │
│                    │  │  └──────┬──────┘ └──────────────┘ │ │      │
│                    │  └─────────│──────────────────────────┘ │      │
│                    └───────────│────────────────────────────-┘      │
│                                │                                     │
│          ┌─────────────────────▼────────────────────────────┐       │
│          │                  External Services                │       │
│          │                                                   │       │
│          │  ┌────────────────┐    ┌────────────────────────┐│       │
│          │  │  Neon Postgres │    │  Anthropic / Azure      ││       │
│          │  │  (encrypted)   │    │  Claude claude-sonnet   ││       │
│          │  │                │    │  -4-6                   ││       │
│          │  │  physicians    │    └────────────────────────┘│       │
│          │  │  encounters    │    ┌────────────────────────┐│       │
│          │  │  transcripts   │    │  AssemblyAI            ││       │
│          │  │  soap_notes    │    │  Real-time streaming   ││       │
│          │  │  audit_logs    │    │  $0.006/minute         ││       │
│          │  │  note_edits    │    └────────────────────────┘│       │
│          │  │  custom_vocab  │                               │       │
│          │  └────────────────┘                               │       │
│          └───────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Patient Encounter
       │
       ▼
Browser Mic (MediaStream API)
       │ Audio stream
       ▼
AssemblyAI WebSocket (real-time)
       │ Words + timestamps
       ▼
TranscriptStreamPanel (UI)
       │ user clicks "Generate Note"
       ▼
POST /api/encounters/:id/transcript/finalize
       │ PHI redaction applied
       ▼
POST /api/encounters/:id/note/generate
       │ Redacted transcript → Claude API
       ▼
SOAP Note JSON (S, O, A, P + ICD-10 + medications)
       │
       ▼
SOAPNotePanel (side-by-side view)
       │ physician reviews, edits, finalizes
       ▼
EHR Copy-Paste (plain / Epic / Athena / DrChrono)
```

## Database Schema

### `physicians`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | TEXT UNIQUE | Login email |
| password_hash | TEXT | bcrypt(12) |
| full_name | TEXT | |
| specialty | TEXT | |
| practice_name | TEXT | |
| ehr_preference | TEXT | plain/epic/athena/drchrono |
| custom_vocab_enabled | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `encounters`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| physician_id | UUID FK | |
| title | TEXT | |
| patient_ref | TEXT | Anonymized reference |
| duration_seconds | INTEGER | |
| status | TEXT | recording/processing/draft/finalized |
| assemblyai_session_id | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| finalized_at | TIMESTAMPTZ | |

### `transcripts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| encounter_id | UUID FK UNIQUE | |
| raw_text | TEXT | Original transcript |
| redacted_text | TEXT | PHI-redacted version |
| words | JSONB | `[{word, start_ms, end_ms, confidence}]` |
| phi_redaction_log | JSONB | Count of redacted tokens by category |

### `soap_notes`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| encounter_id | UUID FK UNIQUE | |
| subjective | TEXT | S section |
| objective | TEXT | O section |
| assessment | TEXT | A section |
| plan | TEXT | P section |
| icd10_codes | TEXT[] | Suggested ICD-10 codes |
| medications | TEXT[] | Medications mentioned |
| raw_claude_response | JSONB | Full Claude API response |
| generation_model | TEXT | Model used |
| generation_ms | INTEGER | Time to generate |

### `note_edits`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| soap_note_id | UUID FK | |
| physician_id | UUID FK | |
| section | TEXT | subjective/objective/assessment/plan |
| before_text | TEXT | Pre-edit content |
| after_text | TEXT | Post-edit content |
| edit_source | TEXT | manual/claude_assist |
| claude_prompt | TEXT | Instruction used (if AI edit) |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| physician_id | UUID FK | |
| encounter_id | UUID FK | |
| action | TEXT | register/login/create/view/update/export/delete |
| resource_type | TEXT | physician/encounter/soap_note |
| resource_id | UUID | |
| ip_address | INET | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | |

### `custom_vocabulary`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| physician_id | UUID FK | |
| term | TEXT | Clinical term |
| phonetic_hint | TEXT | For AssemblyAI boost |
| specialty | TEXT | |
| context_hint | TEXT | |
| active | BOOLEAN | Soft delete |

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Physician registration |
| POST | /api/auth/login | JWT login |
| GET | /api/auth/me | Current physician profile |
| PATCH | /api/physicians/me | Update profile |

### Encounters
| Method | Path | Description |
|---|---|---|
| GET | /api/encounters | List encounters (paginated) |
| POST | /api/encounters | Create new encounter |
| GET | /api/encounters/:id | Get encounter with transcript + note |
| PATCH | /api/encounters/:id | Update status/metadata |
| DELETE | /api/encounters/:id | Soft-delete encounter |
| POST | /api/encounters/:id/transcript/finalize | Save transcript with PHI redaction |
| GET | /api/encounters/:id/transcript | Get transcript |
| POST | /api/encounters/:id/note/generate | Generate SOAP note via Claude |
| GET | /api/encounters/:id/note | Get SOAP note |
| PATCH | /api/encounters/:id/note | Update note (manual edit) |
| POST | /api/encounters/:id/note/section/rewrite | Claude-assisted section rewrite |
| POST | /api/encounters/:id/note/export | Export in EHR format |

### Vocabulary
| Method | Path | Description |
|---|---|---|
| GET | /api/vocabulary | List physician vocabulary |
| POST | /api/vocabulary | Add vocabulary term |
| DELETE | /api/vocabulary/:id | Remove vocabulary term |

### System
| Method | Path | Description |
|---|---|---|
| GET | /api/audit | HIPAA audit log |
| GET | /api/health | Liveness probe |
| POST | /api/webhooks/assemblyai | AssemblyAI streaming webhook |

---

## Frontend Routes

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/login` | Physician login |
| `/register` | Physician registration |
| `/dashboard` | Note history hub |
| `/record` | Ambient audio capture + live transcript |
| `/note/[id]` | Side-by-side transcript + SOAP note review |
| `/settings` | Physician profile + EHR preference |
| `/settings/vocabulary` | Custom vocabulary management |
| `/settings/audit` | HIPAA audit log viewer |

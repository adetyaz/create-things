# Notion Database Schemas

All 6 databases are created under a shared Notion page on first OAuth setup. Relations are added in a second pass after all databases exist (`linkDatabases`).

---

## 1. Inspiration Vault

| Property     | Type                               | Options                                                                              |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Title        | title                              | —                                                                                    |
| Source URL   | url                                | —                                                                                    |
| Author       | rich_text                          | —                                                                                    |
| Platform     | select                             | Dribbble (pink), Twitter (blue), Website (gray), Instagram (orange), Other (default) |
| Capture Type | select                             | screenshot (green), url (blue), upload (purple), note (yellow)                       |
| Status       | select                             | Pending (yellow), Ready (green), Active (blue), Stale (orange), Archived (gray)      |
| Date Saved   | date                               | —                                                                                    |
| Last Active  | date                               | —                                                                                    |
| Notes        | rich_text                          | —                                                                                    |
| Analysis     | **relation → Analysis Results**    | dual                                                                                 |
| Projects     | **relation → Projects**            | dual                                                                                 |
| Roadmap      | **relation → Roadmaps & Learning** | dual                                                                                 |

---

## 2. Analysis Results

| Property       | Type                             | Options                                        |
| -------------- | -------------------------------- | ---------------------------------------------- |
| Title          | title                            | —                                              |
| Colors         | rich_text                        | —                                              |
| Typography     | rich_text                        | —                                              |
| Layout         | rich_text                        | —                                              |
| Mood           | multi_select                     | minimal, bold, editorial, playful, dark, clean |
| Style          | rich_text                        | —                                              |
| Components     | rich_text                        | —                                              |
| Attribution    | rich_text                        | —                                              |
| For Developers | rich_text                        | —                                              |
| For Creators   | rich_text                        | —                                              |
| Suggestions    | rich_text                        | —                                              |
| Inspiration    | **relation → Inspiration Vault** | dual                                           |

---

## 3. Roadmaps & Learning

| Property    | Type                             | Options                                                  |
| ----------- | -------------------------------- | -------------------------------------------------------- |
| Title       | title                            | —                                                        |
| Skills      | rich_text                        | —                                                        |
| Milestones  | rich_text                        | —                                                        |
| Resources   | rich_text                        | —                                                        |
| Progress    | select                           | Not started (gray), In progress (blue), Complete (green) |
| Inspiration | **relation → Inspiration Vault** | dual                                                     |

---

## 4. Projects

| Property       | Type                             | Options                                                        |
| -------------- | -------------------------------- | -------------------------------------------------------------- |
| Title          | title                            | —                                                              |
| Status         | select                           | Ideating (yellow), In Progress (blue), Done (green)            |
| Remix Tag      | select                           | Inspired by (green), Remixed from (yellow), Recreated (orange) |
| Journal        | rich_text                        | —                                                              |
| Date Started   | date                             | —                                                              |
| Date Completed | date                             | —                                                              |
| Public         | checkbox                         | —                                                              |
| Inspiration    | **relation → Inspiration Vault** | dual                                                           |
| Publish Queue  | **relation → Publish Queue**     | dual                                                           |

---

## 5. Publish Queue

| Property          | Type                    | Options                                          |
| ----------------- | ----------------------- | ------------------------------------------------ |
| Title             | title                   | —                                                |
| Status            | select                  | Draft (gray), Approved (blue), Published (green) |
| Caption Twitter   | rich_text               | —                                                |
| Caption LinkedIn  | rich_text               | —                                                |
| Caption Instagram | rich_text               | —                                                |
| Caption Reddit    | rich_text               | —                                                |
| Credit Line       | rich_text               | —                                                |
| Hashtags          | rich_text               | —                                                |
| Platforms         | multi_select            | Twitter, LinkedIn, Instagram, Reddit             |
| Published At      | date                    | —                                                |
| Project           | **relation → Projects** | dual                                             |

---

## 6. User Profile

| Property         | Type         | Options                              |
| ---------------- | ------------ | ------------------------------------ |
| Username         | title        | —                                    |
| Stale Threshold  | number       | —                                    |
| Portfolio Public | checkbox     | —                                    |
| Creative DNA     | rich_text    | —                                    |
| Bio              | rich_text    | —                                    |
| Figma Connected  | checkbox     | —                                    |
| Platforms        | multi_select | Twitter, LinkedIn, Instagram, Reddit |

---

## Relation Map

```
Inspiration Vault ──── Analysis      ───► Analysis Results
                  ──── Projects      ───► Projects
                  ──── Roadmap       ───► Roadmaps & Learning

Analysis Results  ──── Inspiration   ───► Inspiration Vault  (dual of above)

Roadmaps         ──── Inspiration   ───► Inspiration Vault  (dual of above)

Projects          ──── Inspiration   ───► Inspiration Vault  (dual of above)
                  ──── Publish Queue ───► Publish Queue

Publish Queue     ──── Project       ───► Projects           (dual of above)
```

All relations are `dual_property` — both sides are visible in Notion.

# Study source documents

Drop the approved research documents here. They are the source of truth for the
transcribed content in the app.

## Consent

Place the approved IRB informed-consent document in this folder, for example:

    docs/informed-consent.pdf

Then transcribe it, word for word, into `src/content/consent.tsx`:

- Replace the body of `ConsentBody` with the verbatim consent text (every
  section, no rewording or summarizing).
- Fill `CONSENT_META.irbProtocol` and `CONSENT_META.version` from the document.
- Have the rendered consent screen checked against the original before running
  any participant.

The app currently uses the consent text transcribed from
`ConsentForm_CodeViz.docx`.

## Questionnaire

The final questionnaire is rendered inside the app and saved to Supabase with
the participant session. It lives in `src/data/questionnaire.ts`. Replace the
wording there if the professor provides a final questionnaire that differs from
the current draft.

## Note

This folder is for reference documents only. It is not imported by the app at
runtime. The Java tracer prototypes at the repository root are unrelated to the
study harness and are out of scope here.

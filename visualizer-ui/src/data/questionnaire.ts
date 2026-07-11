/*
 * Participant questionnaire definition.
 *
 * This covers the measures named in the study documents: basic demographic
 * information, experience with the learning activity, cognitive load, and
 * usability. Replace wording here if the final approved questionnaire differs.
 */

export type QuestionnaireOption = {
  value: string;
  label: string;
};

export type QuestionnaireItem =
  | {
      kind: "text";
      key: string;
      label: string;
      placeholder?: string;
      required?: boolean;
    }
  | {
      kind: "select";
      key: string;
      label: string;
      options: QuestionnaireOption[];
      required?: boolean;
    }
  | {
      kind: "scale";
      key: string;
      label: string;
      options: QuestionnaireOption[];
      required?: boolean;
    }
  | {
      kind: "textarea";
      key: string;
      label: string;
      placeholder?: string;
      required?: boolean;
    };

const AGREEMENT_OPTIONS: QuestionnaireOption[] = [
  { value: "1", label: "Strongly disagree" },
  { value: "2", label: "Disagree" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "Agree" },
  { value: "5", label: "Strongly agree" },
];

export const QUESTIONNAIRE_ITEMS: QuestionnaireItem[] = [
  {
    kind: "text",
    key: "demographics.age",
    label: "Age",
    placeholder: "Enter your age",
    required: true,
  },
  {
    kind: "select",
    key: "demographics.year_in_program",
    label: "Year in program",
    options: [
      { value: "first_year", label: "First year" },
      { value: "second_year", label: "Second year" },
      { value: "third_year", label: "Third year" },
      { value: "fourth_year", label: "Fourth year" },
      { value: "graduate", label: "Graduate student" },
      { value: "other", label: "Other" },
    ],
    required: true,
  },
  {
    kind: "select",
    key: "demographics.completed_cps_2231",
    label: "Have you previously completed CPS 2231?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "not_sure", label: "Not sure" },
    ],
    required: true,
  },
  {
    kind: "scale",
    key: "experience.understanding_java_execution",
    label:
      "The learning activity helped me understand Java program execution step by step.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "scale",
    key: "experience.understanding_references",
    label:
      "The learning activity helped me understand object references, stack behavior, and heap behavior.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "scale",
    key: "experience.confidence",
    label:
      "After the learning activity, I feel more confident tracing Java code.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "scale",
    key: "cognitive_load.mental_effort",
    label: "The learning activity required a high amount of mental effort.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "scale",
    key: "usability.easy_to_use",
    label: "The learning activity was easy to use.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "scale",
    key: "usability.instructions_clear",
    label: "The instructions and information on the screen were clear.",
    options: AGREEMENT_OPTIONS,
    required: true,
  },
  {
    kind: "textarea",
    key: "open_response.helpful_parts",
    label: "What part of the learning activity was most helpful?",
    placeholder: "Optional written response",
  },
  {
    kind: "textarea",
    key: "open_response.improvements",
    label: "What could be improved about the learning activity?",
    placeholder: "Optional written response",
  },
];

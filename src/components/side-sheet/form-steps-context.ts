import * as React from "react";

/* The shared state behind `form-steps.tsx`, kept apart so that file exports only components. */

/** True inside a stepped sheet's form. */
export const FormStepsContext = React.createContext(false);
/** True inside a step, so the sections in it do not become steps too. */
export const InsideFormStepContext = React.createContext(false);

/** The attributes that make an element a step the list can find. */
export function formStepAttrs(label: string) {
  return { "data-form-step": label };
}

/**
 * The classes a step's own element takes: room for the landing blink's fill,
 * pulled back out so the fields stay where they were.
 */
export const FORM_STEP_CLASS = "-m-3 rounded-lg p-3";

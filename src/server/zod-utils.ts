import { ZodError } from "zod";

/**
 * Converts a ZodError into a concise, human-readable string.
 *
 * Example outputs:
 *   "Name: Project name is required"
 *   "Description: Must be 2000 characters or less; Name: Must be 100 characters or less"
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      if (issue.path.length > 0) {
        const field = capitalize(issue.path.map(String).join("."));
        return `${field}: ${issue.message}`;
      }
      return issue.message;
    })
    .join("; ");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

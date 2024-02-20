import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Team name must be longer than 3 characters" })
    .max(100, { message: "Team name must be less than 100 characters" }),
  description: z.string().optional(),
});
